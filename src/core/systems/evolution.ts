// Avaliação e execução de evoluções (orientado a dados: condições vindas de species.json).
import type { Evolution, EvolutionCondition } from '../../data/types';
import type { GameContext } from '../context';
import { refreshMoves } from '../moves';
import { addPokemon, createPokemon, learnedMoves, maxHpOf, partyMembers, pokemonStats, speciesOf } from '../pokemon';
import type { GameState, OwnedPokemon } from '../state/types';
import { timeOfDay } from '../world';
import { registerCaught } from './collection';

export type EvolutionTrigger = { kind: 'level' } | { kind: 'item'; itemId: string };

export function conditionMet(ctx: GameContext, state: GameState, pk: OwnedPokemon, c: EvolutionCondition, trigger: EvolutionTrigger): boolean {
  switch (c.type) {
    case 'level':
      return pk.level >= c.min;
    case 'item':
      return trigger.kind === 'item' && trigger.itemId === c.itemId;
    case 'heldItem':
      return pk.heldItem === c.itemId;
    case 'friendship':
      return pk.friendship >= c.min;
    case 'timeOfDay': {
      const t = timeOfDay(ctx.now());
      return c.value === 'night' ? t === 'night' : t !== 'night';
    }
    case 'knowsMove':
      return learnedMoves(ctx.data, pk.species, pk.level).includes(c.moveId);
    case 'knowsMoveType':
      return learnedMoves(ctx.data, pk.species, pk.level).some((m) => ctx.data.moves.get(m)?.type === c.moveType);
    case 'statCompare': {
      const s = pokemonStats(state, ctx.data, pk);
      return c.rule === 'atk>def' ? s.atk > s.def : c.rule === 'atk<def' ? s.atk < s.def : s.atk === s.def;
    }
    case 'gender':
      return pk.gender === c.value;
    case 'personality':
      return pk.personality % c.of === c.bucket;
    case 'partySpecies':
      return partyMembers(state).some((p) => p.species === c.species);
    case 'partyType':
      return partyMembers(state).some((p) => p.uid !== pk.uid && speciesOf(ctx.data, p.species).types.includes(c.partyType));
  }
}

export function canEvolve(ctx: GameContext, state: GameState, pk: OwnedPokemon, evo: Evolution, trigger: EvolutionTrigger): boolean {
  if (evo.special) return false;
  if (pk.heldItem === 'everstone') return false;
  const needsItem = evo.conditions.some((c) => c.type === 'item');
  if (trigger.kind === 'level' && needsItem) return false;
  if (trigger.kind === 'item' && !needsItem) return false;
  return evo.conditions.every((c) => conditionMet(ctx, state, pk, c, trigger));
}

export function evolve(ctx: GameContext, state: GameState, pk: OwnedPokemon, evo: Evolution): void {
  const from = pk.species;
  const oldMax = maxHpOf(state, ctx.data, pk);
  const missing = oldMax - pk.hp;
  pk.species = evo.into;
  const newMax = maxHpOf(state, ctx.data, pk);
  if (!pk.fainted) pk.hp = Math.max(1, newMax - missing);
  if (evo.conditions.some((c) => c.type === 'heldItem' && c.itemId === pk.heldItem)) pk.heldItem = null;
  registerCaught(ctx, state, pk.species, pk.shiny);
  state.stats.evolutions++;
  ctx.emit({ type: 'evolved', uid: pk.uid, from, to: pk.species });
  refreshMoves(ctx, pk);

  // Shedinja: aparece junto quando Nincada evolui, se houver uma Poké Ball sobrando.
  const shed = speciesOf(ctx.data, from).evolutions.find((e) => e.special === 'shed');
  if (shed && (state.inventory['poke-ball'] ?? 0) > 0) {
    state.inventory['poke-ball']--;
    const twin = createPokemon(ctx, state, shed.into, pk.level, { origin: 'evolution', area: pk.caughtArea, shiny: pk.shiny });
    addPokemon(state, twin);
    registerCaught(ctx, state, twin.species, twin.shiny);
    ctx.emit({ type: 'evolved', uid: twin.uid, from, to: twin.species });
  }
}

/** Evolução automática ao subir de nível. */
export function tryLevelEvolution(ctx: GameContext, state: GameState, pk: OwnedPokemon): boolean {
  if (!state.settings.autoEvolve) return false;
  const evo = speciesOf(ctx.data, pk.species).evolutions.find((e) => canEvolve(ctx, state, pk, e, { kind: 'level' }));
  if (!evo) return false;
  evolve(ctx, state, pk, evo);
  return true;
}

/** Evoluções disponíveis agora (para a UI): por nível pendente (autoEvolve desligado) ou por item do inventário. */
export function availableEvolutions(ctx: GameContext, state: GameState, pk: OwnedPokemon): { evo: Evolution; itemId?: string }[] {
  const out: { evo: Evolution; itemId?: string }[] = [];
  for (const evo of speciesOf(ctx.data, pk.species).evolutions) {
    const item = evo.conditions.find((c) => c.type === 'item');
    if (item && item.type === 'item') {
      if ((state.inventory[item.itemId] ?? 0) > 0 && canEvolve(ctx, state, pk, evo, { kind: 'item', itemId: item.itemId })) {
        out.push({ evo, itemId: item.itemId });
      }
    } else if (canEvolve(ctx, state, pk, evo, { kind: 'level' })) out.push({ evo });
  }
  return out;
}
