// Renderiza mapas reais de Pokémon FireRed/LeafGreen e Emerald a partir das decompilações da pret (pokefirered,
// pokeemerald), baixando os arquivos originais (tiles PNG indexados de 4 bpp, paletas JASC, metatiles e mapas)
// por CDN no navegador — nada disso é versionado aqui, do mesmo jeito que os sprites dos Pokémon.
import { get as idbGet, set as idbSet } from 'idb-keyval';
import maplinks from '../data/generated/maplinks.json';

export type Game = 'frlg' | 'emerald';
// jsDelivr primeiro (CDN com cache); o pokeemerald passa do limite de tamanho do jsDelivr, então vai direto ao GitHub.
const CDN: Record<Game, string[]> = {
  frlg: ['https://cdn.jsdelivr.net/gh/pret/pokefirered@master/', 'https://raw.githubusercontent.com/pret/pokefirered/master/'],
  emerald: ['https://raw.githubusercontent.com/pret/pokeemerald/master/'],
};
async function fetchAny(game: Game, path: string): Promise<Response> {
  let last: Error | null = null;
  for (const base of CDN[game]) {
    try {
      const r = await fetch(base + path);
      if (r.ok) return r;
      last = new Error(`${r.status} ${path}`);
    } catch (e) {
      last = e as Error;
    }
  }
  throw last ?? new Error(path);
}
const CFG: Record<Game, { tiles: number; metas: number; pals: number; attrBytes: 2 | 4 }> = {
  frlg: { tiles: 640, metas: 640, pals: 7, attrBytes: 4 },
  emerald: { tiles: 512, metas: 512, pals: 6, attrBytes: 2 },
};

interface LayoutInfo { w: number; h: number; map: string; border: string; bw: number; bh: number; primary: string; secondary: string }
interface WorldInfo { game: Game; w: number; h: number; maps: { key: string; x: number; y: number }[] }
const LINKS = maplinks as unknown as {
  areas: Record<string, string>;
  layouts: Record<string, LayoutInfo>;
  worlds: Record<string, WorldInfo>;
  pos: Record<string, [number, number]>;
};

/** Posição (em blocos) da área no mundo real da região, se houver. */
export function worldPos(areaId: string): [number, number] | null {
  return LINKS.pos[areaId] ?? null;
}
export function hasWorld(regionId: string): boolean {
  return !!LINKS.worlds[regionId];
}

export function layoutKeyForArea(areaId: string): string | null {
  return LINKS.areas[areaId] ?? null;
}

/** Comportamento de metatile (MB_*): o que a UI precisa saber de cada célula 16×16. */
export const enum Cell {
  Blocked = 0,
  Walk = 1,
  Grass = 2,
  Water = 3,
}

export interface RenderedMap {
  key: string;
  /** Largura/altura em blocos de 16 px (já com a moldura de borda). */
  w: number;
  h: number;
  /** Deslocamento do mapa original dentro da moldura (em blocos). */
  pad: number;
  base: HTMLCanvasElement;
  over: HTMLCanvasElement;
  cells: Uint8Array;
}

// ---------------------------------------------------------------- downloads com cache

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, f: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = f();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}
const bin = (game: Game, path: string) => once(`${game}:${path}`, async () => new Uint8Array(await (await fetchAny(game, path)).arrayBuffer()));
const text = (game: Game, path: string) => once(`${game}:${path}:t`, async () => (await fetchAny(game, path)).text());

// ---------------------------------------------------------------- PNG indexado (4/8 bpp)

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Decodifica um PNG paletizado devolvendo os ÍNDICES de cor (não as cores) — é o que os tiles do GBA precisam. */
export async function decodeIndexedPng(buf: Uint8Array): Promise<{ w: number; h: number; px: Uint8Array }> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = 8;
  let w = 0, h = 0, depth = 0, type = 0;
  const idat: Uint8Array[] = [];
  while (off < buf.length) {
    const len = dv.getUint32(off);
    const kind = String.fromCharCode(...buf.subarray(off + 4, off + 8));
    const body = buf.subarray(off + 8, off + 8 + len);
    if (kind === 'IHDR') {
      const b = new DataView(body.buffer, body.byteOffset, body.byteLength);
      w = b.getUint32(0); h = b.getUint32(4); depth = body[8]; type = body[9];
    } else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    off += 12 + len;
  }
  if (type !== 3 && type !== 0) throw new Error(`PNG não indexado (tipo ${type})`);
  const all = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of idat) { all.set(c, o); o += c.length; }
  const raw = await inflate(all);
  const stride = Math.ceil((w * depth) / 8);
  const rows = new Uint8Array(stride * h);
  const prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride);
    const up = y ? rows.subarray((y - 1) * stride, y * stride) : prev;
    for (let x = 0; x < stride; x++) {
      const a = x ? out[x - 1] : 0, b = up[x], c = x ? up[x - 1] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = v & 0xff;
    }
  }
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (depth === 8) px[y * w + x] = rows[y * stride + x];
      else if (depth === 4) { const byte = rows[y * stride + (x >> 1)]; px[y * w + x] = x & 1 ? byte & 15 : byte >> 4; }
      else if (depth === 2) { const byte = rows[y * stride + (x >> 2)]; px[y * w + x] = (byte >> (6 - (x & 3) * 2)) & 3; }
      else { const byte = rows[y * stride + (x >> 3)]; px[y * w + x] = (byte >> (7 - (x & 7))) & 1; }
    }
  }
  return { w, h, px };
}

// ---------------------------------------------------------------- tilesets

interface Tileset { tiles: { w: number; h: number; px: Uint8Array }; metas: Uint16Array; attrs: Uint32Array }

function loadTileset(game: Game, dir: string): Promise<Tileset> {
  return once(`ts:${game}:${dir}`, async () => {
    const [png, metas, attrs] = await Promise.all([bin(game, `${dir}/tiles.png`), bin(game, `${dir}/metatiles.bin`), bin(game, `${dir}/metatile_attributes.bin`)]);
    const tiles = await decodeIndexedPng(png);
    const m = new Uint16Array(metas.buffer.slice(metas.byteOffset, metas.byteOffset + (metas.byteLength & ~1)));
    const a = CFG[game].attrBytes === 4
      ? new Uint32Array(attrs.buffer.slice(attrs.byteOffset, attrs.byteOffset + (attrs.byteLength & ~3)))
      : Uint32Array.from(new Uint16Array(attrs.buffer.slice(attrs.byteOffset, attrs.byteOffset + (attrs.byteLength & ~1))));
    return { tiles, metas: m, attrs: a };
  });
}

async function loadPalettes(game: Game, primary: string, secondary: string): Promise<number[][][]> {
  const n = CFG[game].pals;
  const parse = (t: string) => t.trim().split(/\r?\n/).slice(3, 19).map((l) => l.trim().split(/\s+/).map(Number));
  const black = Array.from({ length: 16 }, () => [0, 0, 0]);
  const get = (dir: string, i: number) => text(game, `${dir}/palettes/${String(i).padStart(2, '0')}.pal`).then(parse).catch(() => black);
  return Promise.all(Array.from({ length: 13 }, (_, i) => get(i < n ? primary : secondary, i)));
}

// ---------------------------------------------------------------- comportamento das células

function behaviorOf(game: Game, attr: number): number {
  return game === 'frlg' ? attr & 0x1ff : attr & 0xff;
}
/** Tipo de camada: 0 normal (camada de cima acima dos sprites), 1 coberta (tudo abaixo), 2 dividida. */
function layerTypeOf(game: Game, attr: number): number {
  return game === 'frlg' ? (attr >>> 29) & 3 : (attr >>> 12) & 0xf;
}
function cellOf(behavior: number, collision: number): Cell {
  if (behavior === 0x02 || behavior === 0x03) return Cell.Grass; // MB_TALL_GRASS / MB_LONG_GRASS
  if (behavior >= 0x10 && behavior <= 0x1b) return Cell.Water; // água/mar (superfície)
  return collision === 0 ? Cell.Walk : Cell.Blocked;
}

// ---------------------------------------------------------------- mapa

/** Renderiza o mapa (com moldura de `pad` blocos usando o padrão de borda do próprio mapa). */
export function renderLayout(key: string, pad = 10, keep = true): Promise<RenderedMap> {
  const job = async (): Promise<RenderedMap> => {
    const info = LINKS.layouts[key];
    if (!info) throw new Error(`mapa desconhecido: ${key}`);
    const game = key.split(':')[0] as Game;
    const cfg = CFG[game];
    const [p, s, pals, mapBin, borderBin] = await Promise.all([
      loadTileset(game, info.primary), loadTileset(game, info.secondary), loadPalettes(game, info.primary, info.secondary),
      bin(game, info.map), bin(game, info.border),
    ]);
    const blocks = new Uint16Array(mapBin.buffer.slice(mapBin.byteOffset, mapBin.byteOffset + info.w * info.h * 2));
    const border = new Uint16Array(borderBin.buffer.slice(borderBin.byteOffset, borderBin.byteOffset + info.bw * info.bh * 2));
    const W = info.w + pad * 2;
    const H = info.h + pad * 2;
    const rgba = (c: number[]) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    const palRGBA = pals.map((pal) => pal.map(rgba));
    const base = new Uint32Array(W * 16 * H * 16);
    const over = new Uint32Array(W * 16 * H * 16);
    const cells = new Uint8Array(W * H);

    const tilePx = (t: number): Uint8Array | null => {
      const set = t < cfg.tiles ? p.tiles : s.tiles;
      const i = t < cfg.tiles ? t : t - cfg.tiles;
      const tx = (i % (set.w / 8)) * 8, ty = Math.floor(i / (set.w / 8)) * 8;
      if (ty >= set.h) return null;
      const out = new Uint8Array(64);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[y * 8 + x] = set.px[(ty + y) * set.w + tx + x];
      return out;
    };
    const tcache = new Map<number, Uint8Array | null>();
    const drawTile = (dst: Uint32Array, ref: number, ox: number, oy: number, opaque: boolean) => {
      const t = ref & 0x3ff, hf = (ref >> 10) & 1, vf = (ref >> 11) & 1, pal = palRGBA[ref >> 12] ?? palRGBA[0];
      let px = tcache.get(t);
      if (px === undefined) tcache.set(t, (px = tilePx(t)));
      if (!px) return;
      const stride = W * 16;
      for (let y = 0; y < 8; y++) {
        const sy = vf ? 7 - y : y;
        for (let x = 0; x < 8; x++) {
          const c = px[sy * 8 + (hf ? 7 - x : x)];
          if (c === 0 && !opaque) continue;
          dst[(oy + y) * stride + ox + x] = pal[c];
        }
      }
    };
    const metaOf = (id: number) => {
      const primary = id < cfg.metas;
      const set = primary ? p : s;
      const i = primary ? id : id - cfg.metas;
      return { refs: set.metas.subarray(i * 8, i * 8 + 8), attr: set.attrs[i] ?? 0 };
    };
    for (let by = 0; by < H; by++) {
      for (let bx = 0; bx < W; bx++) {
        const mx = bx - pad, my = by - pad;
        const inside = mx >= 0 && my >= 0 && mx < info.w && my < info.h;
        const block = inside ? blocks[my * info.w + mx] : border[(((my % info.bh) + info.bh) % info.bh) * info.bw + (((mx % info.bw) + info.bw) % info.bw)];
        const { refs, attr } = metaOf(block & 0x3ff);
        if (refs.length < 8) continue;
        const layer = layerTypeOf(game, attr);
        for (let k = 0; k < 4; k++) drawTile(base, refs[k], bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, true);
        for (let k = 0; k < 4; k++) drawTile(layer === 1 ? base : over, refs[4 + k], bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, false);
        cells[by * W + bx] = inside ? cellOf(behaviorOf(game, attr), (block >> 10) & 3) : Cell.Blocked;
      }
    }
    const toCanvas = (data: Uint32Array) => {
      const c = document.createElement('canvas');
      c.width = W * 16;
      c.height = H * 16;
      c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data.buffer as ArrayBuffer), W * 16, H * 16), 0, 0);
      return c;
    };
    return { key, w: W, h: H, pad, base: toCanvas(base), over: toCanvas(over), cells };
  };
  return keep ? once(`map:${key}:${pad}`, job) : job();
}

export interface RenderedWorld {
  url: string;
  /** Tamanho do mundo em blocos. */
  w: number;
  h: number;
}

/** Monta o mundo da região (mapas externos encaixados pelas conexões do jogo) numa imagem reduzida. */
export function renderWorld(regionId: string, onProgress?: (done: number, total: number) => void): Promise<RenderedWorld> {
  return once(`world:${regionId}`, async () => {
    const info = LINKS.worlds[regionId];
    if (!info) throw new Error(`sem mundo para ${regionId}`);
    // Montar o mundo baixa dezenas de mapas: o resultado fica guardado no navegador para as próximas visitas.
    const cacheKey = `pkidle:world:${regionId}:v1`;
    try {
      const saved = await idbGet<Blob>(cacheKey);
      if (saved) return { url: URL.createObjectURL(saved), w: info.w, h: info.h };
    } catch {
      /* sem IndexedDB: monta de novo */
    }
    const px = Math.max(2, Math.min(4, Math.floor(1700 / info.w)));
    const c = document.createElement('canvas');
    c.width = info.w * px;
    c.height = info.h * px;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2c5236';
    g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    let done = 0;
    // Em lotes, para não estourar memória nem a fila de downloads.
    for (let i = 0; i < info.maps.length; i += 6) {
      await Promise.all(info.maps.slice(i, i + 6).map(async (m) => {
        try {
          const r = await renderLayout(m.key, 0, false);
          g.drawImage(r.base, m.x * px, m.y * px, (r.w) * px, (r.h) * px);
          g.drawImage(r.over, m.x * px, m.y * px, (r.w) * px, (r.h) * px);
        } catch {
          /* um mapa que falha não derruba o mundo */
        }
        onProgress?.(++done, info.maps.length);
      }));
    }
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
    if (blob && done === info.maps.length) idbSet(cacheKey, blob).catch(() => undefined);
    return { url: blob ? URL.createObjectURL(blob) : c.toDataURL(), w: info.w, h: info.h };
  });
}
