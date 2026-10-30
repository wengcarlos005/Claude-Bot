// Textos derivados (requisitos, condições de evolução) para a UI.
import type { Requirement } from '../data/content/types';
import type { GameData } from '../data/registry';
import type { EvolutionCondition } from '../data/types';
import { TYPE_NAMES } from './components';

export function requirementText(data: GameData, r: Requirement): string {
  switch (r.type) {
    case 'areaCleared':
      return `concluir ${data.areas.get(r.areaId)?.name ?? r.areaId}`;
    case 'badge': {
      for (const a of data.areas.values()) if (a.gym?.badgeId === r.badgeId) return a.gym.badgeName;
      return r.badgeId;
    }
    case 'badgeCount':
      return `${r.min} insígnias`;
    case 'championOf':
      return `ser Campeão de ${data.regionById.get(r.regionId)?.name}`;
    case 'pokedexCaught':
      return `${r.min} espécies na Pokédex`;
    case 'keyItem':
      return data.items.get(r.itemId)?.name ?? r.itemId;
    case 'anyOf':
      return r.of.map((x) => requirementText(data, x)).join(' ou ');
  }
}

export function conditionText(data: GameData, c: EvolutionCondition): string {
  switch (c.type) {
    case 'level':
      return `Nv. ${c.min}`;
    case 'item':
      return `usar ${data.items.get(c.itemId)?.name ?? c.itemId}`;
    case 'heldItem':
      return `segurando ${data.items.get(c.itemId)?.name ?? c.itemId}`;
    case 'friendship':
      return `amizade ≥ ${c.min}`;
    case 'timeOfDay':
      return c.value === 'day' ? 'de dia (4h–20h)' : 'à noite (20h–4h)';
    case 'knowsMove':
      return `conhecer ${data.moves.get(c.moveId)?.name ?? c.moveId}`;
    case 'knowsMoveType':
      return `conhecer golpe do tipo ${TYPE_NAMES[c.moveType]}`;
    case 'statCompare':
      return c.rule === 'atk>def' ? 'Ataque > Defesa' : c.rule === 'atk<def' ? 'Ataque < Defesa' : 'Ataque = Defesa';
    case 'gender':
      return c.value === 'm' ? 'macho' : 'fêmea';
    case 'personality':
      return `personalidade ${c.bucket + 1}/${c.of} (aleatório)`;
    case 'partySpecies':
      return `${data.species.get(c.species)?.name ?? c.species} na equipe`;
    case 'partyType':
      return `Pokémon do tipo ${TYPE_NAMES[c.partyType]} na equipe`;
  }
}
