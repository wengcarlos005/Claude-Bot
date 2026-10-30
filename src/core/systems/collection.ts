// Pokédex, Afinidade, marcos da Pesquisa e transferências ao Professor.
import type { GameContext } from '../context';
import { ivTotal, ivGrade } from '../formulas/stats';
import { addPokemon, createPokemon, speciesOf } from '../pokemon';
import type { GameState, OwnedPokemon, PokedexEntry } from '../state/types';
import { addItem, caughtSpeciesCount } from '../world';

export function dexEntry(state: GameState, species: string): PokedexEntry {
  let e = state.pokedex[species];
  if (!e) state.pokedex[species] = e = { seen: 0, caught: 0, shinySeen: false, shinyCaught: false };
  return e;
}

export function registerSeen(state: GameState, species: string, shiny: boolean): void {
  const e = dexEntry(state, species);
  e.seen++;
  if (shiny) e.shinySeen = true;
}

/** Registra captura/obtenção. Retorna true se é uma espécie nova na Pokédex. */
export function registerCaught(ctx: GameContext, state: GameState, species: string, shiny: boolean): boolean {
  const e = dexEntry(state, species);
  const isNew = e.caught === 0;
  e.caught++;
  if (e.seen === 0) e.seen = 1;
  if (shiny) e.shinyCaught = true;
  if (isNew) {
    state.player.researchPoints += 2;
    checkMilestones(ctx, state);
  }
  return isNew;
}

/** Cada captura dá 1 ponto de Afinidade para a linha evolutiva inteira (shiny vale 5). */
export function gainAffinity(ctx: GameContext, state: GameState, species: string, shiny: boolean): void {
  const chain = String(speciesOf(ctx.data, species).chainId);
  state.affinity[chain] = (state.affinity[chain] ?? 0) + (shiny ? 5 : 1);
}

export function checkMilestones(ctx: GameContext, state: GameState): void {
  const caught = caughtSpeciesCount(state);
  for (const m of ctx.data.milestones) {
    if (caught < m.caught || state.milestonesClaimed.includes(m.id)) continue;
    state.milestonesClaimed.push(m.id);
    ctx.emit({ type: 'milestone', id: m.id, caught: m.caught });
    for (const r of m.rewards) {
      if (r.kind === 'items') for (const [id, qty] of Object.entries(r.items)) addItem(ctx, state, id, qty);
      else if (r.kind === 'researchPoints') state.player.researchPoints += r.value;
      else if (r.kind === 'pokemon') {
        const pk = createPokemon(ctx, state, r.species, r.level, { origin: 'gift', area: 'professor', ball: 'poke-ball' });
        addPokemon(state, pk);
        registerCaught(ctx, state, r.species, false);
        ctx.emit({ type: 'captured', uid: pk.uid, species: pk.species, shiny: false, newSpecies: true, transferred: false });
      }
    }
  }
}

export function transferValue(ctx: GameContext, pk: OwnedPokemon): { money: number; research: number } {
  const sp = speciesOf(ctx.data, pk.species);
  const rare = sp.tags.includes('legendary') || sp.tags.includes('mythical');
  const shinyMult = pk.shiny ? 10 : 1;
  return {
    money: Math.round((10 + pk.level * 3 + (255 - sp.captureRate) / 2) * shinyMult),
    research: (1 + (sp.captureRate <= 45 ? 2 : 0) + (rare ? 20 : 0)) * (pk.shiny ? 5 : 1),
  };
}

/** Transfere um Pokémon ao Professor (remove do jogo) em troca de ₽ e Pontos de Pesquisa. */
export function transferPokemon(ctx: GameContext, state: GameState, uid: string): { money: number; research: number } | string {
  const pk = state.pokemon[uid];
  if (!pk) return 'Pokémon não encontrado.';
  if (pk.locked) return 'Pokémon protegido. Desbloqueie antes de transferir.';
  if (state.party.includes(uid) && state.party.length <= 1) return 'A equipe precisa de pelo menos um Pokémon.';
  const value = transferValue(ctx, pk);
  delete state.pokemon[uid];
  state.party = state.party.filter((u) => u !== uid);
  state.presets.forEach((p) => (p.party = p.party.filter((u) => u !== uid)));
  state.player.money += value.money;
  state.player.researchPoints += value.research;
  state.stats.transfers++;
  return value;
}

/** Quantidade e melhor soma de IVs da espécie, numa única passada pela coleção. */
export function speciesHoldings(state: GameState, species: string, exceptUid?: string): { count: number; bestIv: number } {
  let count = 0;
  let bestIv = -1;
  for (const uid in state.pokemon) {
    const p = state.pokemon[uid];
    if (p.species !== species || uid === exceptUid) continue;
    count++;
    const t = ivTotal(p.ivs);
    if (t > bestIv) bestIv = t;
  }
  return { count, bestIv };
}

/** Melhor soma de IVs entre os Pokémon da espécie que o jogador possui. */
export function bestIvTotal(state: GameState, species: string, exceptUid?: string): number {
  let best = -1;
  for (const p of Object.values(state.pokemon)) if (p.species === species && p.uid !== exceptUid) best = Math.max(best, ivTotal(p.ivs));
  return best;
}

const GRADE_ORDER = ['D', 'C', 'B', 'A', 'S'];
export function gradeAtLeast(grade: string, min: string): boolean {
  return GRADE_ORDER.indexOf(grade) >= GRADE_ORDER.indexOf(min);
}

/** Decide se uma captura recém-feita deve ser transferida automaticamente (Auto Manager). */
export function shouldAutoTransfer(state: GameState, pk: OwnedPokemon, roomAvailable: boolean): boolean {
  if (pk.shiny || pk.locked) return false;
  if (gradeAtLeast(ivGrade(pk.ivs), state.settings.protectGrade)) return false;
  const others = speciesHoldings(state, pk.species, pk.uid);
  if (others.count === 0) return false;
  const better = ivTotal(pk.ivs) > others.bestIv;
  if (better) return false;
  return state.settings.autoTransfer || !roomAvailable;
}
