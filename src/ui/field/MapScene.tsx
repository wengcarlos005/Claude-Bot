// Cena da hunt sobre o MAPA REAL da área (FireRed/LeafGreen ou Emerald, via pret) com Pokémon andando em 8 direções
// (sprites do PMDCollab). O core decide encontro e resultado; aqui é só apresentação: o Pokémon ativo segue um
// caminho pelas células andáveis até o alvo, os selvagens aparecem no mato alto e as copas/telhados cobrem os sprites.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ItemIcon, Sprite, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { encounterTable } from '../../core/systems/exploration';
import type { EncounterPlan } from '../../core/state/types';
import type { Fx } from '../../app/GameApp';
import { Cell, layoutKeyForArea, renderLayout, type RenderedMap } from '../../app/pret';
import { directionRow, loadPmd, type AnimName, type PmdSet } from '../../app/pmd';
import { RouteField } from './RouteField';

interface Mon {
  key: number;
  species: string;
  level: number;
  x: number;
  y: number;
  dir: number;
  moveAt: number;
  movingUntil: number;
  born: number;
  state: 'idle' | 'target' | 'down' | 'caught';
  downAt: number;
  trainer?: string;
  shiny?: boolean;
}

interface Model {
  key: string;
  mons: Mon[];
  seq: number;
  px: number;
  py: number;
  dir: number;
  path: { x: number; y: number }[];
  walkTotal: number;
  plan: EncounterPlan | null;
  target: number | null;
  inBattle: boolean;
  home: { x: number; y: number };
  /** Última visita (ms) de cada setor de SECTOR×SECTOR blocos: o líder prefere ir para onde não esteve há mais tempo. */
  visits: Float64Array;
}

const SECTOR = 8;

const BODY_MS = 3200;
/** Quantos selvagens ficam passeando ao mesmo tempo: cresce com o tamanho do mato (5 a 14). */
const populationOf = (cells: number) => Math.max(5, Math.min(14, Math.round(cells / 28)));

/** Maior região conexa de células andáveis (1 = dentro). */
function largestRegion(map: RenderedMap, passable: (c: number) => boolean): Uint8Array {
  const seen = new Int32Array(map.cells.length).fill(-1);
  let best = -1, bestN = 0, id = 0;
  const q = new Int32Array(map.cells.length);
  for (let s = 0; s < map.cells.length; s++) {
    if (seen[s] !== -1 || !passable(map.cells[s])) continue;
    let h = 0, n = 0;
    q[n++] = s;
    seen[s] = id;
    while (h < n) {
      const c = q[h++], x = c % map.w;
      for (const nb of [c - 1, c + 1, c - map.w, c + map.w]) {
        if (nb < 0 || nb >= map.cells.length || (nb === c - 1 && x === 0) || (nb === c + 1 && x === map.w - 1)) continue;
        if (seen[nb] !== -1 || !passable(map.cells[nb])) continue;
        seen[nb] = id;
        q[n++] = nb;
      }
    }
    if (n > bestN) [best, bestN] = [id, n];
    id++;
  }
  const out = new Uint8Array(map.cells.length);
  for (let i = 0; i < out.length; i++) if (seen[i] === best) out[i] = 1;
  return out;
}

function hasNeighbor(map: RenderedMap, i: number, mask: Uint8Array): boolean {
  return [i - 1, i + 1, i - map.w, i + map.w].some((n) => n >= 0 && n < mask.length && mask[n] === 1);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Sprites PMD carregados (por espécie/shiny) — leitura síncrona no render; o carregamento dispara re-render.
const pmdCache = new Map<string, PmdSet | null | 'loading'>();
function usePmd(dexId: number, shiny: boolean, bump: () => void): PmdSet | null {
  const k = `${dexId}:${shiny ? 1 : 0}`;
  const v = pmdCache.get(k);
  if (v === undefined) {
    pmdCache.set(k, 'loading');
    void loadPmd(dexId, shiny).then((set) => {
      pmdCache.set(k, set);
      bump();
    });
    return null;
  }
  return v === 'loading' ? null : v;
}

/** Busca em largura nas células andáveis (4 direções). */
function findPath(map: RenderedMap, from: { x: number; y: number }, goal: (x: number, y: number) => boolean, passable: (c: number) => boolean, limit = 4000) {
  const W = map.w;
  const start = Math.round(from.y) * W + Math.round(from.x);
  const prev = new Int32Array(map.w * map.h).fill(-2);
  prev[start] = -1;
  const q = [start];
  for (let qi = 0; qi < q.length && qi < limit; qi++) {
    const cur = q[qi];
    const cx = cur % W, cy = (cur / W) | 0;
    if (goal(cx, cy) && qi > 0) {
      const path: { x: number; y: number }[] = [];
      for (let c = cur; c !== -1; c = prev[c]) path.unshift({ x: c % W, y: (c / W) | 0 });
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= map.h) continue;
      const n = ny * W + nx;
      if (prev[n] !== -2 || !passable(map.cells[n])) continue;
      prev[n] = cur;
      q.push(n);
    }
  }
  return null;
}

export function MapScene() {
  const app = useApp();
  const area = app.data.areas.get(app.state.world.activeAreaId)!;
  const key = layoutKeyForArea(area.id);
  const [map, setMap] = useState<RenderedMap | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setMap(null);
    setFailed(null);
    if (!key) return setFailed('sem mapa');
    renderLayout(key).then((m) => alive && setMap(m)).catch((e) => alive && setFailed(String(e)));
    return () => {
      alive = false;
    };
  }, [key]);
  if (failed || !key) return <RouteField />;
  if (!map) {
    return (
      <div class="mapscene is-loading">
        <RouteField hud={false} />
        <div class="mapscene__loading"><span class="spinner" />Carregando o mapa de {area.name}…</div>
      </div>
    );
  }
  return <MapWorld map={map} />;
}

function MapWorld({ map }: { map: RenderedMap }) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const ex = s.exploration;
  const b = ex.battle;
  const now = performance.now();
  const box = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Os canvases do mapa entram no DOM uma vez (escalados por CSS, sem suavização).
    baseRef.current?.replaceChildren(map.base);
    overRef.current?.replaceChildren(map.over);
  }, [map.key]);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const ref = useRef<Model | null>(null);
  const hourKey = new Date().getHours();
  const vw = box.current?.clientWidth ?? 1200;
  const vh = box.current?.clientHeight ?? 700;
  const scale = vw < 700 ? 2 : 3;
  const T = 16 * scale;

  const table = useMemo(() => encounterTable(s, area, Date.now()), [area.id, hourKey, Object.keys(s.inventory).length]);
  const walkTable = table.filter((x) => x.slot.method === 'walk');
  const waterOnly = walkTable.length === 0 && table.some((x) => x.slot.method !== 'walk');
  const spawnCell = waterOnly ? Cell.Water : Cell.Grass;
  const passable = (c: number) => c === Cell.Walk || c === Cell.Grass;

  // Células candidatas para selvagens (mato alto; ou água em áreas só de pesca/surf; ou chão em cavernas), só na parte
  // do mapa alcançável a pé a partir da maior região andável (evita selvagens presos atrás de cercas ou bordas).
  const { spawnCells, reach } = useMemo(() => {
    const reach = largestRegion(map, passable);
    const ok = (i: number) => reach[i] === 1 || (spawnCell === Cell.Water && hasNeighbor(map, i, reach));
    const out: number[] = [];
    for (let i = 0; i < map.cells.length; i++) if (map.cells[i] === spawnCell && ok(i)) out.push(i);
    if (out.length < 6) for (let i = 0; i < map.cells.length; i++) if (map.cells[i] === Cell.Walk && reach[i]) out.push(i);
    return { spawnCells: out, reach };
  }, [map.key, spawnCell]);
  const sectorsW = Math.ceil(map.w / SECTOR);
  const sectorOf = (x: number, y: number) => Math.floor(y / SECTOR) * sectorsW + Math.floor(x / SECTOR);

  const pickSlot = () => {
    const pool = walkTable.length ? walkTable : table;
    if (!pool.length) return null;
    let r = Math.random() * pool.reduce((a, x) => a + x.weight, 0);
    const x = pool.find((t) => (r -= t.weight) <= 0) ?? pool[0];
    return { species: x.slot.species, level: x.slot.min + Math.floor(Math.random() * (x.slot.max - x.slot.min + 1)) };
  };
  /** Célula livre sorteada em qualquer ponto do mapa (longe do líder e dos outros selvagens). */
  const randomCell = (m: Model): { x: number; y: number } | null => {
    for (let tries = 0; tries < 60; tries++) {
      const i = spawnCells[Math.floor(Math.random() * spawnCells.length)];
      if (i === undefined) return null;
      const x = i % map.w, y = (i / map.w) | 0;
      if (Math.hypot(x - m.px, y - m.py) < 3 && tries < 50) continue;
      if (m.mons.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < 2)) continue;
      return { x, y };
    }
    return null;
  };
  /**
   * Varredura: nota de um destino = há quanto tempo o setor não é visitado − distância. O líder vai cobrindo o mapa
   * todo em vez de lutar sempre perto de onde está (e evita atravessar o mapa de uma vez só).
   */
  const destScore = (m: Model, x: number, y: number) => {
    const d = Math.hypot(x - m.px, y - m.py);
    const stale = Math.min(120, (now - (m.visits[sectorOf(x, y)] ?? 0)) / 1000);
    return stale - d * 1.4 - (d < 3 ? 40 : 0) - (d > 22 ? (d - 22) * 4 : 0);
  };
  const bestCell = (m: Model): { x: number; y: number } | null => {
    let best: { x: number; y: number } | null = null, bestS = -Infinity;
    for (let k = 0; k < 24; k++) {
      const c = randomCell(m);
      if (!c) break;
      const sc = destScore(m, c.x, c.y);
      if (sc > bestS) [best, bestS] = [c, sc];
    }
    return best;
  };
  const spawn = (m: Model, species: string, level: number, at?: { x: number; y: number } | null, trainer?: string): Mon | null => {
    const pt = at ?? randomCell(m);
    if (!pt) return null;
    const mon: Mon = { key: ++m.seq, species, level, ...pt, dir: Math.floor(Math.random() * 8), moveAt: now + 1500 + Math.random() * 3000, movingUntil: 0, born: now, state: 'idle', downAt: 0, trainer };
    m.mons.push(mon);
    return mon;
  };

  // ---------------------------------------------------------------- modelo
  let m = ref.current;
  if (!m || m.key !== map.key) {
    // Ponto de partida: célula andável mais próxima do "centro de massa" das células de encontro.
    let sx = 0, sy = 0;
    for (const i of spawnCells) { sx += i % map.w; sy += (i / map.w) | 0; }
    const cx = spawnCells.length ? sx / spawnCells.length : map.w / 2;
    const cy = spawnCells.length ? sy / spawnCells.length : map.h / 2;
    const near = findPath(map, { x: Math.round(cx), y: Math.round(cy) }, (x, y) => map.cells[y * map.w + x] === Cell.Walk && reach[y * map.w + x] === 1, () => true, 20000);
    const home = near ? near[near.length - 1] : { x: Math.round(cx), y: Math.round(cy) };
    m = ref.current = {
      key: map.key, mons: [], seq: 0, px: home.x, py: home.y, dir: 0, path: [], walkTotal: 1, plan: null, target: null, inBattle: false, home,
      visits: new Float64Array(sectorsW * Math.ceil(map.h / SECTOR)),
    };
    if (!area.gym && !area.league) {
      for (let i = 0; i < populationOf(spawnCells.length); i++) {
        const sl = pickSlot();
        if (sl) {
          const mon = spawn(m, sl.species, sl.level);
          if (mon) mon.born = now - 1000;
        }
      }
    }
  }
  const fx = app.fx.value.filter((f) => now - f.at < 2600);
  const recent = (kind: Fx['kind'], side: Fx['side'] | null, ms: number) =>
    [...fx].reverse().find((f) => f.kind === kind && (side === null || f.side === side) && now - f.at < ms);

  if (m.inBattle && ex.phase !== 'battle') {
    m.inBattle = false;
    const t = m.mons.find((x) => x.key === m!.target);
    if (t) {
      t.state = recent('caught', 'foe', 2500) ? 'caught' : 'down';
      t.downAt = now;
    }
    m.target = null;
  }
  m.mons = m.mons.filter((x) => !((x.state === 'down' || x.state === 'caught') && now - x.downAt > BODY_MS));

  // Novo encontro: escolhe o alvo (um selvagem da mesma espécie já em cena, ou um novo no mato) e o caminho até ele.
  if (ex.phase === 'walking' && ex.next && ex.next !== m.plan) {
    m.plan = ex.next;
    const plan = ex.next;
    let t: Mon | undefined;
    const dest = bestCell(m);
    if (plan.kind === 'wild' && !plan.legendary) {
      // Um selvagem da espécie já em cena, se estiver num ponto tão bom quanto o destino sorteado.
      const same = m.mons.filter((x) => x.state === 'idle' && x.species === plan.species && !x.trainer)
        .map((x) => ({ x, s: destScore(m!, x.x, x.y) })).sort((a, c) => c.s - a.s)[0];
      if (same && (!dest || same.s >= destScore(m, dest.x, dest.y) - 15)) t = same.x;
    }
    if (!t) t = spawn(m, plan.species, plan.level, dest, plan.kind === 'wild' ? undefined : plan.trainerName) ?? undefined;
    if (t) {
      t.level = plan.level;
      t.state = 'target';
      m.target = t.key;
      const tx = t.x, ty = t.y;
      const path = findPath(map, { x: m.px, y: m.py }, (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1, passable)
        ?? findPath(map, { x: m.px, y: m.py }, (x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= 2, () => true);
      m.path = path ?? [{ x: m.px, y: m.py }, { x: tx - 1, y: ty }];
      m.walkTotal = Math.max(ex.timer, 400);
    }
  }

  // Caminhada ao longo do caminho (proporcional ao tempo restante do core).
  if (ex.phase === 'walking' && m.plan && m.target !== null && m.path.length > 1) {
    const p = clamp(1 - ex.timer / m.walkTotal, 0, 1);
    const segs = m.path.length - 1;
    const f = p * segs;
    const i = Math.min(segs - 1, Math.floor(f));
    const a = m.path[i], c = m.path[i + 1];
    const k = f - i;
    m.px = a.x + (c.x - a.x) * k;
    m.py = a.y + (c.y - a.y) * k;
    m.dir = directionRow(c.x - a.x, c.y - a.y);
  } else if (ex.phase === 'battle' && b) {
    let t = m.mons.find((x) => x.key === m!.target);
    if (!t) {
      const mon = spawn(m, b.foe.species, b.foe.level);
      if (mon) {
        mon.x = Math.round(m.px) + 1;
        mon.y = Math.round(m.py);
        mon.state = 'target';
        m.target = mon.key;
        t = mon;
      }
    }
    if (t) {
      t.species = b.foe.species;
      t.level = b.foe.level;
      t.shiny = b.foe.shiny;
      t.trainer = b.trainer ? `${b.trainer.trainerClass} ${b.trainer.name}` : undefined;
      m.dir = directionRow(t.x - m.px, t.y - m.py);
      t.dir = directionRow(m.px - t.x, m.py - t.y);
    }
    m.inBattle = true;
  } else if (ex.phase === 'healing') {
    m.px += (m.home.x - m.px) * 0.1;
    m.py += (m.home.y - m.py) * 0.1;
  }

  // Passeio dos selvagens: um passo para uma célula vizinha do mesmo tipo, de vez em quando.
  for (const mon of m.mons) {
    if (mon.state !== 'idle' || now < mon.moveAt) continue;
    mon.moveAt = now + 2200 + Math.random() * 4500;
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
    const nx = mon.x + dx, ny = mon.y + dy;
    const c = map.cells[ny * map.w + nx];
    if (c !== spawnCell && !(spawnCell === Cell.Grass && c === Cell.Walk && Math.random() < 0.3)) continue;
    if (Math.hypot(nx - m.px, ny - m.py) < 2 || m.mons.some((o) => o !== mon && o.x === nx && o.y === ny)) continue;
    mon.dir = directionRow(dx, dy);
    mon.x = nx;
    mon.y = ny;
    mon.movingUntil = now + 700;
  }
  // Reposição: novos selvagens nascem em pontos aleatórios do mapa inteiro.
  if (!area.gym && !area.league && ex.phase !== 'healing' && m.mons.filter((x) => x.state === 'idle').length < populationOf(spawnCells.length) && Math.random() < 0.05) {
    const sl = pickSlot();
    if (sl) spawn(m, sl.species, sl.level);
  }
  m.visits[sectorOf(Math.round(m.px), Math.round(m.py))] = now;

  // ---------------------------------------------------------------- câmera
  const worldW = map.w * T, worldH = map.h * T;
  const camX = clamp(m.px * T + T / 2 - vw / 2, 0, Math.max(0, worldW - vw));
  const camY = clamp(m.py * T + T / 2 - vh / 2, 0, Math.max(0, worldH - vh));

  const lead = activeMember(s) ?? (s.party[0] ? s.pokemon[s.party[0]] : null);
  const leadMax = lead ? maxHpOf(s, app.data, lead) : 1;
  const throwFx = recent('throw', 'foe', 1500);
  const hitOnFoe = recent('hit', 'foe', 420);
  const hitOnMe = recent('hit', 'player', 420);
  const target = m.mons.find((x) => x.key === m!.target);
  const shots = fx.filter((f) => (f.kind === 'hit' || f.kind === 'miss') && now - f.at < 520 && f.moveType);
  const nightClass = hourKey >= 20 || hourKey < 4 ? 'is-night' : hourKey < 10 ? 'is-morning' : '';
  const at = (x: number, y: number) => ({ left: `${x * T + T / 2}px`, top: `${y * T + T}px` });

  const pops = (side: 'player' | 'foe') =>
    fx.filter((f) => f.side === side && now - f.at < 1100 && f.text && f.kind !== 'throw').map((f, i) => (
      <span key={f.id} class={`fe__pop fe__pop--${f.kind} ${f.tone ? `is-${f.tone}` : ''}`} style={{ '--i': i }}>{f.text}</span>
    ));
  const moveName = (side: 'player' | 'foe') => {
    const f = [...fx].reverse().find((x) => (x.kind === 'hit' || x.kind === 'miss') && x.side !== side && now - x.at < 900 && x.move);
    return f ? <span key={`mv${f.id}`} class={`fe__move type-${f.moveType}`}>{f.move}</span> : null;
  };

  const sprites: preact.JSX.Element[] = [];
  const huds: preact.JSX.Element[] = [];
  for (const mon of m.mons) {
    const sp = speciesOf(app.data, mon.species);
    const isTarget = mon.key === m.target && ex.phase === 'battle' && b;
    const absorbed = !!(isTarget && throwFx && now - throwFx.at > 380 && (throwFx.success || now - throwFx.at < 1250));
    const anim: AnimName = mon.state === 'down' ? 'Faint' : isTarget && hitOnFoe?.kind === 'hit' ? 'Hurt' : isTarget && hitOnMe ? 'Attack' : now < mon.movingUntil ? 'Walk' : 'Idle';
    const seen = (s.pokedex[mon.species]?.seen ?? 0) > 0;
    sprites.push(
      <PmdSprite key={`m${mon.key}`} dex={sp.id} shiny={!!mon.shiny} anim={anim} dir={mon.dir} scale={scale} bump={bump}
        class={`${mon.state === 'down' ? 'is-down' : ''} ${mon.state === 'caught' || absorbed ? 'is-absorbed' : ''} ${now - mon.born < 500 ? 'is-born' : ''} ${mon.state === 'idle' ? 'is-wander' : ''}`}
        style={{ ...at(mon.x, mon.y), zIndex: Math.round(mon.y * 10) }} />,
    );
    if (mon.state === 'down' || mon.state === 'caught') {
      if (now - mon.downAt < 1300) huds.push(<div key={`h${mon.key}`} class="mhud" style={at(mon.x, mon.y)}>{pops('foe')}</div>);
      continue;
    }
    huds.push(
      <div key={`h${mon.key}`} class={`mhud ${mon.state === 'idle' ? 'is-wander' : ''}`} style={at(mon.x, mon.y)}>
        <div class={`fe__hud ${isTarget ? '' : 'is-mini'}`}>
          <span class="fe__name">{(isTarget ? b!.foe.shiny : mon.shiny) && <span class="pk-shiny">✦ </span>}{seen || isTarget ? sp.name : '???'}<b>Nv {isTarget ? b!.foe.level : mon.level}</b></span>
          <HpBar value={isTarget ? b!.foe.hp : 1} max={isTarget ? b!.foe.maxHp : 1} />
        </div>
        {mon.trainer && mon.state === 'target' && <div class="fe__tag">{mon.trainer}</div>}
        {isTarget && <span class="fe__brackets" aria-hidden="true" />}
        {isTarget && moveName('foe')}
        {isTarget && pops('foe')}
      </div>,
    );
  }
  if (lead && s.player.starterChosen) {
    const sp = speciesOf(app.data, lead.species);
    const walking = ex.phase === 'walking' && m.plan !== null && m.target !== null;
    const anim: AnimName = lead.fainted ? 'Faint' : hitOnMe?.kind === 'hit' ? 'Hurt' : hitOnFoe ? 'Attack' : walking || ex.phase === 'healing' ? 'Walk' : 'Idle';
    sprites.push(
      <PmdSprite key="me" dex={sp.id} shiny={lead.shiny} anim={anim} dir={m.dir} scale={scale} bump={bump} class="is-me"
        style={{ ...at(m.px, m.py), zIndex: Math.round(m.py * 10) + 1 }} />,
    );
    huds.push(
      <div key="hme" class="mhud is-me" style={at(m.px, m.py)}>
        <div class="fe__hud fe__hud--me">
          <span class="fe__name">{displayName(app.data, lead)}<b>Nv {lead.level}</b></span>
          <HpBar value={lead.fainted ? 0 : lead.hp} max={leadMax} />
        </div>
        {moveName('player')}
        {pops('player')}
      </div>,
    );
  }

  return (
    <div ref={box} class={`mapscene ${nightClass}`} role="img" aria-label={`Mapa: ${area.name}`}>
      <div class="mapscene__world" style={{ width: `${worldW}px`, height: `${worldH}px`, transform: `translate(${-camX}px, ${-camY}px)` }}>
        <div ref={baseRef} class="mapscene__layer" />
        {sprites}
        <div ref={overRef} class="mapscene__layer is-over" />
        <div class="mapscene__huds">
          {huds}
          {target && shots.map((f) => {
            const fromMe = f.side === 'foe';
            const a = fromMe ? { x: m!.px, y: m!.py } : target;
            const z = fromMe ? target : { x: m!.px, y: m!.py };
            return (
              <span key={`s${f.id}`} class={`shot type-${f.moveType} ${f.kind === 'miss' ? 'is-miss' : ''}`}
                style={{ '--x0': `${a.x * T + T / 2}px`, '--y0': `${a.y * T + T * 0.4}px`, '--x1': `${z.x * T + T / 2}px`, '--y1': `${z.y * T + T * 0.4}px` }}>
                <i />
              </span>
            );
          })}
          {throwFx && target && (
            <span key={throwFx.id} class={`field__ball ${throwFx.success ? 'is-success' : 'is-fail'}`}
              style={{ '--x0': `${m.px * T + T / 2}px`, '--y0': `${m.py * T}px`, '--x1': `${target.x * T + T / 2}px`, '--y1': `${target.y * T + T * 0.3}px` }}>
              <span class="field__ball-arc"><ItemIcon id={throwFx.ball ?? 'poke-ball'} size={32} /></span>
            </span>
          )}
        </div>
      </div>
      {ex.phase === 'healing' && <div class="field__center">Centro Pokémon · {Math.ceil(Math.max(0, ex.timer) / 1000)}s</div>}
      {!table.length && !area.gym && !area.league && s.player.starterChosen && (
        <div class="field__hint">Nenhum Pokémon disponível agora. Esta área exige Vara de Pesca, Surf ou outro horário.</div>
      )}
    </div>
  );
}

/** Sprite PMD animado por CSS (quadros em linha; a linha da folha é a direção). Sem PMD: sprite comum. */
export function PmdSprite(props: { dex: number; shiny: boolean; anim: AnimName; dir: number; scale: number; bump: () => void; class: string; style: Record<string, string | number> }) {
  const set = usePmd(props.dex, props.shiny, props.bump);
  if (!set) {
    return (
      <div class={`msprite is-fallback ${props.class}`} style={props.style}>
        <span class="msprite__shadow" />
        <span style={{ transform: props.dir === 2 || props.dir === 1 || props.dir === 3 ? 'scaleX(-1)' : undefined, display: 'block' }}>
          <Sprite id={props.dex} shiny={props.shiny} size={96} />
        </span>
      </div>
    );
  }
  const a = set[props.anim] ?? (props.anim === 'Idle' ? set.Walk : props.anim === 'Faint' ? set.Hurt ?? set.Walk : set.Walk)!;
  const sc = props.scale;
  return (
    <div class={`msprite anim-${props.anim} ${props.class}`} style={props.style}>
      <span class="msprite__shadow" style={{ width: `${Math.max(14, a.fw * 0.42) * sc}px` }} />
      <span
        key={`${props.anim}-${a.url}`}
        class="msprite__img"
        style={{
          width: `${a.fw * sc}px`, height: `${a.fh * sc}px`,
          backgroundImage: `url(${a.url})`, backgroundSize: `${a.fw * a.frames * sc}px auto`,
          backgroundPositionY: `${-props.dir * a.fh * sc}px`,
          marginTop: `${-(a.fh / 2 + 6) * sc}px`, marginLeft: `${(-a.fw / 2) * sc}px`,
          '--end': `${-a.fw * a.frames * sc}px`, '--steps': a.frames, '--dur': `${props.anim === 'Idle' ? a.ms * 1.4 : a.ms}ms`,
          '--iter': props.anim === 'Attack' || props.anim === 'Hurt' || props.anim === 'Faint' ? 1 : 'infinite',
        }}
      />
    </div>
  );
}

function HpBar({ value, max }: { value: number; max: number }) {
  const r = clamp(value / Math.max(1, max), 0, 1);
  const color = r > 0.5 ? 'var(--hp-high)' : r > 0.2 ? 'var(--hp-mid)' : 'var(--hp-low)';
  return (
    <span class="fe__hp" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.ceil(value)} aria-label="PS">
      <i style={{ width: `${r * 100}%`, background: color }} />
    </span>
  );
}
