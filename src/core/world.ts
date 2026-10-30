// Regiões, áreas, requisitos de desbloqueio e teto de nível.
import type { Requirement, RegionDef } from '../data/content/types';
import type { GameData, ResolvedArea } from '../data/registry';
import type { GameContext } from './context';
import type { AreaProgress, GameState } from './state/types';

export function caughtSpeciesCount(state: GameState): number {
  let n = 0;
  for (const e of Object.values(state.pokedex)) if (e.caught > 0) n++;
  return n;
}

export function checkRequirement(state: GameState, req: Requirement): boolean {
  switch (req.type) {
    case 'areaCleared':
      return !!state.world.areas[req.areaId]?.cleared;
    case 'trainerLevel':
      return trainerLevel(state) >= req.min;
    case 'badge':
      return state.player.badges.includes(req.badgeId);
    case 'badgeCount':
      return state.player.badges.length >= req.min;
    case 'championOf':
      return state.player.champions.includes(req.regionId);
    case 'pokedexCaught':
      return caughtSpeciesCount(state) >= req.min;
    case 'keyItem':
      return (state.inventory[req.itemId] ?? 0) > 0;
    case 'anyOf':
      return req.of.some((r) => checkRequirement(state, r));
  }
}

export function regionUnlocked(state: GameState, region: RegionDef): boolean {
  return region.unlock.every((r) => checkRequirement(state, r));
}

export function areaUnlocked(state: GameState, data: GameData, area: ResolvedArea): boolean {
  const region = data.regionById.get(area.regionId)!;
  if (!regionUnlocked(state, region)) return false;
  if (area.gym && state.player.badges.includes(area.gym.badgeId)) return false; // ginásio já vencido
  if (area.league && state.player.champions.includes(area.regionId)) return true;
  return area.unlock.every((r) => checkRequirement(state, r));
}

export function unlockedAreaIds(state: GameState, data: GameData): string[] {
  return [...data.areas.values()].filter((a) => areaUnlocked(state, data, a)).map((a) => a.id);
}

export function regionBadges(region: RegionDef): string[] {
  return region.areas.filter((a) => a.gym).map((a) => a.gym!.badgeId);
}

/** Teto de nível atual: o maior entre as regiões liberadas. Pokémon no teto não ganham XP. */
export function levelCap(state: GameState, data: GameData): number {
  let cap = 0;
  for (const region of data.regions) {
    if (!regionUnlocked(state, region)) continue;
    if (state.player.champions.includes(region.id)) cap = Math.max(cap, region.championCap);
    else {
      const count = regionBadges(region).filter((b) => state.player.badges.includes(b)).length;
      cap = Math.max(cap, region.levelCaps[Math.min(count, region.levelCaps.length - 1)]);
    }
  }
  return Math.max(cap, 5);
}

export function areaProgress(state: GameState, areaId: string): AreaProgress {
  let p = state.world.areas[areaId];
  if (!p) state.world.areas[areaId] = p = { wins: 0, trainersDefeated: [], cleared: false, encounters: 0 };
  return p;
}

/** Multiplicador global de vitórias para concluir áreas (calibrado no simulador). */
export const WINS_TO_CLEAR_MULT = 4;

/**
 * Vitórias necessárias para concluir a área. Áreas sem encontros "a pé" (só pesca/surf sem o item exigido na
 * própria área) exigem apenas vencer os treinadores.
 */
export function winsToClear(area: ResolvedArea): number {
  const walkable = area.slots.some((s) => s.method === 'walk' || s.method === 'headbutt' || s.method === 'rock-smash');
  const surfable = area.slots.some((s) => s.method === 'surf') && area.unlock.some((r) => r.type === 'keyItem' && r.itemId === 'hm-surf');
  if (!walkable && !surfable) return 0;
  return Math.round((area.winsToClear ?? 10) * WINS_TO_CLEAR_MULT * area.winsMult);
}

export function isFarmArea(area: ResolvedArea): boolean {
  return !area.gym && !area.league;
}

/** Verifica se a área foi concluída; aplica recompensas e anuncia áreas recém-liberadas. */
export function checkAreaCleared(ctx: GameContext, state: GameState, area: ResolvedArea): void {
  if (!isFarmArea(area)) return;
  const p = areaProgress(state, area.id);
  if (p.cleared) return;
  const trainersDone = area.routeTrainers.every((t) => p.trainersDefeated.includes(t.id));
  if (p.wins < winsToClear(area) || !trainersDone) return;
  const before = new Set(unlockedAreaIds(state, ctx.data));
  p.cleared = true;
  state.player.researchPoints += 5;
  state.player.trainerXp += 20;
  ctx.emit({ type: 'areaCleared', areaId: area.id });
  if (area.clearReward?.items) for (const [id, qty] of Object.entries(area.clearReward.items)) addItem(ctx, state, id, qty);
  if (area.clearReward?.money) state.player.money += area.clearReward.money;
  announceUnlocks(ctx, state, before);
}

export function announceUnlocks(ctx: GameContext, state: GameState, before: Set<string>): void {
  for (const id of unlockedAreaIds(state, ctx.data)) if (!before.has(id)) ctx.emit({ type: 'areaUnlocked', areaId: id });
}

export function addItem(ctx: GameContext, state: GameState, itemId: string, qty: number): void {
  const item = ctx.data.items.get(itemId);
  if (!item) throw new Error(`Item desconhecido: ${itemId}`);
  const cur = state.inventory[itemId] ?? 0;
  state.inventory[itemId] = item.category === 'key' ? 1 : cur + qty;
  ctx.emit({ type: 'itemFound', itemId, qty });
}

/** Hora local → período do dia (usado em encontros e evoluções). */
export function timeOfDay(nowMs: number): 'morning' | 'day' | 'night' {
  const h = new Date(nowMs).getHours();
  if (h >= 4 && h < 10) return 'morning';
  if (h >= 10 && h < 20) return 'day';
  return 'night';
}

export function isNight(nowMs: number): boolean {
  return timeOfDay(nowMs) === 'night';
}

// ---------------------------------------------------------------- Nível de Treinador

export const TRAINER_MAX_LEVEL = 100;

/** XP total para estar no Nível de Treinador `n` (curva quadrática: 10·(n−1)²). */
export function trainerXpForLevel(n: number): number {
  return 10 * (Math.max(1, n) - 1) ** 2;
}

export function trainerLevel(state: GameState): number {
  return Math.min(TRAINER_MAX_LEVEL, 1 + Math.floor(Math.sqrt(state.player.trainerXp / 10)));
}

/** Concede XP de Treinador; anuncia subida de nível e as áreas que ela liberou. */
export function giveTrainerXp(ctx: GameContext, state: GameState, amount: number): void {
  if (amount <= 0) return;
  const before = trainerLevel(state);
  const unlockedBefore = new Set(unlockedAreaIds(state, ctx.data));
  state.player.trainerXp += Math.round(amount);
  const after = trainerLevel(state);
  if (after > before) {
    ctx.emit({ type: 'trainerLevelUp', level: after });
    announceUnlocks(ctx, state, unlockedBefore);
  }
}
