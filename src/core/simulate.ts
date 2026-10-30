// Simulação acelerada: roda o MESMO motor do jogo em passos grandes. Usada no progresso offline,
// no Hunt Analyzer e no simulador de balanceamento.
import type { GameData } from '../data/registry';
import type { GameEvent } from './events';
import { GameCore } from './game';
import type { GameState } from './state/types';

export interface SimSummary {
  simulatedMs: number;
  battlesWon: number;
  battlesLost: number;
  encounters: number;
  captures: number;
  newSpecies: string[];
  shinies: string[];
  levelUps: number;
  evolutions: { from: string; to: string }[];
  badges: string[];
  money: number;
  xp: number;
  ballsUsed: number;
  itemsFound: Record<string, number>;
}

export function emptySummary(): SimSummary {
  return {
    simulatedMs: 0, battlesWon: 0, battlesLost: 0, encounters: 0, captures: 0, newSpecies: [], shinies: [], levelUps: 0,
    evolutions: [], badges: [], money: 0, xp: 0, ballsUsed: 0, itemsFound: {},
  };
}

export function summarize(sum: SimSummary, e: GameEvent): void {
  switch (e.type) {
    case 'battleWon':
      sum.battlesWon++;
      sum.money += e.money;
      sum.xp += e.xp;
      break;
    case 'battleLost':
      sum.battlesLost++;
      break;
    case 'encounter':
      sum.encounters++;
      if (e.shiny) sum.shinies.push(e.species);
      break;
    case 'captured':
      sum.captures++;
      if (e.newSpecies) sum.newSpecies.push(e.species);
      break;
    case 'captureThrow':
      sum.ballsUsed++;
      break;
    case 'levelUp':
      sum.levelUps++;
      break;
    case 'evolved':
      sum.evolutions.push({ from: e.from, to: e.to });
      break;
    case 'badge':
      sum.badges.push(e.badgeName);
      break;
    case 'itemFound':
      sum.itemsFound[e.itemId] = (sum.itemsFound[e.itemId] ?? 0) + e.qty;
      break;
  }
}

/**
 * Avança `ms` de jogo no estado informado (mutável), em passos de `stepMs`.
 * `budgetMs` limita o tempo real de CPU; retorna quanto foi efetivamente simulado.
 */
export function simulate(
  data: GameData, state: GameState, ms: number, opts: { now?: () => number; stepMs?: number; budgetMs?: number; summary?: SimSummary } = {},
): SimSummary {
  const sum = opts.summary ?? emptySummary();
  const core = new GameCore(data, state, opts.now ?? (() => Date.now()));
  core.on((e) => summarize(sum, e));
  const step = opts.stepMs ?? 500;
  const start = performance.now();
  let done = 0;
  while (done < ms) {
    const dt = Math.min(step, ms - done);
    core.tick(dt);
    done += dt;
    if (opts.budgetMs && performance.now() - start > opts.budgetMs) break;
  }
  sum.simulatedMs += done;
  return sum;
}
