// Funções utilitárias sobre Pokémon (atributos, golpes, criação). Todas puras sobre o estado recebido.
import type { GameData } from '../data/registry';
import type { Species, Stats } from '../data/types';
import { STAT_KEYS } from '../data/types';
import { AFFINITY_STAT_BONUS, AFFINITY_THRESHOLDS, MASTERY_STAT_BONUS, MASTERY_THRESHOLDS } from '../data/content/upgrades';
import type { GameContext } from './context';
import { computeBonuses } from './bonuses';
import { effectivePower } from './formulas/damage';
import { expForLevel } from './formulas/experience';
import { NATURES } from './formulas/natures';
import { calcStats, emptyStats } from './formulas/stats';
import type { Combatant, GameState, OwnedPokemon } from './state/types';
import { MAX_PARTY } from './state/types';

export function speciesOf(data: GameData, key: string): Species {
  const s = data.species.get(key);
  if (!s) throw new Error(`Espécie desconhecida: ${key}`);
  return s;
}

/** Os 4 golpes de dano mais fortes aprendidos até o nível (STAB pesa 1,5×). Sem golpe de dano → Struggle. */
export function movesFor(data: GameData, speciesKey: string, level: number): string[] {
  const sp = speciesOf(data, speciesKey);
  const seen = new Set<string>();
  const scored: { id: string; score: number }[] = [];
  for (const [lvl, id] of sp.learnset) {
    if (lvl > level || seen.has(id)) continue;
    seen.add(id);
    const m = data.moves.get(id);
    if (!m) continue;
    const p = effectivePower(m);
    if (p <= 0) continue;
    const acc = (m.accuracy ?? 100) / 100;
    scored.push({ id, score: p * acc * (sp.types.includes(m.type) ? 1.5 : 1) });
  }
  scored.sort((a, b) => b.score - a.score);
  const moves = scored.slice(0, 4).map((x) => x.id);
  return moves.length ? moves : ['struggle'];
}

/** Golpes aprendidos até o nível (inclusive de status) — usado nas condições de evolução. */
export function learnedMoves(data: GameData, speciesKey: string, level: number): string[] {
  return speciesOf(data, speciesKey).learnset.filter(([l]) => l <= level).map(([, id]) => id);
}

export function levelFromThresholds(points: number, thresholds: number[]): number {
  let lvl = 0;
  while (lvl < thresholds.length && points >= thresholds[lvl]) lvl++;
  return lvl;
}

export function affinityLevel(state: GameState, data: GameData, speciesKey: string): number {
  const chain = String(speciesOf(data, speciesKey).chainId);
  return levelFromThresholds(state.affinity[chain] ?? 0, AFFINITY_THRESHOLDS);
}

export function masteryLevel(state: GameState, speciesKey: string): number {
  return levelFromThresholds(state.mastery[speciesKey] ?? 0, MASTERY_THRESHOLDS);
}

/** Multiplicador total de atributos de um Pokémon do jogador. */
export function statBonusMult(state: GameState, data: GameData, pk: OwnedPokemon, globalStatMult?: number): number {
  const global = globalStatMult ?? computeBonuses(state, data).statMult;
  return (
    global +
    affinityLevel(state, data, pk.species) * AFFINITY_STAT_BONUS +
    masteryLevel(state, pk.species) * MASTERY_STAT_BONUS
  );
}

export function pokemonStats(state: GameState, data: GameData, pk: OwnedPokemon, globalStatMult?: number): Stats {
  const sp = speciesOf(data, pk.species);
  return calcStats(sp.baseStats, pk.ivs, pk.evs, pk.level, pk.nature, statBonusMult(state, data, pk, globalStatMult));
}

export function maxHpOf(state: GameState, data: GameData, pk: OwnedPokemon): number {
  return pokemonStats(state, data, pk).hp;
}

export function toCombatant(state: GameState, data: GameData, pk: OwnedPokemon, globalStatMult?: number): Combatant {
  const sp = speciesOf(data, pk.species);
  const stats = pokemonStats(state, data, pk, globalStatMult);
  return {
    uid: pk.uid, species: pk.species, level: pk.level, stats, types: sp.types, moves: movesFor(data, pk.species, pk.level),
    hp: Math.min(pk.hp, stats.hp), maxHp: stats.hp, shiny: pk.shiny, heldItem: pk.heldItem,
  };
}

export function randomIvs(ctx: GameContext): Stats {
  const ivs = emptyStats();
  for (const k of STAT_KEYS) ivs[k] = ctx.rng.int(0, 31);
  return ivs;
}

/** Combatente selvagem/treinador (IVs aleatórios, sem EVs, natureza neutra). */
export function wildCombatant(ctx: GameContext, speciesKey: string, level: number, statMult = 1, shiny = false): Combatant {
  const sp = speciesOf(ctx.data, speciesKey);
  const ivs = randomIvs(ctx);
  const stats = calcStats(sp.baseStats, ivs, emptyStats(), level, 'hardy', statMult);
  return {
    species: speciesKey, level, stats, types: sp.types, moves: movesFor(ctx.data, speciesKey, level),
    hp: stats.hp, maxHp: stats.hp, shiny, heldItem: null, ivs,
  };
}

export interface CreateOptions {
  shiny?: boolean;
  origin: OwnedPokemon['origin'];
  area?: string;
  ball?: string;
  ivs?: Stats;
}

export function createPokemon(ctx: GameContext, state: GameState, speciesKey: string, level: number, o: CreateOptions): OwnedPokemon {
  const sp = speciesOf(ctx.data, speciesKey);
  const gender = sp.genderRate < 0 ? null : ctx.rng.next() < sp.genderRate / 8 ? 'f' : 'm';
  const pk: OwnedPokemon = {
    uid: `p${state.meta.nextUid++}`,
    species: speciesKey,
    level,
    xp: expForLevel(sp.growthRate, level),
    ivs: o.ivs ?? randomIvs(ctx),
    evs: emptyStats(),
    nature: ctx.rng.pick(NATURES).id,
    gender,
    shiny: o.shiny ?? false,
    personality: ctx.rng.uint32(),
    friendship: sp.baseFriendship,
    heldItem: null,
    hp: 0,
    fainted: false,
    caughtAt: ctx.now(),
    caughtArea: o.area ?? '',
    ball: o.ball ?? 'poke-ball',
    origin: o.origin,
    locked: o.shiny ?? false,
    wins: 0,
  };
  pk.hp = maxHpOf(state, ctx.data, pk);
  return pk;
}

export function pcCount(state: GameState): number {
  return Object.keys(state.pokemon).length - state.party.length;
}

export function hasRoom(state: GameState): boolean {
  return state.party.length < MAX_PARTY || pcCount(state) < state.pcCapacity;
}

/** Adiciona à equipe (se houver vaga) ou ao PC. */
export function addPokemon(state: GameState, pk: OwnedPokemon): void {
  state.pokemon[pk.uid] = pk;
  if (state.party.length < MAX_PARTY) state.party.push(pk.uid);
}

export function partyMembers(state: GameState): OwnedPokemon[] {
  return state.party.map((uid) => state.pokemon[uid]).filter(Boolean);
}

/** Primeiro Pokémon da equipe em condição de lutar. */
export function activeMember(state: GameState): OwnedPokemon | null {
  return partyMembers(state).find((p) => !p.fainted && p.hp > 0) ?? null;
}

export function displayName(data: GameData, pk: { species: string; nickname?: string }): string {
  return pk.nickname || speciesOf(data, pk.species).name;
}
