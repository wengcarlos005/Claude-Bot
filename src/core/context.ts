import type { GameData } from '../data/registry';
import type { Rng } from './engine/rng';
import type { GameEvent } from './events';

/** Dependências injetadas em todos os sistemas do core. */
export interface GameContext {
  data: GameData;
  rng: Rng;
  /** Relógio de parede (ms). Usado só para horário do dia e carimbos de data. */
  now: () => number;
  emit: (e: GameEvent) => void;
}
