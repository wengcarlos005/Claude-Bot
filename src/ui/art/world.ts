// Mapa-múndi ilustrado de uma região, gerado a partir das áreas: as localidades formam uma trilha em zigue-zague
// sobre uma ilha; o terreno perto de cada parada reflete o tipo da área (montanha, floresta, lago, cidade).
import { Px, seeded } from './pixel';

export type NodeKind = 'route' | 'cave' | 'forest' | 'water' | 'town' | 'building' | 'special';

export interface WorldNode {
  key: string;
  kind: NodeKind;
}

export interface WorldMap {
  uri: string;
  w: number;
  h: number;
  /** Posição de cada parada em % do mapa. */
  pos: Map<string, { x: number; y: number }>;
}

const PER_ROW = 7;
const ROW_H = 30;
const W = 210;

export function worldMap(seedKey: number, nodes: WorldNode[]): WorldMap {
  const rows = Math.max(2, Math.ceil(nodes.length / PER_ROW));
  const H = rows * ROW_H + 26;
  const p = new Px(W, H);
  const r = seeded(seedKey);
  const pts = nodes.map((n, i) => {
    const row = Math.floor(i / PER_ROW);
    const col = i % PER_ROW;
    const c = row % 2 === 0 ? col : PER_ROW - 1 - col;
    return { n, x: Math.round(30 + c * ((W - 60) / (PER_ROW - 1)) + (r() - 0.5) * 6), y: Math.round(20 + row * ROW_H + (r() - 0.5) * 7) };
  });

  // Mar com ondas + ilha (contorno irregular que acompanha a trilha).
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, (x * 7 + y * 13) % 41 === 0 ? '#5aa6ea' : '#2f78c8');
  const land = (x: number, y: number) => {
    const margin = 12 + Math.sin(y / 9 + seedKey) * 4 + Math.sin(y / 3.7) * 1.5;
    const top = 6 + Math.sin(x / 11) * 3, bottom = H - 6 - Math.sin(x / 13 + 1) * 3;
    return x > margin && x < W - margin - Math.sin(y / 7) * 3 && y > top && y < bottom;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!land(x, y)) continue;
      const n = r();
      p.set(x, y, n < 0.08 ? '#4f9a44' : n < 0.15 ? '#73bd5f' : '#62ad52');
    }
  }
  // Areia/espuma na costa.
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!land(x, y)) continue;
      if (!land(x + 2, y) || !land(x - 2, y) || !land(x, y + 2) || !land(x, y - 2)) p.set(x, y, '#e2cf96');
      if (!land(x + 1, y) || !land(x - 1, y) || !land(x, y + 1) || !land(x, y - 1)) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!land(x + dx, y + dy)) p.set(x + dx, y + dy, '#d6efff');
      }
    }
  }

  // Terreno ao redor de cada parada.
  const tree = (x: number, y: number, dark = false) => {
    p.disc(x, y, 2, dark ? '#24582b' : '#2f6f35');
    p.set(x - 1, y - 1, dark ? '#3f8a3f' : '#4c9a45');
    p.set(x, y + 3, '#5c3d24');
  };
  const mountain = (x: number, y: number, s: number, volcano = false) => {
    for (let j = 0; j < s; j++) {
      const half = Math.round((j * 1.1));
      p.rect(x - half, y - s + j, half * 2 + 1, 1, j < s * 0.3 ? (volcano ? '#b8432a' : '#eef3f8') : j % 3 === 0 ? '#7d6b5a' : '#94816d');
      p.set(x - half, y - s + j, '#5b4c3f');
    }
  };
  const lake = (x: number, y: number) => {
    p.ellipse(x, y, 7, 4, '#e2cf96');
    p.ellipse(x, y, 6, 3, '#3f8fe0');
    p.set(x - 2, y - 1, '#a9dcff');
  };
  const roofs = (x: number, y: number) => {
    for (const [dx, dy, c] of [[-5, -2, '#e5484d'], [3, -4, '#3d8ff0'], [-1, 3, '#e5484d'], [6, 2, '#7b5cf0']] as const) {
      p.rect(x + dx - 2, y + dy, 5, 3, '#f3ead6');
      p.rect(x + dx - 2, y + dy - 2, 5, 2, c);
    }
  };
  for (const { n, x, y } of pts) {
    const around = (k: number, f: (ax: number, ay: number) => void, rad = 9) => {
      for (let i = 0; i < k; i++) {
        const a = r() * Math.PI * 2;
        const ax = x + Math.cos(a) * (5 + r() * rad), ay = y + Math.sin(a) * (4 + r() * rad * 0.7);
        if (land(ax, ay) && Math.abs(ay - y) > 3) f(ax, ay);
      }
    };
    if (n.kind === 'forest') around(9, (a, b) => tree(a, b, r() < 0.5));
    else if (n.kind === 'cave') around(3, (a, b) => mountain(a, b, 6 + Math.round(r() * 4)), 8);
    else if (n.kind === 'water') lake(x + (r() < 0.5 ? -9 : 9), y + 6);
    else if (n.kind === 'town' || n.kind === 'building') roofs(x, y + 7);
    else around(3, (a, b) => tree(a, b));
  }
  // Algumas árvores e montanhas soltas pela ilha.
  for (let i = 0; i < rows * 10; i++) {
    const x = r() * W, y = r() * H;
    if (!land(x, y) || pts.some((q) => Math.hypot(q.x - x, q.y - y) < 9)) continue;
    if (r() < 0.2) mountain(x, y, 5 + Math.round(r() * 5), r() < 0.08);
    else tree(x, y, r() < 0.5);
  }
  // Trilha: terra + pontos brancos (pontilhado), ligando as paradas em ordem.
  const trail = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
      p.rect(x - 1, y - 1, 3, 3, '#d9c08a');
      if (i % 4 === 0) p.set(x, y, '#ffffff');
    }
  };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (Math.abs(a.y - b.y) > 12) {
      trail(a.x, a.y, a.x, b.y);
      trail(a.x, b.y, b.x, b.y);
    } else trail(a.x, a.y, b.x, b.y);
  }
  const pos = new Map(pts.map((q) => [q.n.key, { x: (q.x / W) * 100, y: (q.y / H) * 100 }]));
  return { uri: p.uri(), w: W, h: H, pos };
}
