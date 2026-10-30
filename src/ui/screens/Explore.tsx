// Hunt em tela cheia: a cena da rota ocupa a área toda e os painéis flutuam por cima (como num jogo).
import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { ScreenProps } from '../App';
import { CroppedSprite, Grade, ItemIcon, fmt, pct, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { ivGrade } from '../../core/formulas/stats';
import { encounterTable } from '../../core/systems/exploration';
import { isFarmArea, levelCap, trainerLevel, trainerXpForLevel, winsToClear } from '../../core/world';
import type { CaptureRule, Settings } from '../../core/state/types';
import { RouteField } from '../field/RouteField';
import { Meter } from '../hub/Hub';

function clock(ms: number): string {
  const t = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : fmt(n));

/** Painel flutuante com botão de recolher (lembra a escolha no navegador). */
function Float(props: { id: string; title: ComponentChildren; class: string; children: ComponentChildren; actions?: ComponentChildren }) {
  const key = `pkidle:hv:${props.id}`;
  const [closed, setClosed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setClosed(!closed);
    try {
      localStorage.setItem(key, closed ? '0' : '1');
    } catch {
      /* sem armazenamento: só nesta sessão */
    }
  };
  return (
    <section class={`hv ${props.class} ${closed ? 'is-closed' : ''}`}>
      <header class="hv__head">
        <h2 class="hv__title">{props.title}</h2>
        {!closed && props.actions}
        <button class="hv__x" onClick={toggle} aria-label={closed ? 'Mostrar painel' : 'Recolher painel'} aria-expanded={!closed}>{closed ? '+' : '×'}</button>
      </header>
      {!closed && <div class="hv__body">{props.children}</div>}
    </section>
  );
}

export function ExploreScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const region = app.data.regionById.get(area.regionId)!;
  const ex = s.exploration;
  const b = ex.battle;
  const status = ex.phase === 'healing' ? 'No Centro Pokémon' : ex.phase === 'battle' && b
    ? (b.trainer ? `Batalha: ${b.trainer.trainerClass} ${b.trainer.name}` : b.legendary ? 'Lendário!' : 'Batalha selvagem')
    : ex.next?.kind === 'wild' ? 'Indo até o próximo Pokémon' : ex.next ? `Desafio: ${ex.next.trainerName}` : 'Explorando';
  return (
    <div class="huntview">
      <RouteField />
      <div class="hv hv--area">
        <div class="hv-area__name">
          <span class="hv-area__region">{region.name}</span>
          <b>{area.name}</b>
          <span class="hv-area__meta">Nv {area.levelRange[0]}–{area.levelRange[1]} · Teto {levelCap(s, app.data)}{area.statMult > 1 ? ` · Tier ×${area.statMult.toFixed(2)}` : ''}</span>
        </div>
        <span class={`hv-chip ${ex.phase === 'battle' ? 'is-battle' : ex.phase === 'healing' ? 'is-heal' : ''}`}><i />{status}</span>
        <AreaProgress />
      </div>
      <HuntStats />
      <button class="hv hv--leave" onClick={() => go('map')}>Trocar área</button>
      <QuickItems go={go} />
      <div class="hv-right">
        <AreaMons />
        <RecentCaptures go={go} />
      </div>
      <HuntLog />
      <TeamStrip go={go} />
      <HuntControls go={go} />
    </div>
  );
}

function HuntStats() {
  const app = useApp();
  const s = app.state;
  const h = s.hunt;
  const hours = Math.max(h.durationMs, 60_000) / 3600_000;
  const net = h.money - (h.spent ?? 0);
  const tl = trainerLevel(s);
  const toNext = trainerXpForLevel(tl + 1) - s.player.trainerXp;
  const cell = (label: string, value: string, sub: string, tone = '') => (
    <div class={`hv-stat ${tone}`}>
      <span class="hv-stat__label">{label}</span>
      <b class="pk-num">{value}</b>
      <span class="hv-stat__sub pk-num">{sub}</span>
    </div>
  );
  return (
    <div class="hv hv--stats" role="group" aria-label="Métricas da sessão">
      {cell('Tempo', clock(h.durationMs), `${fmt(h.encounters)} encontros`)}
      {cell('Capturas', fmt(h.captures), `${(h.captures / hours).toFixed(1)}/h`)}
      {cell('Abates', fmt(h.wins), `${fmt(h.wins / hours)}/h`)}
      {cell('XP Pokémon', short(h.xp), `${short(h.xp / hours)}/h`)}
      {cell('XP Treinador', short(h.trainerXp ?? 0), `Nv ${tl + 1} em ${fmt(toNext)}`)}
      {cell('Lucro', `₽ ${short(net)}`, `₽ ${short(net / hours)}/h`, net < 0 ? 'is-bad' : 'is-good')}
    </div>
  );
}

function AreaProgress() {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  if (area.gym || area.league) {
    const seq = area.gym ? [...area.gym.trainers, area.gym.leader] : area.league!.members;
    return (
      <div class="hv-steps">
        {seq.map((t, i) => (
          <span key={t.id} class={`step ${i < s.exploration.sequenceIndex ? 'is-done' : i === s.exploration.sequenceIndex ? 'is-now' : ''}`}>{t.name}</span>
        ))}
      </div>
    );
  }
  const p = s.world.areas[area.id] ?? { wins: 0, trainersDefeated: [], cleared: false, encounters: 0 };
  const need = winsToClear(area);
  if (p.cleared) return <span class="hv-area__done">Área concluída</span>;
  if (!need) return null;
  return (
    <div class="hv-area__progress" title="Concluir a área é opcional e dá PP e XP de Treinador">
      <Meter value={p.wins} max={need} kind="trainer" text={`Concluir ${Math.min(p.wins, need)}/${need}`} />
      {area.routeTrainers.length > 0 && <span class="pk-num">Treinadores {p.trainersDefeated.length}/{area.routeTrainers.length}</span>}
    </div>
  );
}

function QuickItems({ go }: ScreenProps) {
  const app = useApp();
  const inv = app.state.inventory;
  const sum = (ids: string[]) => ids.reduce((a, id) => a + (inv[id] ?? 0), 0);
  const items: [string, number, string][] = [
    ['poke-ball', sum(['poke-ball', 'great-ball', 'ultra-ball', 'net-ball', 'dusk-ball', 'quick-ball', 'timer-ball', 'repeat-ball', 'nest-ball', 'heal-ball', 'luxury-ball', 'premier-ball']), 'Poké Balls'],
    ['potion', sum(['potion', 'super-potion', 'hyper-potion', 'max-potion']), 'Poções'],
    ['revive', sum(['revive', 'max-revive']), 'Revives'],
    ['rare-candy', inv['rare-candy'] ?? 0, 'Rare Candy'],
  ];
  return (
    <div class="hv hv--items" role="group" aria-label="Itens">
      {items.map(([id, n, label]) => (
        <button key={id} class="hv-item" onClick={() => go('bag')} title={`${label}: ${fmt(n)}`}>
          <ItemIcon id={id} size={34} />
          <span class="pk-num">{short(n)}</span>
        </button>
      ))}
    </div>
  );
}

function AreaMons() {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const hourKey = new Date().getHours();
  const table = useMemo(() => encounterTable(s, area, Date.now()), [area.id, hourKey, Object.keys(s.inventory).length]);
  let content: ComponentChildren;
  let title = 'Pokémon na área';
  if (!isFarmArea(area)) {
    const team = area.gym ? area.gym.leader.team : area.league!.members[area.league!.members.length - 1].team;
    const region = app.data.regionById.get(area.regionId)!;
    title = area.gym ? `Time de ${area.gym.leader.name}` : 'Time do Campeão';
    content = (
      <div class="hv-mons">
        {team.map((m, i) => (
          <div key={i} class="hv-mon">
            <CroppedSprite id={speciesOf(app.data, m.species).id} box={52} class={(s.pokedex[m.species]?.seen ?? 0) > 0 ? '' : 'is-silhouette'} />
            <span class="pk-num">Nv {Math.round(region.levelOffset + m.level * region.levelScale)}</span>
          </div>
        ))}
      </div>
    );
  } else {
    const merged = new Map<string, number>();
    for (const x of table) merged.set(x.slot.species, (merged.get(x.slot.species) ?? 0) + x.weight);
    content = merged.size === 0 ? <p class="hv-empty">Sem encontros agora: exige Vara de Pesca, Surf ou outro horário.</p> : (
      <div class="hv-mons">
        {[...merged.entries()].sort((a, b) => b[1] - a[1]).map(([key, w]) => {
          const seen = (s.pokedex[key]?.seen ?? 0) > 0;
          const caught = (s.pokedex[key]?.caught ?? 0) > 0;
          const sp = speciesOf(app.data, key);
          return (
            <div key={key} class={`hv-mon ${caught ? 'is-caught' : ''}`} title={`${seen ? sp.name : 'Ainda não visto'}${caught ? ' · capturado' : ''}`}>
              <CroppedSprite id={sp.id} box={52} class={seen ? '' : 'is-silhouette'} />
              <span class="hv-mon__name">{seen ? sp.name : '???'}</span>
              <span class="pk-num">{w < 0.01 ? '<1%' : pct(w)}</span>
            </div>
          );
        })}
        {(area.legendaries ?? []).map((l) => (
          <div key={l.species} class="hv-mon is-rare">
            <CroppedSprite id={speciesOf(app.data, l.species).id} box={52} class={(s.pokedex[l.species]?.seen ?? 0) > 0 ? '' : 'is-silhouette'} />
            <span class="hv-mon__name">Lendário</span>
            <span class="pk-num">raro</span>
          </div>
        ))}
      </div>
    );
  }
  return <Float id="mons" class="hv--mons" title={title}>{content}</Float>;
}

function RecentCaptures({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const list = app.captures.value.slice(0, 8);
  return (
    <Float id="caps" class="hv--caps" title={<>Capturas <span class="hv-count">{s.hunt.captures}</span></>} actions={<button class="hv-link" onClick={() => go('pc')}>PC</button>}>
      {list.length === 0 ? <p class="hv-empty">As capturas desta sessão aparecem aqui.</p> : (
        <ul class="hv-caps">
          {list.map((c) => {
            const pk = s.pokemon[c.uid];
            const sp = speciesOf(app.data, c.species);
            return (
              <li key={c.id} class={c.transferred || !pk ? 'is-gone' : ''}>
                <CroppedSprite id={sp.id} shiny={c.shiny} box={34} />
                <span class="hv-caps__name">{c.shiny && <span class="pk-shiny">✦ </span>}{pk ? displayName(app.data, pk) : sp.name}</span>
                {c.newSpecies && <span class="tag tag--gold">Nova</span>}
                {pk && !c.transferred ? <Grade grade={ivGrade(pk.ivs)} /> : <span class="tag">Transf.</span>}
              </li>
            );
          })}
        </ul>
      )}
    </Float>
  );
}

function HuntLog() {
  const app = useApp();
  return (
    <Float id="log" class="hv--log" title="Registro">
      <ul class="hv-log">
        {app.log.value.slice(0, 40).map((l) => (
          <li key={l.id} class={l.tone === 'muted' ? '' : `is-${l.tone}`}>{l.text}</li>
        ))}
        {!app.log.value.length && <li>Os acontecimentos da hunt aparecem aqui.</li>}
      </ul>
    </Float>
  );
}

function TeamStrip({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const lead = activeMember(s);
  const makeLead = (uid: string) => app.dispatch({ type: 'SetParty', uids: [uid, ...s.party.filter((u) => u !== uid)] });
  return (
    <Float id="team" class="hv--team" title="Sua equipe" actions={<button class="hv-link" onClick={() => go('party')}>Gerenciar</button>}>
      <div class="hv-team">
        {s.party.map((uid) => {
          const pk = s.pokemon[uid];
          const sp = speciesOf(app.data, pk.species);
          return (
            <button key={uid} class={`hv-slot ${lead?.uid === uid ? 'is-active' : ''} ${pk.fainted ? 'is-fainted' : ''}`} onClick={() => makeLead(uid)} title={`${displayName(app.data, pk)} · clique para pôr em campo`}>
              <CroppedSprite id={sp.id} shiny={pk.shiny} box={56} />
              <span class="pk-num">Nv {pk.level}</span>
              <Meter value={pk.fainted ? 0 : pk.hp} max={maxHpOf(s, app.data, pk)} kind="hp" />
            </button>
          );
        })}
      </div>
    </Float>
  );
}

const RULE_SHORT: Record<CaptureRule['when'], string> = {
  shiny: 'Shiny', legendary: 'Lendários', notCaught: 'Espécies novas', betterIvs: 'IVs melhores', species: 'Espécies escolhidas', any: 'Todas as espécies',
};

function HuntControls({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const st = s.settings;
  const set = (patch: Partial<Settings>) => app.dispatch({ type: 'SetSettings', settings: patch });
  const rules = s.captureRules;
  const anyOn = rules.some((r) => r.enabled);
  const firstOn = rules.find((r) => r.enabled && r.when !== 'shiny' && r.when !== 'legendary') ?? rules.find((r) => r.enabled);
  const toggleAll = () =>
    app.dispatch({ type: 'SetCaptureRules', rules: rules.map((r) => ({ ...r, enabled: anyOn ? false : r.when === 'shiny' || r.when === 'legendary' || r.when === 'notCaught' })) });
  const setMode = (when: string) =>
    app.dispatch({ type: 'SetCaptureRules', rules: rules.map((r) => (r.when === 'shiny' || r.when === 'legendary' ? r : { ...r, enabled: r.when === when })) });
  return (
    <Float id="ctrl" class="hv--ctrl" title="Controles da hunt">
      <div class="hv-ctrl">
        <label class="hv-ctrl__row">
          <input type="checkbox" class="pk-toggle" checked={anyOn} onChange={toggleAll} />
          <span>Captura automática</span>
          <select class="pk-select" value={firstOn?.when ?? ''} disabled={!anyOn} onChange={(e) => setMode((e.target as HTMLSelectElement).value)} aria-label="O que capturar">
            {rules.filter((r) => r.when !== 'shiny' && r.when !== 'legendary').map((r) => <option key={r.id} value={r.when}>{RULE_SHORT[r.when]}</option>)}
          </select>
        </label>
        <label class="hv-ctrl__row">
          <input type="checkbox" class="pk-toggle" checked={st.autoPotion} onChange={() => set({ autoPotion: !st.autoPotion })} />
          <span>Usar Poções</span>
          <select class="pk-select" value={String(Math.round(st.autoPotionThreshold * 100))} disabled={!st.autoPotion}
            onChange={(e) => set({ autoPotionThreshold: Number((e.target as HTMLSelectElement).value) / 100 })} aria-label="Limite de PS">
            {[...new Set([20, 25, 30, 35, 40, 50, 60, 70, Math.round(st.autoPotionThreshold * 100)])].sort((a, c) => a - c).map((v) => <option key={v} value={v}>PS &lt; {v}%</option>)}
          </select>
        </label>
        <label class="hv-ctrl__row">
          <input type="checkbox" class="pk-toggle" checked={st.autoRevive} onChange={() => set({ autoRevive: !st.autoRevive })} />
          <span>Usar Revives</span>
          <span class="hv-ctrl__note pk-num">{fmt(s.inventory['revive'] ?? 0)} na mochila</span>
        </label>
        <button class="pk-btn pk-btn--sm hv-ctrl__more" onClick={() => go('auto')}>Configurar automação</button>
      </div>
    </Float>
  );
}
