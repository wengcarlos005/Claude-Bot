// Arte em pixel da cena de rota: cada bioma tem paleta própria e elementos de cenário desenhados como "mapas de
// caracteres" (1 caractere = 1 pixel) convertidos em SVG. Nada de imagem externa: o cenário pesa poucos KB.
import type { ResolvedArea } from '../../data/registry';

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
function art(rows: string[], ink: Record<string, string>): string {
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
const LAMP = ['.lll.', '.lLl.', '..L..', '..L..', '..L..', '..L..', '.LLL.'];
const SNOWMOUND = ['..hhhh..', '.hhhhhh.', 'hhhhhhhg', 'ghhhhhgg'];
const CRATE = ['GGGGGGGG', 'GHHHHHHG', 'GHDHHDHG', 'GHHDDHHG', 'GHDHHDHG', 'GHHHHHHG', 'GGGGGGGG'];

export interface Decor {
  key: string;
  x: number;
  y: number;
  /** Largura em px na tela. */
  w: number;
  img: string;
  /** Altura relativa à largura (para o aspect-ratio). */
  ratio: number;
}

export interface FieldArt {
  biome: Biome;
  background: string;
  decor: Decor[];
  /** Faixa vertical por onde os Pokémon andam (% da altura). */
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

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function fieldArt(area: ResolvedArea): FieldArt {
  const biome = biomeOf(area);
  const p = PALETTES[biome];
  let seed = hash(area.id);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const tile = art(
    ['aaaaaaaabaaaaaaa', 'aaaaaaaaaaaaaaaa', 'aaasaaaaaaaaaaaa', 'aaaaaaaaaaaasaaa', 'aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa',
      'aaaaaaasaaaaaaaa', 'aaaaaaaaaaaaaaaa', 'abaaaaaaaaaaaaaa', 'aaaaaaaaaaaaabaa', 'aaaaaaaaaaaaaaaa', 'aaaasaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaa', 'aaaaaaaaaasaaaaa', 'aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa'],
    { a: p.ground, b: p.ground2, s: p.speck },
  );
  const layers: string[] = [];
  // Faixa de caminho (terra, calçada ou tapete) por onde a equipe anda.
  const pathY = 58 + Math.round(rand() * 14);
  layers.push(`linear-gradient(to bottom, transparent ${pathY - 9}%, ${p.pathEdge} ${pathY - 9}%, ${p.pathEdge} ${pathY - 8}%, ${p.path} ${pathY - 8}%, ${p.path} ${pathY + 8}%, ${p.pathEdge} ${pathY + 8}%, ${p.pathEdge} ${pathY + 9}%, transparent ${pathY + 9}%)`);
  if (biome === 'beach') layers.unshift(`linear-gradient(to bottom, #4a8fd6 0, #5fa2e3 22%, #9fd0f2 26%, transparent 27%)`);
  if (biome === 'arena') {
    layers.unshift(
      'radial-gradient(ellipse 18% 22% at 50% 62%, transparent 92%, #efe6d0 93%, #efe6d0 97%, transparent 98%)',
      'linear-gradient(to right, transparent 49.6%, #efe6d0 49.6%, #efe6d0 50.4%, transparent 50.4%)',
    );
  }
  if (biome === 'indoor' || biome === 'cave' || biome === 'volcano') layers.unshift(`linear-gradient(to bottom, ${p.ink.D} 0, ${p.ink.G} 16%, transparent 24%)`);
  const background = [...layers, `${tile} 0 0 / 48px 48px`].join(', ');

  const decor: Decor[] = [];
  const add = (rows: string[], x: number, y: number, w: number, key: string) =>
    decor.push({ key, x, y, w, img: art(rows, p.ink), ratio: rows.length / Math.max(...rows.map((r) => r.length)) });

  // Fileira de fundo (árvores, pinheiros, rochas, estalagmites) + elementos espalhados.
  const back = biome === 'grass' || biome === 'forest' || biome === 'town' ? TREE
    : biome === 'snow' ? PINE : biome === 'sand' ? CACTUS : biome === 'cave' || biome === 'volcano' ? STALAG
    : biome === 'indoor' ? CRATE : biome === 'beach' ? null : null;
  if (back) {
    const count = biome === 'forest' ? 11 : biome === 'sand' ? 5 : 8;
    for (let i = 0; i < count; i++) {
      const x = (i + 0.3 + rand() * 0.4) * (100 / count);
      add(back, x, 18 + rand() * 10, back === TREE ? 64 + rand() * 12 : back === CACTUS ? 30 : 44, `b${i}`);
    }
  }
  const scatter: [string[], number][] =
    biome === 'grass' ? [[TUFT, 26], [TUFT, 26], [FLOWER, 12], [FLOWER2, 12], [ROCK, 24]]
    : biome === 'forest' ? [[TUFT, 26], [TUFT, 26], [FLOWER, 12], [ROCK, 24]]
    : biome === 'cave' ? [[ROCK, 26], [CRYSTAL, 18], [ROCK, 20]]
    : biome === 'snow' ? [[SNOWMOUND, 30], [ROCK, 22]]
    : biome === 'sand' ? [[ROCK, 22], [CACTUS, 24]]
    : biome === 'beach' ? [[ROCK, 22], [FLOWER2, 10], [TUFT, 22]]
    : biome === 'volcano' ? [[EMBER, 16], [ROCK, 24]]
    : biome === 'town' ? [[LAMP, 18], [FLOWER, 12], [FLOWER2, 12], [TUFT, 24]]
    : biome === 'indoor' ? [[CRATE, 26]] : [];
  const n = biome === 'arena' ? 0 : 10;
  for (let i = 0; i < n && scatter.length; i++) {
    const [rows, w] = scatter[Math.floor(rand() * scatter.length)];
    let y = 38 + rand() * 56;
    if (Math.abs(y - pathY) < 10) y = y < pathY ? pathY - 12 : pathY + 12;
    add(rows, 3 + rand() * 94, Math.min(97, y), w, `s${i}`);
  }
  return { biome, background, decor, walk: [Math.max(40, pathY - 22), Math.min(94, pathY + 22)] };
}
