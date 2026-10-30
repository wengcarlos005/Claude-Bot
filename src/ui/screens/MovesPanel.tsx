// Golpes do Pokémon: conhecidos (até 10) e equipados (2, 4 ou 6 vagas conforme o nível). Clicar equipa/desequipa;
// "Automático" deixa o jogo escolher os melhores sempre que aprende um golpe novo ou abre uma vaga.
import { TypeBadge, useApp } from '../components';
import { speciesOf } from '../../core/pokemon';
import { MAX_KNOWN_MOVES, moveScore, moveSetOf, moveSlots, nextSlotLevel } from '../../core/moves';
import type { OwnedPokemon } from '../../core/state/types';

const CATEGORY: Record<string, string> = { physical: 'Físico', special: 'Especial', status: 'Status' };

export function MovesPanel({ pk }: { pk: OwnedPokemon }) {
  const app = useApp();
  const set = moveSetOf(app.data, pk);
  const slots = moveSlots(pk.level);
  const next = nextSlotLevel(pk.level);
  const known = [...set.known].sort((a, b) => moveScore(app.data, pk.species, b) - moveScore(app.data, pk.species, a));
  const upcoming = speciesOf(app.data, pk.species).learnset
    .filter(([lvl, id]) => lvl > pk.level && moveScore(app.data, pk.species, id) > 0 && !set.known.includes(id))
    .slice(0, 3);
  const toggle = (id: string) => {
    const on = set.active.includes(id);
    if (!on && set.active.length >= slots) return app.toast(`Só cabem ${slots} golpes no Nv ${pk.level}. Desequipe um antes.`, 'bad');
    const active = on ? set.active.filter((x) => x !== id) : [...set.active, id];
    app.dispatch({ type: 'SetMoves', uid: pk.uid, active, auto: false });
  };
  return (
    <div class="moves">
      <div class="moves__head">
        <h3>Golpes</h3>
        <span class="moves__count pk-num">{set.active.length}/{slots} equipados · {set.known.length}/{MAX_KNOWN_MOVES} conhecidos</span>
        <label class="moves__auto">
          <input type="checkbox" class="pk-toggle" checked={set.auto} onChange={(e) => app.dispatch({ type: 'SetMoves', uid: pk.uid, active: set.active, auto: (e.target as HTMLInputElement).checked })} />
          Automático
        </label>
      </div>
      <p class="small muted moves__hint">
        {next ? `Mais vagas no Nv ${next} (${moveSlots(next)} golpes).` : 'Todas as vagas abertas.'} {set.auto ? 'O jogo equipa os golpes mais fortes.' : 'Você escolhe os golpes: toque para equipar ou tirar.'}
      </p>
      <ul class="moves__list">
        {known.map((id) => {
          const mv = app.data.moves.get(id);
          if (!mv) return null;
          const on = set.active.includes(id);
          return (
            <li key={id}>
              <button class={`move ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(id)}>
                <span class="move__slot" aria-hidden="true">{on ? '▶' : ''}</span>
                <TypeBadge type={mv.type} />
                <span class="move__name">{mv.name}</span>
                <span class="move__meta pk-num">{CATEGORY[mv.category] ?? mv.category} · Poder {mv.power ?? '—'} · Prec. {mv.accuracy ?? '—'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {upcoming.length > 0 && (
        <p class="small muted moves__next">
          Próximos: {upcoming.map(([lvl, id]) => `${app.data.moves.get(id)?.name} (Nv ${lvl})`).join(' · ')}
        </p>
      )}
    </div>
  );
}
