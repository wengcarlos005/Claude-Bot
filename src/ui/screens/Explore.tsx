import { useMemo } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Bar, CroppedSprite, ItemIcon, Sprite, Window, duration, fmt, pct, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { encounterTable } from '../../core/systems/exploration';
import { isFarmArea, levelCap, winsToClear } from '../../core/world';
import { computeBonuses } from '../../core/bonuses';
import { Tips } from './Tips';

export function ExploreScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const region = app.data.regionById.get(area.regionId)!;
  return (
    <div class="layout-2">
      <div class="col">
        <section class="area-head">
          <div>
            <div class="area-head__eyebrow">{region.name}</div>
            <h1 class="area-head__name">{area.name}</h1>
            <div class="area-head__meta">
              <span class="pk-num">Nv {area.levelRange[0]}–{area.levelRange[1]}</span>
              {area.statMult > 1 && <span title="Multiplicador de atributos dos oponentes nesta área">Tier ×{area.statMult.toFixed(2)}</span>}
              <span>Teto de nível {levelCap(s, app.data)}</span>
            </div>
          </div>
          <button class="pk-btn" onClick={() => go('map')}>Trocar área</button>
        </section>
        <Scene />
        <AreaProgress />
        <Tips go={go} />
        <HuntMetrics />
        <PartyStrip go={go} />
      </div>
      <div class="col">
        <Window title="Registro">
          <ul class="pk-log">
            {app.log.value.map((l) => (
              <li key={l.id} class={l.tone === 'muted' ? '' : `is-${l.tone}`}>{l.text}</li>
            ))}
            {!app.log.value.length && <li>Os acontecimentos da exploração aparecem aqui.</li>}
          </ul>
        </Window>
        <EncounterTable />
      </div>
    </div>
  );
}

function Scene() {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const ex = s.exploration;
  const b = ex.battle;
  const lead = activeMember(s);
  const hit = app.lastHit.value;
  const recent = hit && performance.now() - hit.at < 450 ? hit : null;
  const lastLog = app.log.value[0]?.text ?? '';
  const throwing = b?.capture && lastLog.includes('%)');

  if (!s.player.starterChosen) return <div class="pk-scene scene"><div class="scene__status">Escolha seu inicial</div></div>;

  if (!b || ex.phase !== 'battle') {
    const bonuses = computeBonuses(s, app.data);
    return (
      <div class="pk-scene scene">
        <div class="scene__status">
          {ex.phase === 'healing' ? (
            <>
              <span class="scene__title">Centro Pokémon</span>
              <span class="scene__sub pk-num">Recuperando a equipe · {Math.ceil(Math.max(0, ex.timer) / 1000)}s</span>
            </>
          ) : (
            <>
              {lead && <Sprite id={speciesOf(app.data, lead.species).id} shiny={lead.shiny} animated class="scene__walker" size={96} />}
              <span class="scene__title">{area.gym || area.league ? 'Próximo desafio' : 'Explorando'}</span>
              <div class="scene__walkbar">
                <Bar value={bonuses.walkMs - Math.max(0, ex.timer)} max={bonuses.walkMs} kind="progress" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const foeSp = speciesOf(app.data, b.foe.species);
  const pk = lead;
  const pkSp = pk ? speciesOf(app.data, pk.species) : null;
  const pkMax = pk ? maxHpOf(s, app.data, pk) : 1;
  const context = b.trainer
    ? `${b.trainer.trainerClass} ${b.trainer.name}${b.foeQueue.length ? ` · +${b.foeQueue.length}` : ''}`
    : b.legendary ? 'Lendário' : 'Selvagem';
  return (
    <div class="pk-scene scene">
      <div class="pk-hud pk-hud--foe">
        <div class="pk-hud__name">
          <span>{b.foe.shiny && <span class="pk-shiny">✦ </span>}{foeSp.name}</span>
          <span class="pk-hud__lvl">Nv {b.foe.level}</span>
        </div>
        <Bar value={b.foe.hp} max={b.foe.maxHp} />
        <div class="pk-hud__tag">{context}{(s.pokedex[b.foe.species]?.caught ?? 0) > 0 && ' · ◓ registrado'}</div>
      </div>
      <div class="pk-scene__foe">
        <div key={recent?.side === 'player' ? recent.at : 'f'} class={`mon ${recent?.side === 'player' ? 'is-hit' : ''}`}>
          <Sprite id={foeSp.id} shiny={b.foe.shiny} animated size={120} />
        </div>
        <div class="pk-scene__platform" />
      </div>
      {throwing && (
        <div class="scene__ball">
          <ItemIcon id={b.capture?.ball ?? 'poke-ball'} size={32} />
        </div>
      )}
      {pk && pkSp && (
        <>
          <div class="pk-scene__mine">
            <div key={recent?.side === 'foe' ? recent.at : 'p'} class={`mon ${recent?.side === 'foe' ? 'is-hit' : ''}`}>
              <Sprite id={pkSp.id} shiny={pk.shiny} back animated size={128} />
            </div>
            <div class="pk-scene__platform" />
          </div>
          <div class="pk-hud pk-hud--mine">
            <div class="pk-hud__name">
              <span>{displayName(app.data, pk)}</span>
              <span class="pk-hud__lvl">Nv {pk.level}</span>
            </div>
            <Bar value={pk.hp} max={pkMax} />
            <div class="pk-hud__hp"><span>PS</span><span>{Math.ceil(pk.hp)}/{pkMax}</span></div>
          </div>
        </>
      )}
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
            <span key={t.id} class={`step ${i < s.exploration.sequenceIndex ? 'is-done' : i === s.exploration.sequenceIndex ? 'is-now' : ''}`}>
              {t.name}
            </span>
          ))}
        </div>
        <span class="pk-muted small">Sem regeneração entre lutas: leve Poções e ative a cura no Auto Manager.</span>
      </div>
    );
  }
  const p = s.world.areas[area.id] ?? { wins: 0, trainersDefeated: [], cleared: false, encounters: 0 };
  const need = winsToClear(area);
  return (
    <div class="progress-row">
      {p.cleared ? (
        <span class="good small">Área concluída · recompensas recebidas</span>
      ) : need > 0 ? (
        <Bar value={p.wins} max={need} kind="progress" caption="Concluir a área (opcional)" label={`${Math.min(p.wins, need)}/${need}`} />
      ) : null}
      {area.routeTrainers.length > 0 && (
        <span class="pk-muted small pk-num">Treinadores {p.trainersDefeated.length}/{area.routeTrainers.length}</span>
      )}
    </div>
  );
}

function HuntMetrics() {
  const app = useApp();
  const h = app.state.hunt;
  const hours = Math.max(h.durationMs, 60_000) / 3600_000;
  const battles = h.wins + h.losses;
  return (
    <Window title="Hunt atual" actions={<span class="pk-screen__meta">{duration(h.durationMs)} nesta área</span>}>
      <div class="pk-metrics">
        <div class="pk-metric"><div class="pk-metric__label">XP/h</div><div class="pk-metric__value">{fmt(h.xp / hours)}</div></div>
        <div class="pk-metric"><div class="pk-metric__label">₽/h</div><div class="pk-metric__value">{fmt(h.money / hours)}</div></div>
        <div class="pk-metric"><div class="pk-metric__label">Encontros/h</div><div class="pk-metric__value">{fmt(h.encounters / hours)}</div></div>
        <div class="pk-metric"><div class="pk-metric__label">Capturas</div><div class="pk-metric__value">{fmt(h.captures)}</div></div>
        <div class="pk-metric"><div class="pk-metric__label">Vitórias</div><div class="pk-metric__value">{battles ? pct(h.wins / battles) : '—'}</div></div>
        <div class="pk-metric"><div class="pk-metric__label">Bolas usadas</div><div class="pk-metric__value">{fmt(h.ballsUsed)}</div></div>
      </div>
    </Window>
  );
}

function PartyStrip({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const lead = activeMember(s);
  return (
    <Window title="Equipe" actions={<button class="pk-btn pk-btn--sm" onClick={() => go('party')}>Gerenciar</button>}>
      <div class="party-strip">
        {s.party.map((uid) => {
          const pk = s.pokemon[uid];
          const sp = speciesOf(app.data, pk.species);
          const max = maxHpOf(s, app.data, pk);
          return (
            <button key={uid} class={`mini ${lead?.uid === uid ? 'is-active' : ''} ${pk.fainted ? 'is-fainted' : ''}`} onClick={() => go('party')}>
              <CroppedSprite id={sp.id} shiny={pk.shiny} box={56} />
              <span class="mini__name">{pk.shiny && <span class="pk-shiny">✦ </span>}{displayName(app.data, pk)}</span>
              <span class="mini__lvl">Nv {pk.level}</span>
              <Bar value={pk.fainted ? 0 : pk.hp} max={max} />
            </button>
          );
        })}
      </div>
    </Window>
  );
}

function EncounterTable() {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const hourKey = new Date().getHours();
  const table = useMemo(() => encounterTable(s, area, Date.now()), [area.id, hourKey, Object.keys(s.inventory).length]);
  if (!isFarmArea(area)) return null;
  const merged = new Map<string, number>();
  for (const x of table) merged.set(x.slot.species, (merged.get(x.slot.species) ?? 0) + x.weight);
  return (
    <Window title="Pokémon desta área" actions={<span class="pk-screen__meta">chance por encontro</span>}>
      {merged.size === 0 ? (
        <p class="pk-muted" style={{ margin: 0 }}>Nenhum encontro disponível agora. Pode exigir Vara de Pesca, Surf ou outro horário.</p>
      ) : (
        <div class="odds-grid">
          {[...merged.entries()].sort((a, b) => b[1] - a[1]).map(([key, w]) => <Odds key={key} speciesKey={key} weight={w} />)}
          {(area.legendaries ?? []).map((l) => <Odds key={l.species} speciesKey={l.species} label="Lendário" />)}
        </div>
      )}
    </Window>
  );
}

export function Odds({ speciesKey, weight, label, match }: { speciesKey: string; weight?: number; label?: string; match?: boolean }) {
  const app = useApp();
  const sp = speciesOf(app.data, speciesKey);
  const dex = app.state.pokedex[speciesKey];
  const seen = (dex?.seen ?? 0) > 0;
  return (
    <div class={`pk-odds ${match ? 'is-match' : ''}`} title={seen ? sp.name : 'Ainda não visto'}>
      <CroppedSprite id={sp.id} box={56} class={seen ? '' : 'is-silhouette'} />
      <span class="pk-odds__pct">{label ?? (weight! < 0.01 ? '<1%' : pct(weight!))}</span>
      {(dex?.caught ?? 0) > 0 ? <span class="pk-odds__caught">◓</span> : <span class="pk-odds__caught"> </span>}
    </div>
  );
}
