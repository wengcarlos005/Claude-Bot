// Cena da rota vista de cima: o Pokémon ativo anda pela clareira até o próximo encontro (já sorteado pelo core no
// início da caminhada) e batalha ali mesmo. Os outros selvagens da tabela da área passeiam pela clareira com nome,
// nível e PS. Tudo aqui é apresentação: posições e passeios usam Math.random só na UI; quem decide é o core.
import { useMemo, useRef } from 'preact/hooks';
import { ItemIcon, Sprite, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { encounterTable } from '../../core/systems/exploration';
import type { EncounterPlan } from '../../core/state/types';
import type { Fx } from '../../app/GameApp';
import { fieldArt, inClearing, type FieldArt } from './art';

interface Mon {
  key: number;
  species: string;
  level: number;
  x: number;
  y: number;
  flip: boolean;
  moveAt: number;
  born: number;
  state: 'idle' | 'target' | 'down' | 'caught';
  downAt: number;
  trainer?: string;
  shiny?: boolean;
}

interface Model {
  areaId: string;
  art: FieldArt;
  mons: Mon[];
  seq: number;
  px: number;
  py: number;
  flip: boolean;
  from: { x: number; y: number };
  to: { x: number; y: number };
  walkTotal: number;
  plan: EncounterPlan | null;
  target: number | null;
  inBattle: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const BODY_MS = 3200;

/** Ponto aleatório dentro da clareira (k = fração do raio). */
function pointIn(art: FieldArt, k = 0.85): { x: number; y: number } {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * k;
  return { x: art.clearing.cx + Math.cos(a) * art.clearing.rx * r, y: art.clearing.cy + Math.sin(a) * art.clearing.ry * r };
}

export function RouteField({ hud = true }: { hud?: boolean }) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const ex = s.exploration;
  const b = ex.battle;
  const now = performance.now();
  const ref = useRef<Model | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Distância entre o jogador e o oponente na batalha: ~170 px, em % da largura da cena.
  const width = Math.max(240, box.current?.clientWidth ?? 1100);
  const gap = Math.max(10, ((width < 700 ? 115 : 170) / width) * 100);
  const hourKey = new Date().getHours();
  const table = useMemo(
    () => encounterTable(s, area, Date.now()).filter((x) => x.slot.method === 'walk' || x.slot.method === 'surf'),
    [area.id, hourKey, Object.keys(s.inventory).length],
  );

  const pickSlot = (): { species: string; level: number } | null => {
    if (!table.length) return null;
    let r = Math.random() * table.reduce((a, x) => a + x.weight, 0);
    const x = table.find((t) => (r -= t.weight) <= 0) ?? table[0];
    return { species: x.slot.species, level: x.slot.min + Math.floor(Math.random() * (x.slot.max - x.slot.min + 1)) };
  };
  const spawn = (m: Model, species: string, level: number, near?: { x: number; y: number }, trainer?: string): Mon => {
    let pt = pointIn(m.art);
    for (let i = 0; i < 14; i++) {
      const far = !near || Math.hypot(pt.x - near.x, (pt.y - near.y) * 1.6) > 22;
      const free = m.mons.every((o) => Math.hypot(pt.x - o.x, (pt.y - o.y) * 1.6) > 12);
      if (far && free) break;
      pt = pointIn(m.art);
    }
    const mon: Mon = { key: ++m.seq, species, level, ...pt, flip: Math.random() < 0.5, moveAt: now + 1500 + Math.random() * 3000, born: now, state: 'idle', downAt: 0, trainer };
    m.mons.push(mon);
    return mon;
  };

  // ---------------------------------------------------------------- modelo da cena
  let m = ref.current;
  if (!m || m.areaId !== area.id) {
    const art = fieldArt(area);
    const start = { x: art.clearing.cx - art.clearing.rx * 0.6, y: art.clearing.cy };
    m = ref.current = {
      areaId: area.id, art, mons: [], seq: 0, px: start.x, py: start.y, flip: true,
      from: { ...start }, to: { ...start }, walkTotal: 1, plan: null, target: null, inBattle: false,
    };
    if (!area.gym && !area.league) {
      for (let i = 0; i < (width < 700 ? 3 : 5); i++) {
        const sl = pickSlot();
        if (sl) spawn(m, sl.species, sl.level, start).born = now - 1000;
      }
    }
  }
  const fx = app.fx.value.filter((f) => now - f.at < 2600);
  const recent = (kind: Fx['kind'], side: Fx['side'] | null, ms: number) =>
    [...fx].reverse().find((f) => f.kind === kind && (side === null || f.side === side) && now - f.at < ms);

  // Fim da batalha: o alvo fica caído (ou dentro da bola) por alguns segundos.
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

  // Novo encontro planejado: escolhe (ou faz surgir) o alvo e traça a caminhada até ele.
  if (ex.phase === 'walking' && ex.next && ex.next !== m.plan) {
    m.plan = ex.next;
    const plan = ex.next;
    let t: Mon | undefined;
    if (plan.kind === 'wild' && !plan.legendary) {
      t = m.mons.filter((x) => x.state === 'idle' && x.species === plan.species && !x.trainer)
        .sort((a, c) => Math.hypot(a.x - m!.px, a.y - m!.py) - Math.hypot(c.x - m!.px, c.y - m!.py))[0];
    }
    if (!t) {
      t = spawn(m, plan.species, plan.level, { x: m.px, y: m.py }, plan.kind === 'wild' ? undefined : plan.trainerName);
      if (plan.kind === 'challenge') {
        t.x = m.art.clearing.cx + m.art.clearing.rx * 0.4;
        t.y = m.art.clearing.cy;
      }
    }
    t.level = plan.level;
    t.state = 'target';
    m.target = t.key;
    const c = m.art.clearing;
    const side = t.x > m.px ? -1 : 1;
    let tx = t.x + side * gap;
    if (!inClearing(c, tx, t.y, 2)) tx = t.x - side * gap;
    if (!inClearing(c, tx, t.y, 2)) {
      t.x = c.cx + gap / 2;
      tx = c.cx - gap / 2;
    }
    m.from = { x: m.px, y: m.py };
    m.to = { x: tx, y: t.y };
    m.walkTotal = Math.max(ex.timer, 400);
    t.flip = m.to.x > t.x;
  }

  if (ex.phase === 'walking' && m.plan && m.target !== null) {
    const p = ease(clamp(1 - ex.timer / m.walkTotal, 0, 1));
    m.px = m.from.x + (m.to.x - m.from.x) * p;
    m.py = m.from.y + (m.to.y - m.from.y) * p;
    m.flip = m.to.x > m.from.x;
  } else if (ex.phase === 'battle' && b) {
    let t = m.mons.find((x) => x.key === m!.target);
    if (!t) {
      // Batalha já em andamento (ex.: ao abrir a página): coloca o oponente ao lado.
      t = spawn(m, b.foe.species, b.foe.level);
      t.x = clamp(m.px + gap, 8, 92);
      t.y = m.py;
      t.state = 'target';
      m.target = t.key;
    }
    t.species = b.foe.species;
    t.level = b.foe.level;
    t.shiny = b.foe.shiny;
    t.trainer = b.trainer ? `${b.trainer.trainerClass} ${b.trainer.name}` : undefined;
    t.flip = m.px > t.x;
    m.flip = t.x > m.px;
    m.inBattle = true;
  } else if (ex.phase === 'healing') {
    m.px += (3 - m.px) * 0.06;
    m.flip = false;
  }

  // Passeio dos selvagens e reposição da população. Quem estiver perto da batalha se afasta.
  const fight = m.mons.find((x) => x.key === m!.target);
  for (const mon of m.mons) {
    if (mon.state === 'idle') {
      const near = (o: { x: number; y: number }) => Math.hypot(mon.x - o.x, (mon.y - o.y) * 1.6) < 15;
      if (near({ x: m.px, y: m.py }) || (fight && near(fight)) || (m.target !== null && near(m.to))) {
        for (let i = 0; i < 10; i++) {
          const pt = pointIn(m.art);
          if (Math.hypot(pt.x - m.px, (pt.y - m.py) * 1.6) > 22 && (!fight || Math.hypot(pt.x - fight.x, (pt.y - fight.y) * 1.6) > 22)) {
            mon.flip = pt.x > mon.x;
            mon.x = pt.x;
            mon.y = pt.y;
            break;
          }
        }
        mon.moveAt = now + 3000;
        continue;
      }
    }
    if (mon.state !== 'idle' || now < mon.moveAt) continue;
    const nx = mon.x + (Math.random() - 0.5) * 18;
    const ny = mon.y + (Math.random() - 0.5) * 14;
    mon.moveAt = now + 2500 + Math.random() * 4500;
    if (!inClearing(m.art.clearing, nx, ny, 3) || Math.hypot(nx - m.px, (ny - m.py) * 1.6) < 12) continue;
    mon.flip = nx > mon.x;
    mon.x = nx;
    mon.y = ny;
  }
  if (!area.gym && !area.league && ex.phase !== 'healing' && m.mons.filter((x) => x.state === 'idle').length < 4 && Math.random() < 0.05) {
    const sl = pickSlot();
    if (sl) spawn(m, sl.species, sl.level, { x: m.px, y: m.py });
  }

  // ---------------------------------------------------------------- render
  const lead = activeMember(s) ?? (s.party[0] ? s.pokemon[s.party[0]] : null);
  const leadMax = lead ? maxHpOf(s, app.data, lead) : 1;
  const nightClass = hourKey >= 20 || hourKey < 4 ? 'field--night' : hourKey < 10 ? 'field--morning' : '';
  const throwFx = recent('throw', 'foe', 1500);
  const hitOnFoe = recent('hit', 'foe', 380) ?? recent('miss', 'foe', 380);
  const hitOnMe = recent('hit', 'player', 380) ?? recent('miss', 'player', 380);
  const target = m.mons.find((x) => x.key === m!.target);
  const shots = fx.filter((f) => (f.kind === 'hit' || f.kind === 'miss') && now - f.at < 520 && f.moveType);
  const { y: c0, ry } = { y: m.art.clearing.cy - m.art.clearing.ry, ry: m.art.clearing.ry * 2 };

  const pops = (side: 'player' | 'foe') =>
    fx.filter((f) => f.side === side && now - f.at < 1100 && f.text && f.kind !== 'throw').map((f, i) => (
      <span key={f.id} class={`fe__pop fe__pop--${f.kind} ${f.tone ? `is-${f.tone}` : ''}`} style={{ '--i': i }}>{f.text}</span>
    ));
  const moveName = (side: 'player' | 'foe') => {
    const f = [...fx].reverse().find((x) => (x.kind === 'hit' || x.kind === 'miss') && x.side !== side && now - x.at < 900 && x.move);
    return f ? <span key={`mv${f.id}`} class={`fe__move type-${f.moveType}`}>{f.move}</span> : null;
  };

  const ents: preact.JSX.Element[] = [];
  for (const mon of m.mons) {
    const sp = speciesOf(app.data, mon.species);
    const isTarget = mon.key === m.target && ex.phase === 'battle' && b;
    const absorbed = isTarget && throwFx && now - throwFx.at > 380 && (throwFx.success || now - throwFx.at < 1250);
    const depth = 0.8 + 0.35 * clamp((mon.y - c0) / ry, 0, 1);
    const seen = (s.pokedex[mon.species]?.seen ?? 0) > 0;
    const cls = ['fe', mon.state === 'down' ? 'is-down' : '', mon.state === 'caught' ? 'is-caught' : '', now - mon.born < 500 ? 'is-born' : '',
      mon.state === 'idle' ? 'is-wander' : '', isTarget ? 'is-targeted' : ''].join(' ');
    ents.push(
      <div key={`m${mon.key}`} class={cls} style={{ left: `${mon.x}%`, top: `${mon.y}%`, zIndex: Math.round(mon.y * 10), '--s': depth }}>
        {hud && mon.state !== 'down' && mon.state !== 'caught' && (
          <div class={`fe__hud ${isTarget ? '' : 'is-mini'}`}>
            <span class="fe__name">{(isTarget ? b!.foe.shiny : mon.shiny) && <span class="pk-shiny">✦ </span>}{seen || isTarget ? sp.name : '???'}<b>Nv {isTarget ? b!.foe.level : mon.level}</b></span>
            <HpBar value={isTarget ? b!.foe.hp : 1} max={isTarget ? b!.foe.maxHp : 1} />
          </div>
        )}
        {mon.trainer && mon.state === 'target' && <div class="fe__tag">{mon.trainer}</div>}
        <div class="fe__body" style={{ transform: mon.flip ? 'scaleX(-1)' : undefined }}>
          <div key={isTarget && hitOnFoe ? hitOnFoe.id : 'n'} class={`fe__anim ${isTarget && hitOnFoe?.kind === 'hit' ? 'is-hit' : ''} ${isTarget && hitOnMe ? 'is-lunge' : ''} ${absorbed ? 'is-absorbed' : ''}`}>
            <Sprite id={sp.id} shiny={mon.shiny} animated size={96} />
          </div>
        </div>
        <span class="fe__shadow" />
        {isTarget && <span class="fe__brackets" aria-hidden="true" />}
        {isTarget && moveName('foe')}
        {isTarget && pops('foe')}
        {(mon.state === 'down' || mon.state === 'caught') && now - mon.downAt < 1300 && pops('foe')}
      </div>,
    );
  }
  if (lead && s.player.starterChosen) {
    const sp = speciesOf(app.data, lead.species);
    ents.push(
      <div key="me" class={`fe fe--me ${ex.phase === 'walking' && m.plan ? 'is-walking' : ''} ${lead.fainted ? 'is-fainted' : ''}`} style={{ left: `${m.px}%`, top: `${m.py}%`, zIndex: Math.round(m.py * 10) + 1, '--s': 1.12 }}>
        {hud && (
          <div class="fe__hud fe__hud--me">
            <span class="fe__name">{displayName(app.data, lead)}<b>Nv {lead.level}</b></span>
            <HpBar value={lead.fainted ? 0 : lead.hp} max={leadMax} />
          </div>
        )}
        <div class="fe__body" style={{ transform: m.flip ? 'scaleX(-1)' : undefined }}>
          <div key={hitOnMe ? hitOnMe.id : hitOnFoe ? `l${hitOnFoe.id}` : 'n'} class={`fe__anim ${hitOnMe?.kind === 'hit' ? 'is-hit' : ''} ${hitOnFoe ? 'is-lunge' : ''}`}>
            <Sprite id={sp.id} shiny={lead.shiny} animated size={96} />
          </div>
        </div>
        <span class="fe__shadow" />
        {moveName('player')}
        {pops('player')}
      </div>,
    );
  }

  return (
    <div ref={box} class={`field field--${m.art.biome} ${nightClass}`} style={{ backgroundImage: `url("${m.art.ground}")` }} role="img" aria-label={`Cena: ${area.name}`}>
      {m.art.decor.map((d) => (
        <span key={d.key} class="field__decor" style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, aspectRatio: `1 / ${d.ratio}`, backgroundImage: d.img, zIndex: Math.round(d.y * 10) }} />
      ))}
      {ents}
      {target && shots.map((f) => {
        // Projétil do atacante até o alvo, na cor do tipo do golpe.
        const fromMe = f.side === 'foe';
        const a = fromMe ? { x: m!.px, y: m!.py } : target;
        const z = fromMe ? target : { x: m!.px, y: m!.py };
        return (
          <span key={`s${f.id}`} class={`shot type-${f.moveType} ${f.kind === 'miss' ? 'is-miss' : ''}`}
            style={{ '--x0': `${a.x}%`, '--y0': `${a.y - 5}%`, '--x1': `${z.x}%`, '--y1': `${z.y - 5}%`, zIndex: 2500 }}>
            <i />
          </span>
        );
      })}
      {throwFx && target && (
        <span key={throwFx.id} class={`field__ball ${throwFx.success ? 'is-success' : 'is-fail'}`}
          style={{ '--x0': `${m.px}%`, '--y0': `${m.py - 8}%`, '--x1': `${target.x}%`, '--y1': `${target.y - 6}%`, zIndex: 2600 }}>
          <span class="field__ball-arc"><ItemIcon id={throwFx.ball ?? 'poke-ball'} size={32} /></span>
        </span>
      )}
      {ex.phase === 'healing' && <div class="field__center">Centro Pokémon · {Math.ceil(Math.max(0, ex.timer) / 1000)}s</div>}
      {!table.length && !area.gym && !area.league && s.player.starterChosen && (
        <div class="field__hint">Nenhum Pokémon a pé aqui agora. Esta área exige Vara de Pesca, Surf ou outro horário.</div>
      )}
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
