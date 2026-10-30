// Arte em pixel da cena de rota: cada bioma tem paleta própria e elementos de cenário desenhados como "mapas de
// caracteres" (1 caractere = 1 pixel) convertidos em SVG. Nada de imagem externa: o cenário pesa poucos KB.
import type { ResolvedArea } from '../../data/registry';
import { Px, hashString as hash, seeded } from '../art/pixel';

export type Biome = 'grass' | 'forest' | 'cave' | 'snow' | 'sand' | 'beach' | 'volcano' | 'town' | 'indoor' | 'arena';

interface Palette {
  ground: string;
  ground2: string;
  speck: string;
  path: string;
  pathEdge: string;
  /** Cor de cada caractere usado nos desenhos. */
  ink: Record<string, string>;
}

const BASE_INK = { T: '#7a5232', t: '#5c3d24', F: '#f6d44f', f: '#ee6a6a', W: '#ffffff' };

const PALETTES: Record<Biome, Palette> = {
  grass: { ground: '#6fb85b', ground2: '#66ad53', speck: '#58a048', path: '#d9c38d', pathEdge: '#c7ad72', ink: { ...BASE_INK, G: '#3f8a3f', H: '#62b153', D: '#2c6732', g: '#3d7f35', h: '#7cc767', R: '#8d8a80', r: '#b9b5aa', d: '#66635b' } },
  forest: { ground: '#4f9447', ground2: '#4a8b42', speck: '#3f7c39', path: '#b9a274', pathEdge: '#a38c5f', ink: { ...BASE_INK, G: '#2f7436', H: '#4b9a48', D: '#1f5229', g: '#2f6b2c', h: '#5ea64f', R: '#7c7a70', r: '#a7a397', d: '#585650' } },
  cave: { ground: '#806e5a', ground2: '#776650', speck: '#6a5a47', path: '#93806a', pathEdge: '#857360', ink: { ...BASE_INK, G: '#5d4f40', H: '#9a8670', D: '#43382d', g: '#6a5a47', h: '#a8957d', R: '#5d4f40', r: '#9a8670', d: '#43382d', C: '#7fd3e6', c: '#c9f1f8' } },
  snow: { ground: '#e9f1f7', ground2: '#dde8f1', speck: '#cad9e6', path: '#cfdbe6', pathEdge: '#bccbd9', ink: { ...BASE_INK, G: '#2f6b55', H: '#f4f8fb', D: '#1f4a3c', g: '#9fb6c8', h: '#ffffff', R: '#9fb3c4', r: '#d3dfe9', d: '#7a8fa1' } },
  sand: { ground: '#e7d08f', ground2: '#ddc47e', speck: '#cdb06a', path: '#d4b977', pathEdge: '#c3a564', ink: { ...BASE_INK, G: '#4f9a52', H: '#79bf72', D: '#356f3a', g: '#b49456', h: '#efd99c', R: '#b9925e', r: '#d8b583', d: '#8f6c41' } },
  beach: { ground: '#ecd9a0', ground2: '#e3cd8e', speck: '#d5bd78', path: '#e3cd8e', pathEdge: '#d5bd78', ink: { ...BASE_INK, G: '#3f8a3f', H: '#62b153', D: '#2c6732', g: '#5fa64f', h: '#7cc767', R: '#a59f92', r: '#cfc9bb', d: '#7a756b' } },
  volcano: { ground: '#6f4c3e', ground2: '#664538', speck: '#5a3c30', path: '#7d5848', pathEdge: '#6e4c3d', ink: { ...BASE_INK, G: '#4a332a', H: '#8a6453', D: '#33231d', g: '#e2662f', h: '#ffb35c', R: '#4a332a', r: '#8a6453', d: '#2d1f19' } },
  town: { ground: '#78bd64', ground2: '#6fb35b', speck: '#62a74f', path: '#cfc7b8', pathEdge: '#bab1a1', ink: { ...BASE_INK, G: '#3f8a3f', H: '#62b153', D: '#2c6732', g: '#3d7f35', h: '#7cc767', R: '#8d8a80', r: '#b9b5aa', d: '#66635b', L: '#3d4a57', l: '#ffe58a' } },
  indoor: { ground: '#bba996', ground2: '#b09e8b', speck: '#a69481', path: '#c9b9a6', pathEdge: '#b6a693', ink: { ...BASE_INK, G: '#7b6656', H: '#a48c78', D: '#5a4a3f', g: '#7b6656', h: '#a48c78', R: '#7b6656', r: '#a48c78', d: '#5a4a3f' } },
  arena: { ground: '#d9c9a5', ground2: '#d1c09a', speck: '#c6b58e', path: '#efe6d0', pathEdge: '#e2d6ba', ink: { ...BASE_INK, G: '#3f8a3f', H: '#62b153', D: '#2c6732', g: '#9c8b6a', h: '#efe6d0', R: '#8d8a80', r: '#b9b5aa', d: '#66635b' } },
};

/** Converte um desenho em caracteres para SVG (data URI). '.' é transparente. */
export function art(rows: string[], ink: Record<string, string>): string {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '.' || !ink[c]) continue;
      let run = 1;
      while (row[x + run] === c) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${ink[c]}"/>`;
      x += run - 1;
    }
  });
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`)}")`;
}

const TREE = [
  '......GGGG......', '....GGHHGGGG....', '...GGHHGGGGGG...', '..GGHHGGGGGGGG..', '..GGHGGGGGGGDG..',
  '.GGGGGGGGGGGDDG.', '.GGHGGGGGGGGDDG.', '.GGGGGGGGGGGDDG.', '..GGGGGGGGGDDG..', '..DGGGGGGGDDDD..',
  '...DDGGGGDDDD...', '....DDDDDDDD....', '......TTtT......', '......TTtT......', '.....TTTttT.....',
];
const PINE = [
  '.......G.......', '......GHG......', '.....GHGGG.....', '....GHHGGGD....', '......GGG......', '....GHGGGGD....',
  '...GHHGGGGDD...', '.....GGGGG.....', '...GHGGGGGGD...', '..GHHGGGGGGDD..', '.GHGGGGGGGGGDD.', '......TtT......', '......TtT......',
];
const TUFT = ['.h...h..', '.g.h.g.h', 'gg.g.gg.', 'gghggggg', 'ggggh.gg', 'gggggggg'];
const ROCK = ['..rrrr..', '.rrRRRR.', 'rrRRRRRd', 'rRRRRRdd', '.RRRddd.'];
const FLOWER = ['.f.', 'fFf', '.f.'];
const FLOWER2 = ['.F.', 'FWF', '.F.'];
const STALAG = ['...h...', '..hR...', '..hRR..', '.hRRR..', '.hRRRd.', 'hRRRRdd', 'RRRRRdd'];
const CRYSTAL = ['..c..', '.cCc.', '.cCC.', 'cCCCd', '.CCd.'];
const CACTUS = ['..GH..', '..GH..', 'H.GH..', 'GHGH.H', '.GGHGH', '..GHG.', '..GH..', '..GD..'];
const EMBER = ['..h..', '.hgh.', 'hgggh', '.ggg.'];
const SNOWMOUND = ['..hhhh..', '.hhhhhh.', 'hhhhhhhg', 'ghhhhhgg'];
const CRATE = ['GGGGGGGG', 'GHHHHHHG', 'GHDHHDHG', 'GHHDDHHG', 'GHDHHDHG', 'GHHHHHHG', 'GGGGGGGG'];

export interface Decor {
  key: string;
  x: number;
  y: number;
  /** Largura em % da largura da cena. */
  w: number;
  img: string;
  /** Altura relativa à largura (para o aspect-ratio). */
  ratio: number;
}

export interface Clearing {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface FieldArt {
  biome: Biome;
  /** Chão em pixel art (data URI). */
  ground: string;
  decor: Decor[];
  /** Clareira onde os Pokémon andam e batalham (% da cena). */
  clearing: Clearing;
  /** Faixa vertical da clareira (compatibilidade). */
  walk: [number, number];
}

export function biomeOf(area: ResolvedArea): Biome {
  const n = area.name.toLowerCase();
  if (area.gym || area.league) return 'arena';
  if (/gelo|ice|neve|snow|nevasca|nevada|icefall|rota 21[67]|mt\. silver/.test(n)) return 'snow';
  if (/ember|ardente|fiery|chimney|irregular|stark|magma|vulc/.test(n)) return 'volcano';
  if (/desert|deserto|rota 111|cânion|canyon/.test(n)) return 'sand';
  if (area.kind === 'cave' || area.tags?.includes('cave')) return 'cave';
  if (area.kind === 'forest' || /floresta|bosque|forest|woods|jardim|arbustos/.test(n)) return 'forest';
  if (area.kind === 'building') return 'indoor';
  if (area.kind === 'city') return 'town';
  if (area.kind === 'water' || /marítima|praia|ilha|porto|cabo|lago|margem/.test(n)) return 'beach';
  return 'grass';
}


const LOG = ['..TTTTTTTTTT..', '.TtTTTTTTTTTt.', 'TtWtTTTTTTTTTt', 'TttTTTTTTTTTTt', '.TtTTTTTTTTTt.', '..tttttttttt..'];
const BUSH = ['...GGGG...', '.GGHHGGGG.', 'GGHHGGGGDG', 'GHGGGFGGDG', 'GGGGGGGDDG', '.GDGGGDDG.', '..DDDDDD..'];

/** Dentro da clareira (elipse em %)? */
export function inClearing(c: Clearing, x: number, y: number, pad = 0): boolean {
  return ((x - c.cx) / (c.rx - pad)) ** 2 + ((y - c.cy) / (c.ry - pad)) ** 2 <= 1;
}

export function fieldArt(area: ResolvedArea): FieldArt {
  const biome = biomeOf(area);
  const p = PALETTES[biome];
  const rand = seeded(hash(area.id));
  const W = 192;
  const H = 108;
  const clearing: Clearing = { cx: 47, cy: 53, rx: 33, ry: 27 };
  const g = new Px(W, H);
  const lighten = biome === 'cave' || biome === 'volcano' || biome === 'indoor' ? p.ground2 : p.path;
  // Chão com ruído; clareira um tom mais claro; bordas mais escuras (sombra das árvores/paredes).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x / W * 100 - clearing.cx) / clearing.rx;
      const dy = (y / H * 100 - clearing.cy) / clearing.ry;
      const d = dx * dx + dy * dy;
      const n = rand();
      let c = n < 0.07 ? p.speck : n < 0.16 ? p.ground2 : p.ground;
      if (d > 1.3) c = n < 0.18 ? p.speck : p.ground2;
      g.set(x, y, c);
    }
  }
  if (biome !== 'arena' && biome !== 'indoor') {
    // Trilha sinuosa atravessando a clareira.
    const phase = rand() * 10;
    for (let x = 0; x < W; x++) {
      const yc = H * 0.6 + Math.sin(x / 19 + phase) * 9 + Math.sin(x / 7) * 1.5;
      for (let k = -4; k <= 4; k++) {
        const c = Math.abs(k) === 4 ? p.pathEdge : rand() < 0.1 ? p.pathEdge : lighten;
        g.set(x, yc + k, c);
      }
    }
  }
  if (biome === 'grass' || biome === 'forest' || biome === 'snow' || biome === 'town') {
    // Lago num canto.
    const right = rand() < 0.5;
    const px0 = right ? W * 0.86 : W * 0.13;
    const py0 = H * 0.86;
    const water = biome === 'snow' ? ['#dff2ff', '#a9d8f5', '#7cc0ea'] : ['#cdeeff', '#5fb0ef', '#3f8fe0'];
    g.ellipse(px0, py0, 19, 9, p.pathEdge);
    g.ellipse(px0, py0, 17, 8, water[2]);
    g.ellipse(px0 - 2, py0 - 1, 13, 5, water[1]);
    for (let i = 0; i < 10; i++) g.set(px0 - 12 + rand() * 24, py0 - 4 + rand() * 7, water[0]);
  }
  if (biome === 'beach') {
    for (let x = 0; x < W; x++) {
      const shore = Math.round(H * 0.2 + Math.sin(x / 13) * 2.5);
      for (let y = 0; y < shore; y++) g.set(x, y, (x + y * 5) % 29 === 0 ? '#a9dcff' : y > shore - 2 ? '#e9f6ff' : y > shore - 4 ? '#79c2f2' : '#3f8fe0');
    }
  }
  if (biome === 'volcano') {
    for (let i = 0; i < 5; i++) {
      const lx = rand() * W, ly = rand() * H;
      if (Math.abs(lx / W * 100 - 50) < 20) continue;
      g.ellipse(lx, ly, 6 + rand() * 6, 3 + rand() * 2, '#c2421f');
      g.ellipse(lx, ly, 3 + rand() * 3, 1 + rand() * 1.5, '#ffb35c');
    }
  }
  if (biome === 'indoor') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x % 12 === 0 || y % 12 === 0) g.set(x, y, p.speck);
  }
  if (biome === 'arena') {
    g.ellipse(W / 2, H * 0.58, 26, 15, '#efe6d0');
    g.ellipse(W / 2, H * 0.58, 24, 13, p.ground);
    g.rect(W / 2, H * 0.12, 1, H * 0.8, '#efe6d0');
    g.rect(W * 0.12, H * 0.12, W * 0.76, 1, '#efe6d0');
    g.rect(W * 0.12, H * 0.92, W * 0.76, 1, '#efe6d0');
  }

  const decor: Decor[] = [];
  const add = (rows: string[], x: number, y: number, w: number, key: string) =>
    decor.push({ key, x, y, w, img: art(rows, p.ink), ratio: rows.length / Math.max(...rows.map((r) => r.length)) });
  const edge = biome === 'grass' || biome === 'forest' || biome === 'town' ? [TREE, BUSH]
    : biome === 'snow' ? [PINE, SNOWMOUND] : biome === 'sand' ? [CACTUS, ROCK] : biome === 'cave' || biome === 'volcano' ? [STALAG, ROCK]
    : biome === 'indoor' ? [CRATE] : biome === 'beach' ? [ROCK, TUFT] : [];
  // Moldura densa fora da clareira.
  const edgeCount = biome === 'forest' ? 70 : biome === 'arena' || biome === 'beach' ? 0 : 52;
  for (let i = 0, tries = 0; i < edgeCount && tries < 900; tries++) {
    const x = rand() * 108 - 4;
    const y = 4 + rand() * 104;
    if (inClearing(clearing, x, y, -4)) continue;
    const rows = edge[i % 4 === 3 && edge[1] ? 1 : 0];
    const w = rows === TREE ? 9 + rand() * 4 : rows === PINE ? 7 + rand() * 3 : rows === STALAG ? 5 + rand() * 2.5 : rows === CACTUS ? 3 : 5 + rand() * 2;
    add(rows, x, y, w, `e${i++}`);
  }
  // Detalhes dentro da clareira (poucos, para não poluir a batalha).
  const inner: [string[], number][] =
    biome === 'grass' || biome === 'town' ? [[TUFT, 2.2], [FLOWER, 1], [FLOWER2, 1], [ROCK, 2], [LOG, 4]]
    : biome === 'forest' ? [[TUFT, 2.2], [FLOWER, 1], [LOG, 4.2], [ROCK, 2]]
    : biome === 'cave' ? [[ROCK, 2.2], [CRYSTAL, 1.6]]
    : biome === 'snow' ? [[SNOWMOUND, 2.6], [ROCK, 2]]
    : biome === 'sand' ? [[ROCK, 2], [CACTUS, 2.2]]
    : biome === 'beach' ? [[ROCK, 2], [FLOWER2, 1], [TUFT, 2]]
    : biome === 'volcano' ? [[EMBER, 1.4], [ROCK, 2]]
    : biome === 'indoor' ? [[CRATE, 2.4]] : [];
  for (let i = 0; i < (inner.length ? 14 : 0); i++) {
    const [rows, w] = inner[Math.floor(rand() * inner.length)];
    const a = rand() * Math.PI * 2;
    const k = 0.35 + rand() * 0.7;
    add(rows, clearing.cx + Math.cos(a) * clearing.rx * k, clearing.cy + Math.sin(a) * clearing.ry * k, w, `i${i}`);
  }
  return {
    biome, ground: g.uri(), decor, clearing,
    walk: [clearing.cy - clearing.ry * 0.8, clearing.cy + clearing.ry * 0.85],
  };
}
