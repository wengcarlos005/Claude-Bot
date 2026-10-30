// Runtime do navegador: carrega dados e save, roda o loop, calcula progresso offline, salva e expõe sinais para a UI.
import { signal } from '@preact/signals';
import type { GameData } from '../data/registry';
import { loadGameData } from '../data/registry';
import type { Command } from '../core/commands';
import type { GameEvent } from '../core/events';
import { GameCore } from '../core/game';
import { computeBonuses } from '../core/bonuses';
import { emptySummary, simulate, type SimSummary } from '../core/simulate';
import { createInitialState } from '../core/state/create';
import type { GameState } from '../core/state/types';
import type { Result } from '../core/systems/items';
import { describeEvent } from './describe';
import {
  IndexedDbRepository, LocalStorageRepository, exportSave, importSave, loadGame, saveGame, wipeSaves, type SaveRepository,
} from './persistence';

const STEP_MS = 100;
const MAX_FRAME_CATCHUP_MS = 5000;
const OFFLINE_THRESHOLD_MS = 60_000;
const AUTOSAVE_MS = 30_000;
const UI_REFRESH_MS = 200;

export interface LogEntry {
  id: number;
  text: string;
  tone: 'normal' | 'good' | 'great' | 'bad' | 'muted';
}

export interface Toast {
  id: number;
  text: string;
  tone: LogEntry['tone'];
}

export interface OfflineReport {
  awayMs: number;
  simulatedMs: number;
  efficiency: number;
  capped: boolean;
  summary: SimSummary;
}

export class GameApp {
  readonly frame = signal(0);
  readonly log = signal<LogEntry[]>([]);
  readonly toasts = signal<Toast[]>([]);
  readonly offlineReport = signal<OfflineReport | null>(null);
  readonly offlineProgress = signal<number | null>(null);
  readonly lastHit = signal<{ side: 'player' | 'foe'; at: number; crit: boolean; eff: number } | null>(null);
  core: GameCore;
  private seq = 0;
  private acc = 0;
  private lastFrame = 0;
  private lastUi = 0;
  private lastSave = 0;
  private running = false;
  private busy = false;
  private saveSoon = false;

  private constructor(readonly data: GameData, state: GameState, private repo: SaveRepository) {
    this.core = new GameCore(data, state);
    this.core.on((e) => this.onEvent(e));
  }

  static async boot(): Promise<GameApp> {
    const data = await loadGameData();
    let repo: SaveRepository = new IndexedDbRepository();
    let loaded: Awaited<ReturnType<typeof loadGame>> = null;
    try {
      loaded = await loadGame(repo);
    } catch {
      repo = new LocalStorageRepository();
      loaded = await loadGame(repo);
    }
    const now = Date.now();
    const state = loaded?.state ?? createInitialState(data, now, (Math.random() * 2 ** 32) >>> 0);
    const app = new GameApp(data, state, repo);
    if (loaded && loaded.slot !== 'main') app.toast('O save principal estava corrompido; restaurado do backup.', 'bad');
    return app;
  }

  get state(): GameState {
    return this.core.state;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.handleAway().then(() => {
      this.lastFrame = performance.now();
      requestAnimationFrame(this.loop);
      // Fallback quando a aba está em segundo plano (rAF pausa; timers ficam limitados a ~1/s).
      setInterval(() => {
        if (document.hidden) this.advance(performance.now());
      }, 1000);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.save();
      else void this.handleAway();
    });
    window.addEventListener('pagehide', () => void this.save());
  }

  private loop = (t: number) => {
    if (!document.hidden) this.advance(t);
    requestAnimationFrame(this.loop);
  };

  private advance(t: number): void {
    if (this.busy) return;
    const dt = Math.min(t - this.lastFrame, MAX_FRAME_CATCHUP_MS);
    this.lastFrame = t;
    this.acc += Math.max(0, dt);
    while (this.acc >= STEP_MS) {
      this.core.tick(STEP_MS);
      this.acc -= STEP_MS;
    }
    this.state.meta.lastTickAt = Date.now();
    if (t - this.lastUi >= UI_REFRESH_MS) {
      this.lastUi = t;
      this.frame.value++;
    }
    if (t - this.lastSave >= AUTOSAVE_MS || this.saveSoon) {
      this.lastSave = t;
      this.saveSoon = false;
      void this.save();
    }
  }

  /** Progresso offline: simula o tempo ausente (limitado e com eficiência) com o motor real, em fatias. */
  private async handleAway(): Promise<void> {
    if (this.busy) return;
    const now = Date.now();
    const away = now - this.state.meta.lastTickAt;
    this.lastFrame = performance.now();
    if (away < OFFLINE_THRESHOLD_MS || !this.state.player.starterChosen) {
      if (away > 0 && away < OFFLINE_THRESHOLD_MS) this.acc += away;
      this.state.meta.lastTickAt = now;
      return;
    }
    this.busy = true;
    const b = computeBonuses(this.state, this.data);
    const capped = away > b.offlineCapMs;
    const target = Math.min(away, b.offlineCapMs) * b.offlineEfficiency;
    const summary = emptySummary();
    this.offlineProgress.value = 0;
    while (summary.simulatedMs < target) {
      simulate(this.data, this.state, Math.min(target - summary.simulatedMs, 10 * 60_000), { summary, budgetMs: 40, stepMs: 500, now: () => now });
      this.offlineProgress.value = summary.simulatedMs / target;
      await new Promise((r) => setTimeout(r, 0));
    }
    this.core.setState(this.state);
    this.state.stats.offlineMs += away;
    this.state.meta.lastTickAt = Date.now();
    this.offlineProgress.value = null;
    this.offlineReport.value = { awayMs: away, simulatedMs: summary.simulatedMs, efficiency: b.offlineEfficiency, capped, summary };
    this.busy = false;
    this.frame.value++;
    await this.save(true);
  }

  dispatch(cmd: Command): Result {
    const r = this.core.dispatch(cmd);
    if (!r.ok) this.toast(r.error, 'bad');
    else if (r.message) this.toast(r.message, 'good');
    this.saveSoon = true;
    this.frame.value++;
    return r;
  }

  async save(rotate = false): Promise<void> {
    try {
      await saveGame(this.repo, this.state, Date.now(), rotate);
    } catch (e) {
      console.error('Falha ao salvar', e);
    }
  }

  async exportString(): Promise<string> {
    return exportSave(this.state, Date.now());
  }

  async importString(text: string): Promise<void> {
    const state = await importSave(text);
    state.meta.lastTickAt = Date.now();
    this.core.setState(state);
    await this.save(true);
    this.toast('Save importado com sucesso.', 'good');
    this.frame.value++;
  }

  async resetGame(): Promise<void> {
    await wipeSaves(this.repo);
    this.core.setState(createInitialState(this.data, Date.now(), (Math.random() * 2 ** 32) >>> 0));
    this.log.value = [];
    this.frame.value++;
  }

  toast(text: string, tone: Toast['tone'] = 'normal'): void {
    const t = { id: ++this.seq, text, tone };
    this.toasts.value = [...this.toasts.value.slice(-4), t];
    setTimeout(() => (this.toasts.value = this.toasts.value.filter((x) => x.id !== t.id)), 4500);
  }

  private onEvent(e: GameEvent): void {
    if (e.type === 'move') this.lastHit.value = { side: e.side, at: performance.now(), crit: e.crit, eff: e.effectiveness };
    const d = describeEvent(this.data, this.state, e);
    if (!d) return;
    this.log.value = [{ id: ++this.seq, text: d.text, tone: d.tone }, ...this.log.value].slice(0, 80);
    if (d.toast) {
      this.toast(d.text, d.tone);
      this.saveSoon = true;
    }
  }
}
