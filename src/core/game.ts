// Fachada isomórfica do core: estado + contexto + comandos + eventos. Sem DOM — roda no navegador,
// nos testes e no simulador (Node). Um backend autoritativo futuro pode usar exatamente esta classe.
import type { GameData } from '../data/registry';
import { applyCommand, type Command } from './commands';
import type { GameContext } from './context';
import { Rng } from './engine/rng';
import type { GameEvent } from './events';
import type { Result } from './systems/items';
import type { GameState } from './state/types';
import { tickExploration } from './systems/exploration';

export type Listener = (e: GameEvent) => void;

export class GameCore {
  readonly ctx: GameContext;
  private listeners = new Set<Listener>();

  constructor(
    readonly data: GameData,
    public state: GameState,
    now: () => number = () => Date.now(),
  ) {
    this.ctx = { data, rng: new Rng(state.rng), now, emit: (e) => this.listeners.forEach((l) => l(e)) };
  }

  /** Substitui o estado (ex.: ao carregar um save). */
  setState(state: GameState): void {
    this.state = state;
    this.ctx.rng = new Rng(state.rng);
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  tick(dtMs: number): void {
    tickExploration(this.ctx, this.state, dtMs);
  }

  dispatch(cmd: Command): Result {
    const r = applyCommand(this.ctx, this.state, cmd);
    if (r.ok) this.state.meta.revision++;
    return r;
  }
}
