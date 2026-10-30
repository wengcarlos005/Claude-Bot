// Arte da cidade do Hub: chão (grama, praça, caminhos, água) e prédios, todos gerados em pixel art.
import { Px, seeded } from './pixel';

const O = '#1d1a26'; // contorno
const C = {
  red: ['#ff7d80', '#e5484d', '#a8282f'], blue: ['#7cb8ff', '#3d8ff0', '#245fb0'], purple: ['#a48cff', '#7b5cf0', '#4d36a8'],
  gray: ['#c4ccd8', '#8c96a8', '#626c80'], teal: ['#7fe0d0', '#2fb3a0', '#1d7a6e'],
  cream: ['#fbf4e4', '#efe3c8', '#cdbd98'], white: ['#ffffff', '#eef1f6', '#c8d0dc'], stone: ['#d2d6de', '#a9b0bd', '#7b8494'],
  wood: ['#c98a4b', '#a86f3c', '#7a4b25'], glass: ['#c8ecff', '#8fd3ff', '#4b9ad6'], gold: ['#ffe58a', '#ffcc3d', '#c9921a'],
  dark: ['#3b3f4c', '#262a35', '#14161d'],
};
type Shade = string[];

export interface Sprite {
  uri: string;
  w: number;
  h: number;
}

function finish(p: Px): Sprite {
  return { uri: p.outline(O).uri(), w: p.w, h: p.h };
}

/** Telhado em perspectiva frontal: mais largo embaixo, com faixas de telhas e beiral escuro. */
function roof(p: Px, x0: number, w: number, h: number, shade: Shade, slope = 0.55) {
  for (let y = 0; y < h; y++) {
    const inset = Math.round((h - 1 - y) * slope);
    const c = y === 0 ? shade[0] : y >= h - 2 ? shade[2] : (y % 3 === 0 ? shade[2] : shade[1]);
    p.rect(x0 + inset, y, w - inset * 2, 1, c);
    p.set(x0 + inset, y, shade[0]);
  }
}

function walls(p: Px, x: number, y: number, w: number, h: number, shade: Shade, planks = false) {
  p.rect(x, y, w, h, shade[1]);
  if (planks) for (let j = y + 2; j < y + h; j += 3) p.rect(x, j, w, 1, shade[2]);
  p.rect(x, y, w, 1, shade[2]);
  p.rect(x, y + h - 3, w, 3, C.stone[2]);
  p.rect(x, y + h - 3, w, 1, C.stone[1]);
}

function windowAt(p: Px, x: number, y: number, w = 7, h = 6) {
  p.rect(x, y, w, h, C.white[2]);
  p.rect(x + 1, y + 1, w - 2, h - 2, C.glass[1]);
  p.rect(x + 1, y + 1, w - 2, 1, C.glass[0]);
  p.rect(x + Math.floor(w / 2), y + 1, 1, h - 2, C.white[1]);
  p.set(x + 1, y + 2, C.glass[0]);
}

function door(p: Px, cx: number, bottom: number, w: number, h: number, kind: 'glass' | 'wood') {
  const x = Math.round(cx - w / 2);
  const y = bottom - h;
  p.rect(x - 1, y - 1, w + 2, h + 1, C.dark[1]);
  if (kind === 'glass') {
    p.rect(x, y, w, h, C.glass[2]);
    p.rect(x, y, w, 2, C.glass[0]);
    p.rect(Math.round(cx), y, 1, h, C.dark[0]);
  } else {
    p.rect(x, y, w, h, C.wood[2]);
    for (let i = x + 1; i < x + w; i += 3) p.rect(i, y + 1, 1, h - 1, C.wood[1]);
    p.set(Math.round(cx) + 1, y + Math.floor(h / 2), C.gold[1]);
  }
}

function pokeball(p: Px, cx: number, cy: number, r: number) {
  p.disc(cx, cy, r + 1, O);
  p.disc(cx, cy, r, C.white[0]);
  for (let y = -r; y < 0; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) p.set(cx + x, cy + y, C.red[1]);
  p.rect(cx - r, cy, r * 2 + 1, 1, O);
  p.disc(cx, cy, Math.max(1, Math.round(r / 3)), O);
  p.set(cx, cy, C.white[0]);
  p.set(cx - Math.round(r / 2), cy - Math.round(r / 2), C.red[0]);
}

export function pokeCenter(): Sprite {
  const p = new Px(60, 42);
  roof(p, 1, 58, 16, C.red);
  walls(p, 4, 16, 52, 25, C.cream);
  p.rect(4, 16, 52, 2, C.red[2]);
  pokeball(p, 30, 8, 5);
  windowAt(p, 8, 21);
  windowAt(p, 17, 21);
  windowAt(p, 36, 21);
  windowAt(p, 45, 21);
  p.rect(22, 25, 16, 2, C.red[1]);
  p.rect(22, 27, 16, 1, C.red[2]);
  door(p, 30, 38, 10, 10, 'glass');
  return finish(p);
}

export function gym(): Sprite {
  const p = new Px(78, 50);
  roof(p, 1, 76, 18, C.red, 0.7);
  p.rect(12, 8, 54, 2, C.white[0]);
  walls(p, 4, 18, 70, 31, C.stone);
  p.rect(4, 18, 70, 2, C.red[2]);
  for (const x of [8, 20, 54, 66]) {
    p.rect(x, 22, 4, 24, C.white[1]);
    p.rect(x, 22, 1, 24, C.white[0]);
    p.rect(x + 3, 22, 1, 24, C.white[2]);
    p.rect(x - 1, 21, 6, 2, C.white[0]);
  }
  pokeball(p, 39, 27, 6);
  door(p, 39, 46, 14, 11, 'wood');
  windowAt(p, 26, 23, 6, 7);
  windowAt(p, 46, 23, 6, 7);
  return finish(p);
}

export function mart(): Sprite {
  const p = new Px(52, 38);
  roof(p, 1, 50, 13, C.blue);
  walls(p, 3, 13, 46, 24, C.white);
  p.rect(3, 13, 46, 2, C.blue[2]);
  p.box(14, 16, 24, 5, C.blue[1], C.blue[2]);
  p.rect(16, 18, 2, 1, C.white[0]);
  p.rect(20, 18, 2, 1, C.white[0]);
  p.rect(24, 18, 2, 1, C.white[0]);
  p.rect(28, 18, 2, 1, C.white[0]);
  p.rect(32, 18, 3, 1, C.white[0]);
  windowAt(p, 6, 23);
  windowAt(p, 39, 23);
  door(p, 26, 34, 10, 10, 'glass');
  return finish(p);
}

export function lab(): Sprite {
  const p = new Px(58, 40);
  roof(p, 1, 56, 11, C.gray, 0.4);
  walls(p, 3, 11, 52, 28, C.white);
  for (let x = 7; x < 52; x += 11) windowAt(p, x, 15, 7, 6);
  door(p, 29, 36, 10, 10, 'glass');
  p.rect(44, 0, 1, 4, C.gray[2]);
  p.ellipse(44, 1, 3, 1, C.white[1]);
  p.rect(12, 26, 10, 7, C.teal[2]);
  p.rect(13, 27, 8, 5, C.teal[1]);
  return finish(p);
}

export function market(): Sprite {
  const p = new Px(70, 50);
  for (let y = 0; y <= 26; y++) {
    const half = Math.round(33 * Math.sqrt(1 - ((26 - y) / 26) ** 2));
    p.rect(35 - half, y, half * 2, 1, y < 4 ? C.glass[0] : C.glass[1]);
  }
  for (let x = 6; x < 66; x += 8) for (let y = 2; y < 27; y++) if (p.get(x, y)) p.set(x, y, C.glass[2]);
  for (const y of [9, 17]) for (let x = 0; x < 70; x++) if (p.get(x, y)) p.set(x, y, C.glass[2]);
  walls(p, 2, 26, 66, 23, C.stone);
  p.rect(2, 26, 66, 2, C.gold[2]);
  p.disc(35, 34, 5, C.gold[2]);
  p.disc(35, 34, 4, C.gold[1]);
  p.rect(34, 31, 2, 6, C.gold[0]);
  door(p, 35, 46, 12, 7, 'glass');
  windowAt(p, 8, 31);
  windowAt(p, 55, 31);
  return finish(p);
}

export function guild(): Sprite {
  const p = new Px(56, 44);
  roof(p, 1, 54, 17, C.purple, 0.75);
  walls(p, 4, 17, 48, 26, C.wood, true);
  p.rect(4, 17, 48, 2, C.purple[2]);
  p.rect(23, 20, 10, 9, C.blue[1]);
  p.rect(24, 29, 8, 2, C.blue[1]);
  p.rect(25, 31, 6, 1, C.blue[1]);
  p.rect(27, 32, 2, 1, C.blue[1]);
  p.rect(27, 22, 2, 7, C.gold[1]);
  p.rect(25, 24, 6, 2, C.gold[1]);
  windowAt(p, 8, 23);
  windowAt(p, 41, 23);
  door(p, 28, 40, 9, 8, 'wood');
  return finish(p);
}

export function arena(): Sprite {
  const p = new Px(84, 40);
  p.rect(4, 6, 76, 33, C.stone[1]);
  for (let y = 9; y < 36; y += 4) p.rect(4, y, 76, 1, C.stone[2]);
  for (let x = 10; x < 76; x += 12) {
    p.rect(x, 18, 8, 18, C.dark[1]);
    p.ellipse(x + 4, 18, 4, 3, C.dark[1]);
  }
  p.rect(2, 4, 80, 5, C.red[1]);
  p.rect(2, 4, 80, 1, C.red[0]);
  p.rect(2, 8, 80, 1, C.red[2]);
  for (const x of [6, 78]) {
    p.rect(x, 0, 1, 12, C.wood[2]);
    p.rect(x + 1, 0, 4, 3, C.red[1]);
  }
  p.rect(34, 22, 16, 17, C.dark[2]);
  p.ellipse(42, 22, 8, 5, C.dark[2]);
  return finish(p);
}

export function huntGate(): Sprite {
  const p = new Px(64, 44);
  const r = seeded(7);
  for (let x = 0; x < 64; x++) {
    const top = Math.round(10 + Math.sin(x / 7) * 4 + Math.sin(x / 3) * 1.5);
    for (let y = top; y < 44; y++) p.set(x, y, y - top < 2 ? C.stone[0] : r() < 0.15 ? C.stone[2] : C.stone[1]);
  }
  p.ellipse(32, 30, 12, 13, C.dark[2]);
  p.rect(20, 30, 25, 14, C.dark[2]);
  p.rect(18, 18, 3, 26, C.wood[2]);
  p.rect(43, 18, 3, 26, C.wood[2]);
  p.rect(16, 16, 32, 3, C.wood[1]);
  p.rect(16, 16, 32, 1, C.wood[0]);
  for (let x = 4; x < 60; x += 9) p.rect(x, 4 + Math.round(Math.sin(x) * 3), 4, 4, C.teal[1]);
  return finish(p);
}

export function fountain(): Sprite {
  const p = new Px(52, 30);
  p.ellipse(26, 17, 25, 12, C.stone[2]);
  p.ellipse(26, 16, 24, 11, C.stone[1]);
  p.ellipse(26, 17, 20, 8, C.blue[2]);
  p.ellipse(26, 16, 19, 7, '#4aa6ef');
  const r = seeded(3);
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    p.set(26 + Math.cos(a) * (6 + r() * 11), 16 + Math.sin(a) * (3 + r() * 3), '#bfe6ff');
  }
  p.ellipse(26, 14, 6, 4, C.stone[2]);
  p.ellipse(26, 13, 5, 3, C.stone[0]);
  return finish(p);
}

const TREE = [
  '......GGGG......', '....GGHHGGGG....', '...GGHHGGGGGG...', '..GGHHGGGGGGGG..', '..GGHGGGGGGGDG..',
  '.GGGGGGGGGGGDDG.', '.GGHGGGGGGGGDDG.', '.GGGGGGGGGGGDDG.', '..GGGGGGGGGDDG..', '..DGGGGGGGDDDD..',
  '...DDGGGGDDDD...', '....DDDDDDDD....', '......TTtT......', '......TTtT......', '.....TTTttT.....',
];
export function tree(variant = 0): Sprite {
  const g = variant % 3 === 0 ? ['#62b153', '#3f8a3f', '#2c6732'] : variant % 3 === 1 ? ['#74c060', '#4c9a45', '#336f34'] : ['#5aa64f', '#367c3a', '#24582b'];
  const p = new Px(16, 15).stamp(TREE, 0, 0, { G: g[1], H: g[0], D: g[2], T: '#7a5232', t: '#5c3d24' });
  return finish(p);
}

const LAMP = ['.yyy.', 'yYYYy', '.yYy.', '..L..', '..L..', '..L..', '..L..', '..L..', '.LLL.'];
export function lamp(): Sprite {
  return finish(new Px(5, 9).stamp(LAMP, 0, 0, { y: '#c9921a', Y: '#ffe58a', L: '#3b4458' }));
}

/** Chão da cidade (320×180): grama com textura, praça de pedra, caminhos até as portas e água à direita. */
export function townGround(paths: { x: number; y: number }[], plaza: { x: number; y: number; rx: number; ry: number }): string {
  const W = 320;
  const H = 180;
  const p = new Px(W, H);
  const r = seeded(42);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = r();
      p.set(x, y, n < 0.08 ? '#56a246' : n < 0.14 ? '#6cbd5b' : '#5fae4f');
    }
  }
  const sand = '#dcca9c';
  const sandEdge = '#c4b07e';
  const path = (x0: number, y0: number, x1: number, y1: number) => {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
    p.rect(xa - 5, ya - 5, xb - xa + 10, yb - ya + 10, sandEdge);
    p.rect(xa - 4, ya - 4, xb - xa + 8, yb - ya + 8, sand);
  };
  for (const d of paths) {
    path(d.x, d.y, d.x, plaza.y);
    path(d.x, plaza.y, plaza.x, plaza.y);
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    if (p.get(x, y) === sand) p.set(x, y, '#cfbb8a');
  }
  // Praça: anel de borda + ladrilhos.
  p.ellipse(plaza.x, plaza.y, plaza.rx + 2, plaza.ry + 2, '#8f8774');
  for (let y = -plaza.ry; y <= plaza.ry; y++) {
    for (let x = -plaza.rx; x <= plaza.rx; x++) {
      if ((x * x) / (plaza.rx * plaza.rx) + (y * y) / (plaza.ry * plaza.ry) > 1) continue;
      const gx = plaza.x + x, gy = plaza.y + y;
      const grout = (gx % 6 === 0) || (gy % 5 === 0);
      p.set(gx, gy, grout ? '#aea58f' : (Math.floor(gx / 6) + Math.floor(gy / 5)) % 2 ? '#d5cdb8' : '#cac2ac');
    }
  }
  // Canteiros de flores ao redor da praça.
  const flowers = ['#ff6b81', '#ffd447', '#ffffff', '#b98cff'];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const k = 1.12 + r() * 0.12;
    const x = plaza.x + Math.cos(a) * plaza.rx * k, y = plaza.y + Math.sin(a) * plaza.ry * k;
    if (p.get(x, y) === sand) continue;
    p.set(x, y, flowers[i % flowers.length]);
  }
  // Água: margem direita com espuma e reflexos.
  for (let y = 0; y < H; y++) {
    const shore = 308 - Math.round(Math.max(0, (y - 128) * 1.1) + Math.sin(y / 9) * 2);
    for (let x = shore; x < W; x++) {
      const d = x - shore;
      p.set(x, y, d < 1 ? '#e9f6ff' : d < 3 ? '#76c1f4' : (x + y * 3) % 23 === 0 ? '#9fd6fb' : '#3f92e0');
    }
    if (shore - 1 >= 0) p.set(shore - 1, y, '#d8c79a');
  }
  return p.uri();
}
