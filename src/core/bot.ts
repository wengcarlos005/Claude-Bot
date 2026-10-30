// "Jogador automático" usado pelo simulador de balanceamento: toma decisões simples e razoáveis,
// como um jogador casual que entra algumas vezes por dia.
import type { GameCore } from './game';
import { upgradeCost } from './commands';
import { activeMember, maxHpOf, partyMembers, pokemonStats } from './pokemon';
import { areaUnlocked, checkRequirement, isFarmArea } from './world';
import { availableEvolutions } from './systems/evolution';
import { shopAvailable } from './systems/items';
import { ivTotal } from './formulas/stats';

export function botDecide(core: GameCore): void {
  const { state, data, ctx } = core;
  if (!state.player.starterChosen) {
    core.dispatch({ type: 'ChooseStarter', species: data.regions[0].starters![0] });
    return;
  }
  // Equipe: os 6 Pokémon de maior "poder" (nível + soma de atributos).
  const power = (uid: string) => {
    const pk = state.pokemon[uid];
    const s = pokemonStats(state, data, pk);
    return pk.level * 10 + s.atk + s.spa + s.def + s.spd + s.spe + s.hp;
  };
  const best = Object.keys(state.pokemon).sort((a, b) => power(b) - power(a)).slice(0, 6);
  if (best.join() !== state.party.join()) core.dispatch({ type: 'SetParty', uids: best });

  // Evoluções por item.
  for (const pk of Object.values(state.pokemon)) {
    for (const ev of availableEvolutions(ctx, state, pk)) {
      if (ev.itemId) core.dispatch({ type: 'UseItem', itemId: ev.itemId, uid: pk.uid });
    }
  }
  // Compras: bolas e poções.
  const shop = shopAvailable(ctx, state).map((i) => i.id);
  const ball = shop.includes('ultra-ball') ? 'ultra-ball' : shop.includes('great-ball') ? 'great-ball' : 'poke-ball';
  for (const r of state.captureRules) if (r.when === 'notCaught') r.ball = ball;
  const price = data.items.get(ball)!.price!;
  if ((state.inventory[ball] ?? 0) < 15 && state.player.money > price * 20) core.dispatch({ type: 'BuyItem', itemId: ball, qty: 15 });
  const potion = shop.includes('max-potion') ? 'max-potion' : shop.includes('hyper-potion') ? 'hyper-potion' : shop.includes('super-potion') ? 'super-potion' : 'potion';
  const pp = data.items.get(potion)!.price!;
  const want = state.player.badges.length >= 8 ? 40 : 10;
  const have = state.inventory[potion] ?? 0;
  if (have < want && state.player.money > pp * (want - have) * 2) core.dispatch({ type: 'BuyItem', itemId: potion, qty: want - have });
  if (shop.includes('revive') && (state.inventory['revive'] ?? 0) < 5 && state.player.money > 40000) {
    core.dispatch({ type: 'BuyItem', itemId: 'revive', qty: 5 - (state.inventory['revive'] ?? 0) });
    if (!state.settings.autoRevive) core.dispatch({ type: 'SetSettings', settings: { autoRevive: true } });
  }
  // Pedras: compra uma se algum Pokémon puder usar.
  for (const pk of Object.values(state.pokemon)) {
    for (const evo of data.species.get(pk.species)!.evolutions) {
      const it = evo.conditions.find((c) => c.type === 'item');
      if (it && it.type === 'item' && shop.includes(it.itemId) && !(state.inventory[it.itemId] ?? 0)) {
        const p = data.items.get(it.itemId)!.price!;
        if (state.player.money > p * 5) core.dispatch({ type: 'BuyItem', itemId: it.itemId, qty: 1 });
      }
    }
  }
  // Melhorias: compra a mais barata que couber em 40% do dinheiro / 100% dos PP.
  for (let i = 0; i < 5; i++) {
    let pick: { id: string; cost: number } | null = null;
    for (const u of data.upgrades.values()) {
      const cost = upgradeCost(ctx, state, u.id);
      if (cost === null || (u.requires && !u.requires.every((r) => checkRequirement(state, r)))) continue;
      const afford = u.currency === 'money' ? cost <= state.player.money * 0.4 : cost <= state.player.researchPoints;
      if (afford && (!pick || cost < pick.cost)) pick = { id: u.id, cost };
    }
    if (!pick) break;
    core.dispatch({ type: 'BuyUpgrade', upgradeId: pick.id });
  }
  if (state.upgrades['auto-buyer'] && !state.settings.autoBuy) core.dispatch({ type: 'SetSettings', settings: { autoBuy: true, autoBuyItem: ball } });

  // Navegação: se a área atual está concluída, tenta ginásio/liga quando a equipe parece pronta; senão a área liberada mais avançada.
  const current = data.areas.get(state.world.activeAreaId)!;
  if (!isFarmArea(current)) return;
  const lead = activeMember(state);
  const team = partyMembers(state);
  const avgTop3 = team.slice(0, 3).reduce((a, p) => a + p.level, 0) / Math.max(1, Math.min(3, team.length));
  const unlocked = data.regions.flatMap((r) => r.areas).map((a) => data.areas.get(a.id)!).filter((a) => areaUnlocked(state, data, a));
  const challenge = unlocked.find(
    (a) => !isFarmArea(a) && !(a.league && state.player.champions.includes(a.regionId)) && avgTop3 >= a.levelRange[1] + (a.league ? 2 : 0),
  );
  if (challenge && (state.exploration.lossStreak === 0 || Math.random() < 0.3)) {
    core.dispatch({ type: 'SelectArea', areaId: challenge.id });
    return;
  }
  const farms = unlocked.filter(isFarmArea);
  const uncleared = farms.filter((a) => !state.world.areas[a.id]?.cleared && a.levelRange[0] <= avgTop3 + 3);
  const target = uncleared[0] ?? [...farms].reverse().find((a) => a.levelRange[0] <= (lead?.level ?? 5) + 2) ?? farms[0];
  if (target && target.id !== current.id) core.dispatch({ type: 'SelectArea', areaId: target.id });
  void maxHpOf;
  void ivTotal;
}
