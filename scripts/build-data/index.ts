/**
 * Pipeline de dados: CSVs do PokeAPI → JSON do jogo em src/data/generated/.
 * Uso: npm run build:data
 *
 * Gera:
 *  - species.json    todas as espécies (1..1025), com atributos, evoluções e learnset por nível
 *  - moves.json      golpes referenciados nos learnsets
 *  - types.json      tabela de efetividade
 *  - items.json      nomes dos itens usados pelo jogo
 *  - encounters-{região}.json  tabelas de encontro por local
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCsv } from './csv';
import type {
  EncounterMethod, EncounterSlot, Evolution, EvolutionCondition, GeneratedItem, GrowthRate,
  LocationEncounters, Move, Species, Stats, TimeOfDay, TypeChart, TypeId,
} from '../../src/data/types';
import { STAT_KEYS, TYPES } from '../../src/data/types';

const OUT = join(process.cwd(), 'src', 'data', 'generated');
const MAX_SPECIES = 1025;
const EN = '9';

/** Versões usadas para gerar os encontros de cada região (unidas para incluir exclusivos de versão). */
const REGION_VERSIONS: Record<string, string[]> = {
  kanto: ['10', '11'], // FireRed / LeafGreen
  johto: ['15', '16'], // HeartGold / SoulSilver
  hoenn: ['7', '8', '9'], // Ruby / Sapphire / Emerald
  sinnoh: ['12', '13', '14'], // Diamond / Pearl / Platinum
};

/** Grupos de versão ignorados na escolha de learnset/evolução (mecânicas diferentes ou incompletas). */
const SKIP_VERSION_GROUPS = new Set(['12', '13', '24', '28', '29', '30', '31', '32']);

/** Itens que o jogo usa além dos itens de evolução (nomes vêm do PokeAPI). */
const EXTRA_ITEMS = [
  'poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'net-ball', 'dusk-ball', 'quick-ball', 'repeat-ball',
  'safari-ball', 'potion', 'super-potion', 'hyper-potion', 'max-potion', 'revive', 'rare-candy',
  'protein', 'iron', 'calcium', 'zinc', 'carbos', 'hp-up', 'lucky-egg', 'amulet-coin', 'exp-share', 'leftovers',
  'charcoal', 'mystic-water', 'miracle-seed', 'magnet', 'never-melt-ice', 'black-belt', 'poison-barb', 'soft-sand',
  'sharp-beak', 'twisted-spoon', 'silver-powder', 'hard-stone', 'spell-tag', 'dragon-fang', 'black-glasses',
  'metal-coat', 'silk-scarf', 'repel', 'super-repel', 'max-repel', 'old-rod', 'good-rod', 'super-rod', 'bicycle',
  'everstone', 'soothe-bell', 'shiny-charm', 'oval-charm', 'link-cable', 'muscle-band', 'wise-glasses',
];

const GROWTH: Record<string, GrowthRate> = {
  '1': 'slow', '2': 'medium-fast', '3': 'fast', '4': 'medium-slow', '5': 'erratic', '6': 'fluctuating',
};

const ENCOUNTER_METHOD: Record<string, EncounterMethod> = {
  '1': 'walk', '8': 'walk', '9': 'walk', '10': 'walk', '11': 'walk', '14': 'walk', '15': 'walk', '16': 'walk',
  '17': 'walk', '2': 'old-rod', '3': 'good-rod', '4': 'super-rod', '12': 'super-rod', '5': 'surf', '13': 'surf',
  '6': 'rock-smash', '7': 'headbutt', '22': 'headbutt', '23': 'headbutt', '24': 'headbutt',
};

const TIME_VALUES: Record<string, TimeOfDay> = { '3': 'morning', '4': 'day', '5': 'night' };

/** Evoluções com gatilhos sem equivalente no idle → condição de nível (documentado no GDD). */
const TRIGGER_LEVEL_FALLBACK: Record<string, number> = { kingambit: 64, gholdengo: 40, melmetal: 48, urshifu: 40 };

async function main() {
  const [
    speciesRows, pokemonRows, statRows, typeRows, typesCsv, efficacyRows, nameRows, evolutionRows, itemRows,
    itemNameRows, moveRows, moveNameRows, pokemonMoveRows, versionGroupRows, encounterRows, slotRows, condMapRows,
    condValueRows, areaRows, locationRows, locationNameRows, regionRows, versionRows,
  ] = await Promise.all(
    [
      'pokemon_species', 'pokemon', 'pokemon_stats', 'pokemon_types', 'types', 'type_efficacy', 'pokemon_species_names',
      'pokemon_evolution', 'items', 'item_names', 'moves', 'move_names', 'pokemon_moves', 'version_groups',
      'encounters', 'encounter_slots', 'encounter_condition_value_map', 'encounter_condition_values',
      'location_areas', 'locations', 'location_names', 'regions', 'versions',
    ].map(loadCsv),
  );
  void regionRows;
  void versionRows;

  const typeById = new Map(typesCsv.map((t) => [t.id, t.identifier as TypeId]));
  const speciesKeyById = new Map(speciesRows.map((s) => [s.id, s.identifier]));
  const itemKeyById = new Map(itemRows.map((i) => [i.id, i.identifier]));
  const moveById = new Map(moveRows.map((m) => [m.id, m]));
  const vgOrder = new Map(versionGroupRows.map((v) => [v.id, Number(v.order)]));
  const nameOf = (rows: Record<string, string>[], idKey: string) => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.local_language_id === EN) m.set(r[idKey], r.name);
    return m;
  };
  const speciesName = nameOf(nameRows, 'pokemon_species_id');
  const moveName = nameOf(moveNameRows, 'move_id');
  const itemName = nameOf(itemNameRows, 'item_id');
  const locationName = nameOf(locationNameRows, 'location_id');

  // Pokémon padrão de cada espécie (forma base).
  const defaultPokemon = new Map<string, Record<string, string>>();
  for (const p of pokemonRows) if (p.is_default === '1') defaultPokemon.set(p.species_id, p);
  const speciesOfPokemon = new Map(pokemonRows.map((p) => [p.id, p.species_id]));

  const statsByPokemon = new Map<string, { base: Stats; ev: Partial<Stats> }>();
  for (const r of statRows) {
    const key = STAT_KEYS[Number(r.stat_id) - 1];
    if (!key) continue;
    let e = statsByPokemon.get(r.pokemon_id);
    if (!e) statsByPokemon.set(r.pokemon_id, (e = { base: {} as Stats, ev: {} }));
    e.base[key] = Number(r.base_stat);
    if (Number(r.effort) > 0) e.ev[key] = Number(r.effort);
  }
  const typesByPokemon = new Map<string, TypeId[]>();
  for (const r of [...typeRows].sort((a, b) => Number(a.slot) - Number(b.slot))) {
    const list = typesByPokemon.get(r.pokemon_id) ?? [];
    list.push(typeById.get(r.type_id)!);
    typesByPokemon.set(r.pokemon_id, list);
  }

  // ---------- Learnsets: grupo de versão mais recente com golpes por nível ----------
  const levelMoves = new Map<string, Map<string, [number, string][]>>(); // pokemonId → vg → moves
  for (const r of pokemonMoveRows) {
    if (r.pokemon_move_method_id !== '1' || SKIP_VERSION_GROUPS.has(r.version_group_id)) continue;
    let byVg = levelMoves.get(r.pokemon_id);
    if (!byVg) levelMoves.set(r.pokemon_id, (byVg = new Map()));
    const list = byVg.get(r.version_group_id) ?? [];
    list.push([Math.max(1, Number(r.level)), r.move_id]);
    byVg.set(r.version_group_id, list);
  }
  const usedMoves = new Set<string>(['165']); // struggle (golpe reserva)

  // ---------- Evoluções ----------
  const evolutionsFrom = buildEvolutions();

  function buildEvolutions(): Map<string, Evolution[]> {
    type Candidate = { order: number; from: string; into: string; conditions: EvolutionCondition[]; special?: 'shed' };
    const candidates: Candidate[] = [];
    for (const r of evolutionRows) {
      if (r.region_id) continue; // variantes regionais
      if (Number(r.required_pokemon_form_id || 0) >= 10000 || Number(r.evolved_pokemon_form_id || 0) >= 10000) continue;
      const into = speciesKeyById.get(r.evolved_species_id)!;
      const intoRow = speciesRows.find((s) => s.id === r.evolved_species_id)!;
      if (!intoRow.evolves_from_species_id) continue;
      const from = speciesKeyById.get(intoRow.evolves_from_species_id)!;
      const conditions: EvolutionCondition[] = [];
      let special: 'shed' | undefined;
      const trigger = r.evolution_trigger_id;
      let supported = true;

      if (trigger === '1' || trigger === '10') {
        // subir de nível
      } else if (trigger === '2') {
        conditions.push({ type: 'item', itemId: 'link-cable' });
      } else if (trigger === '3' || trigger === '5') {
        const itemId = itemKeyById.get(r.trigger_item_id || r.held_item_id);
        if (!itemId) supported = false;
        else conditions.push({ type: 'item', itemId });
      } else if (trigger === '4') {
        special = 'shed';
      } else if (['11', '12', '14'].includes(trigger) && r.used_move_id) {
        conditions.push({ type: 'knowsMove', moveId: moveById.get(r.used_move_id)!.identifier });
      } else if (TRIGGER_LEVEL_FALLBACK[into] && trigger !== '7') {
        conditions.push({ type: 'level', min: TRIGGER_LEVEL_FALLBACK[into] });
      } else supported = false;

      if (r.location_id || r.minimum_beauty || r.minimum_damage_taken) supported = false;
      if (!supported) continue;

      if (r.minimum_level) conditions.push({ type: 'level', min: Number(r.minimum_level) });
      if (r.held_item_id && trigger !== '5') conditions.push({ type: 'heldItem', itemId: itemKeyById.get(r.held_item_id)! });
      if (r.minimum_happiness) conditions.push({ type: 'friendship', min: Number(r.minimum_happiness) });
      if (r.minimum_affection) conditions.push({ type: 'friendship', min: 160 });
      if (r.time_of_day === 'day' || r.time_of_day === 'night') conditions.push({ type: 'timeOfDay', value: r.time_of_day });
      if (r.known_move_id) conditions.push({ type: 'knowsMove', moveId: moveById.get(r.known_move_id)!.identifier });
      if (r.known_move_type_id) conditions.push({ type: 'knowsMoveType', moveType: typeById.get(r.known_move_type_id)! });
      if (r.gender_id) conditions.push({ type: 'gender', value: r.gender_id === '1' ? 'f' : 'm' });
      if (r.relative_physical_stats) {
        const v = Number(r.relative_physical_stats);
        conditions.push({ type: 'statCompare', rule: v > 0 ? 'atk>def' : v < 0 ? 'atk<def' : 'atk=def' });
      }
      if (r.party_species_id) conditions.push({ type: 'partySpecies', species: speciesKeyById.get(r.party_species_id)! });
      if (r.party_type_id) conditions.push({ type: 'partyType', partyType: typeById.get(r.party_type_id)! });
      // Subir de nível sem nível mínimo nem outra condição de bloqueio: exige pelo menos nível+1 (qualquer level up).
      if (conditions.length === 0 && !special) conditions.push({ type: 'level', min: 2 });

      candidates.push({ order: vgOrder.get(r.version_group_id) ?? 0, from, into, conditions, special });
    }

    // Por par (from, into), fica só o jogo mais recente; dentro dele, alternativas distintas.
    const byPair = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const k = `${c.from}>${c.into}`;
      byPair.set(k, [...(byPair.get(k) ?? []), c]);
    }
    const result = new Map<string, Evolution[]>();
    for (const list of byPair.values()) {
      const latest = Math.max(...list.map((c) => c.order));
      const seen = new Set<string>();
      for (const c of list.filter((x) => x.order === latest)) {
        const sig = JSON.stringify(c.conditions) + (c.special ?? '');
        if (seen.has(sig)) continue;
        seen.add(sig);
        const evo: Evolution = { into: c.into, conditions: c.conditions };
        if (c.special) evo.special = c.special;
        result.set(c.from, [...(result.get(c.from) ?? []), evo]);
      }
    }
    // Evoluções com condições idênticas para alvos diferentes (ex.: Wurmple) → divisão por personalidade.
    for (const evos of result.values()) {
      const groups = new Map<string, Evolution[]>();
      for (const e of evos) {
        const sig = JSON.stringify(e.conditions);
        groups.set(sig, [...(groups.get(sig) ?? []), e]);
      }
      for (const g of groups.values()) {
        if (g.length < 2) continue;
        g.forEach((e, i) => e.conditions.push({ type: 'personality', bucket: i, of: g.length }));
      }
    }
    return result;
  }

  // ---------- Espécies ----------
  const species: Species[] = [];
  for (const s of speciesRows) {
    const id = Number(s.id);
    if (id > MAX_SPECIES) continue;
    const p = defaultPokemon.get(s.id)!;
    const stats = statsByPokemon.get(p.id)!;
    const byVg = levelMoves.get(p.id) ?? new Map();
    let bestVg: string | null = null;
    for (const vg of byVg.keys()) if (!bestVg || vgOrder.get(vg)! > vgOrder.get(bestVg)!) bestVg = vg;
    const learnset = (bestVg ? byVg.get(bestVg)! : [])
      .sort((a: [number, string], b: [number, string]) => a[0] - b[0])
      .filter((m: [number, string], i: number, arr: [number, string][]) => arr.findIndex((x) => x[1] === m[1]) === i)
      .map(([lvl, mid]: [number, string]) => {
        usedMoves.add(mid);
        return [lvl, moveById.get(mid)!.identifier] as [number, string];
      });
    const bst = STAT_KEYS.reduce((a, k) => a + stats.base[k], 0);
    const tags: Species['tags'] = [];
    if (s.is_legendary === '1') tags.push('legendary');
    if (s.is_mythical === '1') tags.push('mythical');
    if (s.is_baby === '1') tags.push('baby');
    species.push({
      id,
      key: s.identifier,
      name: speciesName.get(s.id) ?? s.identifier,
      types: typesByPokemon.get(p.id)!,
      baseStats: stats.base,
      growthRate: GROWTH[s.growth_rate_id],
      captureRate: Number(s.capture_rate),
      // Algumas espécies recentes não têm base_experience: estimativa pelo total de atributos.
      baseExp: Number(p.base_experience) || Math.round(bst / 3),
      baseFriendship: s.base_happiness === '' ? 50 : Number(s.base_happiness),
      evYield: stats.ev,
      genderRate: Number(s.gender_rate),
      generation: Number(s.generation_id),
      chainId: Number(s.evolution_chain_id),
      evolvesFrom: s.evolves_from_species_id ? speciesKeyById.get(s.evolves_from_species_id)! : null,
      evolutions: evolutionsFrom.get(s.identifier) ?? [],
      learnset,
      tags,
    });
  }
  species.sort((a, b) => a.id - b.id);
  // Remove evoluções para espécies fora do limite.
  const keys = new Set(species.map((s) => s.key));
  for (const s of species) s.evolutions = s.evolutions.filter((e) => keys.has(e.into));

  // ---------- Golpes ----------
  const CATEGORY: Record<string, Move['category']> = { '1': 'status', '2': 'physical', '3': 'special' };
  const moves: Record<string, Move> = {};
  for (const id of usedMoves) {
    const m = moveById.get(id)!;
    moves[m.identifier] = {
      id: m.identifier,
      name: moveName.get(id) ?? m.identifier,
      type: typeById.get(m.type_id)!,
      category: CATEGORY[m.damage_class_id] ?? 'status',
      power: m.power ? Number(m.power) : null,
      accuracy: m.accuracy ? Number(m.accuracy) : null,
      priority: Number(m.priority || 0),
    };
  }

  // ---------- Tabela de tipos ----------
  const typeChart = Object.fromEntries(TYPES.map((t) => [t, {}])) as TypeChart;
  for (const r of efficacyRows) {
    const atk = typeById.get(r.damage_type_id);
    const def = typeById.get(r.target_type_id);
    if (!atk || !def || !TYPES.includes(atk) || !TYPES.includes(def)) continue;
    const f = Number(r.damage_factor) / 100;
    if (f !== 1) typeChart[atk][def] = f;
  }

  // ---------- Itens ----------
  const itemIds = new Set(EXTRA_ITEMS);
  for (const s of species)
    for (const e of s.evolutions)
      for (const c of e.conditions) if (c.type === 'item' || c.type === 'heldItem') itemIds.add(c.itemId);
  const itemIdByKey = new Map(itemRows.map((i) => [i.identifier, i.id]));
  const items: GeneratedItem[] = [...itemIds].map((id) => ({
    id,
    name: (itemIdByKey.get(id) && itemName.get(itemIdByKey.get(id)!)) || titleCase(id),
  }));

  // ---------- Encontros ----------
  const areaById = new Map(areaRows.map((a) => [a.id, a]));
  const locationById = new Map(locationRows.map((l) => [l.id, l]));
  const slotById = new Map(slotRows.map((s) => [s.id, s]));
  const condValueById = new Map(condValueRows.map((c) => [c.id, c]));
  const condsByEncounter = new Map<string, string[]>();
  for (const r of condMapRows) {
    condsByEncounter.set(r.encounter_id, [...(condsByEncounter.get(r.encounter_id) ?? []), r.encounter_condition_value_id]);
  }
  const encounters: Record<string, Record<string, LocationEncounters>> = {};
  for (const [region, versions] of Object.entries(REGION_VERSIONS)) {
    const acc = new Map<string, Map<string, EncounterSlot & { total: number }>>();
    const names = new Map<string, string>();
    for (const e of encounterRows) {
      if (!versions.includes(e.version_id)) continue;
      const slot = slotById.get(e.encounter_slot_id)!;
      const method = ENCOUNTER_METHOD[slot.encounter_method_id];
      if (!method) continue;
      // Ignora encontros que dependem de condições especiais (enxame, rádio, Poké Radar, cartucho GBA...).
      const conds = condsByEncounter.get(e.id) ?? [];
      const times: TimeOfDay[] = [];
      let special = false;
      for (const c of conds) {
        if (TIME_VALUES[c]) times.push(TIME_VALUES[c]);
        else if (condValueById.get(c)?.is_default !== '1') special = true;
      }
      if (special) continue;
      const area = areaById.get(e.location_area_id)!;
      const loc = locationById.get(area.location_id)!;
      const locKey = loc.identifier + (area.identifier ? `/${area.identifier}` : '');
      names.set(locKey, (locationName.get(loc.id) ?? titleCase(loc.identifier)) + (area.identifier ? ` (${titleCase(area.identifier)})` : ''));
      const speciesKey = speciesKeyById.get(speciesOfPokemon.get(e.pokemon_id)!)!;
      const timeKey = times.sort().join('+');
      const k = `${speciesKey}|${method}|${timeKey}`;
      let byKey = acc.get(locKey);
      if (!byKey) acc.set(locKey, (byKey = new Map()));
      const cur = byKey.get(k);
      const rarity = Number(slot.rarity);
      if (cur) {
        cur.total += rarity;
        cur.min = Math.min(cur.min, Number(e.min_level));
        cur.max = Math.max(cur.max, Number(e.max_level));
      } else {
        byKey.set(k, {
          species: speciesKey, weight: 0, total: rarity, min: Number(e.min_level), max: Number(e.max_level), method,
          ...(times.length && times.length < 3 ? { time: [...new Set(times)] } : {}),
        });
      }
    }
    encounters[region] = {};
    for (const [locKey, byKey] of [...acc.entries()].sort()) {
      const slots = [...byKey.values()].map(({ total, ...s }) => ({ ...s, weight: Math.round((total / versions.length) * 10) / 10 }));
      encounters[region][locKey] = { name: names.get(locKey)!, slots };
    }
  }

  // ---------- Saída ----------
  mkdirSync(OUT, { recursive: true });
  const write = (file: string, data: unknown) => writeFileSync(join(OUT, file), JSON.stringify(data));
  write('species.json', species);
  write('moves.json', moves);
  write('types.json', typeChart);
  write('items.json', items);
  for (const [region, data] of Object.entries(encounters)) write(`encounters-${region}.json`, data);

  console.log(
    `✔ ${species.length} espécies, ${Object.keys(moves).length} golpes, ${items.length} itens, ` +
      Object.entries(encounters).map(([r, d]) => `${r}: ${Object.keys(d).length} locais`).join(', '),
  );
  const noDamage = species.filter((s) => !s.learnset.some(([, m]) => moves[m].power && moves[m].category !== 'status'));
  console.log(`  Espécies sem golpe de dano (usarão Struggle): ${noDamage.map((s) => s.key).join(', ')}`);
}

function titleCase(s: string) {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
