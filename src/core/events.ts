// Eventos de domínio emitidos pelo core. A UI e o log observam; a lógica não depende deles.

export type GameEvent =
  | { type: 'encounter'; species: string; level: number; shiny: boolean; kind: 'wild' | 'trainer' | 'gym' | 'league'; trainerName?: string; legendary?: boolean }
  | { type: 'move'; side: 'player' | 'foe'; moveId: string; damage: number; effectiveness: number; crit: boolean; missed: boolean }
  | { type: 'fainted'; side: 'player' | 'foe'; species: string }
  | { type: 'switched'; side: 'player' | 'foe'; species: string }
  | { type: 'battleWon'; kind: string; money: number; xp: number }
  | { type: 'battleLost'; kind: string }
  | { type: 'captureThrow'; species: string; ball: string; chance: number; success: boolean }
  | { type: 'captured'; uid: string; species: string; shiny: boolean; newSpecies: boolean; transferred: boolean }
  | { type: 'fled'; species: string }
  | { type: 'levelUp'; uid: string; species: string; level: number }
  | { type: 'evolved'; uid: string; from: string; to: string }
  | { type: 'itemUsed'; itemId: string; uid?: string }
  | { type: 'itemFound'; itemId: string; qty: number }
  | { type: 'badge'; badgeId: string; badgeName: string }
  | { type: 'champion'; regionId: string }
  | { type: 'areaCleared'; areaId: string }
  | { type: 'areaUnlocked'; areaId: string }
  | { type: 'milestone'; id: string; caught: number }
  | { type: 'achievement'; id: string; name: string; rewardPP: number }
  | { type: 'healed'; reason: 'center' | 'potion' | 'revive' }
  | { type: 'retreat'; toAreaId: string }
  | { type: 'autoBuy'; itemId: string; qty: number; cost: number }
  | { type: 'message'; text: string };

export type EventType = GameEvent['type'];
