// Tipos do conteúdo estático do jogo (espécies, golpes, áreas, itens...).
// Os arquivos em src/data/generated/ seguem estes formatos e são gerados por `npm run build:data`.

export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;
export type TypeId = (typeof TYPES)[number];

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export type GrowthRate = 'fast' | 'medium-fast' | 'medium-slow' | 'slow' | 'erratic' | 'fluctuating';
export type TimeOfDay = 'morning' | 'day' | 'night';

export type EvolutionCondition =
  | { type: 'level'; min: number }
  | { type: 'item'; itemId: string } // usar item no Pokémon
  | { type: 'heldItem'; itemId: string } // estar segurando o item ao subir de nível / usar Cabo de Ligação
  | { type: 'friendship'; min: number }
  | { type: 'timeOfDay'; value: 'day' | 'night' }
  | { type: 'knowsMove'; moveId: string }
  | { type: 'knowsMoveType'; moveType: TypeId }
  | { type: 'statCompare'; rule: 'atk>def' | 'atk<def' | 'atk=def' }
  | { type: 'gender'; value: 'm' | 'f' }
  | { type: 'personality'; bucket: number; of: number }
  | { type: 'partySpecies'; species: string }
  | { type: 'partyType'; partyType: TypeId };

export interface Evolution {
  into: string;
  /** Todas as condições precisam ser verdadeiras. */
  conditions: EvolutionCondition[];
  /** Evolução especial: Shedinja aparece junto quando Nincada evolui. */
  special?: 'shed';
}

export interface Species {
  id: number;
  key: string;
  name: string;
  types: TypeId[];
  baseStats: Stats;
  growthRate: GrowthRate;
  captureRate: number;
  baseExp: number;
  baseFriendship: number;
  evYield: Partial<Stats>;
  /** -1 = sem gênero; 0..8 = oitavos de chance de ser fêmea. */
  genderRate: number;
  generation: number;
  chainId: number;
  evolvesFrom: string | null;
  evolutions: Evolution[];
  /** [nível, id do golpe], ordenado por nível. */
  learnset: [number, string][];
  tags: ('legendary' | 'mythical' | 'baby')[];
}

export type MoveCategory = 'physical' | 'special' | 'status';
export interface Move {
  id: string;
  name: string;
  type: TypeId;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  priority: number;
}

export type EncounterMethod = 'walk' | 'surf' | 'old-rod' | 'good-rod' | 'super-rod' | 'rock-smash' | 'headbutt';

export interface EncounterSlot {
  species: string;
  /** Peso relativo dentro do mesmo método. */
  weight: number;
  min: number;
  max: number;
  method: EncounterMethod;
  time?: TimeOfDay[];
}

/** Encontros gerados por local (chave = identificador de local do PokeAPI, com sub-área opcional). */
export interface LocationEncounters {
  name: string;
  slots: EncounterSlot[];
}

export interface GeneratedItem {
  id: string;
  name: string;
}

export type TypeChart = Record<TypeId, Partial<Record<TypeId, number>>>;
