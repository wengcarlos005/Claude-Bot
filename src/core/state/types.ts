// Estado completo e serializável do jogador. Salvar = serializar este objeto.
import type { Stats, TypeId } from '../../data/types';
import type { RngState } from '../engine/rng';

export const SAVE_VERSION = 3;
export const MAX_PARTY = 6;

/** Golpes do Pokémon: conhecidos (até 10) e equipados (vagas por nível: 2, 4 ou 6). */
export interface MoveSet {
  known: string[];
  active: string[];
  /** Automático: o jogo equipa os melhores golpes sempre que aprende um novo ou abre uma vaga. */
  auto: boolean;
}

export interface OwnedPokemon {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  xp: number;
  ivs: Stats;
  evs: Stats;
  nature: string;
  gender: 'm' | 'f' | null;
  shiny: boolean;
  personality: number;
  friendship: number;
  heldItem: string | null;
  /** PS atuais (o máximo é derivado dos atributos). */
  hp: number;
  /** Desmaiado: só volta a lutar com 50% dos PS (regeneração), Revive ou Centro Pokémon. */
  fainted: boolean;
  caughtAt: number;
  caughtArea: string;
  ball: string;
  origin: 'starter' | 'wild' | 'gift' | 'evolution';
  /** Protegido contra transferência/descartes automáticos. */
  locked: boolean;
  /** Vitórias como Pokémon ativo (estatística individual). */
  wins: number;
  /** Golpes (saves antigos não têm: o conjunto inicial é derivado do learnset na primeira vez). */
  moves?: MoveSet;
}

export interface Combatant {
  uid?: string;
  species: string;
  level: number;
  stats: Stats;
  types: TypeId[];
  moves: string[];
  hp: number;
  maxHp: number;
  shiny: boolean;
  heldItem: string | null;
  /** IVs do selvagem (preservados se ele for capturado). */
  ivs?: Stats;
  /** Razão PS real / PS em combate (obediência: Pokémon acima do teto luta com PS do nível do teto). */
  hpScale?: number;
}

export type BattleKind = 'wild' | 'trainer' | 'gym' | 'league';

export interface BattleState {
  kind: BattleKind;
  foe: Combatant;
  /** Restante da equipe adversária (treinadores). */
  foeQueue: { species: string; level: number }[];
  trainer?: { id: string; name: string; trainerClass: string; moneyPerLevel: number; maxLevel: number };
  turn: number;
  /** Ordem de ações restante na rodada atual. */
  queue: ('player' | 'foe')[];
  actionTimer: number;
  /** Pokémon do jogador que entraram em campo nesta batalha. */
  participants: string[];
  capture: { ball: string | null; throws: number; maxThrows: number; ruleId: string } | null;
  legendary: boolean;
  encounterMethod: string;
}

export type EncounterPlan =
  | { kind: 'wild'; areaId: string; species: string; level: number; legendary: boolean; method: string }
  | { kind: 'trainer'; areaId: string; trainerId: string; species: string; level: number; trainerName: string }
  | { kind: 'challenge'; areaId: string; trainerId: string; species: string; level: number; trainerName: string };

export type ExplorationPhase = 'idle' | 'walking' | 'battle' | 'healing';

export interface CaptureRule {
  id: string;
  enabled: boolean;
  when: 'shiny' | 'notCaught' | 'betterIvs' | 'legendary' | 'species' | 'any';
  species?: string[];
  ball: string;
  /** Se a bola escolhida acabar, usa outra disponível (da mais barata para a mais cara). */
  fallback: boolean;
}

export interface Settings {
  autoPotion: boolean;
  autoPotionThreshold: number;
  autoRevive: boolean;
  autoRetreat: boolean;
  autoTransfer: boolean;
  /** Pokémon com nota de IV igual ou acima desta não são transferidos automaticamente. */
  protectGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  autoBuy: boolean;
  autoBuyItem: string;
  autoBuyMinStock: number;
  /** Fração máxima do dinheiro que o comprador automático pode gastar por compra. */
  autoBuyBudget: number;
  autoEvolve: boolean;
}

export interface AreaProgress {
  wins: number;
  trainersDefeated: string[];
  cleared: boolean;
  encounters: number;
}

export interface PokedexEntry {
  seen: number;
  caught: number;
  shinySeen: boolean;
  shinyCaught: boolean;
}

export interface HuntSession {
  areaId: string;
  durationMs: number;
  xp: number;
  money: number;
  encounters: number;
  wins: number;
  losses: number;
  captures: number;
  ballsUsed: number;
  shinies: number;
  /** XP de Treinador ganho na hunt (opcional: saves antigos não têm). */
  trainerXp?: number;
  /** Valor (₽) dos consumíveis gastos na hunt: bolas arremessadas, poções e Revives. */
  spent?: number;
}

export interface Boost {
  itemId: string;
  kind: 'repel';
  remainingMs: number;
}

export interface GameStats {
  battlesWon: number;
  battlesLost: number;
  wildDefeated: number;
  trainersDefeated: number;
  encounters: number;
  encountersSinceShiny: number;
  captures: number;
  captureAttempts: number;
  shiniesFound: number;
  shiniesCaught: number;
  evolutions: number;
  moneyEarned: number;
  moneySpent: number;
  xpEarned: number;
  transfers: number;
  offlineMs: number;
}

export interface GameState {
  meta: {
    saveVersion: number;
    createdAt: number;
    /** Relógio de parede do último tick processado (base do cálculo offline). */
    lastTickAt: number;
    lastSavedAt: number;
    revision: number;
    playTimeMs: number;
    nextUid: number;
  };
  rng: RngState;
  player: {
    name: string;
    money: number;
    researchPoints: number;
    /** XP de Treinador acumulada (o Nível de Treinador libera áreas). */
    trainerXp: number;
    badges: string[];
    champions: string[];
    starterChosen: boolean;
    /** Avatar do treinador (cosmético); padrão em data/content/avatars.ts. */
    avatar?: string;
  };
  party: string[];
  pokemon: Record<string, OwnedPokemon>;
  pcCapacity: number;
  presets: { name: string; party: string[] }[];
  pokedex: Record<string, PokedexEntry>;
  affinity: Record<string, number>;
  mastery: Record<string, number>;
  inventory: Record<string, number>;
  upgrades: Record<string, number>;
  milestonesClaimed: string[];
  /** Conquistas obtidas (desde a versão 2 do save). */
  achievements: string[];
  world: {
    activeAreaId: string;
    /** Última área de farm (para onde a equipe volta após perder em ginásio/liga). */
    lastFarmAreaId: string;
    areas: Record<string, AreaProgress>;
  };
  exploration: {
    phase: ExplorationPhase;
    timer: number;
    battle: BattleState | null;
    lossStreak: number;
    /** Sequência de ginásio/liga: índice do próximo treinador. */
    sequenceIndex: number;
    /** Próximo encontro, sorteado no início da caminhada (a UI mostra o alvo enquanto o Pokémon anda até ele). */
    next?: EncounterPlan | null;
  };
  captureRules: CaptureRule[];
  settings: Settings;
  boosts: Boost[];
  stats: GameStats;
  hunt: HuntSession;
}
