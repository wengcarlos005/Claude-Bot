// Tradução dos eventos de domínio em mensagens de log/notificação (pt-BR).
import type { GameData } from '../data/registry';
import type { GameEvent } from '../core/events';
import type { GameState } from '../core/state/types';

export interface Described {
  text: string;
  tone: 'normal' | 'good' | 'great' | 'bad' | 'muted';
  toast?: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

export function describeEvent(data: GameData, state: GameState, e: GameEvent): Described | null {
  const sp = (k: string) => data.species.get(k)?.name ?? k;
  const item = (k: string) => data.items.get(k)?.name ?? k;
  switch (e.type) {
    case 'encounter':
      if (e.shiny) return { text: `✨ Um ${sp(e.species)} SHINY apareceu! (Nv. ${e.level})`, tone: 'great', toast: true };
      if (e.legendary) return { text: `⚡ O lendário ${sp(e.species)} apareceu! (Nv. ${e.level})`, tone: 'great', toast: true };
      if (e.trainerName) return { text: `${e.trainerName} desafiou você! Enviou ${sp(e.species)} (Nv. ${e.level}).`, tone: 'normal' };
      return { text: `Um ${sp(e.species)} selvagem apareceu (Nv. ${e.level}).`, tone: 'muted' };
    case 'battleWon':
      if (e.kind === 'capture') return null;
      return { text: `Vitória! +${fmt(e.xp)} XP${e.money ? `, +₽${fmt(e.money)}` : ''}.`, tone: 'muted' };
    case 'battleLost':
      return { text: 'Sua equipe foi derrotada… indo ao Centro Pokémon.', tone: 'bad', toast: e.kind === 'gym' || e.kind === 'league' };
    case 'captureThrow':
      return {
        text: `${item(e.ball)} em ${sp(e.species)} (${Math.round(e.chance * 100)}%)… ${e.success ? 'pegou!' : 'escapou!'}`,
        tone: e.success ? 'good' : 'muted',
      };
    case 'captured':
      if (e.transferred) return { text: `${sp(e.species)} capturado e transferido ao Professor (duplicata).`, tone: 'muted' };
      return {
        text: `${e.shiny ? '✨ ' : ''}${sp(e.species)} foi capturado!${e.newSpecies ? ' Novo registro na Pokédex!' : ''}`,
        tone: e.newSpecies || e.shiny ? 'great' : 'good',
        toast: e.newSpecies || e.shiny,
      };
    case 'fled':
      return { text: `${sp(e.species)} fugiu!`, tone: 'bad', toast: true };
    case 'levelUp':
      return { text: `${sp(e.species)} subiu para o nível ${e.level}!`, tone: 'good' };
    case 'evolved':
      return { text: `${sp(e.from)} evoluiu para ${sp(e.to)}!`, tone: 'great', toast: true };
    case 'itemFound':
      return { text: `Obteve ${e.qty > 1 ? `${e.qty}× ` : ''}${item(e.itemId)}.`, tone: 'good', toast: data.items.get(e.itemId)?.category === 'key' };
    case 'badge':
      return { text: `🏅 Você ganhou a ${e.badgeName}!`, tone: 'great', toast: true };
    case 'champion':
      return { text: `🏆 Você é o novo Campeão de ${data.regionById.get(e.regionId)?.name}!`, tone: 'great', toast: true };
    case 'areaCleared':
      return { text: `Área concluída: ${data.areas.get(e.areaId)?.name}. +5 PP`, tone: 'good', toast: true };
    case 'areaUnlocked':
      return { text: `Nova área liberada: ${data.areas.get(e.areaId)?.name}.`, tone: 'good', toast: true };
    case 'milestone':
      return { text: `📖 Marco da Pesquisa: ${e.caught} espécies! Recompensas recebidas.`, tone: 'great', toast: true };
    case 'healed':
      return e.reason === 'center' ? { text: 'Equipe recuperada no Centro Pokémon.', tone: 'normal' } : null;
    case 'retreat':
      return { text: `Muitas derrotas seguidas: recuando para ${data.areas.get(e.toAreaId)?.name}.`, tone: 'bad', toast: true };
    case 'autoBuy':
      return { text: `Comprador automático: ${e.qty}× ${item(e.itemId)} (₽${fmt(e.cost)}).`, tone: 'muted' };
    case 'fainted':
      return e.side === 'player' ? { text: `${sp(e.species)} desmaiou!`, tone: 'bad' } : null;
    case 'message':
      return { text: e.text, tone: 'normal' };
    default:
      return null;
  }
  void state;
}
