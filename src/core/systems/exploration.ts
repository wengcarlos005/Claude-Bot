// Loop principal da hunt: caminhada → encontro → batalha → captura/recompensas → caminhada.
import type { TrainerDef } from '../../data/content/types';
import type { ResolvedArea } from '../../data/registry';
import { transformLevel } from '../../data/registry';
import type { EncounterSlot } from '../../data/types';
import { BASE, computeBonuses, type Bonuses } from '../bonuses';
import type { GameContext } from '../context';
import { captureChance } from '../formulas/capture';
import { ivTotal } from '../formulas/stats';
import { activeMember, addPokemon, createPokemon, hasRoom, maxHpOf, partyMembers, speciesOf, toCombatant, wildCombatant } from '../pokemon';
import type { BattleKind, BattleState, CaptureRule, Combatant, GameState } from '../state/types';
import { addItem, announceUnlocks, areaProgress, areaUnlocked, checkAreaCleared, isFarmArea, levelCap, timeOfDay, unlockedAreaIds } from '../world';
import { attack, roundOrder } from './battle';
import { bestIvTotal, gainAffinity, registerCaught, registerSeen, shouldAutoTransfer, transferPokemon } from './collection';
import { autoBuy, autoHeal, ballMultiplier } from './items';
import { awardDefeat, creditWin } from './progression';
import { checkAchievements } from './achievements';

const METHOD_SHARE: Record<string, number> = {
  walk: 70, surf: 25, 'old-rod': 6, 'good-rod': 8, 'super-rod': 10, 'rock-smash': 8, headbutt: 8,
};
const METHOD_ITEM: Record<string, string> = { surf: 'hm-surf', 'old-rod': 'old-rod', 'good-rod': 'good-rod', 'super-rod': 'super-rod' };
const SEQUENCE_WALK_MS = 1500;

export function tickExploration(ctx: GameContext, state: GameState, dt: number): void {
  state.meta.playTimeMs += dt;
  for (const b of state.boosts) b.remainingMs -= dt;
  state.boosts = state.boosts.filter((b) => b.remainingMs > 0);
  const area = ctx.data.areas.get(state.world.activeAreaId);
  const ex = state.exploration;
  if (!state.player.starterChosen || !area || state.party.length === 0) {
    ex.phase = 'idle';
    return;
  }
  state.hunt.durationMs += dt;
  const bonuses = computeBonuses(state, ctx.data);

  switch (ex.phase) {
    case 'idle':
      ex.phase = 'walking';
      ex.timer = bonuses.walkMs;
      break;
    case 'walking':
      if (isFarmArea(area)) regenerate(ctx, state, bonuses, dt);
      ex.timer -= dt;
      if (ex.timer <= 0) {
        autoHeal(ctx, state);
        autoBuy(ctx, state);
        startNextEncounter(ctx, state, area, bonuses);
      }
      break;
    case 'battle': {
      const b = ex.battle;
      if (!b) {
        ex.phase = 'walking';
        ex.timer = bonuses.walkMs;
        break;
      }
      b.actionTimer -= dt;
      while (b.actionTimer <= 0 && ex.battle === b) b.actionTimer += stepBattle(ctx, state, area, bonuses, b);
      break;
    }
    case 'healing':
      ex.timer -= dt;
      if (ex.timer <= 0) {
        healParty(ctx, state);
        ctx.emit({ type: 'healed', reason: 'center' });
        ex.phase = 'walking';
        ex.timer = bonuses.walkMs;
      }
      break;
  }
}

function regenerate(ctx: GameContext, state: GameState, bonuses: Bonuses, dt: number): void {
  for (const pk of partyMembers(state)) {
    const maxHp = maxHpOf(state, ctx.data, pk);
    if (pk.hp >= maxHp && !pk.fainted) continue;
    const rate = bonuses.regenPerSec * (pk.fainted ? 0.5 : 1);
    pk.hp = Math.min(maxHp, pk.hp + (maxHp * rate * dt) / 1000);
    if (pk.fainted && pk.hp >= maxHp * 0.5) pk.fainted = false;
  }
}

export function healParty(ctx: GameContext, state: GameState): void {
  for (const pk of partyMembers(state)) {
    pk.hp = maxHpOf(state, ctx.data, pk);
    pk.fainted = false;
  }
}

// ---------------------------------------------------------------- encontros

export function availableMethods(state: GameState, area: ResolvedArea): string[] {
  const methods = new Set(area.slots.map((s) => s.method));
  return [...methods].filter((m) => !METHOD_ITEM[m] || (state.inventory[METHOD_ITEM[m]] ?? 0) > 0);
}

/** Slots disponíveis agora (método liberado e horário compatível), com o peso já ponderado pelo método. */
export function encounterTable(state: GameState, area: ResolvedArea, nowMs: number): { slot: EncounterSlot; weight: number }[] {
  const tod = timeOfDay(nowMs);
  const methods = availableMethods(state, area);
  const out: { slot: EncounterSlot; weight: number }[] = [];
  for (const m of methods) {
    const slots = area.slots.filter((s) => s.method === m && (!s.time || s.time.includes(tod)));
    const total = slots.reduce((a, s) => a + s.weight, 0);
    if (!total) continue;
    for (const s of slots) out.push({ slot: s, weight: (METHOD_SHARE[m] ?? 5) * (s.weight / total) });
  }
  const sum = out.reduce((a, x) => a + x.weight, 0);
  return out.map((x) => ({ ...x, weight: x.weight / sum }));
}

function startNextEncounter(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses): void {
  const ex = state.exploration;
  if (!activeMember(state)) {
    if (area.gym || area.league) {
      // Sem regeneração em desafios: equipe toda desmaiada entre lutas = derrota no desafio.
      state.stats.battlesLost++;
      state.hunt.losses++;
      ctx.emit({ type: 'battleLost', kind: area.league ? 'league' : 'gym' });
      state.exploration.sequenceIndex = 0;
      setActiveArea(state, state.world.lastFarmAreaId);
    }
    goHealing(state, bonuses);
    return;
  }
  const region = ctx.data.regionById.get(area.regionId)!;
  if (area.gym || area.league) {
    const seq = sequenceOf(area);
    const tr = seq[ex.sequenceIndex];
    if (!tr) return finishSequence(ctx, state, area);
    startTrainerBattle(ctx, state, tr, area.league ? 'league' : 'gym', region.levelOffset, region.levelScale, area.statMult, bonuses);
    return;
  }
  const progress = areaProgress(state, area.id);
  const pending = area.routeTrainers.filter((t) => !progress.trainersDefeated.includes(t.id));
  const table = encounterTable(state, area, ctx.now());
  if (pending.length && (table.length === 0 || ctx.rng.chance(0.2))) {
    startTrainerBattle(ctx, state, pending[0], 'trainer', 0, 1, area.statMult, bonuses);
    return;
  }
  if (!table.length) {
    ex.timer = bonuses.walkMs;
    return;
  }
  // Lendários: um encontro raro por área até ser capturado.
  for (const lg of area.legendaries ?? []) {
    if ((state.pokedex[lg.species]?.caught ?? 0) > 0) continue;
    if (ctx.rng.chance(lg.chance)) {
      startWildBattle(ctx, state, area, lg.species, transformLevel(region, lg.level), bonuses, true, 'walk');
      return;
    }
  }
  let candidates = table;
  const repel = state.boosts.some((b) => b.kind === 'repel');
  const lead = activeMember(state);
  if (repel && lead) {
    const filtered = table.filter((x) => x.slot.max >= lead.level - 5);
    if (filtered.length) candidates = filtered;
  }
  const { slot } = ctx.rng.weighted(candidates, (x) => x.weight);
  startWildBattle(ctx, state, area, slot.species, ctx.rng.int(slot.min, slot.max), bonuses, false, slot.method);
}

function sequenceOf(area: ResolvedArea): TrainerDef[] {
  if (area.gym) return [...area.gym.trainers, area.gym.leader];
  return area.league?.members ?? [];
}

function newBattle(kind: BattleKind, foe: Combatant, bonuses: Bonuses, method: string): BattleState {
  return {
    kind, foe, foeQueue: [], turn: 0, queue: [], actionTimer: bonuses.actionMs, participants: [], capture: null,
    legendary: false, encounterMethod: method,
  };
}

function startWildBattle(
  ctx: GameContext, state: GameState, area: ResolvedArea, species: string, level: number, bonuses: Bonuses, legendary: boolean,
  method: string,
): void {
  const shiny = ctx.rng.chance(bonuses.shinyChance);
  const foe = wildCombatant(ctx, species, level, area.statMult, shiny);
  const b = newBattle('wild', foe, bonuses, method);
  b.legendary = legendary;
  registerSeen(state, species, shiny);
  areaProgress(state, area.id).encounters++;
  state.stats.encounters++;
  state.stats.encountersSinceShiny++;
  state.hunt.encounters++;
  if (shiny) {
    state.stats.shiniesFound++;
    state.stats.encountersSinceShiny = 0;
    state.hunt.shinies++;
  }
  const rule = matchCaptureRule(ctx, state, foe, legendary);
  // Shiny: tenta até acabarem as bolas (máx. 30) — perder um shiny por falta de tentativas é frustrante demais.
  if (rule) b.capture = { ball: rule.ball, throws: 0, maxThrows: shiny ? Math.max(30, bonuses.maxThrows) : bonuses.maxThrows, ruleId: rule.id };
  state.exploration.battle = b;
  state.exploration.phase = 'battle';
  ctx.emit({ type: 'encounter', species, level, shiny, kind: 'wild', legendary });
}

function startTrainerBattle(
  ctx: GameContext, state: GameState, tr: TrainerDef, kind: BattleKind, offset: number, scale: number, statMult: number,
  bonuses: Bonuses,
): void {
  const team = tr.team.map((m) => ({
    species: m.species,
    level: Math.max(1, Math.min(100, Math.round(offset + m.level * scale))),
  }));
  const [first, ...rest] = team;
  const b = newBattle(kind, wildCombatant(ctx, first.species, first.level, statMult), bonuses, 'trainer');
  b.foeQueue = rest;
  b.trainer = { id: tr.id, name: tr.name, trainerClass: tr.trainerClass, moneyPerLevel: tr.moneyPerLevel, maxLevel: Math.max(...team.map((m) => m.level)) };
  registerSeen(state, first.species, false);
  state.hunt.encounters++;
  state.exploration.battle = b;
  state.exploration.phase = 'battle';
  ctx.emit({ type: 'encounter', species: first.species, level: first.level, shiny: false, kind: kind === 'trainer' ? 'trainer' : kind, trainerName: `${tr.trainerClass} ${tr.name}` });
}

// ---------------------------------------------------------------- regras de captura

export function ruleMatches(ctx: GameContext, state: GameState, rule: CaptureRule, foe: Combatant, legendary: boolean): boolean {
  if (!rule.enabled) return false;
  const sp = speciesOf(ctx.data, foe.species);
  switch (rule.when) {
    case 'shiny':
      return foe.shiny;
    case 'legendary':
      return legendary || sp.tags.includes('legendary') || sp.tags.includes('mythical');
    case 'notCaught':
      return (state.pokedex[foe.species]?.caught ?? 0) === 0;
    case 'betterIvs':
      return !!foe.ivs && ivTotal(foe.ivs) > bestIvTotal(state, foe.species);
    case 'species':
      return !!rule.species?.includes(foe.species);
    case 'any':
      return true;
  }
}

export function matchCaptureRule(ctx: GameContext, state: GameState, foe: Combatant, legendary: boolean): CaptureRule | null {
  return state.captureRules.find((r) => ruleMatches(ctx, state, r, foe, legendary)) ?? null;
}

/** Bola a usar: a da regra; se acabou e a regra permite, a mais barata disponível (Master Ball nunca por fallback). */
export function resolveBall(ctx: GameContext, state: GameState, ball: string | null, fallback: boolean): string | null {
  if (ball && (state.inventory[ball] ?? 0) > 0) return ball;
  if (!fallback) return null;
  const balls = [...ctx.data.items.values()]
    .filter((i) => i.category === 'ball' && i.id !== 'master-ball' && i.id !== 'safari-ball' && (state.inventory[i.id] ?? 0) > 0)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return balls[0]?.id ?? null;
}

// ---------------------------------------------------------------- passo de batalha

/** Processa uma ação da batalha. Retorna a duração (ms) da ação. */
function stepBattle(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses, b: BattleState): number {
  const pk = activeMember(state);
  if (!pk) {
    loseBattle(ctx, state, area, bonuses, b);
    return bonuses.actionMs;
  }
  const player = toCombatant(state, ctx.data, pk, bonuses.statMult, levelCap(state, ctx.data));
  if (!b.participants.includes(pk.uid)) b.participants.push(pk.uid);
  if (!b.queue.length) {
    b.queue = roundOrder(ctx, player, b.foe);
    b.turn++;
  }
  const actor = b.queue.shift()!;

  if (actor === 'player') {
    if (b.capture) {
      const rule = state.captureRules.find((r) => r.id === b.capture!.ruleId);
      const ball = rule?.enabled ? resolveBall(ctx, state, rule.ball, rule.fallback) : null;
      if (!ball) b.capture = null;
      else if (shouldThrow(b, ball)) return throwBall(ctx, state, area, bonuses, b, pk.uid, ball);
    }
    const res = attack(ctx, player, b.foe, !!b.capture);
    pk.hp = player.hp * (player.hpScale ?? 1);
    ctx.emit({ type: 'move', side: 'player', moveId: res.moveId, damage: res.damage, effectiveness: res.effectiveness, crit: res.crit, missed: res.missed });
    if (b.foe.hp <= 0) foeFainted(ctx, state, area, bonuses, b, pk.uid);
  } else {
    const res = attack(ctx, b.foe, player);
    pk.hp = player.hp * (player.hpScale ?? 1);
    ctx.emit({ type: 'move', side: 'foe', moveId: res.moveId, damage: res.damage, effectiveness: res.effectiveness, crit: res.crit, missed: res.missed });
    if (player.hp <= 0) {
      pk.hp = 0;
      pk.fainted = true;
      b.queue = [];
      ctx.emit({ type: 'fainted', side: 'player', species: pk.species });
      const next = activeMember(state);
      if (!next) loseBattle(ctx, state, area, bonuses, b);
      else ctx.emit({ type: 'switched', side: 'player', species: next.species });
    }
  }
  return bonuses.actionMs;
}

function shouldThrow(b: BattleState, ball: string): boolean {
  if (ball === 'master-ball' || (ball === 'quick-ball' && b.capture!.throws === 0)) return true;
  return b.foe.hp / b.foe.maxHp <= 0.5;
}

function throwBall(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses, b: BattleState, uid: string, ball: string): number {
  const cap = b.capture!;
  state.inventory[ball]--;
  if (state.inventory[ball] <= 0) delete state.inventory[ball];
  state.stats.captureAttempts++;
  state.hunt.ballsUsed++;
  const pk = state.pokemon[uid];
  const sp = speciesOf(ctx.data, b.foe.species);
  const bm = ballMultiplier(ctx, state, ball, b.foe.species, area, cap.throws === 0);
  const chance = captureChance({
    captureRate: sp.captureRate, maxHp: b.foe.maxHp, currentHp: b.foe.hp, ballMult: bm.mult, master: bm.master,
    playerLevel: Math.min(pk.level, levelCap(state, ctx.data)), wildLevel: b.foe.level, alreadyCaught: (state.pokedex[b.foe.species]?.caught ?? 0) > 0,
    bonus: bonuses.captureBonus,
  });
  const success = ctx.rng.chance(chance);
  ctx.emit({ type: 'captureThrow', species: b.foe.species, ball, chance, success });
  cap.throws++;
  if (success) {
    finishCapture(ctx, state, area, bonuses, b, uid, ball);
  } else if (cap.throws >= cap.maxThrows) {
    b.capture = null;
    if (b.legendary) {
      ctx.emit({ type: 'fled', species: b.foe.species });
      endBattle(state, bonuses, area);
    }
  }
  return BASE.captureActionMs;
}

function finishCapture(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses, b: BattleState, uid: string, ball: string): void {
  const foe = b.foe;
  const room = hasRoom(state);
  const pk = createPokemon(ctx, state, foe.species, foe.level, { shiny: foe.shiny, origin: 'wild', area: area.id, ball, ivs: foe.ivs });
  addPokemon(state, pk);
  const isNew = registerCaught(ctx, state, foe.species, foe.shiny);
  gainAffinity(ctx, state, foe.species, foe.shiny);
  state.stats.captures++;
  state.hunt.captures++;
  if (foe.shiny) state.stats.shiniesCaught++;
  let transferred = false;
  if (shouldAutoTransfer(state, pk, room)) transferred = typeof transferPokemon(ctx, state, pk.uid) !== 'string';
  ctx.emit({ type: 'captured', uid: pk.uid, species: foe.species, shiny: foe.shiny, newSpecies: isNew, transferred });
  // Captura também conta como vitória (XP e progresso da área, sem dinheiro).
  const xp = awardDefeat(ctx, state, bonuses, b.participants, foe.species, foe.level, false, area.xpMult);
  const active = state.pokemon[uid];
  if (active) creditWin(ctx, state, active);
  areaProgress(state, area.id).wins++;
  state.stats.battlesWon++;
  state.hunt.wins++;
  state.exploration.lossStreak = 0;
  ctx.emit({ type: 'battleWon', kind: 'capture', money: 0, xp });
  checkAreaCleared(ctx, state, area);
  checkAchievements(ctx, state);
  endBattle(state, bonuses, area);
}

function foeFainted(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses, b: BattleState, uid: string): void {
  ctx.emit({ type: 'fainted', side: 'foe', species: b.foe.species });
  const xp = awardDefeat(ctx, state, bonuses, b.participants, b.foe.species, b.foe.level, b.kind !== 'wild', area.xpMult);
  const active = state.pokemon[uid];
  if (active) creditWin(ctx, state, active);
  b.queue = [];
  const next = b.foeQueue.shift();
  if (next) {
    b.foe = wildCombatant(ctx, next.species, next.level, area.statMult);
    registerSeen(state, next.species, false);
    ctx.emit({ type: 'switched', side: 'foe', species: next.species });
    return;
  }
  winBattle(ctx, state, area, bonuses, b, xp);
}

const DROPS: { id: string; w: number; badges: number }[] = [
  { id: 'poke-ball', w: 30, badges: 0 }, { id: 'potion', w: 25, badges: 0 }, { id: 'great-ball', w: 12, badges: 1 },
  { id: 'super-potion', w: 8, badges: 2 }, { id: 'ultra-ball', w: 6, badges: 4 }, { id: 'revive', w: 4, badges: 3 },
  { id: 'rare-candy', w: 2, badges: 1 }, { id: 'fire-stone', w: 1, badges: 2 }, { id: 'water-stone', w: 1, badges: 2 },
  { id: 'thunder-stone', w: 1, badges: 2 }, { id: 'leaf-stone', w: 1, badges: 2 }, { id: 'moon-stone', w: 1.5, badges: 1 },
  { id: 'link-cable', w: 0.5, badges: 3 },
];
const DROP_CHANCE = 0.04;

function winBattle(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses, b: BattleState, xp: number): void {
  const amulet = b.participants.some((u) => state.pokemon[u]?.heldItem === 'amulet-coin') ? 1.5 : 1;
  // Revanche da Liga paga 10% do prêmio dos treinadores (evita farm de dinheiro na Liga).
  const rematch = b.kind === 'league' && state.player.champions.includes(area.regionId) ? 0.1 : 1;
  const base = (b.trainer ? b.trainer.moneyPerLevel * b.trainer.maxLevel : 2 + b.foe.level * 1.2) * rematch;
  const money = Math.floor(base * bonuses.moneyMult * amulet);
  state.player.money += money;
  state.stats.moneyEarned += money;
  state.hunt.money += money;
  state.stats.battlesWon++;
  state.hunt.wins++;
  state.exploration.lossStreak = 0;
  ctx.emit({ type: 'battleWon', kind: b.kind, money, xp });

  if (b.kind === 'wild') {
    state.stats.wildDefeated++;
    areaProgress(state, area.id).wins++;
    if (ctx.rng.chance(DROP_CHANCE)) {
      const pool = DROPS.filter((d) => d.badges <= state.player.badges.length);
      addItem(ctx, state, ctx.rng.weighted(pool, (d) => d.w).id, 1);
    }
  } else if (b.kind === 'trainer') {
    state.stats.trainersDefeated++;
    const p = areaProgress(state, area.id);
    if (b.trainer && !p.trainersDefeated.includes(b.trainer.id)) {
      p.trainersDefeated.push(b.trainer.id);
      state.player.researchPoints += 1;
    }
    p.wins++;
  } else {
    state.stats.trainersDefeated++;
    state.exploration.sequenceIndex++;
  }
  checkAreaCleared(ctx, state, area);
  checkAchievements(ctx, state);
  endBattle(state, bonuses, area);
}

function endBattle(state: GameState, bonuses: Bonuses, area: ResolvedArea): void {
  state.exploration.battle = null;
  state.exploration.phase = 'walking';
  state.exploration.timer = area.gym || area.league ? SEQUENCE_WALK_MS : bonuses.walkMs;
}

function goHealing(state: GameState, bonuses: Bonuses): void {
  state.exploration.battle = null;
  state.exploration.phase = 'healing';
  state.exploration.timer = bonuses.centerMs;
}

function loseBattle(ctx: GameContext, state: GameState, area: ResolvedArea, bonuses: Bonuses, b: BattleState): void {
  state.stats.battlesLost++;
  state.hunt.losses++;
  state.exploration.lossStreak++;
  ctx.emit({ type: 'battleLost', kind: b.kind });
  if (area.gym || area.league) {
    state.exploration.sequenceIndex = 0;
    setActiveArea(state, state.world.lastFarmAreaId);
  } else if (state.settings.autoRetreat && state.exploration.lossStreak >= 3) {
    const prev = previousFarmArea(ctx, state, area);
    if (prev) {
      setActiveArea(state, prev);
      state.world.lastFarmAreaId = prev;
      state.exploration.lossStreak = 0;
      ctx.emit({ type: 'retreat', toAreaId: prev });
    }
  }
  goHealing(state, bonuses);
}

function previousFarmArea(ctx: GameContext, state: GameState, area: ResolvedArea): string | null {
  const region = ctx.data.regionById.get(area.regionId)!;
  const idx = region.areas.findIndex((a) => a.id === area.id);
  for (let i = idx - 1; i >= 0; i--) {
    const a = ctx.data.areas.get(region.areas[i].id)!;
    if (isFarmArea(a) && areaUnlocked(state, ctx.data, a)) return a.id;
  }
  return null;
}

function finishSequence(ctx: GameContext, state: GameState, area: ResolvedArea): void {
  const before = new Set(unlockedAreaIds(state, ctx.data));
  const reward = area.gym?.reward ?? area.league?.reward;
  if (area.gym && !state.player.badges.includes(area.gym.badgeId)) {
    state.player.badges.push(area.gym.badgeId);
    ctx.emit({ type: 'badge', badgeId: area.gym.badgeId, badgeName: area.gym.badgeName });
  }
  let rematch = false;
  if (area.league) {
    rematch = state.player.champions.includes(area.regionId);
    if (!rematch) {
      state.player.champions.push(area.regionId);
      ctx.emit({ type: 'champion', regionId: area.regionId });
    }
  }
  if (reward && rematch) {
    // Revanche da Liga: só 25% do dinheiro (sem PP nem itens) — evita farm de recompensas.
    state.player.money += Math.floor((reward.money ?? 0) * 0.25);
  } else if (reward) {
    state.player.money += reward.money ?? 0;
    state.player.researchPoints += reward.researchPoints ?? 0;
    for (const [id, qty] of Object.entries(reward.items ?? {})) addItem(ctx, state, id, qty);
  }
  state.exploration.sequenceIndex = 0;
  setActiveArea(state, state.world.lastFarmAreaId);
  announceUnlocks(ctx, state, before);
  checkAchievements(ctx, state);
}

/** Troca a área ativa (sem validação — use o comando SelectArea para entradas do jogador). */
export function setActiveArea(state: GameState, areaId: string): void {
  state.world.activeAreaId = areaId;
  state.exploration.battle = null;
  state.exploration.phase = state.exploration.phase === 'healing' ? 'healing' : 'walking';
  if (state.exploration.phase === 'walking') state.exploration.timer = 1000;
  state.exploration.sequenceIndex = 0;
  state.hunt = { areaId, durationMs: 0, xp: 0, money: 0, encounters: 0, wins: 0, losses: 0, captures: 0, ballsUsed: 0, shinies: 0 };
}

export { computeBonuses };
