// XP, níveis, EVs, amizade e Maestria.
import { MASTERY_XP_BONUS } from '../../data/content/upgrades';
import type { Stats } from '../../data/types';
import type { GameContext } from '../context';
import type { Bonuses } from '../bonuses';
import { battleExp, expForLevel } from '../formulas/experience';
import { addEvs } from '../formulas/stats';
import { masteryLevel, maxHpOf, partyMembers, speciesOf } from '../pokemon';
import type { GameState, OwnedPokemon } from '../state/types';
import { levelCap } from '../world';
import { tryLevelEvolution } from './evolution';
import { moveSlots, refreshMoves } from '../moves';

/** Concede XP a um Pokémon, respeitando o teto de nível. Retorna a XP efetivamente ganha. */
export function giveExp(ctx: GameContext, state: GameState, pk: OwnedPokemon, amount: number): number {
  const sp = speciesOf(ctx.data, pk.species);
  const cap = levelCap(state, ctx.data);
  if (pk.level >= cap) return 0;
  const maxXp = expForLevel(sp.growthRate, cap);
  const before = pk.xp;
  const startLevel = pk.level;
  pk.xp = Math.min(maxXp, pk.xp + Math.floor(amount));
  while (pk.level < cap && pk.xp >= expForLevel(sp.growthRate, pk.level + 1)) {
    const oldMax = maxHpOf(state, ctx.data, pk);
    pk.level++;
    const newMax = maxHpOf(state, ctx.data, pk);
    if (!pk.fainted) pk.hp = Math.min(newMax, pk.hp + (newMax - oldMax));
    pk.friendship = Math.min(255, pk.friendship + 2);
    ctx.emit({ type: 'levelUp', uid: pk.uid, species: pk.species, level: pk.level });
    tryLevelEvolution(ctx, state, pk);
  }
  if (pk.level !== startLevel) {
    refreshMoves(ctx, pk);
    if (moveSlots(pk.level) > moveSlots(startLevel)) {
      ctx.emit({ type: 'message', text: `${speciesOf(ctx.data, pk.species).name} agora pode usar ${moveSlots(pk.level)} golpes em batalha!` });
    }
  }
  return pk.xp - before;
}

/**
 * Distribui a XP de um adversário derrotado: participantes recebem 100%, o resto da equipe (não desmaiado)
 * recebe a fração da Exp. Share. Participantes também recebem os EVs da espécie derrotada.
 */
export function awardDefeat(
  ctx: GameContext, state: GameState, bonuses: Bonuses, participants: string[], foeSpecies: string, foeLevel: number,
  isTrainer: boolean, areaXpMult = 1,
): number {
  const foe = speciesOf(ctx.data, foeSpecies);
  let total = 0;
  for (const pk of partyMembers(state)) {
    if (pk.fainted) continue;
    const participant = participants.includes(pk.uid);
    let amount = battleExp(foe.baseExp, foeLevel, isTrainer, pk.level) * bonuses.xpMult * areaXpMult * (participant ? 1 : bonuses.expShare);
    if (pk.heldItem === 'lucky-egg') amount *= 1.5;
    amount *= 1 + masteryLevel(state, pk.species) * MASTERY_XP_BONUS;
    if (participant) addEvs(pk.evs, foe.evYield as Partial<Stats>);
    total += giveExp(ctx, state, pk, amount);
  }
  state.stats.xpEarned += total;
  state.hunt.xp += total;
  return total;
}

/**
 * Vitória do Pokémon ativo: Maestria da espécie, contador individual e amizade (+1 a cada 3 vitórias; ×2 com Soothe Bell).
 * Quando a amizade sobe, verifica evoluções (cobre Pokémon parados no teto de nível, que não sobem mais de nível).
 */
export function creditWin(ctx: GameContext, state: GameState, pk: OwnedPokemon): void {
  pk.wins++;
  state.mastery[pk.species] = (state.mastery[pk.species] ?? 0) + 1;
  if (pk.wins % 3 === 0 && pk.friendship < 255) {
    pk.friendship = Math.min(255, pk.friendship + (pk.heldItem === 'soothe-bell' ? 2 : 1));
    tryLevelEvolution(ctx, state, pk);
  }
}
