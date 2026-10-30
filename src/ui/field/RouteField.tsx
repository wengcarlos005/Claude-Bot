// Cena da rota: o Pokémon ativo anda pela área até o próximo encontro (já sorteado pelo core no início da caminhada)
// e batalha ali mesmo. Os outros selvagens da tabela da área ficam passeando pelo cenário. Tudo aqui é apresentação:
// posições e passeios usam Math.random só na UI; quem decide o encontro e o resultado é o core.
import { useMemo, useRef } from 'preact/hooks';
import { Sprite, ItemIcon, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { encounterTable } from '../../core/systems/exploration';
import type { EncounterPlan } from '../../core/state/types';
import type { Fx } from '../../app/GameApp';
import { fieldArt, type FieldArt } from './art';

interface Mon {
  key: number;
  species: string;
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

export function RouteField() {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const ex = s.exploration;
  const b = ex.battle;
  const now = performance.now();
  const ref = useRef<Model | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Distância entre o jogador e o oponente na batalha: ~140 px, em % da largura da cena (mais em telas estreitas).
  const gap = Math.max(14, (140 / Math.max(240, box.current?.clientWidth ?? 900)) * 100);
  const hourKey = new Date().getHours();
  const table = useMemo(
    () => encounterTable(s, area, Date.now()).filter((x) => x.slot.method === 'walk' || x.slot.method === 'surf'),
    [area.id, hourKey, Object.keys(s.inventory).length],
  );

  const [y0, y1] = ref.current?.art.walk ?? [45, 90];
  const pickSpecies = (): string | null => {
    if (!table.length) return null;
    let r = Math.random() * table.reduce((a, x) => a + x.weight, 0);
    for (const x of table) if ((r -= x.weight) <= 0) return x.slot.species;
    return table[0].slot.species;
  };
  const spawn = (m: Model, species: string, near?: { x: number; y: number }, trainer?: string): Mon => {
    let x = 0;
    let y = 0;
    for (let i = 0; i < 12; i++) {
      x = 10 + Math.random() * 80;
      y = m.art.walk[0] + Math.random() * (m.art.walk[1] - m.art.walk[0]);
      const far = !near || Math.hypot(x - near.x, (y - near.y) * 1.6) > 28;
      const free = m.mons.every((o) => Math.hypot(x - o.x, (y - o.y) * 1.6) > 14);
      if (far && free) break;
    }
    const mon: Mon = { key: ++m.seq, species, x, y, flip: Math.random() < 0.5, moveAt: now + 1500 + Math.random() * 3000, born: now, state: 'idle', downAt: 0, trainer };
    m.mons.push(mon);
    return mon;
  };

  // ---------------------------------------------------------------- modelo da cena
  let m = ref.current;
  if (!m || m.areaId !== area.id) {
    const art = fieldArt(area);
    m = ref.current = {
      areaId: area.id, art, mons: [], seq: 0, px: 14, py: (art.walk[0] + art.walk[1]) / 2, flip: true,
      from: { x: 14, y: 0 }, to: { x: 14, y: 0 }, walkTotal: 1, plan: null, target: null, inBattle: false,
    };
    m.from.y = m.to.y = m.py;
    if (!area.gym && !area.league) {
      for (let i = 0; i < 4; i++) {
        const sp = pickSpecies();
        if (sp) spawn(m, sp, { x: m.px, y: m.py }).born = now - 1000;
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
      t = spawn(m, plan.species, { x: m.px, y: m.py }, plan.kind === 'wild' ? undefined : plan.trainerName);
      if (plan.kind === 'challenge') {
        t.x = 72;
        t.y = (m.art.walk[0] + m.art.walk[1]) / 2;
      }
    }
    t.state = 'target';
    m.target = t.key;
    const side = t.x > m.px ? -1 : 1;
    if (t.x - gap < 6 && t.x + gap > 94) t.x = 50 + gap / 2;
    let tx = t.x + side * gap;
    if (tx < 6 || tx > 94) tx = t.x - side * gap;
    m.from = { x: m.px, y: m.py };
    m.to = { x: clamp(tx, 6, 94), y: t.y };
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
      t = spawn(m, b.foe.species);
      t.x = clamp(m.px + gap, 8, 92);
      t.y = m.py;
      t.state = 'target';
      m.target = t.key;
    }
    t.species = b.foe.species;
    t.shiny = b.foe.shiny;
    t.trainer = b.trainer ? `${b.trainer.trainerClass} ${b.trainer.name}` : undefined;
    t.flip = m.px > t.x;
    m.flip = t.x > m.px;
    m.inBattle = true;
  } else if (ex.phase === 'healing') {
    m.px += (5 - m.px) * 0.08;
    m.flip = false;
  }

  // Passeio dos selvagens e reposição da população.
  for (const mon of m.mons) {
    if (mon.state !== 'idle' || now < mon.moveAt) continue;
    const nx = clamp(mon.x + (Math.random() - 0.5) * 22, 6, 94);
    const ny = clamp(mon.y + (Math.random() - 0.5) * 14, m.art.walk[0], m.art.walk[1]);
    if (Math.hypot(nx - m.px, (ny - m.py) * 1.6) < 12) continue;
    mon.flip = nx > mon.x;
    mon.x = nx;
    mon.y = ny;
    mon.moveAt = now + 2500 + Math.random() * 4500;
  }
  if (!area.gym && !area.league && ex.phase !== 'healing' && m.mons.filter((x) => x.state === 'idle').length < 3 && Math.random() < 0.04) {
    const sp = pickSpecies();
    if (sp) spawn(m, sp, { x: m.px, y: m.py });
  }

  // ---------------------------------------------------------------- render
  const lead = activeMember(s) ?? (s.party[0] ? s.pokemon[s.party[0]] : null);
  const leadMax = lead ? maxHpOf(s, app.data, lead) : 1;
  const nightClass = hourKey >= 20 || hourKey < 4 ? 'field--night' : hourKey < 10 ? 'field--morning' : '';
  const throwFx = recent('throw', 'foe', 1500);
  const hitOnFoe = recent('hit', 'foe', 380);
  const hitOnMe = recent('hit', 'player', 380);
  const target = m.mons.find((x) => x.key === m!.target);
  const status = !s.player.starterChosen ? 'Escolha seu inicial'
    : ex.phase === 'healing' ? `Centro Pokémon · ${Math.ceil(Math.max(0, ex.timer) / 1000)}s`
    : ex.phase === 'battle' && b ? (b.trainer ? `${b.trainer.trainerClass} ${b.trainer.name}${b.foeQueue.length ? ` · +${b.foeQueue.length}` : ''}` : b.legendary ? 'Lendário' : 'Selvagem')
    : m.plan?.kind === 'wild' ? 'Indo até o próximo Pokémon' : m.plan ? `Desafio: ${m.plan.trainerName}` : 'Explorando';

  const pops = (side: 'player' | 'foe') =>
    fx.filter((f) => f.side === side && now - f.at < 1100 && f.text && f.kind !== 'throw').map((f, i) => (
      <span key={f.id} class={`fe__pop fe__pop--${f.kind} ${f.tone ? `is-${f.tone}` : ''}`} style={{ '--i': i }}>{f.text}</span>
    ));

  const ents: preact.JSX.Element[] = [];
  for (const mon of m.mons) {
    const sp = speciesOf(app.data, mon.species);
    const isTarget = mon.key === m.target && ex.phase === 'battle' && b;
    const absorbed = isTarget && throwFx && now - throwFx.at > 380 && (throwFx.success || now - throwFx.at < 1250);
    const scale = 0.78 + 0.36 * ((mon.y - y0) / Math.max(1, y1 - y0));
    const cls = [
      'fe',
      mon.state === 'down' ? 'is-down' : '',
      mon.state === 'caught' ? 'is-caught' : '',
      now - mon.born < 500 ? 'is-born' : '',
      mon.state === 'idle' ? 'is-wander' : '',
    ].join(' ');
    ents.push(
      <div key={`m${mon.key}`} class={cls} style={{ left: `${mon.x}%`, top: `${mon.y}%`, zIndex: Math.round(mon.y * 10), '--s': scale }}>
        {isTarget && b && (
          <div class="fe__hud">
            <span class="fe__name">{b.foe.shiny && <span class="pk-shiny">✦ </span>}{sp.name}<b>Nv {b.foe.level}</b></span>
            <HpBar value={b.foe.hp} max={b.foe.maxHp} />
          </div>
        )}
        {mon.trainer && mon.state === 'target' && !isTarget && <div class="fe__tag">{mon.trainer}</div>}
        <div class="fe__body" style={{ transform: mon.flip ? 'scaleX(-1)' : undefined }}>
          <div key={isTarget && hitOnFoe ? hitOnFoe.id : 'n'} class={`fe__anim ${isTarget && hitOnFoe ? 'is-hit' : ''} ${isTarget && hitOnMe ? 'is-lunge' : ''} ${absorbed ? 'is-absorbed' : ''}`}>
            <Sprite id={sp.id} shiny={mon.shiny} animated size={80} />
          </div>
        </div>
        <span class="fe__shadow" />
        {isTarget && pops('foe')}
        {(mon.state === 'down' || mon.state === 'caught') && now - mon.downAt < 1300 && pops('foe')}
      </div>,
    );
  }
  if (lead && s.player.starterChosen) {
    const sp = speciesOf(app.data, lead.species);
    ents.push(
      <div key="me" class={`fe fe--me ${ex.phase === 'walking' && m.plan ? 'is-walking' : ''} ${lead.fainted ? 'is-fainted' : ''}`} style={{ left: `${m.px}%`, top: `${m.py}%`, zIndex: Math.round(m.py * 10) + 1, '--s': 1 }}>
        <div class="fe__hud fe__hud--me">
          <span class="fe__name">{displayName(app.data, lead)}<b>Nv {lead.level}</b></span>
          <HpBar value={lead.fainted ? 0 : lead.hp} max={leadMax} />
        </div>
        <div class="fe__body" style={{ transform: m.flip ? 'scaleX(-1)' : undefined }}>
          <div key={hitOnMe ? hitOnMe.id : hitOnFoe ? `l${hitOnFoe.id}` : 'n'} class={`fe__anim ${hitOnMe ? 'is-hit' : ''} ${hitOnFoe ? 'is-lunge' : ''}`}>
            <Sprite id={sp.id} shiny={lead.shiny} animated size={88} />
          </div>
        </div>
        <span class="fe__shadow" />
        {pops('player')}
      </div>,
    );
  }

  return (
    <div ref={box} class={`field field--${m.art.biome} ${nightClass}`} style={{ background: m.art.background }} role="img" aria-label={`Cena: ${area.name}. ${status}`}>
      {m.art.decor.map((d) => (
        <span key={d.key} class="field__decor" style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}px`, aspectRatio: `1 / ${d.ratio}`, backgroundImage: d.img, zIndex: Math.round(d.y * 10) }} />
      ))}
      {ents}
      {throwFx && target && (
        <span
          key={throwFx.id}
          class={`field__ball ${throwFx.success ? 'is-success' : 'is-fail'}`}
          style={{ '--x0': `${m.px}%`, '--y0': `${m.py - 8}%`, '--x1': `${target.x}%`, '--y1': `${target.y - 6}%`, zIndex: 2000 }}
        >
          <span class="field__ball-arc"><ItemIcon id={throwFx.ball ?? 'poke-ball'} size={28} /></span>
        </span>
      )}
      {ex.phase === 'healing' && <div class="field__center">Centro Pokémon</div>}
      <div class="field__status">
        <span class={`field__dot ${ex.phase === 'battle' ? 'is-battle' : ex.phase === 'healing' ? 'is-heal' : ''}`} />
        {status}
      </div>
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
