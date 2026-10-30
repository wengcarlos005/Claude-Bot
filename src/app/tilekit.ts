// Kit de tiles para desenhar mapas próprios com os pixels dos jogos: amostra blocos de 16×16 de mapas reais do
// FireRed (grama baixa, grama alta, caminho, água e árvores da borda) e devolve cada um como canvas.
import { Cell, renderLayout, type RenderedMap } from './pret';

export interface TileKit {
  ground: HTMLCanvasElement;
  tall: HTMLCanvasElement;
  path: HTMLCanvasElement;
  water: HTMLCanvasElement;
  /** Árvore 32×32 (2×2 blocos), tirada da borda da rota. */
  tree: HTMLCanvasElement;
  /** Outros blocos decorativos de chão (flores etc.), para variar. */
  extras: HTMLCanvasElement[];
}

let kit: Promise<TileKit> | null = null;

export function loadTileKit(): Promise<TileKit> {
  return (kit ??= build().catch((e) => {
    kit = null;
    throw e;
  }));
}

function flatten(m: RenderedMap): ImageData {
  const c = document.createElement('canvas');
  c.width = m.base.width;
  c.height = m.base.height;
  const g = c.getContext('2d')!;
  g.drawImage(m.base, 0, 0);
  g.drawImage(m.over, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}

function crop(img: ImageData, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const out = new ImageData(w, h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const si = ((y + yy) * img.width + x + xx) * 4, di = (yy * w + xx) * 4;
    out.data[di] = img.data[si];
    out.data[di + 1] = img.data[si + 1];
    out.data[di + 2] = img.data[si + 2];
    out.data[di + 3] = 255;
  }
  c.getContext('2d')!.putImageData(out, 0, 0);
  return c;
}

interface Sample { x: number; y: number; n: number; r: number; g: number; b: number }

/** Blocos distintos de uma classe de célula, do mais frequente ao menos, com a cor média. */
function samples(m: RenderedMap, img: ImageData, cell: Cell): Sample[] {
  const seen = new Map<string, Sample>();
  for (let by = m.pad; by < m.h - m.pad; by++) {
    for (let bx = m.pad; bx < m.w - m.pad; bx++) {
      if (m.cells[by * m.w + bx] !== cell) continue;
      let h = 0, r = 0, g = 0, b = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const i = ((by * 16 + y) * img.width + bx * 16 + x) * 4;
        h = (h * 31 + img.data[i] * 7 + img.data[i + 1] * 3 + img.data[i + 2]) | 0;
        r += img.data[i];
        g += img.data[i + 1];
        b += img.data[i + 2];
      }
      const k = String(h);
      const s = seen.get(k);
      if (s) s.n++;
      else seen.set(k, { x: bx * 16, y: by * 16, n: 1, r: r / 256, g: g / 256, b: b / 256 });
    }
  }
  return [...seen.values()].sort((a, b) => b.n - a.n);
}

async function build(): Promise<TileKit> {
  const [route, town] = await Promise.all([renderLayout('frlg:Route1', 2), renderLayout('frlg:PalletTown', 2)]);
  const ri = flatten(route), ti = flatten(town);
  const walk = samples(route, ri, Cell.Walk);
  // Chão: grama baixa (verde-água: G bem acima de R); caminho: o miolo da areia (R alto, B baixo); flores: R > G.
  const lawn = walk.filter((s) => s.g - s.r > 60 && s.b < s.g);
  const ground = lawn[0];
  const path = walk.find((s) => s.r > 225 && s.b < 160) ?? walk.find((s) => s.r > 180 && s.b < 170);
  const tall = samples(route, ri, Cell.Grass)[0];
  const water = samples(town, ti, Cell.Water)[0];
  const extras = [...lawn.slice(1, 3), ...walk.filter((s) => s.r > s.g * 0.85 && s.r < 200 && s.n >= 6).slice(0, 1)];
  if (!ground || !path || !tall || !water) throw new Error('kit de tiles incompleto');
  return {
    ground: crop(ri, ground.x, ground.y, 16, 16),
    path: crop(ri, path.x, path.y, 16, 16),
    tall: crop(ri, tall.x, tall.y, 16, 16),
    water: crop(ti, water.x, water.y, 16, 16),
    tree: crop(ri, 0, 0, 32, 32),
    extras: extras.map((s) => crop(ri, s.x, s.y, 16, 16)),
  };
}
