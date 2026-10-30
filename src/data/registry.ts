// GameData: carrega os dados gerados + conteúdo autoral, valida referências e cria índices O(1).
import type { EncounterSlot, GeneratedItem, LocationEncounters, Move, Species, TypeChart } from './types';
import type { AreaDef, ItemDef, MilestoneDef, RegionDef, Requirement, TrainerDef, UpgradeDef } from './content/types';
import { EVOLUTION_STONES, ITEMS } from './content/items';
import { MILESTONES, UPGRADES } from './content/upgrades';
import { REGIONS } from './content/regions';

export interface RawData {
  species: Species[];
  moves: Record<string, Move>;
  types: TypeChart;
  items: GeneratedItem[];
  encounters: Record<string, Record<string, LocationEncounters>>;
}

export interface ResolvedItem extends ItemDef {
  name: string;
}

/** Faixa padrão de Nível de Treinador por região (primeira → última área), se a região não definir a sua. */
const DEFAULT_TRAINER_LEVELS: Record<string, [number, number]> = {
  kanto: [1, 30], johto: [30, 42], hoenn: [42, 62], sinnoh: [62, 85],
};

/**
 * Progressão por Nível de Treinador: requisitos "concluir a área X" do conteúdo autoral viram um Nível de Treinador
 * que cresce ao longo da região (na ordem das áreas). Insígnias, itens-chave e títulos de Campeão continuam valendo.
 */
function toTrainerLevelUnlock(reqs: Requirement[], level: number): Requirement[] {
  const strip = (r: Requirement): Requirement | null => {
    if (r.type === 'areaCleared') return null;
    if (r.type === 'anyOf') {
      const of = r.of.map(strip).filter(Boolean) as Requirement[];
      return of.length === r.of.length ? r : null; // um "ou" que dependia de concluir área vira só o nível
    }
    return r;
  };
  const kept = reqs.map(strip).filter(Boolean) as Requirement[];
  return level > 1 ? [{ type: 'trainerLevel', min: level }, ...kept] : kept;
}

export interface ResolvedArea extends AreaDef {
  regionId: string;
  /** Slots combinados de todos os locais, com níveis já transformados pela região. */
  slots: EncounterSlot[];
  routeTrainers: TrainerDef[];
  levelRange: [number, number];
  /** Nível de Treinador exigido (já incluído em `unlock`). */
  trainerLevel: number;
  statMult: number;
  xpMult: number;
  winsMult: number;
}

export interface GameData {
  species: Map<string, Species>;
  speciesList: Species[];
  moves: Map<string, Move>;
  typeChart: TypeChart;
  items: Map<string, ResolvedItem>;
  regions: RegionDef[];
  regionById: Map<string, RegionDef>;
  areas: Map<string, ResolvedArea>;
  upgrades: Map<string, UpgradeDef>;
  milestones: MilestoneDef[];
  /** Linha evolutiva → espécies (para Afinidade). */
  chains: Map<number, string[]>;
}

/** Valor por nível pago por classe de treinador de rota. */
const CLASS_MONEY: Record<string, number> = {
  Youngster: 16, Lass: 16, 'Bug Catcher': 12, Camper: 20, Picnicker: 20, Hiker: 36, 'Super Nerd': 24, 'Rocket Grunt': 20,
  Sailor: 32, Gentleman: 72, Fisherman: 36, Engineer: 48, Gambler: 72, Pokémaniac: 50, Biker: 20, 'Cue Ball': 24,
  'Bird Keeper': 24, Beauty: 56, Rocker: 24, Channeler: 32, Juggler: 40, Tamer: 40, Psychic: 24, Swimmer: 16,
  Burglar: 36, Scientist: 48, Cooltrainer: 48, 'Black Belt': 24,
};
const TRAINER_NAMES = [
  'Ana', 'Bruno', 'Caio', 'Duda', 'Enzo', 'Fábio', 'Gabi', 'Heitor', 'Iara', 'João', 'Kiko', 'Lara', 'Malu', 'Nina',
  'Otto', 'Paula', 'Rafa', 'Sofia', 'Téo', 'Vitor', 'Yuri', 'Zeca', 'Bia', 'Davi', 'Lucas', 'Manu', 'Pedro', 'Clara',
];

export function transformLevel(region: RegionDef, level: number): number {
  return Math.max(1, Math.min(100, Math.round(region.levelOffset + level * region.levelScale)));
}

/** Hash determinístico de string → uint32 (para conteúdo procedural estável). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mergeSlots(region: RegionDef, area: AreaDef, encounters: Record<string, LocationEncounters>): EncounterSlot[] {
  const merged = new Map<string, EncounterSlot>();
  const methodLocCount = new Map<string, number>();
  for (const loc of area.locations) {
    const data = encounters[loc];
    if (!data) throw new Error(`Área ${area.id}: local "${loc}" não existe em encounters-${region.id}.json`);
    // Normaliza os pesos por método dentro de cada local (cada local contribui igualmente).
    const totals = new Map<string, number>();
    for (const s of data.slots) totals.set(s.method, (totals.get(s.method) ?? 0) + s.weight);
    for (const m of totals.keys()) methodLocCount.set(m, (methodLocCount.get(m) ?? 0) + 1);
    for (const s of data.slots) {
      const key = `${s.species}|${s.method}|${s.time?.join('+') ?? ''}`;
      const w = (s.weight / totals.get(s.method)!) * 100;
      const cur = merged.get(key);
      const min = transformLevel(region, s.min);
      const max = transformLevel(region, s.max);
      if (cur) {
        cur.weight += w;
        cur.min = Math.min(cur.min, min);
        cur.max = Math.max(cur.max, max);
      } else merged.set(key, { ...s, weight: w, min, max });
    }
  }
  const slots = [...merged.values()].map((s) => ({ ...s, weight: s.weight / (methodLocCount.get(s.method) ?? 1) }));
  for (const x of area.extraSlots ?? []) {
    slots.push({
      species: x.species, weight: x.weight, method: x.method ?? 'walk',
      min: transformLevel(region, x.min), max: transformLevel(region, x.max),
    });
  }
  return slots;
}

function buildRouteTrainers(region: RegionDef, area: AreaDef, slots: EncounterSlot[]): TrainerDef[] {
  const count = area.trainers ?? 0;
  if (!count) return [];
  const classes = area.trainerClasses?.length ? area.trainerClasses : ['Youngster'];
  let seed = hashString(area.id);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Sem encontros a pé (ex.: navio, rota marítima): usa os encontros de menor nível como base do time.
  const walk = slots.filter((s) => s.method === 'walk');
  const pool = walk.length ? walk : [...slots].sort((a, b) => a.max - b.max).slice(0, Math.max(2, Math.ceil(slots.length / 3)));
  const maxLevel = area.trainerLevel ? transformLevel(region, area.trainerLevel) : Math.max(...pool.map((s) => s.max));
  const total = pool.reduce((a, s) => a + s.weight, 0);
  const pick = () => {
    let r = rand() * total;
    for (const s of pool) if ((r -= s.weight) <= 0) return s;
    return pool[pool.length - 1];
  };
  const trainers: TrainerDef[] = [];
  for (let i = 0; i < count; i++) {
    const trainerClass = classes[i % classes.length];
    const size = 1 + Math.floor(rand() * 3);
    const team = Array.from({ length: size }, () => {
      const s = pick();
      return { species: s.species, level: Math.min(100, maxLevel + Math.floor(rand() * 3)) };
    });
    trainers.push({
      id: `${area.id}-t${i + 1}`,
      name: TRAINER_NAMES[Math.floor(rand() * TRAINER_NAMES.length)],
      trainerClass,
      moneyPerLevel: CLASS_MONEY[trainerClass] ?? 24,
      team,
    });
  }
  return trainers;
}

export function createGameData(raw: RawData): GameData {
  const species = new Map(raw.species.map((s) => [s.key, s]));
  const moves = new Map(Object.entries(raw.moves));

  const items = new Map<string, ResolvedItem>();
  const genNames = new Map(raw.items.map((i) => [i.id, i.name]));
  for (const def of ITEMS) items.set(def.id, { ...def, name: def.name ?? genNames.get(def.id) ?? def.id });
  for (const g of raw.items) {
    if (items.has(g.id)) continue;
    const stone = EVOLUTION_STONES.has(g.id);
    items.set(g.id, {
      id: g.id, name: g.name, category: 'evolution', effect: { kind: 'evolution' },
      description: stone ? 'Pedra evolutiva: use em um Pokémon compatível.' : 'Item de evolução: segure ou use conforme a espécie.',
      price: stone ? 2100 : 4000, shopBadges: stone ? 4 : 6,
    });
  }

  const areas = new Map<string, ResolvedArea>();
  for (const region of REGIONS) {
    const enc = raw.encounters[region.id] ?? {};
    const n = region.areas.length;
    for (const [idx, area] of region.areas.entries()) {
      const t0 = region.statMult ?? 1;
      const t1 = region.statMultEnd ?? t0;
      if (areas.has(area.id)) throw new Error(`Área duplicada: ${area.id}`);
      const slots = mergeSlots(region, area, enc);
      // Faixa exibida: encontros a pé quando existem (pesca/surf têm níveis bem diferentes).
      const walkSlots = slots.filter((s) => s.method === 'walk');
      const levels = (walkSlots.length ? walkSlots : slots).flatMap((s) => [s.min, s.max]);
      const trainerLevels = [area.gym?.leader, ...(area.league?.members ?? [])]
        .filter(Boolean)
        .flatMap((tr) => tr!.team.map((m) => transformLevel(region, m.level)));
      const all = [...levels, ...trainerLevels];
      const [tl0, tl1] = region.trainerLevels ?? DEFAULT_TRAINER_LEVELS[region.id] ?? [1, 1];
      const trainerLevel = Math.round(n > 1 ? tl0 + ((tl1 - tl0) * idx) / (n - 1) : tl0);
      areas.set(area.id, {
        ...area,
        unlock: toTrainerLevelUnlock(area.unlock, trainerLevel),
        trainerLevel,
        regionId: region.id,
        slots,
        routeTrainers: buildRouteTrainers(region, area, slots),
        levelRange: all.length ? [Math.min(...all), Math.max(...all)] : [1, 1],
        statMult: n > 1 ? t0 + ((t1 - t0) * idx) / (n - 1) : t0,
        xpMult: region.xpMult ?? 1,
        winsMult: region.winsMult ?? 1,
      });
    }
  }

  const chains = new Map<number, string[]>();
  for (const s of raw.species) chains.set(s.chainId, [...(chains.get(s.chainId) ?? []), s.key]);

  return {
    species,
    speciesList: raw.species,
    moves,
    typeChart: raw.types,
    items,
    regions: REGIONS,
    regionById: new Map(REGIONS.map((r) => [r.id, r])),
    areas,
    upgrades: new Map(UPGRADES.map((u) => [u.id, u])),
    milestones: MILESTONES,
    chains,
  };
}

/** Carrega os JSON gerados (em chunks separados no navegador) e cria o GameData. */
export async function loadGameData(): Promise<GameData> {
  const [species, moves, types, items, kanto, johto, hoenn, sinnoh] = await Promise.all([
    import('./generated/species.json'),
    import('./generated/moves.json'),
    import('./generated/types.json'),
    import('./generated/items.json'),
    import('./generated/encounters-kanto.json'),
    import('./generated/encounters-johto.json'),
    import('./generated/encounters-hoenn.json'),
    import('./generated/encounters-sinnoh.json'),
  ]);
  return createGameData({
    species: species.default as unknown as Species[],
    moves: moves.default as unknown as Record<string, Move>,
    types: types.default as unknown as TypeChart,
    items: items.default as GeneratedItem[],
    encounters: {
      kanto: kanto.default as unknown as Record<string, LocationEncounters>,
      johto: johto.default as unknown as Record<string, LocationEncounters>,
      hoenn: hoenn.default as unknown as Record<string, LocationEncounters>,
      sinnoh: sinnoh.default as unknown as Record<string, LocationEncounters>,
    },
  });
}
