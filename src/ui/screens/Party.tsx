import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Bar, GenderIcon, Grade, ItemIcon, Sprite, TypeBadge, Window, useApp } from '../components';
import { uiIcon } from '../../app/assets';
import { PokemonDetail } from './PokemonDetail';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { activeMoves } from '../../core/moves';
import { ivGrade } from '../../core/formulas/stats';
import { availableEvolutions } from '../../core/systems/evolution';
import { expForLevel } from '../../core/formulas/experience';
import { levelCap } from '../../core/world';

export function PartyScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [open, setOpen] = useState<string | null>(null);
  const lead = activeMember(s);
  const cap = levelCap(s, app.data);
  return (
    <div class="party-layout">
      <Window title={<>Sua equipe <span class="muted small">teto de nível {cap}</span></>} class="grow">
        <div class="party-grid">
          {Array.from({ length: 6 }, (_, i) => {
            const uid = s.party[i];
            if (!uid) {
              return (
                <div key={`e${i}`} class="slot is-empty">
                  <img src={uiIcon('ball/poke')} width={48} height={48} alt="" />
                  <b>Vaga {i + 1} livre</b>
                  <span class="small muted">Capture mais Pokémon ou traga um do PC.</span>
                </div>
              );
            }
            const pk = s.pokemon[uid];
            const sp = speciesOf(app.data, pk.species);
            const max = maxHpOf(s, app.data, pk);
            const x0 = expForLevel(sp.growthRate, pk.level);
            const x1 = expForLevel(sp.growthRate, pk.level + 1);
            const evo = availableEvolutions(app.core.ctx, s, pk).length > 0;
            return (
              <button key={uid} class={`slot ${lead?.uid === uid ? 'is-lead' : ''} ${pk.fainted ? 'is-fainted' : ''}`} onClick={() => setOpen(uid)}>
                <span class="slot__no pk-num">{i + 1}</span>
                {lead?.uid === uid && <span class="slot__tag">Líder</span>}
                <span class="slot__art"><Sprite id={sp.id} shiny={pk.shiny} animated size={96} /></span>
                <span class="slot__name">{pk.shiny && <span class="pk-shiny">✦ </span>}{displayName(app.data, pk)} <GenderIcon g={pk.gender} /></span>
                <span class="slot__meta"><span class="pk-num">Nv {pk.level}</span>{sp.types.map((ty) => <TypeBadge key={ty} type={ty} />)}<Grade grade={ivGrade(pk.ivs)} /></span>
                <Bar value={pk.fainted ? 0 : pk.hp} max={max} caption="PS" label={`${Math.ceil(pk.fainted ? 0 : pk.hp)}/${max}`} />
                <Bar value={pk.level >= cap ? 1 : pk.xp - x0} max={pk.level >= cap ? 1 : x1 - x0} kind="xp" />
                <span class="slot__moves">
                  {activeMoves(app.data, pk).map((m) => {
                    const mv = app.data.moves.get(m);
                    return <span key={m} class={`move-chip type-${mv?.type ?? 'normal'}`}>{mv?.name ?? 'Struggle'}</span>;
                  })}
                </span>
                {(evo || pk.heldItem || pk.level > cap) && (
                  <span class="slot__notes">
                    {evo && <span class="great">Pode evoluir</span>}
                    {pk.heldItem && <span><ItemIcon id={pk.heldItem} size={20} /> {app.data.items.get(pk.heldItem)?.name}</span>}
                    {pk.level > cap && <span class="bad">Luta como Nv {cap}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Window>
      <Presets />
      {open && <PokemonDetail uid={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Presets() {
  const app = useApp();
  const s = app.state;
  const [name, setName] = useState('');
  return (
    <Window title="Presets de equipe">
      <p class="small muted">Salve composições para objetivos diferentes (XP, captura, shiny hunting, ginásio…).</p>
      <div class="presets__form">
        <input placeholder="Nome do preset" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} maxLength={20} />
        <button class="pk-btn pk-btn--primary pk-btn--sm" onClick={() => app.dispatch({ type: 'SavePreset', name }) && setName('')}>Salvar equipe atual</button>
      </div>
      <div class="stack" style={{ marginTop: '10px', gap: '6px' }}>
        {s.presets.map((p, i) => (
          <div key={i} class="row spread">
            <span>
              <b>{p.name}</b>{' '}
              <span class="small muted">{p.party.filter((u) => s.pokemon[u]).map((u) => displayName(app.data, s.pokemon[u])).join(', ')}</span>
            </span>
            <span class="row">
              <button class="pk-btn pk-btn--sm" onClick={() => app.dispatch({ type: 'LoadPreset', index: i })}>Carregar</button>
              <button class="pk-btn pk-btn--sm pk-btn--danger" onClick={() => app.dispatch({ type: 'DeletePreset', index: i })}>Excluir</button>
            </span>
          </div>
        ))}
        {!s.presets.length && <span class="muted small">Nenhum preset salvo.</span>}
      </div>
    </Window>
  );
}
