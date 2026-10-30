// Uso de itens, itens segurados, loja, cura automática e comprador automático.
import type { ResolvedArea, ResolvedItem } from '../../data/registry';
import type { GameContext } from '../context';
import { upgradeLevel } from '../bonuses';
import { MAX_EV_STAT, MAX_EV_TOTAL } from '../formulas/stats';
import { expForLevel } from '../formulas/experience';
import { maxHpOf, partyMembers, speciesOf } from '../pokemon';
import type { GameState, OwnedPokemon } from '../state/types';
import { STAT_KEYS } from '../../data/types';
import { isNight, levelCap } from '../world';
import { canEvolve, evolve } from './evolution';
import { giveExp } from './progression';

export type Result = { ok: true; message?: string } | { ok: false; error: string };
const ok = (message?: string): Result => ({ ok: true, message });
const fail = (error: string): Result => ({ ok: false, error });

export function itemDef(ctx: GameContext, id: string): ResolvedItem {
  const it = ctx.data.items.get(id);
  if (!it) throw new Error(`Item desconhecido: ${id}`);
  return it;
}

function consume(state: GameState, id: string, qty = 1): void {
  state.inventory[id] = (state.inventory[id] ?? 0) - qty;
  if (state.inventory[id] <= 0) delete state.inventory[id];
}

/** Usa um item do inventário (opcionalmente em um Pokémon). */
export function useItem(ctx: GameContext, state: GameState, itemId: string, uid?: string): Result {
  if ((state.inventory[itemId] ?? 0) <= 0) return fail('Você não tem este item.');
  const item = itemDef(ctx, itemId);
  const pk = uid ? state.pokemon[uid] : undefined;
  const e = item.effect;

  if (e.kind === 'repel') {
    const cur = state.boosts.find((b) => b.kind === 'repel');
    if (cur) cur.remainingMs += e.minutes * 60_000;
    else state.boosts.push({ itemId, kind: 'repel', remainingMs: e.minutes * 60_000 });
    consume(state, itemId);
    ctx.emit({ type: 'itemUsed', itemId });
    return ok(`${item.name} ativo.`);
  }
  if (!pk) return fail('Escolha um Pokémon.');
  const maxHp = maxHpOf(state, ctx.data, pk);

  switch (e.kind) {
    case 'heal':
      if (pk.fainted) return fail('Pokémon desmaiado: use um Revive.');
      if (pk.hp >= maxHp) return fail('PS já está cheio.');
      pk.hp = e.hp === 'full' ? maxHp : Math.min(maxHp, pk.hp + e.hp);
      break;
    case 'revive':
      if (!pk.fainted) return fail('Este Pokémon não está desmaiado.');
      pk.fainted = false;
      pk.hp = Math.max(1, Math.floor(maxHp * e.fraction));
      break;
    case 'rareCandy': {
      if (pk.level >= levelCap(state, ctx.data)) return fail('No teto de nível atual.');
      const sp = speciesOf(ctx.data, pk.species);
      giveExp(ctx, state, pk, expForLevel(sp.growthRate, pk.level + 1) - pk.xp);
      break;
    }
    case 'vitamin': {
      const total = STAT_KEYS.reduce((a, k) => a + pk.evs[k], 0);
      if (pk.evs[e.stat] >= MAX_EV_STAT || total >= MAX_EV_TOTAL) return fail('EVs já no máximo.');
      pk.evs[e.stat] = Math.min(MAX_EV_STAT, pk.evs[e.stat] + Math.min(10, MAX_EV_TOTAL - total));
      break;
    }
    case 'evolution': {
      const evo = speciesOf(ctx.data, pk.species).evolutions.find((ev) => canEvolve(ctx, state, pk, ev, { kind: 'item', itemId }));
      if (!evo) return fail('Não tem efeito neste Pokémon agora.');
      consume(state, itemId);
      evolve(ctx, state, pk, evo);
      ctx.emit({ type: 'itemUsed', itemId, uid });
      return ok();
    }
    default:
      return fail('Este item é segurado, não usado. Use "Segurar".');
  }
  consume(state, itemId);
  ctx.emit({ type: 'itemUsed', itemId, uid });
  return ok();
}

/** Dá um item para o Pokémon segurar (devolve o anterior ao inventário). itemId null = remover. */
export function holdItem(ctx: GameContext, state: GameState, uid: string, itemId: string | null): Result {
  const pk = state.pokemon[uid];
  if (!pk) return fail('Pokémon não encontrado.');
  if (itemId) {
    if ((state.inventory[itemId] ?? 0) <= 0) return fail('Você não tem este item.');
    const cat = itemDef(ctx, itemId).category;
    if (cat !== 'held' && cat !== 'evolution') return fail('Este item não pode ser segurado.');
  }
  if (pk.heldItem) state.inventory[pk.heldItem] = (state.inventory[pk.heldItem] ?? 0) + 1;
  pk.heldItem = itemId;
  if (itemId) consume(state, itemId);
  return ok();
}

export function shopAvailable(ctx: GameContext, state: GameState): ResolvedItem[] {
  const badges = state.player.badges.length;
  return [...ctx.data.items.values()].filter((i) => i.price !== null && (i.shopBadges ?? 0) <= badges);
}

export function buyItem(ctx: GameContext, state: GameState, itemId: string, qty: number): Result {
  const item = itemDef(ctx, itemId);
  if (!shopAvailable(ctx, state).some((i) => i.id === itemId)) return fail('Item indisponível na loja.');
  if (!Number.isInteger(qty) || qty < 1) return fail('Quantidade inválida.');
  const cost = item.price! * qty;
  if (state.player.money < cost) return fail('Dinheiro insuficiente.');
  state.player.money -= cost;
  state.stats.moneySpent += cost;
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + qty;
  return ok();
}

export function sellItem(ctx: GameContext, state: GameState, itemId: string, qty: number): Result {
  const item = itemDef(ctx, itemId);
  if (item.category === 'key') return fail('Itens-chave não podem ser vendidos.');
  if (!Number.isInteger(qty) || qty < 1 || (state.inventory[itemId] ?? 0) < qty) return fail('Quantidade inválida.');
  const unit = Math.floor((item.price ?? 1000) / 2);
  consume(state, itemId, qty);
  state.player.money += unit * qty;
  return ok();
}

/** Multiplicador efetivo de uma bola contra o alvo nesta situação. */
export function ballMultiplier(
  ctx: GameContext, state: GameState, ballId: string, foeSpecies: string, area: ResolvedArea | undefined, firstThrow: boolean,
): { mult: number; master: boolean } {
  const e = itemDef(ctx, ballId).effect;
  if (e.kind !== 'ball') return { mult: 0, master: false };
  const b = e.bonus;
  if (!b) return { mult: e.mult, master: false };
  switch (b.kind) {
    case 'master':
      return { mult: 1, master: true };
    case 'types':
      return { mult: speciesOf(ctx.data, foeSpecies).types.some((t) => b.types.includes(t)) ? b.mult : e.mult, master: false };
    case 'nightOrCave':
      return { mult: isNight(ctx.now()) || area?.tags?.includes('cave') ? b.mult : e.mult, master: false };
    case 'firstThrow':
      return { mult: firstThrow ? b.mult : e.mult, master: false };
    case 'alreadyCaught':
      return { mult: (state.pokedex[foeSpecies]?.caught ?? 0) > 0 ? b.mult : e.mult, master: false };
  }
}

const POTIONS = ['potion', 'super-potion', 'hyper-potion', 'max-potion'];

/**
 * Cura automática (Auto Manager): para cada membro não desmaiado abaixo do limite, usa a poção mais barata que
 * cubra o que falta (ou a mais forte disponível). Revive automático se habilitado.
 */
export function autoHeal(ctx: GameContext, state: GameState): void {
  const s = state.settings;
  for (const pk of partyMembers(state)) {
    const maxHp = maxHpOf(state, ctx.data, pk);
    if (pk.fainted) {
      if (s.autoRevive && (state.inventory['revive'] ?? 0) > 0) {
        useItem(ctx, state, 'revive', pk.uid);
        ctx.emit({ type: 'healed', reason: 'revive' });
      }
      continue;
    }
    if (!s.autoPotion || pk.hp / maxHp >= s.autoPotionThreshold) continue;
    const missing = maxHp - pk.hp;
    const owned = POTIONS.filter((p) => (state.inventory[p] ?? 0) > 0);
    if (!owned.length) continue;
    const heals = (id: string) => {
      const e = itemDef(ctx, id).effect;
      return e.kind === 'heal' ? (e.hp === 'full' ? Infinity : e.hp) : 0;
    };
    const choice = owned.find((p) => heals(p) >= missing) ?? owned[owned.length - 1];
    useItem(ctx, state, choice, pk.uid);
    ctx.emit({ type: 'healed', reason: 'potion' });
  }
}

/** Comprador automático: repõe o estoque da bola escolhida dentro do orçamento (fração do dinheiro). */
export function autoBuy(ctx: GameContext, state: GameState): void {
  const s = state.settings;
  if (!s.autoBuy || upgradeLevel(state, 'auto-buyer') < 1) return;
  const stock = state.inventory[s.autoBuyItem] ?? 0;
  if (stock >= s.autoBuyMinStock) return;
  const item = shopAvailable(ctx, state).find((i) => i.id === s.autoBuyItem);
  if (!item?.price) return;
  const budget = Math.floor(Math.max(0, state.player.money) * Math.min(1, Math.max(0, s.autoBuyBudget)));
  const qty = Math.min(s.autoBuyMinStock * 2 - stock, Math.floor(budget / item.price));
  if (qty <= 0) return;
  state.player.money -= qty * item.price;
  state.stats.moneySpent += qty * item.price;
  state.inventory[item.id] = stock + qty;
  ctx.emit({ type: 'autoBuy', itemId: item.id, qty, cost: qty * item.price });
}

export function heldEffectMult(ctx: GameContext, pk: Pick<OwnedPokemon, 'heldItem'>, moveType: string, category: string): number {
  if (!pk.heldItem) return 1;
  const e = ctx.data.items.get(pk.heldItem)?.effect;
  if (!e) return 1;
  if (e.kind === 'typeBoost' && e.type === moveType) return e.mult;
  if (e.kind === 'categoryBoost' && e.category === category) return e.mult;
  return 1;
}
