// Hunt Analyzer: projeta o desempenho da equipe atual em uma área rodando o motor real numa CÓPIA do estado.
// É uma projeção (amostra semeada de N minutos), não uma garantia — a UI exibe as premissas.
import type { GameData } from '../data/registry';
import { simulate } from './simulate';
import type { GameState } from './state/types';
import { setActiveArea, healParty } from './systems/exploration';
import { GameCore } from './game';

export interface HuntEstimate {
  areaId: string;
  sampleMinutes: number;
  xpPerHour: number;
  moneyPerHour: number;
  encountersPerHour: number;
  capturesPerHour: number;
  newSpeciesPerHour: number;
  ballsPerHour: number;
  lossesPerHour: number;
  winRate: number;
  /** Índice explicável: XP/h normalizado × taxa de vitória (penaliza risco). */
  efficiency: number;
}

export function estimateHunt(data: GameData, state: GameState, areaId: string, sampleMinutes = 20, now = Date.now()): HuntEstimate {
  const clone: GameState = structuredClone(state);
  clone.rng = { s: 0x9e3779b9 };
  const core = new GameCore(data, clone, () => now);
  healParty(core.ctx, clone);
  setActiveArea(clone, areaId);
  clone.world.lastFarmAreaId = areaId;
  const ms = sampleMinutes * 60_000;
  const sum = simulate(data, clone, ms, { now: () => now, stepMs: 500 });
  const perHour = (v: number) => (v * 3600_000) / sum.simulatedMs;
  const battles = sum.battlesWon + sum.battlesLost;
  const winRate = battles ? sum.battlesWon / battles : 0;
  const xpPerHour = perHour(sum.xp);
  return {
    areaId,
    sampleMinutes,
    xpPerHour,
    moneyPerHour: perHour(sum.money),
    encountersPerHour: perHour(sum.encounters),
    capturesPerHour: perHour(sum.captures),
    newSpeciesPerHour: perHour(sum.newSpecies.length),
    ballsPerHour: perHour(sum.ballsUsed),
    lossesPerHour: perHour(sum.battlesLost),
    winRate,
    efficiency: xpPerHour * winRate * winRate,
  };
}
