// Mini "canvas" de pixel art que gera SVG (um <rect> por trecho horizontal). Usado para prédios, chão da cidade e
// mapas-múndi. Tudo é desenhado em coordenadas lógicas pequenas e escalado com image-rendering: pixelated.

export class Px {
  private runs = new Map<number, (string | null)[]>();
  constructor(readonly w: number, readonly h: number) {}

  set(x: number, y: number, c: string | null): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    let row = this.runs.get(y);
    if (!row) this.runs.set(y, (row = new Array(this.w).fill(null)));
    row[x] = c;
  }
  get(x: number, y: number): string | null {
    return this.runs.get(Math.round(y))?.[Math.round(x)] ?? null;
  }
  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  /** Retângulo com contorno. */
  box(x: number, y: number, w: number, h: number, fill: string, line: string): this {
    this.rect(x, y, w, h, line);
    return this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }
  disc(cx: number, cy: number, r: number, c: string): this {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) this.set(cx + x, cy + y, c);
    return this;
  }
  /** Desenha um mapa de caracteres (1 caractere = 1 pixel; '.' = vazio). */
  stamp(rows: string[], x: number, y: number, ink: Record<string, string>): this {
    rows.forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && this.set(x + i, y + j, ink[ch])));
    return this;
  }
  /** Contorno de 1px ao redor de tudo que já foi desenhado (estilo sprite). */
  outline(c: string): this {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  svg(): string {
    let rects = '';
    for (const [y, row] of [...this.runs.entries()].sort((a, b) => a[0] - b[0])) {
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (!c) continue;
        let n = 1;
        while (row[x + n] === c) n++;
        rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${c}"/>`;
        x += n - 1;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" shape-rendering="crispEdges">${rects}</svg>`;
  }
  /** data URI para usar em <img src> ou background-image: url(...). */
  uri(): string {
    return `data:image/svg+xml,${encodeURIComponent(this.svg())}`;
  }
}

/** Gerador pseudoaleatório determinístico (mesma arte a cada carregamento). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
