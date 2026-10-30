/**
 * Liga cada área do jogo a um mapa real dos jogos de GBA (decompilações pret: pokefirered e pokeemerald).
 * Kanto → FireRed/LeafGreen, Hoenn → Emerald; o resto usa um mapa do mesmo tipo (floresta, caverna, água…).
 * Uso:
 *   curl -s https://raw.githubusercontent.com/pret/pokefirered/master/data/layouts/layouts.json > /tmp/frlg.json
 *   curl -s https://raw.githubusercontent.com/pret/pokeemerald/master/data/layouts/layouts.json > /tmp/em.json
 *   curl -s https://raw.githubusercontent.com/pret/pokefirered/master/src/data/tilesets/graphics.h > /tmp/frlg.h
 *   curl -s https://raw.githubusercontent.com/pret/pokeemerald/master/src/data/tilesets/graphics.h > /tmp/em.h
 *   (mapas: data/maps/<Mapa>/map.json de cada jogo, resumidos em uma pasta por jogo, um <Mapa>.json por mapa)
 *   npm run build:maplinks -- /tmp/frlg.json /tmp/em.json /tmp/frlg.h /tmp/em.h /tmp/maps-frlg /tmp/maps-em
 * Gera src/data/generated/maplinks.json: { areas: { [areaId]: layoutKey }, layouts: { [layoutKey]: arquivos e medidas } }.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { loadGameData, type ResolvedArea } from '../src/data/registry';

type Game = 'frlg' | 'emerald';
interface RawLayout { name?: string; width: number; height: number; border_width?: number; border_height?: number; primary_tileset: string; secondary_tileset: string; border_filepath: string; blockdata_filepath: string }
interface Layout { name: string; width: number; height: number; game: Game; tokens: string[]; raw: RawLayout }

const read = (p: string, game: Game): Layout[] =>
  (JSON.parse(readFileSync(p, 'utf8')).layouts as RawLayout[])
    .filter((l) => l.name)
    .map((l) => {
      const name = l.name!.replace(/_Layout$/, '');
      return { name, width: l.width, height: l.height, game, tokens: layoutTokens(name), raw: l };
    });

/** Pasta de cada tileset (gTileset_X → data/tilesets/…/x), lida do graphics.h de cada jogo. */
function tilesetDirs(p: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of readFileSync(p, 'utf8').matchAll(/gTilesetTiles_(\w+)\[\]\s*=\s*INC\w+\("([^"]+)\/tiles\.(?:png|4bpp)/g)) out.set(`gTileset_${m[1]}`, m[2]);
  return out;
}
const snake = (n: string) => n.replace(/(?<!^)(?=[A-Z0-9])/g, '_').toLowerCase().replace(/__/g, '_');
function dirOf(dirs: Map<string, string>, sym: string, secondary: boolean): string {
  return dirs.get(sym) ?? `data/tilesets/${secondary ? 'secondary' : 'primary'}/${snake(sym.replace('gTileset_', ''))}`;
}

function layoutTokens(name: string): string[] {
  return name
    .split('_')
    .flatMap((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([a-zA-Z])(\d)/g, '$1$2').split(' '))
    .map((t) => t.toLowerCase())
    .map((t) => (/^(route|room)\d+$/.test(t) ? t : t));
}

const DIR: Record<string, string> = { sw: 'southwest', se: 'southeast', ne: 'northeast', nw: 'northwest', middle: 'center' };
function locTokens(loc: string): string[] {
  const raw = loc.replace(/^(kanto|johto|hoenn|sinnoh)-/, '').replace(/(north|south|east|west)-towards-.*/, '').split(/[-/]/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    if ((t === 'route' || t === 'room') && /^\d+$/.test(raw[i + 1] ?? '')) {
      out.push(t + raw[++i]);
      continue;
    }
    if (t === 'sea' || t === 'area' || t === 'bike' || /^\d+$/.test(t) || t.length === 1) continue;
    if (t === 'nwmach') { out.push('northwest'); continue; }
    if (t === 'neacro') { out.push('northeast'); continue; }
    out.push(DIR[t] ?? t);
  }
  return out;
}

function best(tokens: string[], pool: Layout[]): Layout | null {
  if (!tokens.length) return null;
  const hits = pool.filter((l) => tokens.every((t) => l.tokens.includes(t)));
  return hits.sort((a, b) => a.tokens.length - b.tokens.length || a.name.length - b.name.length)[0] ?? null;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const [frlgPath, emPath, frlgH, emH, frlgMaps, emMaps] = process.argv.slice(2);
if (!frlgPath || !emPath || !frlgH || !emH || !frlgMaps || !emMaps) throw new Error('uso: npm run build:maplinks -- <frlg layouts.json> <em layouts.json> <frlg graphics.h> <em graphics.h>');
const DIRS: Record<Game, Map<string, string>> = { frlg: tilesetDirs(frlgH), emerald: tilesetDirs(emH) };
const FRLG = read(frlgPath, 'frlg');
const EM = read(emPath, 'emerald');
const byName = (game: Game, name: string) => (game === 'frlg' ? FRLG : EM).find((l) => l.name === name);
const pick = (names: [Game, string][], key: string): Layout => {
  const list = names.map(([g, n]) => byName(g, n)).filter((x): x is Layout => !!x);
  return list[hash(key) % list.length];
};
const range = (game: Game, prefix: string, nums: number[]) => nums.map((n): [Game, string] => [game, `${prefix}${n}`]);
const POOLS: Record<string, [Game, string][]> = {
  route: [...range('frlg', 'Route', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25]), ...range('emerald', 'Route', [101, 102, 103, 104, 110, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 123])],
  forest: [['frlg', 'ViridianForest'], ['emerald', 'PetalburgWoods'], ['frlg', 'ThreeIsland_BerryForest'], ['frlg', 'SixIsland_PatternBush']],
  cave: [['frlg', 'MtMoon_1F'], ['frlg', 'MtMoon_B2F'], ['frlg', 'RockTunnel_1F'], ['frlg', 'RockTunnel_B1F'], ['frlg', 'CeruleanCave_1F'], ['frlg', 'DiglettsCave_B1F'], ['frlg', 'VictoryRoad_1F'], ['emerald', 'GraniteCave_1F'], ['emerald', 'MeteorFalls_1F_1R'], ['emerald', 'RusturfTunnel'], ['emerald', 'VictoryRoad_B1F'], ['emerald', 'CaveOfOrigin_1F']],
  water: [...range('frlg', 'Route', [19, 20]), ['frlg', 'Route21_North'], ...range('emerald', 'Route', [105, 106, 107, 108, 109, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134])],
  city: [['frlg', 'PalletTown'], ['frlg', 'ViridianCity'], ['frlg', 'PewterCity'], ['frlg', 'CeruleanCity'], ['frlg', 'VermilionCity'], ['frlg', 'LavenderTown'], ['frlg', 'CeladonCity'], ['frlg', 'FuchsiaCity'], ['emerald', 'OldaleTown'], ['emerald', 'PetalburgCity'], ['emerald', 'RustboroCity'], ['emerald', 'FallarborTown'], ['emerald', 'FortreeCity'], ['emerald', 'LilycoveCity']],
  building: [['frlg', 'PokemonTower_3F'], ['frlg', 'PokemonMansion_1F'], ['frlg', 'PowerPlant'], ['frlg', 'SilphCo_1F'], ['emerald', 'AbandonedShip_Deck'], ['emerald', 'MtPyre_1F'], ['emerald', 'NewMauville_Inside']],
  snow: [['frlg', 'FourIsland_IcefallCave_1F'], ['frlg', 'FourIsland_IcefallCave_B1F'], ['frlg', 'FourIsland_IcefallCave_Back']],
  sand: [['emerald', 'Route111'], ['emerald', 'DesertUnderpass'], ['frlg', 'SevenIsland_SevaultCanyon']],
  volcano: [['emerald', 'FieryPath'], ['emerald', 'MtChimney'], ['emerald', 'JaggedPass'], ['emerald', 'MagmaHideout_1F'], ['frlg', 'MtEmber_RubyPath_1F']],
  gym: [['frlg', 'PewterCity_Gym'], ['frlg', 'CeruleanCity_Gym'], ['frlg', 'VermilionCity_Gym'], ['frlg', 'CeladonCity_Gym'], ['frlg', 'FuchsiaCity_Gym'], ['frlg', 'SaffronCity_Gym'], ['frlg', 'CinnabarIsland_Gym'], ['frlg', 'ViridianCity_Gym'], ['emerald', 'RustboroCity_Gym'], ['emerald', 'DewfordTown_Gym'], ['emerald', 'MauvilleCity_Gym'], ['emerald', 'LavaridgeTown_Gym_1F'], ['emerald', 'PetalburgCity_Gym'], ['emerald', 'FortreeCity_Gym'], ['emerald', 'MossdeepCity_Gym'], ['emerald', 'SootopolisCity_Gym_1F']],
  league: [['frlg', 'PokemonLeague_ChampionsRoom'], ['emerald', 'EverGrandeCity_ChampionsRoom']],
};
/** Casos que o casamento por nome não resolve. */
const SPECIAL: Record<string, [Game, string]> = {
  'kanto-route-21': ['frlg', 'Route21_North'],
  'kanto-ss-anne': ['frlg', 'SSAnne_Deck'],
  'five-isle-meadow': ['frlg', 'FiveIsland_Meadow'],
  'viapos-chamber': ['frlg', 'SevenIsland_TanobyRuins_ViapoisChamber'],
  'digletts-cave': ['frlg', 'DiglettsCave_B1F'],
  'vermilion-city/ss-anne-dock': ['frlg', 'SSAnne_Exterior'],
  'mt-ember': ['frlg', 'MtEmber_Exterior'],
  'mt-ember/inside': ['frlg', 'MtEmber_SummitPath_1F'],
  'mt-ember/cave': ['frlg', 'MtEmber_RubyPath_1F'],
  'mt-ember/1f-cave-behind-team-rocket': ['frlg', 'MtEmber_RubyPath_1F'],
  'mt-ember/b1f': ['frlg', 'MtEmber_RubyPath_B1F'],
  'mt-ember/b2f': ['frlg', 'MtEmber_RubyPath_B2F'],
  'mt-ember/b3f': ['frlg', 'MtEmber_RubyPath_B3F'],
  'three-isle-port': ['frlg', 'ThreeIsland_Port'],
  'canyon-entrance': ['frlg', 'SevenIsland_SevaultCanyon_Entrance'],
  'lost-cave/item-rooms': ['frlg', 'FiveIsland_LostCave_Room10'],
  'hoenn-altering-cave': ['emerald', 'AlteringCave'],
  'shoal-cave/low-tide': ['emerald', 'ShoalCave_LowTideEntranceRoom'],
  'shoal-cave/high-tide': ['emerald', 'ShoalCave_HighTideEntranceRoom'],
  'shoal-cave/b1f': ['emerald', 'ShoalCave_LowTideLowerRoom'],
  'shoal-cave/b2f': ['emerald', 'ShoalCave_LowTideIceRoom'],
  'shoal-cave/b3f': ['emerald', 'ShoalCave_LowTideInnerRoom'],
  'meteor-falls': ['emerald', 'MeteorFalls_1F_1R'],
  'meteor-falls/b1f': ['emerald', 'MeteorFalls_B1F_1R'],
  'meteor-falls/back': ['emerald', 'MeteorFalls_1F_2R'],
  'meteor-falls/backsmall-room': ['emerald', 'MeteorFalls_B1F_2R'],
  'granite-cave/1fsmall-room': ['emerald', 'GraniteCave_StevensRoom'],
  'new-mauville': ['emerald', 'NewMauville_Inside'],
  'mt-pyre/outside': ['emerald', 'MtPyre_Exterior'],
  'cave-of-origin/b2f': ['emerald', 'CaveOfOrigin_B1F'],
  'cave-of-origin/b3f': ['emerald', 'CaveOfOrigin_B1F'],
  'seafloor-cavern': ['emerald', 'SeafloorCavern_Entrance'],
  'mirage-island': ['emerald', 'Route130_MirageIsland'],
  'abandoned-ship': ['emerald', 'AbandonedShip_Deck'],
  'artisan-cave': ['emerald', 'ArtisanCave_1F'],
  'magma-hideout': ['emerald', 'MagmaHideout_1F'],
  'mirage-tower': ['emerald', 'MirageTower_1F'],
};

function kindPool(a: ResolvedArea): string {
  const n = a.name.toLowerCase();
  if (a.league) return 'league';
  if (a.gym) return 'gym';
  if (/gelo|ice|neve|snow|nevasca|nevada|icefall/.test(n)) return 'snow';
  if (/deserto|desert|cânion|canyon/.test(n)) return 'sand';
  if (/ember|ardente|fiery|chimney|irregular|stark|magma|vulc/.test(n)) return 'volcano';
  if (a.kind === 'cave' || a.tags?.includes('cave')) return 'cave';
  if (a.kind === 'forest') return 'forest';
  if (a.kind === 'water') return 'water';
  if (a.kind === 'city') return 'city';
  if (a.kind === 'building') return 'building';
  return 'route';
}

const data = await loadGameData();
const areas: Record<string, string> = {};
const layouts: Record<string, { w: number; h: number; map: string; border: string; bw: number; bh: number; primary: string; secondary: string }> = {};
const stats = { exact: 0, fallback: 0 };
const exactOf: Record<string, boolean> = {};
/** Mapas extras usados pela UI (cidade do Hub). */
const EXTRA: [Game, string][] = [['frlg', 'CeladonCity'], ['frlg', 'ViridianCity'], ['frlg', 'SaffronCity'], ['frlg', 'PalletTown'], ['emerald', 'LilycoveCity']];
const keep = (hit: Layout) => {
  const key = `${hit.game}:${hit.name}`;
  if (!layouts[key]) {
    const r = hit.raw;
    layouts[key] = {
      w: r.width, h: r.height, map: r.blockdata_filepath, border: r.border_filepath, bw: r.border_width ?? 2, bh: r.border_height ?? 2,
      primary: dirOf(DIRS[hit.game], r.primary_tileset, false), secondary: dirOf(DIRS[hit.game], r.secondary_tileset, true),
    };
  }
  return key;
};
for (const [g, n] of EXTRA) keep(byName(g, n)!);
for (const a of data.areas.values()) {
  const pool = a.regionId === 'hoenn' ? [...EM, ...FRLG] : [...FRLG, ...EM];
  let hit: Layout | null = null;
  const loc = a.locations[0];
  const special = SPECIAL[a.id] ?? (loc ? SPECIAL[loc] : undefined);
  if (special) hit = byName(...special) ?? null;
  if (!hit && a.gym) {
    const city = a.id.replace(/^(kanto|johto|hoenn|sinnoh)-/, '').replace(/-gym$/, '').split('-');
    hit = best([...city, 'gym'], pool.filter((l) => l.game === (a.regionId === 'hoenn' ? 'emerald' : 'frlg') || a.regionId === 'kanto'));
  }
  if (!hit && loc && (a.regionId === 'kanto' || a.regionId === 'hoenn' || /^kanto-|^(cerulean|seafoam|rock|mt-moon|digletts|viridian|pallet|vermilion|celadon|fuchsia|cinnabar)/.test(loc))) {
    const game: Game = a.regionId === 'hoenn' ? 'emerald' : 'frlg';
    const same = pool.filter((l) => l.game === game);
    hit = best(locTokens(loc), same) ?? best(locTokens(loc.split('/')[0]), same);
  }
  const exact = !!hit;
  if (!hit) hit = pick(POOLS[kindPool(a)], a.id);
  if (!hit) throw new Error(`sem mapa para ${a.id}`);
  stats[exact ? 'exact' : 'fallback']++;
  exactOf[a.id] = exact;
  areas[a.id] = keep(hit);
}
// ---------------------------------------------------------------- mundo: mapas externos montados pelas conexões
interface MapJson { id: string; name: string; layout: string; map_type: string; connections: { map: string; offset: number; direction: string }[] | null; warps: { x: number; y: number; dest: string }[] }
function buildWorld(game: Game, dir: string, root: string, region: string) {
  const maps = new Map<string, MapJson>();
  for (const f of readdirSync(dir)) {
    const m = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as MapJson;
    maps.set(m.id, m);
  }
  const lay = new Map((game === 'frlg' ? FRLG : EM).map((l) => [(l.raw as unknown as { id: string }).id, l]));
  const size = (m: MapJson) => lay.get(m.layout)!;
  const pos = new Map<string, { x: number; y: number }>();
  const rootMap = [...maps.values()].find((m) => m.name === root)!;
  pos.set(rootMap.id, { x: 0, y: 0 });
  const queue = [rootMap.id];
  while (queue.length) {
    const id = queue.shift()!;
    const a = maps.get(id)!;
    const pa = pos.get(id)!;
    for (const c of a.connections ?? []) {
      const b = maps.get(c.map);
      if (!b || pos.has(b.id) || !lay.get(b.layout)) continue;
      const sa = size(a), sb = size(b);
      const p = c.direction === 'up' ? { x: pa.x + c.offset, y: pa.y - sb.height }
        : c.direction === 'down' ? { x: pa.x + c.offset, y: pa.y + sa.height }
        : c.direction === 'left' ? { x: pa.x - sb.width, y: pa.y + c.offset }
        : c.direction === 'right' ? { x: pa.x + sa.width, y: pa.y + c.offset } : null;
      if (!p) continue;
      pos.set(b.id, p);
      queue.push(b.id);
    }
  }
  const outdoor = [...pos.keys()];
  const minX = Math.min(...outdoor.map((id) => pos.get(id)!.x)), minY = Math.min(...outdoor.map((id) => pos.get(id)!.y));
  const maxX = Math.max(...outdoor.map((id) => pos.get(id)!.x + size(maps.get(id)!).width));
  const maxY = Math.max(...outdoor.map((id) => pos.get(id)!.y + size(maps.get(id)!).height));
  // Âncora de cada mapa no mundo: centro (externos) ou a porta que leva até ele (cavernas, prédios, andares).
  const anchor = new Map<string, { x: number; y: number }>();
  for (const id of outdoor) {
    const p = pos.get(id)!, sz = size(maps.get(id)!);
    anchor.set(id, { x: p.x - minX + sz.width / 2, y: p.y - minY + sz.height / 2 });
  }
  const wq = [...outdoor];
  while (wq.length) {
    const id = wq.shift()!;
    const m = maps.get(id)!;
    for (const w of m.warps) {
      if (anchor.has(w.dest) || !maps.has(w.dest)) continue;
      const base = pos.get(id);
      anchor.set(w.dest, base ? { x: base.x - minX + w.x, y: base.y - minY + w.y } : anchor.get(id)!);
      wq.push(w.dest);
    }
  }
  const world = {
    game, w: maxX - minX, h: maxY - minY,
    maps: outdoor.map((id) => {
      const m = maps.get(id)!;
      const l = size(m);
      return { key: keep(l), x: pos.get(id)!.x - minX, y: pos.get(id)!.y - minY };
    }),
  };
  // Posição de cada área da região: o mapa cujo layout ela usa.
  const byLayout = new Map<string, string[]>();
  for (const m of maps.values()) {
    const l = lay.get(m.layout);
    if (l) byLayout.set(`${game}:${l.name}`, [...(byLayout.get(`${game}:${l.name}`) ?? []), m.id]);
  }
  const at: Record<string, [number, number]> = {};
  for (const a of data.areas.values()) {
    if (a.regionId !== region || !exactOf[a.id]) continue;
    const ids = byLayout.get(areas[a.id]) ?? [];
    const p = ids.map((id) => anchor.get(id)).find(Boolean);
    if (p) at[a.id] = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  }
  return { world, at };
}
const kanto = buildWorld('frlg', frlgMaps, 'PalletTown', 'kanto');
const hoenn = buildWorld('emerald', emMaps, 'LittlerootTown', 'hoenn');
const worlds = { kanto: kanto.world, hoenn: hoenn.world };
const pos = { ...kanto.at, ...hoenn.at };
for (const [r, w] of Object.entries(worlds)) console.log(`mundo ${r}: ${w.maps.length} mapas, ${w.w}×${w.h} blocos`);
console.log(`posições no mundo: ${Object.keys(pos).length} áreas`);
writeFileSync('src/data/generated/maplinks.json', JSON.stringify({ areas, layouts, worlds, pos }));
const byRegion = (r: string) => [...data.areas.values()].filter((a) => a.regionId === r).map((a) => `${a.id}=${areas[a.id]}${exactOf[a.id] ? '' : '*'}`);
if (process.env.VERBOSE) for (const r of ['kanto', 'hoenn']) console.log(r, byRegion(r).join(' '));
console.log(`✔ maplinks.json: ${stats.exact} áreas por nome, ${stats.fallback} por tipo, ${Object.keys(layouts).length} mapas`);
