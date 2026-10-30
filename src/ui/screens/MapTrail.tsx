// Mapa em trilha: todas as localidades da região numa trilha contínua (em zigue-zague, na ordem da aventura),
// desenhada com tiles reais do FireRed (grama, grama alta, caminho, água e árvores). Cada parada é um botão com
// sprite: o líder nos ginásios e na Liga, um Pokémon da área nas rotas e o seu treinador onde você está.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../components';
import { loadTileKit, type TileKit } from '../../app/tilekit';
import { badgeSprite, pokemonIcon, trainerSprite, uiIcon } from '../../app/assets';
import { DEFAULT_AVATAR } from '../../data/content/avatars';
import { areaUnlocked } from '../../core/world';
import { speciesOf } from '../../core/pokemon';
import type { Place } from './Map';

const T = 16; // bloco do jogo
const STEP = 5; // distância entre paradas, em blocos
const M = 3; // margem (árvores) em blocos

interface Node {
  place: Place;
  x: number;
  y: number;
  open: boolean;
  done: boolean;
}

export function MapTrail({ places, sel, onSelect, gymBase }: { places: Place[]; sel: Place | null; onSelect: (p: Place) => void; gymBase: number }) {
  const app = useApp();
  const s = app.state;
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [kit, setKit] = useState<TileKit | null>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    let alive = true;
    loadTileKit().then((k) => alive && setKit(k)).catch(() => undefined);
    const el = box.current;
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(() => setWidth(el.clientWidth)) : null;
    if (el) {
      setWidth(el.clientWidth);
      ro?.observe(el);
    }
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, []);

  // No celular os tiles ficam 1,5× (cabem 2 paradas por linha); no computador, 2×.
  const SCALE = width < 600 ? 1.5 : 2;
  const cols = Math.max(2, Math.min(8, Math.floor((width / (T * SCALE) - M * 2 - 2) / STEP) + 1));
  const isDone = (p: Place) => p.areas.every((a) => (a.gym ? s.player.badges.includes(a.gym.badgeId) : a.league ? s.player.champions.includes(a.regionId) : s.world.areas[a.id]?.cleared));
  // O tabuleiro ocupa a largura toda; a trilha fica centralizada e as sobras viram mata.
  const BW = Math.max(M * 2 + 2 + (cols - 1) * STEP, Math.floor((width - 12) / (T * SCALE)));
  const shift = Math.floor((BW - (M * 2 + 2 + (cols - 1) * STEP)) / 2);
  const nodes: Node[] = places.map((place, i) => {
    const r = Math.floor(i / cols);
    const c = r % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    return { place, x: shift + M + 1 + c * STEP, y: M + 1 + r * STEP, open: place.areas.some((a) => areaUnlocked(s, app.data, a)), done: isDone(place) };
  });
  const rows = Math.ceil(places.length / cols);
  const BH = M * 2 + 3 + (rows - 1) * STEP;
  const openKey = nodes.map((n) => (n.open ? 1 : 0)).join('');

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = BW * T;
    c.height = BH * T;
    paint(c.getContext('2d')!, kit, nodes, BW, BH);
  }, [kit, BW, BH, openKey, places]);

  // Rola até onde você está ao abrir a região.
  const here = nodes.find((n) => n.place.areas.some((a) => a.id === s.world.activeAreaId)) ?? [...nodes].reverse().find((n) => n.open);
  useEffect(() => {
    const el = box.current;
    if (el && here) el.scrollTop = Math.max(0, here.y * T * SCALE - el.clientHeight / 2);
  }, [places, cols]);

  let gym = 0;
  return (
    <div class="trail" ref={box}>
      <div class="trail__board" style={{ width: `${BW * T * SCALE}px`, height: `${BH * T * SCALE}px` }}>
        <canvas ref={canvas} class="trail__canvas" style={{ width: `${BW * T * SCALE}px`, height: `${BH * T * SCALE}px` }} />
        {nodes.map((n) => {
          const first = n.place.areas[0];
          const isGym = !!(first.gym || first.league);
          const badgeN = first.gym ? gymBase + ++gym : 0;
          const isHere = n.place.areas.some((a) => a.id === s.world.activeAreaId);
          const lvl = `Nv ${Math.min(...n.place.areas.map((a) => a.levelRange[0]))}–${Math.max(...n.place.areas.map((a) => a.levelRange[1]))}`;
          return (
            <button key={n.place.key} class={`stop stop--${n.place.kind} ${isGym ? 'stop--gym' : ''} ${n.open ? 'is-open' : 'is-locked'} ${n.done ? 'is-done' : ''} ${isHere ? 'is-here' : ''} ${sel === n.place ? 'is-sel' : ''}`}
              style={{ left: `${n.x * T * SCALE}px`, top: `${n.y * T * SCALE}px` }} onClick={() => onSelect(n.place)}
              aria-label={`${n.place.name}, ${lvl}${n.open ? '' : ' (bloqueado)'}`}>
              <span class="stop__disc">{isGym ? <Leader place={n.place} /> : <StopMon place={n.place} />}</span>
              {!n.open && <img class="stop__lock" src={uiIcon('key-item/secret-key-kanto')} alt="" />}
              {n.done && !isGym && <img class="stop__ok" src={uiIcon('ball/poke')} alt="" />}
              {badgeN > 0 && <img class={`stop__badge ${n.done ? '' : 'is-off'}`} src={badgeSprite(badgeN)} alt="" />}
              {isHere && <img class="stop__me" src={trainerSprite(s.player.avatar ?? DEFAULT_AVATAR)} alt="Você" />}
              <span class="stop__label">
                <b>{n.place.name}</b>
                <span class="pk-num">{lvl}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pokémon que representa a parada: o primeiro ainda não capturado (é o que vale ir buscar), senão o mais comum. */
function StopMon({ place }: { place: Place }) {
  const app = useApp();
  const s = app.state;
  const all = place.areas.flatMap((a) => a.slots);
  const walk = all.filter((x) => x.method === 'walk');
  const slots = (walk.length ? walk : all).sort((a, b) => b.weight - a.weight);
  const key = (slots.find((x) => !(s.pokedex[x.species]?.caught)) ?? slots[0])?.species;
  if (!key) return <img class="stop__icon stop__icon--item" src={uiIcon(place.kind === 'water' ? 'key-item/super-rod' : 'key-item/town-map-gen3')} alt="" />;
  const sp = speciesOf(app.data, key);
  return <img class="stop__icon" src={pokemonIcon(sp.id)} alt="" loading="lazy" />;
}

function Leader({ place }: { place: Place }) {
  const a = place.areas[0];
  const name = a.gym ? a.gym.leader.name : a.league ? a.league.members[a.league.members.length - 1].name : '';
  const id = name.toLowerCase().replace(/[^a-z]/g, '');
  return <img class="stop__leader" src={trainerSprite(id)} alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).src = uiIcon('key-item/vs-seeker'))} />;
}

// ---------------------------------------------------------------- pintura do tabuleiro

function paint(g: CanvasRenderingContext2D, kit: TileKit | null, nodes: Node[], BW: number, BH: number) {
  const fill = (x: number, y: number, tile: HTMLCanvasElement | null, color: string) => {
    if (tile) g.drawImage(tile, x * T, y * T);
    else {
      g.fillStyle = color;
      g.fillRect(x * T, y * T, T, T);
    }
  };
  const tree = (x: number, y: number) => {
    if (kit) g.drawImage(kit.tree, x * T, y * T);
    else {
      g.fillStyle = '#2f7d3b';
      g.fillRect(x * T, y * T, T * 2, T * 2);
    }
  };
  const used = new Uint8Array(BW * BH);
  const mark = (x: number, y: number, v = 1) => x >= 0 && y >= 0 && x < BW && y < BH && (used[y * BW + x] = v);
  const free = (x: number, y: number, w = 1, h = 1) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx < 0 || yy < 0 || xx >= BW || yy >= BH || used[yy * BW + xx]) return false;
    return true;
  };

  // 1) chão
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) fill(x, y, kit?.ground ?? null, '#78c850');

  // 2) trilha (2 blocos de largura; o centro da parada fica no encontro dos blocos)
  const pathTiles: [number, number, boolean][] = [];
  const seg = (x1: number, y1: number, x2: number, y2: number, lit: boolean) => {
    for (let x = Math.min(x1, x2) - 1; x <= Math.max(x1, x2); x++) for (let y = Math.min(y1, y2) - 1; y <= Math.max(y1, y2); y++) pathTiles.push([x, y, lit]);
  };
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i], b = nodes[i + 1];
    seg(a.x, a.y, a.x, a.y, a.open);
    if (b) seg(a.x, a.y, b.x, b.y, b.open);
  }
  for (const [x, y] of pathTiles) {
    fill(x, y, kit?.path ?? null, '#d8c088');
    mark(x, y, 2);
  }
  // reserva o espaço do rótulo embaixo de cada parada
  for (const n of nodes) for (let x = n.x - 2; x <= n.x + 1; x++) for (let y = n.y + 1; y <= n.y + 2; y++) mark(x, y);

  // 3) moldura de árvores
  for (let y = 0; y < BH; y += 2) {
    for (let x = 0; x < BW; x += 2) {
      const edge = x < 2 || y < 2 || x >= BW - 2 || y >= BH - 2;
      if (edge && free(x, y, 2, 2)) {
        tree(x, y);
        for (let k = 0; k < 4; k++) mark(x + (k & 1), y + (k >> 1));
      }
    }
  }

  // 4) decoração entre paradas, conforme o tipo do lugar
  const rnd = mulberry(BW * 7919 + BH);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const next = nodes[i + 1];
    const mx = next && next.y === n.y ? Math.round((n.x + next.x) / 2) : n.x + (rnd() < 0.5 ? 2 : -3);
    for (const dy of [-3, 2]) {
      const y = n.y + dy;
      const x = mx - 1;
      if (n.place.kind === 'water' && free(x - 1, y, 4, 2)) {
        for (let yy = y; yy < y + 2; yy++) for (let xx = x - 1; xx < x + 3; xx++) {
          fill(xx, yy, kit?.water ?? null, '#5890f0');
          mark(xx, yy);
        }
      } else if ((n.place.kind === 'forest' || n.place.kind === 'cave') && free(x, y, 2, 2)) {
        tree(x, y);
        for (let k = 0; k < 4; k++) mark(x + (k & 1), y + (k >> 1));
      } else if (free(x - 1, y, 3, 2)) {
        for (let yy = y; yy < y + 2; yy++) for (let xx = x - 1; xx < x + 2; xx++) {
          fill(xx, yy, kit?.tall ?? null, '#409848');
          mark(xx, yy);
        }
      }
    }
  }

  // 5) preenche o resto: árvores nos vãos grandes, flores e grama alta espalhadas
  for (let y = 2; y < BH - 2; y += 2) {
    for (let x = 2; x < BW - 2; x += 2) {
      if (free(x - 1, y - 1, 4, 4) && rnd() < 0.55) {
        tree(x, y);
        for (let k = 0; k < 4; k++) mark(x + (k & 1), y + (k >> 1));
      }
    }
  }
  for (let y = 2; y < BH - 2; y++) {
    for (let x = 2; x < BW - 2; x++) {
      if (!free(x, y)) continue;
      const r = rnd();
      if (kit && kit.extras.length && r < 0.12) g.drawImage(kit.extras[Math.floor(rnd() * kit.extras.length)], x * T, y * T);
      else if (r < 0.2) fill(x, y, kit?.tall ?? null, '#409848');
    }
  }

  // 6) trechos ainda bloqueados ficam mais escuros
  g.fillStyle = 'rgba(8, 14, 30, 0.28)';
  for (const [x, y, lit] of pathTiles) if (!lit) g.fillRect(x * T, y * T, T, T);
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
