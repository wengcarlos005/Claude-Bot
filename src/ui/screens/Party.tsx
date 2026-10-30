import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Bar, GenderIcon, Grade, Sprite, TypeBadge, Window, useApp } from '../components';
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
    <div class="stack">
      <Window title={<>Equipe <span class="muted small">({s.party.length}/6 · teto de nível {cap})</span></>}>
        <p class="small muted">O primeiro Pokémon luta primeiro; os outros entram quando ele desmaia. Quem não lutou recebe a XP da Exp. Share.</p>
        <div class="card-grid">
          {s.party.map((uid, i) => {
            const pk = s.pokemon[uid];
            const sp = speciesOf(app.data, pk.species);
            const max = maxHpOf(s, app.data, pk);
            const x0 = expForLevel(sp.growthRate, pk.level);
            const x1 = expForLevel(sp.growthRate, pk.level + 1);
            const evo = availableEvolutions(app.core.ctx, s, pk).length > 0;
            return (
              <div key={uid} class={`pk-card ${lead?.uid === uid ? 'is-active' : ''} ${pk.fainted ? 'is-fainted' : ''}`} onClick={() => setOpen(uid)}>
                <Sprite id={sp.id} shiny={pk.shiny} animated size={80} class="pk-card__sprite" />
                <div class="pk-card__body">
                  <div class="pk-card__name">
                    <span>{i + 1}. {pk.shiny && <span class="pk-shiny">✦ </span>}{displayName(app.data, pk)} <GenderIcon g={pk.gender} /></span>
                    <span class="pk-card__lvl">Nv {pk.level}</span>
                  </div>
                  <div class="pk-row">{sp.types.map((t) => <TypeBadge key={t} type={t} />)}<Grade grade={ivGrade(pk.ivs)} />{evo && <span class="pk-chip-btn" aria-pressed="true">Pode evoluir</span>}</div>
                  <Bar value={pk.fainted ? 0 : pk.hp} max={max} caption="PS" label={`${Math.ceil(pk.fainted ? 0 : pk.hp)}/${max}`} />
                  <Bar value={pk.level >= cap ? 1 : pk.xp - x0} max={pk.level >= cap ? 1 : x1 - x0} kind="xp" />
                  <div class="pk-card__note">{activeMoves(app.data, pk).map((m) => app.data.moves.get(m)?.name ?? 'Struggle').join(' · ')}</div>
                  {pk.heldItem && <div class="pk-card__note">Segurando: {app.data.items.get(pk.heldItem)?.name}</div>}
                  {pk.level > cap && <div class="pk-card__note is-bad">Acima do teto: luta como Nv {cap} até a próxima insígnia.</div>}
                </div>
              </div>
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
      <div class="row">
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
