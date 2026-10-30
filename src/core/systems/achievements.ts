// Conquistas: verificadas ao fim de batalhas/capturas/desafios. Recompensa em PP, uma única vez.
import { ACHIEVEMENTS, type AchievementMetric } from '../../data/content/achievements';
import { AFFINITY_THRESHOLDS } from '../../data/content/upgrades';
import type { GameContext } from '../context';
import { levelFromThresholds } from '../pokemon';
import type { GameState } from '../state/types';
import { caughtSpeciesCount } from '../world';

export function metricValue(state: GameState, m: AchievementMetric): number {
  switch (m) {
    case 'dexCaught':
      return caughtSpeciesCount(state);
    case 'badges':
      return state.player.badges.length;
    case 'champions':
      return state.player.champions.length;
    case 'affinityMax':
      return Math.max(0, ...Object.values(state.affinity).map((p) => levelFromThresholds(p, AFFINITY_THRESHOLDS)));
    case 'level100':
      return Object.values(state.pokemon).filter((p) => p.level >= 100).length;
    default:
      return state.stats[m];
  }
}

export function checkAchievements(ctx: GameContext, state: GameState): void {
  const memo = new Map<AchievementMetric, number>();
  const value = (m: AchievementMetric) => {
    if (!memo.has(m)) memo.set(m, metricValue(state, m));
    return memo.get(m)!;
  };
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    if (value(a.metric) < a.target) continue;
    state.achievements.push(a.id);
    state.player.researchPoints += a.rewardPP;
    ctx.emit({ type: 'achievement', id: a.id, name: a.name, rewardPP: a.rewardPP });
  }
}
