// Multiplicadores globais derivados de melhorias, marcos da Pokédex e itens-chave.
import type { GameData } from '../data/registry';
import type { GameState } from './state/types';

export interface Bonuses {
  xpMult: number;
  moneyMult: number;
  captureBonus: number;
  statMult: number;
  shinyChance: number;
  walkMs: number;
  actionMs: number;
  expShare: number;
  offlineCapMs: number;
  offlineEfficiency: number;
  maxThrows: number;
  regenPerSec: number;
  centerMs: number;
}

export const BASE = {
  walkMs: 3500,
  actionMs: 800,
  captureActionMs: 900,
  centerMs: 20000,
  regenPerSec: 0.03,
  expShare: 0.25,
  offlineCapHours: 8,
  offlineEfficiency: 0.5,
  maxThrows: 3,
  shinyChance: 1 / 8192,
};

export function upgradeLevel(state: GameState, id: string): number {
  return state.upgrades[id] ?? 0;
}

const cache = new WeakMap<GameState, { key: string; value: Bonuses }>();

/** Bônus globais com cache: só recalcula quando melhorias, marcos ou itens-chave relevantes mudam. */
export function computeBonuses(state: GameState, data: GameData): Bonuses {
  const inv = state.inventory;
  let key = `${state.milestonesClaimed.length}|${inv['oval-charm'] ?? 0}|${inv['shiny-charm'] ?? 0}|${inv['bicycle'] ?? 0}`;
  for (const id in state.upgrades) key += `|${id}:${state.upgrades[id]}`;
  const hit = cache.get(state);
  if (hit && hit.key === key) return hit.value;
  const value = computeBonusesUncached(state, data);
  cache.set(state, { key, value });
  return value;
}

function computeBonusesUncached(state: GameState, data: GameData): Bonuses {
  let xp = 0;
  let money = 0;
  let capture = 0;
  let stat = 0;
  for (const m of data.milestones) {
    if (!state.milestonesClaimed.includes(m.id)) continue;
    for (const r of m.rewards) {
      if (r.kind === 'xpMult') xp += r.value;
      else if (r.kind === 'moneyMult') money += r.value;
      else if (r.kind === 'captureMult') capture += r.value;
      else if (r.kind === 'statMult') stat += r.value;
    }
  }
  const u = (id: string) => upgradeLevel(state, id);
  const has = (item: string) => (state.inventory[item] ?? 0) > 0;
  xp += u('xp-boost') * 0.1;
  stat += u('academy') * 0.01;
  money += u('amulet') * 0.1;
  capture += u('capture-skill') * 0.05 + (has('oval-charm') ? 0.1 : 0);
  return {
    xpMult: 1 + xp,
    moneyMult: 1 + money,
    captureBonus: capture,
    statMult: 1 + stat,
    shinyChance: BASE.shinyChance * (1 + u('shiny-hunter') * 0.25) * (has('shiny-charm') ? 2 : 1),
    walkMs: BASE.walkMs * Math.pow(0.92, u('running-shoes')) * (has('bicycle') ? 0.8 : 1),
    actionMs: BASE.actionMs * Math.pow(0.9, u('battle-speed')),
    expShare: Math.min(0.95, BASE.expShare + u('exp-share') * 0.1),
    offlineCapMs: (BASE.offlineCapHours + u('offline-cap')) * 3600_000,
    offlineEfficiency: Math.min(1, BASE.offlineEfficiency + u('offline-efficiency') * 0.05),
    maxThrows: BASE.maxThrows + u('extra-throws'),
    regenPerSec: BASE.regenPerSec + u('regen') * 0.01,
    centerMs: BASE.centerMs * Math.pow(0.85, u('nurse')),
  };
}
