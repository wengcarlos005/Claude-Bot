// Golpes do Pokémon do jogador: ele aprende golpes de dano pelo learnset ao subir de nível ou evoluir (até 10
// conhecidos) e usa em batalha só os equipados. As vagas crescem com o nível: 2 (Nv 1–19), 4 (Nv 20–39), 6 (Nv 40+).
// No modo automático o jogo equipa os melhores; o treinador pode escolher os golpes a qualquer momento.
import type { GameData } from '../data/registry';
import type { GameContext } from './context';
import { effectivePower } from './formulas/damage';
import { speciesOf } from './pokemon';
import type { MoveSet, OwnedPokemon } from './state/types';

export const MAX_KNOWN_MOVES = 10;
/** Níveis em que o Pokémon ganha mais vagas de golpe. */
export const MOVE_SLOT_LEVELS: [level: number, slots: number][] = [[1, 2], [20, 4], [40, 6]];

export function moveSlots(level: number): number {
  let n = MOVE_SLOT_LEVELS[0][1];
  for (const [lvl, slots] of MOVE_SLOT_LEVELS) if (level >= lvl) n = slots;
  return n;
}

/** Nível em que abre a próxima vaga (null se já tem todas). */
export function nextSlotLevel(level: number): number | null {
  return MOVE_SLOT_LEVELS.find(([lvl]) => lvl > level)?.[0] ?? null;
}

/** Força de um golpe para a espécie (poder × precisão × STAB). Golpes sem dano valem 0. */
export function moveScore(data: GameData, speciesKey: string, moveId: string): number {
  const m = data.moves.get(moveId);
  if (!m) return 0;
  const p = effectivePower(m);
  if (p <= 0) return 0;
  return p * ((m.accuracy ?? 100) / 100) * (speciesOf(data, speciesKey).types.includes(m.type) ? 1.5 : 1);
}

/** Golpes de dano que a espécie aprende até o nível, sem repetição. */
export function learnableMoves(data: GameData, speciesKey: string, level: number): string[] {
  const out: string[] = [];
  for (const [lvl, id] of speciesOf(data, speciesKey).learnset) {
    if (lvl <= level && !out.includes(id) && moveScore(data, speciesKey, id) > 0) out.push(id);
  }
  return out;
}

const byScore = (data: GameData, species: string) => (a: string, b: string) => moveScore(data, species, b) - moveScore(data, species, a);

/** Os `n` melhores golpes de dano até o nível (selvagens, treinadores e o modo automático). Sem golpe → Struggle. */
export function bestMoves(data: GameData, speciesKey: string, level: number, n = moveSlots(level)): string[] {
  const moves = learnableMoves(data, speciesKey, level).sort(byScore(data, speciesKey)).slice(0, n);
  return moves.length ? moves : ['struggle'];
}

/** Conjunto inicial: os 10 melhores conhecidos e os melhores equipados nas vagas do nível. */
export function initialMoveSet(data: GameData, speciesKey: string, level: number): MoveSet {
  const known = learnableMoves(data, speciesKey, level).sort(byScore(data, speciesKey)).slice(0, MAX_KNOWN_MOVES);
  return { known, active: known.slice(0, moveSlots(level)), auto: true };
}

/** Golpes do Pokémon sem alterar o estado (saves antigos ainda sem `moves` recebem o conjunto inicial). */
export function moveSetOf(data: GameData, pk: OwnedPokemon): MoveSet {
  return pk.moves ?? initialMoveSet(data, pk.species, pk.level);
}

/** Golpes equipados que vão para a batalha. */
export function activeMoves(data: GameData, pk: OwnedPokemon, level = pk.level): string[] {
  const set = moveSetOf(data, pk);
  const active = set.active.filter((id) => data.moves.has(id)).slice(0, moveSlots(level));
  return active.length ? active : ['struggle'];
}

/**
 * Atualiza os golpes depois de subir de nível ou evoluir: aprende os golpes novos do learnset (se houver espaço, ou
 * no lugar do golpe conhecido mais fraco que não está equipado) e preenche vagas livres. No modo automático,
 * reequipa os melhores. Retorna os golpes aprendidos agora.
 */
export function refreshMoves(ctx: GameContext, pk: OwnedPokemon): string[] {
  const data = ctx.data;
  const set = (pk.moves ??= initialMoveSet(data, pk.species, pk.level));
  const score = (id: string) => moveScore(data, pk.species, id);
  const learned: string[] = [];
  for (const id of learnableMoves(data, pk.species, pk.level).sort(byScore(data, pk.species))) {
    if (set.known.includes(id)) continue;
    if (set.known.length < MAX_KNOWN_MOVES) {
      set.known.push(id);
      learned.push(id);
      continue;
    }
    const weakest = set.known.filter((k) => !set.active.includes(k)).sort((a, b) => score(a) - score(b))[0];
    if (!weakest || score(weakest) >= score(id)) continue;
    set.known[set.known.indexOf(weakest)] = id;
    learned.push(id);
  }
  const slots = moveSlots(pk.level);
  if (set.auto) set.active = [...set.known].sort(byScore(data, pk.species)).slice(0, slots);
  else {
    set.active = set.active.filter((id) => set.known.includes(id)).slice(0, slots);
    for (const id of [...set.known].sort(byScore(data, pk.species))) {
      if (set.active.length >= slots) break;
      if (!set.active.includes(id)) set.active.push(id);
    }
  }
  for (const id of learned) ctx.emit({ type: 'moveLearned', uid: pk.uid, species: pk.species, moveId: id });
  return learned;
}

/** Troca os golpes equipados (comando do jogador). */
export function setActiveMoves(data: GameData, pk: OwnedPokemon, active: string[], auto: boolean): string | null {
  const set = (pk.moves ??= initialMoveSet(data, pk.species, pk.level));
  if (auto) {
    set.auto = true;
    set.active = [...set.known].sort(byScore(data, pk.species)).slice(0, moveSlots(pk.level));
    return null;
  }
  const uniq = [...new Set(active)];
  if (uniq.length === 0) return 'Equipe pelo menos um golpe.';
  if (uniq.length > moveSlots(pk.level)) return `Só cabem ${moveSlots(pk.level)} golpes neste nível.`;
  if (uniq.some((id) => !set.known.includes(id))) return 'Golpe não aprendido.';
  set.active = uniq;
  set.auto = false;
  return null;
}
