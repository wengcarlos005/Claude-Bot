import { useState } from 'preact/hooks';
import { Bar, GenderIcon, Grade, Modal, Sprite, TypeBadge, fmt, useApp } from '../components';
import { conditionText } from '../text';
import { STAT_KEYS } from '../../data/types';
import { affinityLevel, displayName, masteryLevel, maxHpOf, movesFor, pokemonStats, speciesOf } from '../../core/pokemon';
import { expForLevel } from '../../core/formulas/experience';
import { ivGrade, ivTotal } from '../../core/formulas/stats';
import { NATURE_BY_ID } from '../../core/formulas/natures';
import { availableEvolutions } from '../../core/systems/evolution';
import { transferValue } from '../../core/systems/collection';
import { MAX_PARTY } from '../../core/state/types';
import { AFFINITY_THRESHOLDS, MASTERY_THRESHOLDS } from '../../data/content/upgrades';

const STAT_LABEL: Record<string, string> = { hp: 'PS', atk: 'Atq', def: 'Def', spa: 'AtE', spd: 'DfE', spe: 'Vel' };

export function PokemonDetail({ uid, onClose }: { uid: string; onClose: () => void }) {
  const app = useApp();
  const s = app.state;
  const pk = s.pokemon[uid];
  const [confirm, setConfirm] = useState(false);
  if (!pk) return null;
  const sp = speciesOf(app.data, pk.species);
  const stats = pokemonStats(s, app.data, pk);
  const maxHp = maxHpOf(s, app.data, pk);
  const nature = NATURE_BY_ID.get(pk.nature);
  const inParty = s.party.includes(uid);
  const idx = s.party.indexOf(uid);
  const xpCur = expForLevel(sp.growthRate, pk.level);
  const xpNext = expForLevel(sp.growthRate, pk.level + 1);
  const evos = availableEvolutions(app.core.ctx, s, pk);
  const holdable = Object.keys(s.inventory).filter((id) => {
    const c = app.data.items.get(id)?.category;
    return c === 'held' || c === 'evolution';
  });
  const usable = Object.keys(s.inventory).filter((id) => {
    const c = app.data.items.get(id)?.category;
    return c === 'medicine' || c === 'vitamin';
  });
  const move = (dir: number) => {
    const p = [...s.party];
    const j = idx + dir;
    if (j < 0 || j >= p.length) return;
    [p[idx], p[j]] = [p[j], p[idx]];
    app.dispatch({ type: 'SetParty', uids: p });
  };
  const tv = transferValue(app.core.ctx, pk);
  const aff = affinityLevel(s, app.data, pk.species);
  const mas = masteryLevel(s, pk.species);

  return (
    <Modal title={<>{pk.shiny && '✨ '}{displayName(app.data, pk)} <span class="muted small">#{sp.id} {sp.name}</span></>} onClose={onClose} wide>
      <div class="cols">
        <div class="stack">
          <div class="row">
            <Sprite id={sp.id} shiny={pk.shiny} animated size={120} />
            <div class="stack" style={{ gap: '4px' }}>
              <div class="row">{sp.types.map((t) => <TypeBadge key={t} type={t} />)} <GenderIcon g={pk.gender} /> <Grade grade={ivGrade(pk.ivs)} /></div>
              <div>Nível <b>{pk.level}</b> · Natureza <b>{nature?.name}</b>{nature?.up && <span class="muted small"> (+{STAT_LABEL[nature.up]} −{STAT_LABEL[nature.down!]})</span>}</div>
              <div class="small muted">XP {fmt(pk.xp - xpCur)}/{fmt(xpNext - xpCur)}</div>
              <Bar value={pk.xp - xpCur} max={xpNext - xpCur} kind="xp" />
              <div class="small">PS {Math.ceil(pk.hp)}/{maxHp}{pk.fainted && <span class="bad"> · desmaiado</span>}</div>
              <div class="small">Amizade {pk.friendship}/255 · Vitórias {fmt(pk.wins)}</div>
              <div class="small">
                Afinidade da linha: <b>{aff}</b>/10 · Maestria da espécie: <b>{mas}</b>/10
              </div>
              <div class="small muted">Capturado em {app.data.areas.get(pk.caughtArea)?.name ?? pk.caughtArea} com {app.data.items.get(pk.ball)?.name}</div>
            </div>
          </div>
          <table class="table stats-table">
            <thead><tr><th /><th>Atributo</th><th>IV</th><th>EV</th><th style={{ width: '40%' }} /></tr></thead>
            <tbody>
              {STAT_KEYS.map((k) => (
                <tr key={k}>
                  <td>{STAT_LABEL[k]}</td>
                  <td class="num">{stats[k]}</td>
                  <td class={`num ${pk.ivs[k] === 31 ? 'great' : ''}`}>{pk.ivs[k]}</td>
                  <td class="num">{pk.evs[k]}</td>
                  <td><div class="statbar" style={{ width: `${Math.min(100, (sp.baseStats[k] / 180) * 100)}%` }} title={`Base ${sp.baseStats[k]}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class="small muted">Soma de IVs: {ivTotal(pk.ivs)}/186</div>
        </div>
        <div class="stack">
          <div>
            <h3>Golpes</h3>
            <div class="stack" style={{ gap: '4px' }}>
              {movesFor(app.data, pk.species, pk.level).map((m) => {
                const mv = app.data.moves.get(m)!;
                return (
                  <div key={m} class="row spread small">
                    <span><TypeBadge type={mv.type} /> {mv.name}</span>
                    <span class="muted">Poder {mv.power ?? 50} · Prec. {mv.accuracy ?? '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3>Evolução</h3>
            {sp.evolutions.length === 0 && <p class="muted small">Não evolui.</p>}
            {sp.evolutions.map((e) => {
              const ok = evos.find((x) => x.evo.into === e.into);
              const into = speciesOf(app.data, e.into);
              return (
                <div key={e.into + JSON.stringify(e.conditions)} class="row spread small">
                  <span>→ <b>{into.name}</b>: {e.special === 'shed' ? 'surge junto na evolução (precisa de 1 Poké Ball)' : e.conditions.map((c) => conditionText(app.data, c)).join(' + ')}</span>
                  {ok && <button class="btn btn-sm btn-gold" onClick={() => app.dispatch({ type: 'Evolve', uid, into: e.into })}>Evoluir</button>}
                </div>
              );
            })}
          </div>
          <div>
            <h3>Item segurado</h3>
            <div class="row">
              <select
                value={pk.heldItem ?? ''}
                onChange={(e) => app.dispatch({ type: 'HoldItem', uid, itemId: (e.target as HTMLSelectElement).value || null })}
              >
                <option value="">— nenhum —</option>
                {pk.heldItem && <option value={pk.heldItem}>{app.data.items.get(pk.heldItem)?.name}</option>}
                {holdable.filter((i) => i !== pk.heldItem).map((i) => (
                  <option key={i} value={i}>{app.data.items.get(i)?.name} (×{s.inventory[i]})</option>
                ))}
              </select>
              {pk.heldItem && <span class="small muted">{app.data.items.get(pk.heldItem)?.description}</span>}
            </div>
          </div>
          {usable.length > 0 && (
            <div>
              <h3>Usar item</h3>
              <div class="row">
                {usable.map((i) => (
                  <button key={i} class="btn btn-sm" onClick={() => app.dispatch({ type: 'UseItem', itemId: i, uid })} title={app.data.items.get(i)?.description}>
                    {app.data.items.get(i)?.name} ×{s.inventory[i]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3>Ações</h3>
            <div class="row">
              {inParty ? (
                <>
                  <button class="btn btn-sm" disabled={idx === 0} onClick={() => move(-1)}>▲ Subir</button>
                  <button class="btn btn-sm" disabled={idx === s.party.length - 1} onClick={() => move(1)}>▼ Descer</button>
                  <button class="btn btn-sm" disabled={idx === 0} onClick={() => app.dispatch({ type: 'SetParty', uids: [uid, ...s.party.filter((u) => u !== uid)] })}>Tornar líder</button>
                  <button class="btn btn-sm" disabled={s.party.length <= 1} onClick={() => app.dispatch({ type: 'SetParty', uids: s.party.filter((u) => u !== uid) })}>Mover p/ PC</button>
                </>
              ) : (
                <button class="btn btn-sm btn-primary" disabled={s.party.length >= MAX_PARTY} onClick={() => app.dispatch({ type: 'SetParty', uids: [...s.party, uid] })}>
                  Adicionar à equipe
                </button>
              )}
              <button class="btn btn-sm" onClick={() => app.dispatch({ type: 'ToggleLock', uid })}>{pk.locked ? '🔒 Protegido' : '🔓 Proteger'}</button>
              <button
                class="btn btn-sm"
                onClick={() => {
                  const name = prompt('Apelido (vazio para remover):', pk.nickname ?? '');
                  if (name !== null) app.dispatch({ type: 'Rename', uid, name });
                }}
              >
                Apelido
              </button>
              {!pk.locked && !confirm && (
                <button class="btn btn-sm btn-danger" onClick={() => setConfirm(true)}>Transferir…</button>
              )}
              {confirm && (
                <button
                  class="btn btn-sm btn-danger"
                  onClick={() => {
                    if (app.dispatch({ type: 'Transfer', uids: [uid] }).ok) onClose();
                  }}
                >
                  Confirmar: +₽{fmt(tv.money)} +{tv.research} PP
                </button>
              )}
            </div>
          </div>
          <p class="small muted">
            Afinidade: {aff < 10 ? `próximo nível com ${AFFINITY_THRESHOLDS[aff]} pontos (${s.affinity[String(sp.chainId)] ?? 0} atuais; cada captura da linha = +1)` : 'máxima'}.
            {' '}Maestria: {mas < 10 ? `${fmt(s.mastery[pk.species] ?? 0)}/${fmt(MASTERY_THRESHOLDS[mas])} vitórias da espécie` : 'máxima'}.
          </p>
        </div>
      </div>
    </Modal>
  );
}
