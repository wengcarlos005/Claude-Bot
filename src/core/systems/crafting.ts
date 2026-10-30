// Oficina: melhorias de treinador e itens que não são vendidos pela loja do jogo são FABRICADOS com fragmentos
// (que caem nas hunts) mais uma taxa em ₽. No futuro, também poderão ser comprados de outros jogadores no Mercado.
// A loja do jogo vende só bolas, remédios e buffs (Repel) — ver SHOP_CATEGORIES.
import type { ResolvedItem } from '../../data/registry';
import type { UpgradeDef } from '../../data/content/types';
import type { GameContext } from '../context';
import type { GameState } from '../state/types';
import { upgradeLevel } from '../bonuses';
import { addItem } from '../world';
import type { Result } from './items';

/** Fragmentos, do mais comum ao mais raro. */
export const FRAGMENTS = ['red-shard', 'blue-shard', 'green-shard', 'yellow-shard'] as const;
export type Fragment = (typeof FRAGMENTS)[number];
export type Materials = Partial<Record<Fragment, number>>;

/** Categorias que a loja do jogo vende. */
export const SHOP_CATEGORIES = new Set(['ball', 'medicine', 'boost']);
/** Categorias fabricadas na Oficina (quando têm valor de referência). */
const CRAFT_CATEGORIES = new Set(['evolution', 'vitamin', 'held']);

export interface CraftCost {
  money: number;
  mats: Materials;
}

/** Custo de fabricar o PRÓXIMO nível de uma melhoria de treinador (as melhorias pagas em ₽). */
export function upgradeCraftCost(u: UpgradeDef, level: number): CraftCost {
  const money = Math.round(u.baseCost * Math.pow(u.growth, level));
  if (u.id === 'academy') {
    return { money, mats: compact({ 'red-shard': Math.ceil(10 * 1.08 ** level), 'blue-shard': Math.ceil(3 * 1.08 ** level), 'green-shard': Math.floor(level / 4), 'yellow-shard': Math.floor(level / 10) }) };
  }
  if (u.id === 'pc-boxes') return { money, mats: compact({ 'red-shard': 3 + level, 'blue-shard': Math.floor(level / 3) }) };
  return {
    money,
    mats: compact({
      'red-shard': Math.ceil(4 * 1.45 ** level),
      'blue-shard': level >= 2 ? Math.ceil(2 * 1.4 ** (level - 2)) : 0,
      'green-shard': level >= 5 ? Math.ceil(1.5 ** (level - 5)) : 0,
      'yellow-shard': level >= 8 ? level - 7 : 0,
    }),
  };
}

/** Receita de um item da Oficina (pelo valor de referência do item). */
export function itemCraftCost(item: ResolvedItem): CraftCost | null {
  if (!CRAFT_CATEGORIES.has(item.category) || item.price === null) return null;
  const v = item.price;
  const mats: Materials = v <= 2500 ? { 'red-shard': 5, 'blue-shard': 2 }
    : v <= 4000 ? { 'red-shard': 8, 'blue-shard': 3 }
    : v <= 6000 ? { 'red-shard': 10, 'blue-shard': 4, 'green-shard': 1 }
    : { 'red-shard': 12, 'blue-shard': 6, 'green-shard': 2 };
  return { money: Math.round(v * 0.5), mats };
}

export function craftableItems(ctx: GameContext): ResolvedItem[] {
  return [...ctx.data.items.values()].filter((i) => itemCraftCost(i) !== null);
}

export function canAfford(state: GameState, cost: CraftCost): boolean {
  return state.player.money >= cost.money && Object.entries(cost.mats).every(([id, n]) => (state.inventory[id] ?? 0) >= (n ?? 0));
}

export function pay(state: GameState, cost: CraftCost): void {
  state.player.money -= cost.money;
  state.stats.moneySpent += cost.money;
  for (const [id, n] of Object.entries(cost.mats)) {
    state.inventory[id] = (state.inventory[id] ?? 0) - (n ?? 0);
    if (state.inventory[id] <= 0) delete state.inventory[id];
  }
}

export function craftItem(ctx: GameContext, state: GameState, itemId: string, qty: number): Result {
  const item = ctx.data.items.get(itemId);
  const cost = item ? itemCraftCost(item) : null;
  if (!item || !cost) return { ok: false, error: 'Este item não é fabricado na Oficina.' };
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return { ok: false, error: 'Quantidade inválida.' };
  const total: CraftCost = { money: cost.money * qty, mats: Object.fromEntries(Object.entries(cost.mats).map(([k, n]) => [k, (n ?? 0) * qty])) };
  if (!canAfford(state, total)) return { ok: false, error: 'Fragmentos ou dinheiro insuficientes.' };
  pay(state, total);
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + qty;
  return { ok: true };
}

export function nextUpgradeCost(ctx: GameContext, state: GameState, id: string): CraftCost | null {
  const u = ctx.data.upgrades.get(id);
  if (!u || u.currency !== 'money') return null;
  const lvl = upgradeLevel(state, id);
  return lvl >= u.maxLevel ? null : upgradeCraftCost(u, lvl);
}

// ---------------------------------------------------------------- drops

export type DropSource = 'wild' | 'capture' | 'trainer' | 'challenge' | 'badge' | 'champion' | 'shiny' | 'legendary';

/** Fragmentos ganhos por evento. Regiões mais avançadas rendem mais (×1, ×1,5, ×2, ×2,5). */
export function dropFragments(ctx: GameContext, state: GameState, source: DropSource, regionIndex: number): Materials {
  const r = ctx.rng;
  const got: Materials = {};
  const give = (id: Fragment, n: number) => {
    if (n > 0) got[id] = (got[id] ?? 0) + n;
  };
  const roll = (p: number) => r.chance(p);
  switch (source) {
    case 'wild':
    case 'capture':
      if (roll(0.3)) give('red-shard', 1);
      if (roll(0.06)) give('blue-shard', 1);
      if (roll(0.008)) give('green-shard', 1);
      break;
    case 'trainer':
      give('red-shard', 1 + (roll(0.5) ? 1 : 0));
      if (roll(0.4)) give('blue-shard', 1);
      if (roll(0.08)) give('green-shard', 1);
      break;
    case 'challenge':
      give('red-shard', 2);
      give('blue-shard', 1);
      if (roll(0.25)) give('green-shard', 1);
      break;
    case 'badge':
      give('green-shard', 3);
      give('yellow-shard', 1);
      break;
    case 'champion':
      give('green-shard', 5);
      give('yellow-shard', 3);
      break;
    case 'shiny':
      give('yellow-shard', 2);
      break;
    case 'legendary':
      give('yellow-shard', 3);
      break;
  }
  const mult = 1 + Math.max(0, regionIndex) * 0.5;
  for (const id of FRAGMENTS) {
    if (!got[id]) continue;
    got[id] = Math.max(1, Math.round(got[id]! * mult));
    addItem(ctx, state, id, got[id]!);
  }
  return got;
}

function compact(m: Materials): Materials {
  return Object.fromEntries(Object.entries(m).filter(([, n]) => (n ?? 0) > 0));
}
