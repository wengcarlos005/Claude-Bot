import type { GameData } from '../../data/registry';
import type { GameState } from './types';
import { SAVE_VERSION } from './types';

export function createInitialState(data: GameData, now: number, seed: number): GameState {
  const firstArea = data.regions[0].areas[0].id;
  return {
    meta: { saveVersion: SAVE_VERSION, createdAt: now, lastTickAt: now, lastSavedAt: 0, revision: 0, playTimeMs: 0, nextUid: 1 },
    rng: { s: seed >>> 0 },
    player: { name: 'Treinador', money: 3000, researchPoints: 0, badges: [], champions: [], starterChosen: false },
    party: [],
    pokemon: {},
    pcCapacity: 150,
    presets: [],
    pokedex: {},
    affinity: {},
    mastery: {},
    inventory: { 'poke-ball': 10, potion: 5 },
    upgrades: {},
    milestonesClaimed: [],
    world: { activeAreaId: firstArea, lastFarmAreaId: firstArea, areas: {} },
    exploration: { phase: 'idle', timer: 0, battle: null, lossStreak: 0, sequenceIndex: 0 },
    captureRules: [
      { id: 'r-shiny', enabled: true, when: 'shiny', ball: 'ultra-ball', fallback: true },
      { id: 'r-legendary', enabled: true, when: 'legendary', ball: 'ultra-ball', fallback: true },
      { id: 'r-new', enabled: true, when: 'notCaught', ball: 'poke-ball', fallback: true },
      { id: 'r-ivs', enabled: false, when: 'betterIvs', ball: 'poke-ball', fallback: false },
      { id: 'r-any', enabled: false, when: 'any', ball: 'poke-ball', fallback: false },
    ],
    settings: {
      autoPotion: true,
      autoPotionThreshold: 0.35,
      autoRevive: false,
      autoRetreat: true,
      autoTransfer: true,
      protectGrade: 'A',
      autoBuy: false,
      autoBuyItem: 'poke-ball',
      autoBuyMinStock: 10,
      autoBuyBudget: 0.25,
      autoEvolve: true,
    },
    boosts: [],
    stats: {
      battlesWon: 0, battlesLost: 0, wildDefeated: 0, trainersDefeated: 0, encounters: 0, encountersSinceShiny: 0, captures: 0,
      captureAttempts: 0, shiniesFound: 0, shiniesCaught: 0, evolutions: 0, moneyEarned: 0, moneySpent: 0, xpEarned: 0,
      transfers: 0, offlineMs: 0,
    },
    hunt: { areaId: firstArea, durationMs: 0, xp: 0, money: 0, encounters: 0, wins: 0, losses: 0, captures: 0, ballsUsed: 0, shinies: 0 },
  };
}
