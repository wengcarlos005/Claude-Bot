import { useMemo } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Bar, ItemIcon, Sprite, Window, duration, fmt, pct, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { encounterTable } from '../../core/systems/exploration';
import { areaProgress, isFarmArea, levelCap, winsToClear } from '../../core/world';
import { computeBonuses } from '../../core/bonuses';
import { Tips } from './Tips';

export function ExploreScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  return (
    <div class="cols">
      <div class="stack">
        <Window
          title={
            <>
              {area.name} <span class="muted small">Nv. {area.levelRange[0]}–{area.levelRange[1]}</span>
              {area.statMult > 1 && <span class="bad small" title="Multiplicador de atributos dos oponentes nesta área"> · Tier ×{area.statMult.toFixed(2)}</span>}
            </>
          }
          actions={<button class="btn btn-sm" onClick={() => go('map')}>Trocar área</button>}
        >
          <Scene />
          <AreaProgress />
        </Window>
        <Tips go={go} />
        <HuntMetrics />
        <PartyStrip go={go} />
      </div>
      <div class="stack">
        <Window title="Registro">
          <ul class="log">
            {app.log.value.map((l) => (
              <li key={l.id} class={`tone-${l.tone}`}>{l.text}</li>
            ))}
            {!app.log.value.length && <li class="tone-muted">Os acontecimentos da exploração aparecem aqui.</li>}
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
  const bg = ['cave', 'water', 'building', 'gym', 'league'].includes(area.kind) ? area.kind : '';
  const lastLog = app.log.value[0]?.text ?? '';
  const throwing = b?.capture && lastLog.includes('%)');

  if (!s.player.starterChosen) return <div class={`scene ${bg}`}><div class="scene-status">Escolha seu inicial!</div></div>;

  if (!b || ex.phase !== 'battle') {
    const bonuses = computeBonuses(s, app.data);
    return (
      <div class={`scene ${bg}`}>
        <div class="scene-status">
          {ex.phase === 'healing' ? (
            <>
              <span>🏥 Centro Pokémon</span>
              <span class="small">Recuperando a equipe… {Math.ceil(Math.max(0, ex.timer) / 1000)}s</span>
            </>
          ) : (
            <>
              {lead && <Sprite id={speciesOf(app.data, lead.species).id} shiny={lead.shiny} animated class="walker" size={96} />}
              <span>{area.gym || area.league ? 'Avançando para o próximo desafio…' : 'Explorando…'}</span>
              <div style={{ width: '200px' }}>
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
  return (
    <div class={`scene ${bg}`}>
      <div class="hud hud-foe">
        <div class="hud-name">
          <span>{b.foe.shiny && <span class="shiny-star">✨</span>}{foeSp.name}</span>
          <span>Nv{b.foe.level}</span>
        </div>
        <Bar value={b.foe.hp} max={b.foe.maxHp} />
        <div class="small" style={{ color: '#555' }}>
          {b.trainer ? `${b.trainer.trainerClass} ${b.trainer.name}${b.foeQueue.length ? ` · +${b.foeQueue.length}` : ''}` : b.legendary ? 'Lendário!' : 'Selvagem'}
          {(s.pokedex[b.foe.species]?.caught ?? 0) > 0 && ' · ◓ registrado'}
        </div>
      </div>
      <div class="foe-side">
        <div key={recent?.side === 'player' ? recent.at : 'f'} class={`mon ${recent?.side === 'player' ? 'hit' : 'idle'}`}>
          <Sprite id={foeSp.id} shiny={b.foe.shiny} animated size={120} />
        </div>
        <div class="platform" />
      </div>
      {throwing && (
        <div class="ballthrow">
          <ItemIcon id={b.capture?.ball ?? 'poke-ball'} size={32} />
        </div>
      )}
      {pk && pkSp && (
        <>
          <div class="player-side">
            <div key={recent?.side === 'foe' ? recent.at : 'p'} class={`mon ${recent?.side === 'foe' ? 'hit' : ''}`}>
              <Sprite id={pkSp.id} shiny={pk.shiny} back animated size={130} />
            </div>
            <div class="platform" />
          </div>
          <div class="hud hud-player">
            <div class="hud-name">
              <span>{displayName(app.data, pk)}</span>
              <span>Nv{pk.level}</span>
            </div>
            <Bar value={pk.hp} max={pkMax} label={`${Math.ceil(pk.hp)}/${pkMax}`} />
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
      <div class="row" style={{ marginTop: '10px' }}>
        <span class="muted">Desafio:</span>
        {seq.map((t, i) => (
          <span key={t.id} class={`chip ${i < s.exploration.sequenceIndex ? 'good' : i === s.exploration.sequenceIndex ? 'great' : 'muted'}`}>
            {i < s.exploration.sequenceIndex ? '✓ ' : ''}{t.name}
          </span>
        ))}
        <span class="muted small">Sem regeneração entre lutas — use Poções (Auto Manager).</span>
      </div>
    );
  }
  const p = s.world.areas[area.id] ?? { wins: 0, trainersDefeated: [], cleared: false, encounters: 0 };
  const need = winsToClear(area);
  return (
    <div class="stack" style={{ marginTop: '10px', gap: '6px' }}>
      <div class="row spread small">
        <span>{p.cleared ? '✅ Área concluída' : `Vitórias para concluir: ${Math.min(p.wins, need)}/${need}`}</span>
        {area.routeTrainers.length > 0 && (
          <span>Treinadores: {p.trainersDefeated.length}/{area.routeTrainers.length}</span>
        )}
        <span class="muted">Teto de nível: {levelCap(s, app.data)}</span>
      </div>
      {!p.cleared && need > 0 && <Bar value={p.wins} max={need} kind="progress" />}
    </div>
  );
}

function HuntMetrics() {
  const app = useApp();
  const h = app.state.hunt;
  const hours = Math.max(h.durationMs, 60_000) / 3600_000;
  const battles = h.wins + h.losses;
  return (
    <Window title={<>Hunt atual <span class="muted small">({duration(h.durationMs)})</span></>}>
      <div class="metrics">
        <div class="metric"><div class="label">XP/h</div><div class="value">{fmt(h.xp / hours)}</div></div>
        <div class="metric"><div class="label">₽/h</div><div class="value">{fmt(h.money / hours)}</div></div>
        <div class="metric"><div class="label">Encontros/h</div><div class="value">{fmt(h.encounters / hours)}</div></div>
        <div class="metric"><div class="label">Capturas</div><div class="value">{fmt(h.captures)}</div></div>
        <div class="metric"><div class="label">Vitórias</div><div class="value">{battles ? pct(h.wins / battles) : '—'}</div></div>
        <div class="metric"><div class="label">Bolas usadas</div><div class="value">{fmt(h.ballsUsed)}</div></div>
      </div>
    </Window>
  );
}

function PartyStrip({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const lead = activeMember(s);
  return (
    <Window title="Equipe" actions={<button class="btn btn-sm" onClick={() => go('party')}>Gerenciar</button>}>
      <div class="party">
        {s.party.map((uid) => {
          const pk = s.pokemon[uid];
          const sp = speciesOf(app.data, pk.species);
          const max = maxHpOf(s, app.data, pk);
          return (
            <div key={uid} class={`pcard ${lead?.uid === uid ? 'active' : ''} ${pk.fainted ? 'fainted' : ''}`} onClick={() => go('party')}>
              <Sprite id={sp.id} shiny={pk.shiny} size={56} />
              <div class="info">
                <div class="name">
                  <span>{pk.shiny && '✨'}{displayName(app.data, pk)}</span>
                  <span class="small">Nv{pk.level}</span>
                </div>
                <Bar value={pk.fainted ? 0 : pk.hp} max={max} />
                {pk.fainted && <span class="small bad">Desmaiado (recupera a 50% PS)</span>}
              </div>
            </div>
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
  const p = areaProgress;
  void p;
  return (
    <Window title="Pokémon desta área">
      {merged.size === 0 ? (
        <p class="muted">Nenhum encontro disponível agora (pode exigir Vara de Pesca, Surf ou outro horário).</p>
      ) : (
        <div class="encounters">
          {[...merged.entries()].sort((a, b) => b[1] - a[1]).map(([key, w]) => {
            const sp = speciesOf(app.data, key);
            const dex = s.pokedex[key];
            return (
              <div key={key} class={`enc ${dex?.seen ? '' : 'unknown'}`} title={dex?.seen ? sp.name : '???'}>
                <Sprite id={sp.id} size={48} />
                <span>{dex?.seen ? sp.name : '???'}</span>
                <span class="muted">{w < 0.01 ? '<1%' : pct(w)}</span>
                {(dex?.caught ?? 0) > 0 && <span class="caught">◓</span>}
              </div>
            );
          })}
          {(area.legendaries ?? []).map((l) => (
            <div key={l.species} class={`enc ${s.pokedex[l.species]?.seen ? '' : 'unknown'}`} title="Lendário">
              <Sprite id={speciesOf(app.data, l.species).id} size={48} />
              <span>{s.pokedex[l.species]?.seen ? speciesOf(app.data, l.species).name : '???'}</span>
              <span class="great">Lendário</span>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
