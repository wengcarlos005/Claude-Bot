// Comandos do jogador: única forma de a UI alterar o estado. Cada comando valida e retorna Result.
import type { GameContext } from './context';
import { upgradeLevel } from './bonuses';
import { addPokemon, createPokemon, speciesOf } from './pokemon';
import type { CaptureRule, GameState, Settings } from './state/types';
import { MAX_PARTY } from './state/types';
import { registerCaught, gainAffinity, transferPokemon } from './systems/collection';
import { canEvolve, evolve } from './systems/evolution';
import { setActiveArea } from './systems/exploration';
import { buyItem, holdItem, sellItem, useItem, type Result } from './systems/items';
import { areaUnlocked, checkRequirement, isFarmArea } from './world';

export type Command =
  | { type: 'ChooseStarter'; species: string }
  | { type: 'SelectArea'; areaId: string }
  | { type: 'SetParty'; uids: string[] }
  | { type: 'BuyItem'; itemId: string; qty: number }
  | { type: 'SellItem'; itemId: string; qty: number }
  | { type: 'UseItem'; itemId: string; uid?: string }
  | { type: 'HoldItem'; uid: string; itemId: string | null }
  | { type: 'BuyUpgrade'; upgradeId: string }
  | { type: 'Transfer'; uids: string[] }
  | { type: 'ToggleLock'; uid: string }
  | { type: 'Rename'; uid: string; name: string }
  | { type: 'Evolve'; uid: string; into: string }
  | { type: 'SetSettings'; settings: Partial<Settings> }
  | { type: 'SetCaptureRules'; rules: CaptureRule[] }
  | { type: 'SavePreset'; name: string }
  | { type: 'LoadPreset'; index: number }
  | { type: 'DeletePreset'; index: number }
  | { type: 'SetPlayerName'; name: string };

const ok = (message?: string): Result => ({ ok: true, message });
const fail = (error: string): Result => ({ ok: false, error });

export function upgradeCost(ctx: GameContext, state: GameState, id: string): number | null {
  const u = ctx.data.upgrades.get(id);
  if (!u) return null;
  const lvl = upgradeLevel(state, id);
  if (lvl >= u.maxLevel) return null;
  return Math.round(u.baseCost * Math.pow(u.growth, lvl));
}

export function applyCommand(ctx: GameContext, state: GameState, cmd: Command): Result {
  switch (cmd.type) {
    case 'ChooseStarter': {
      if (state.player.starterChosen) return fail('Inicial já escolhido.');
      const region = ctx.data.regions[0];
      if (!region.starters?.includes(cmd.species)) return fail('Inicial inválido.');
      const pk = createPokemon(ctx, state, cmd.species, 5, { origin: 'starter', area: region.areas[0].id });
      addPokemon(state, pk);
      registerCaught(ctx, state, cmd.species, false);
      gainAffinity(ctx, state, cmd.species, false);
      state.player.starterChosen = true;
      setActiveArea(state, region.areas[0].id);
      return ok();
    }
    case 'SelectArea': {
      const area = ctx.data.areas.get(cmd.areaId);
      if (!area || !areaUnlocked(state, ctx.data, area)) return fail('Área bloqueada.');
      if (isFarmArea(area)) state.world.lastFarmAreaId = area.id;
      setActiveArea(state, area.id);
      return ok();
    }
    case 'SetParty': {
      const uids = [...new Set(cmd.uids)];
      if (!uids.length || uids.length > MAX_PARTY) return fail('A equipe precisa ter de 1 a 6 Pokémon.');
      if (!uids.every((u) => state.pokemon[u])) return fail('Pokémon inválido.');
      if (state.exploration.phase === 'battle') state.exploration.battle!.queue = [];
      state.party = uids;
      return ok();
    }
    case 'BuyItem':
      return buyItem(ctx, state, cmd.itemId, cmd.qty);
    case 'SellItem':
      return sellItem(ctx, state, cmd.itemId, cmd.qty);
    case 'UseItem':
      return useItem(ctx, state, cmd.itemId, cmd.uid);
    case 'HoldItem':
      return holdItem(ctx, state, cmd.uid, cmd.itemId);
    case 'BuyUpgrade': {
      const u = ctx.data.upgrades.get(cmd.upgradeId);
      const cost = upgradeCost(ctx, state, cmd.upgradeId);
      if (!u || cost === null) return fail('Melhoria no nível máximo.');
      if (u.requires && !u.requires.every((r) => checkRequirement(state, r))) return fail('Requisito da melhoria não atendido.');
      if (u.currency === 'money') {
        if (state.player.money < cost) return fail('Dinheiro insuficiente.');
        state.player.money -= cost;
        state.stats.moneySpent += cost;
      } else {
        if (state.player.researchPoints < cost) return fail('Pontos de Pesquisa insuficientes.');
        state.player.researchPoints -= cost;
      }
      state.upgrades[u.id] = upgradeLevel(state, u.id) + 1;
      if (u.id === 'pc-boxes') state.pcCapacity += 30;
      return ok();
    }
    case 'Transfer': {
      let money = 0;
      let research = 0;
      for (const uid of cmd.uids) {
        const r = transferPokemon(ctx, state, uid);
        if (typeof r === 'string') return fail(r);
        money += r.money;
        research += r.research;
      }
      return ok(`Transferido(s): +₽${money} e +${research} PP.`);
    }
    case 'ToggleLock': {
      const pk = state.pokemon[cmd.uid];
      if (!pk) return fail('Pokémon não encontrado.');
      pk.locked = !pk.locked;
      return ok();
    }
    case 'Rename': {
      const pk = state.pokemon[cmd.uid];
      if (!pk) return fail('Pokémon não encontrado.');
      pk.nickname = cmd.name.trim().slice(0, 12) || undefined;
      return ok();
    }
    case 'Evolve': {
      const pk = state.pokemon[cmd.uid];
      if (!pk) return fail('Pokémon não encontrado.');
      const evo = speciesOf(ctx.data, pk.species).evolutions.find((e) => e.into === cmd.into);
      if (!evo) return fail('Evolução inválida.');
      const item = evo.conditions.find((c) => c.type === 'item');
      if (item && item.type === 'item') return useItem(ctx, state, item.itemId, pk.uid);
      if (!canEvolve(ctx, state, pk, evo, { kind: 'level' })) return fail('Condições de evolução não atendidas.');
      evolve(ctx, state, pk, evo);
      return ok();
    }
    case 'SetSettings':
      state.settings = { ...state.settings, ...cmd.settings };
      return ok();
    case 'SetCaptureRules':
      if (cmd.rules.some((r) => !ctx.data.items.get(r.ball) || ctx.data.items.get(r.ball)!.category !== 'ball')) return fail('Bola inválida.');
      state.captureRules = cmd.rules;
      return ok();
    case 'SavePreset': {
      if (state.presets.length >= 8) return fail('Máximo de 8 presets.');
      state.presets.push({ name: cmd.name.trim().slice(0, 20) || `Preset ${state.presets.length + 1}`, party: [...state.party] });
      return ok();
    }
    case 'LoadPreset': {
      const p = state.presets[cmd.index];
      if (!p) return fail('Preset não encontrado.');
      const uids = p.party.filter((u) => state.pokemon[u]);
      if (!uids.length) return fail('Os Pokémon deste preset não existem mais.');
      state.party = uids;
      if (state.exploration.battle) state.exploration.battle.queue = [];
      return ok();
    }
    case 'DeletePreset':
      state.presets.splice(cmd.index, 1);
      return ok();
    case 'SetPlayerName':
      state.player.name = cmd.name.trim().slice(0, 16) || 'Treinador';
      return ok();
  }
}
