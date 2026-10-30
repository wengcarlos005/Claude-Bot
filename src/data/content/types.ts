// Tipos do conteúdo autoral (escrito à mão): itens, melhorias, regiões, áreas, treinadores, pesquisas.
import type { TypeId } from '../types';

export type Requirement =
  | { type: 'areaCleared'; areaId: string }
  | { type: 'badge'; badgeId: string }
  | { type: 'badgeCount'; min: number }
  | { type: 'championOf'; regionId: string }
  | { type: 'pokedexCaught'; min: number }
  | { type: 'keyItem'; itemId: string }
  | { type: 'anyOf'; of: Requirement[] };

export type ItemCategory = 'ball' | 'medicine' | 'evolution' | 'held' | 'vitamin' | 'boost' | 'key' | 'misc';

export type BallBonus =
  | { kind: 'types'; types: TypeId[]; mult: number }
  | { kind: 'nightOrCave'; mult: number }
  | { kind: 'firstThrow'; mult: number }
  | { kind: 'alreadyCaught'; mult: number }
  | { kind: 'master' };

export type ItemEffect =
  | { kind: 'ball'; mult: number; bonus?: BallBonus }
  | { kind: 'heal'; hp: number | 'full' }
  | { kind: 'revive'; fraction: number }
  | { kind: 'evolution' }
  | { kind: 'rareCandy' }
  | { kind: 'vitamin'; stat: 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe' }
  | { kind: 'typeBoost'; type: TypeId; mult: number }
  | { kind: 'categoryBoost'; category: 'physical' | 'special'; mult: number }
  | { kind: 'xpBoost'; mult: number }
  | { kind: 'moneyBoost'; mult: number }
  | { kind: 'leftovers' }
  | { kind: 'everstone' }
  | { kind: 'friendshipBoost'; mult: number }
  | { kind: 'repel' | 'lure' | 'luckyIncense'; minutes: number }
  | { kind: 'key' }
  | { kind: 'none' };

export interface ItemDef {
  id: string;
  /** Nome exibido (se ausente, usa o nome em inglês dos dados gerados). */
  name?: string;
  description: string;
  category: ItemCategory;
  /** Preço na loja; null = não vendido. */
  price: number | null;
  /** Insígnias necessárias para aparecer na loja. */
  shopBadges?: number;
  effect: ItemEffect;
  /** Caminho de sprite alternativo (ex.: HM). */
  sprite?: string;
}

export interface TrainerMon {
  species: string;
  level: number;
}

export interface TrainerDef {
  id: string;
  name: string;
  trainerClass: string;
  team: TrainerMon[];
  /** Pagamento base por nível do Pokémon mais forte (como nos jogos principais). */
  moneyPerLevel: number;
}

export interface GymDef {
  badgeId: string;
  badgeName: string;
  type: TypeId;
  trainers: TrainerDef[];
  leader: TrainerDef;
  reward: { money?: number; items?: Record<string, number>; researchPoints?: number };
}

export interface LeagueDef {
  members: TrainerDef[];
  reward: { money?: number; items?: Record<string, number>; researchPoints?: number };
}

export interface ExtraSlot {
  species: string;
  weight: number;
  min: number;
  max: number;
  method?: 'walk' | 'surf';
}

export interface LegendaryEncounter {
  species: string;
  level: number;
  /** Chance por encontro selvagem (ex.: 1/400). */
  chance: number;
}

export type AreaKind = 'route' | 'cave' | 'forest' | 'water' | 'building' | 'city' | 'gym' | 'league' | 'special';

export interface AreaDef {
  id: string;
  name: string;
  kind: AreaKind;
  /** Chaves dos locais em encounters-{região}.json cujas tabelas são combinadas. */
  locations: string[];
  extraSlots?: ExtraSlot[];
  legendaries?: LegendaryEncounter[];
  unlock: Requirement[];
  /** Nº de treinadores de rota gerados proceduralmente. */
  trainers?: number;
  trainerClasses?: string[];
  /** Nível dos treinadores de rota (original do jogo); padrão = nível máximo dos encontros a pé. */
  trainerLevel?: number;
  /** Vitórias necessárias (além dos treinadores) para concluir a área. */
  winsToClear?: number;
  gym?: GymDef;
  league?: LeagueDef;
  /** Itens-chave recebidos ao concluir a área. */
  clearReward?: { items?: Record<string, number>; money?: number };
  tags?: string[];
}

export interface RegionDef {
  id: string;
  name: string;
  order: number;
  unlock: Requirement[];
  /** Teto de nível por nº de insígnias desta região (índice 0..8). */
  levelCaps: number[];
  /** Teto após vencer a Liga da região. */
  championCap: number;
  /** Transformação dos níveis originais dos dados: nível = offset + base * scale. */
  levelOffset: number;
  levelScale: number;
  /** Multiplicador de atributos de selvagens e treinadores (Tier de Região) na primeira área. */
  statMult?: number;
  /** Tier na última área da região (cresce linearmente pela ordem das áreas). */
  statMultEnd?: number;
  /** Multiplicador de XP ganha na região (ritmo). */
  xpMult?: number;
  /** Multiplicador das vitórias exigidas para concluir áreas na região (ritmo). */
  winsMult?: number;
  starters?: string[];
  areas: AreaDef[];
}

export type UpgradeCurrency = 'money' | 'research';
export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  currency: UpgradeCurrency;
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** Requisito para aparecer. */
  requires?: Requirement[];
}

export type MilestoneReward =
  | { kind: 'xpMult'; value: number }
  | { kind: 'moneyMult'; value: number }
  | { kind: 'captureMult'; value: number }
  | { kind: 'statMult'; value: number }
  | { kind: 'items'; items: Record<string, number> }
  | { kind: 'pokemon'; species: string; level: number }
  | { kind: 'researchPoints'; value: number };

export interface MilestoneDef {
  id: string;
  caught: number;
  rewards: MilestoneReward[];
}
