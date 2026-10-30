import { loadGameData, type GameData } from '../src/data/registry';
import { createInitialState } from '../src/core/state/create';
import { GameCore } from '../src/core/game';

let cached: GameData | null = null;
export async function data(): Promise<GameData> {
  return (cached ??= await loadGameData());
}

/** Core novo com relógio fixo (meio-dia) e semente determinística. */
export async function newCore(seed = 1, hour = 12) {
  const d = await data();
  let clock = Date.UTC(2026, 0, 1, hour) + new Date().getTimezoneOffset() * 60_000;
  const state = createInitialState(d, clock, seed);
  const core = new GameCore(d, state, () => clock);
  return { core, state, data: d, advance: (ms: number) => (clock += ms) };
}
