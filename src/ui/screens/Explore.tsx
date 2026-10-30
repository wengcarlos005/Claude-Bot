import { useMemo } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { CroppedSprite, Grade, fmt, pct, useApp } from '../components';
import { displayName, speciesOf } from '../../core/pokemon';
import { ivGrade } from '../../core/formulas/stats';
import { encounterTable } from '../../core/systems/exploration';
import { isFarmArea, levelCap, trainerLevel, trainerXpForLevel, winsToClear } from '../../core/world';
import { RouteField } from '../field/RouteField';
import { Meter, Panel, TeamList } from '../hub/Hub';
import { Tips } from './Tips';

export function ExploreScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const region = app.data.regionById.get(area.regionId)!;
  return (
    <div class="hunt">
      <Tips go={go} />
      <section class="panel session">
        <header class="session__head">
          <div class="session__where">
            <span class="session__eyebrow">{region.name}{area.gym ? ' · Ginásio' : area.league ? ' · Liga' : ''}</span>
            <h1 class="session__area">{area.name}</h1>
            <span class="session__meta">
              <span>Nv {area.levelRange[0]}–{area.levelRange[1]}</span>
              {area.statMult > 1 && <span title="Multiplicador de atributos dos oponentes">Tier ×{area.statMult.toFixed(2)}</span>}
              <span>Teto Nv {levelCap(s, app.data)}</span>
            </span>
          </div>
          <div class="session__actions">
            <span class="session__clock pk-num" title="Tempo nesta sessão de hunt"><span class="session__live" />{clock(s.hunt.durationMs)}</span>
            <button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => app.dispatch({ type: 'SelectArea', areaId: area.id })} title="Zera as métricas da sessão">Zerar sessão</button>
            <button class="pk-btn pk-btn--sm pk-btn--primary" onClick={() => go('map')}>Trocar área</button>
          </div>
        </header>
        <SessionMetrics />
      </section>
      <RouteField />
      <AreaProgress />
      <div class="hunt__grid">
        <RecentCaptures go={go} />
        <AreaMons />
      </div>
      <div class="only-compact"><TeamList go={go} /></div>
    </div>
  );
}

function clock(ms: number): string {
  const t = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}

function SessionMetrics() {
  const app = useApp();
  const s = app.state;
  const h = s.hunt;
  const hours = Math.max(h.durationMs, 60_000) / 3600_000;
  const spent = h.spent ?? 0;
  const net = h.money - spent;
  const tl = trainerLevel(s);
  const toNext = trainerXpForLevel(tl + 1) - s.player.trainerXp;
  const kills = h.wins;
  const every = kills ? h.durationMs / kills / 1000 : 0;
  const Tile = (p: { label: string; value: string; rate: string; sub: string; tone?: string }) => (
    <div class={`metric ${p.tone ?? ''}`}>
      <div class="metric__label">{p.label}</div>
      <div class="metric__value pk-num">{p.value}</div>
      <div class="metric__rate pk-num">{p.rate}</div>
      <div class="metric__sub">{p.sub}</div>
    </div>
  );
  return (
    <div class="metrics">
      {Tile({ label: 'XP de Treinador', value: fmt(h.trainerXp ?? 0), rate: `${fmt((h.trainerXp ?? 0) / hours)}/h`, sub: `Nv ${tl + 1} em ${fmt(toNext)} XP` })}
      {Tile({ label: 'XP de Pokémon', value: fmt(h.xp), rate: `${fmt(h.xp / hours)}/h`, sub: `${fmt(h.encounters)} encontros` })}
      {Tile({ label: 'Lucro líquido', value: `₽ ${fmt(net)}`, rate: `₽ ${fmt(net / hours)}/h`, sub: spent ? `−₽ ${fmt(spent)} em gastos` : 'sem gastos', tone: net >= 0 ? 'is-good' : 'is-bad' })}
      {Tile({ label: 'Abates', value: fmt(kills), rate: `${fmt(kills / hours)}/h`, sub: every ? `um a cada ${every < 60 ? `${every.toFixed(1)}s` : `${Math.round(every / 60)}min`}` : '—' })}
      {Tile({ label: 'Capturas', value: fmt(h.captures), rate: `${(h.captures / hours).toFixed(1)}/h`, sub: h.captures ? `1 a cada ${Math.max(1, Math.round(h.encounters / h.captures))} encontros` : `${fmt(h.ballsUsed)} bolas usadas` })}
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
      <div class="progress-row">
        <div class="pk-row">
          {seq.map((t, i) => (
            <span key={t.id} class={`step ${i < s.exploration.sequenceIndex ? 'is-done' : i === s.exploration.sequenceIndex ? 'is-now' : ''}`}>{t.name}</span>
          ))}
        </div>
        <span class="pk-muted small">Sem regeneração entre lutas: leve Poções e ative a cura nas Automações.</span>
      </div>
    );
  }
  const p = s.world.areas[area.id] ?? { wins: 0, trainersDefeated: [], cleared: false, encounters: 0 };
  const need = winsToClear(area);
  if (!need && !area.routeTrainers.length) return null;
  return (
    <div class="progress-row">
      {p.cleared ? (
        <span class="good small">Área concluída · recompensas recebidas</span>
      ) : need > 0 ? (
        <div class="progress-row__bar">
          <span class="progress-row__label">Concluir a área (opcional)</span>
          <Meter value={p.wins} max={need} kind="trainer" text={`${Math.min(p.wins, need)}/${need} vitórias`} />
        </div>
      ) : null}
      {area.routeTrainers.length > 0 && <span class="pk-muted small pk-num">Treinadores {p.trainersDefeated.length}/{area.routeTrainers.length}</span>}
    </div>
  );
}

function RecentCaptures({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const list = app.captures.value;
  return (
    <Panel title={<>Capturas <span class="panel__count">{s.hunt.captures}</span></>} actions={<button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => go('pc')}>PC</button>}>
      {list.length === 0 ? (
        <p class="panel__empty">As capturas desta sessão aparecem aqui. Ajuste o que capturar em Automações.</p>
      ) : (
        <ul class="catches">
          {list.map((c) => {
            const pk = s.pokemon[c.uid];
            const sp = speciesOf(app.data, c.species);
            return (
              <li key={c.id} class={`catch ${c.transferred || !pk ? 'is-gone' : ''}`}>
                <CroppedSprite id={sp.id} shiny={c.shiny} box={40} />
                <span class="catch__name">
                  {c.shiny && <span class="pk-shiny">✦ </span>}
                  {pk ? displayName(app.data, pk) : sp.name}
                  {pk && <b>Nv {pk.level}</b>}
                </span>
                <span class="catch__tags">
                  {c.newSpecies && <span class="tag tag--gold">Nova</span>}
                  {c.transferred || !pk ? <span class="tag">Transferido</span> : <Grade grade={ivGrade(pk.ivs)} />}
                </span>
                <span class="catch__time pk-num">{new Date(c.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function AreaMons() {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const hourKey = new Date().getHours();
  const table = useMemo(() => encounterTable(s, area, Date.now()), [area.id, hourKey, Object.keys(s.inventory).length]);
  if (!isFarmArea(area)) {
    const team = area.gym ? area.gym.leader.team : area.league!.members[area.league!.members.length - 1].team;
    const region = app.data.regionById.get(area.regionId)!;
    return (
      <Panel title={area.gym ? `Time de ${area.gym.leader.name}` : 'Campeão'}>
        <div class="odds-grid">
          {team.map((m, i) => (
            <div key={i} class="pk-odds">
              <CroppedSprite id={speciesOf(app.data, m.species).id} box={56} class={(s.pokedex[m.species]?.seen ?? 0) > 0 ? '' : 'is-silhouette'} />
              <span class="pk-odds__pct">Nv {Math.round(region.levelOffset + m.level * region.levelScale)}</span>
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  const merged = new Map<string, number>();
  for (const x of table) merged.set(x.slot.species, (merged.get(x.slot.species) ?? 0) + x.weight);
  const caught = [...merged.keys()].filter((k) => (s.pokedex[k]?.caught ?? 0) > 0).length;
  return (
    <Panel title={<>Pokémon da área <span class="panel__count">{caught}/{merged.size}</span></>} actions={<span class="panel__meta">chance por encontro</span>}>
      {merged.size === 0 ? (
        <p class="panel__empty">Nenhum encontro disponível agora. Pode exigir Vara de Pesca, Surf ou outro horário.</p>
      ) : (
        <div class="odds-grid">
          {[...merged.entries()].sort((a, b) => b[1] - a[1]).map(([key, w]) => <Odds key={key} speciesKey={key} weight={w} />)}
          {(area.legendaries ?? []).map((l) => <Odds key={l.species} speciesKey={l.species} label="Lendário" />)}
        </div>
      )}
    </Panel>
  );
}

export function Odds({ speciesKey, weight, label, match, size = 56 }: { speciesKey: string; weight?: number; label?: string; match?: boolean; size?: number }) {
  const app = useApp();
  const sp = speciesOf(app.data, speciesKey);
  const dex = app.state.pokedex[speciesKey];
  const seen = (dex?.seen ?? 0) > 0;
  const caught = (dex?.caught ?? 0) > 0;
  return (
    <div class={`pk-odds ${match ? 'is-match' : ''} ${caught ? 'is-caught' : ''}`} title={`${seen ? sp.name : 'Ainda não visto'}${caught ? ' · capturado' : ''}`}>
      <CroppedSprite id={sp.id} box={size} class={seen ? '' : 'is-silhouette'} />
      <span class="pk-odds__pct">{label ?? (weight! < 0.01 ? '<1%' : pct(weight!))}</span>
      {caught && <span class="odds__ball" aria-hidden="true" />}
    </div>
  );
}
