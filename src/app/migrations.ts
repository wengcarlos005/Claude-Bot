// Migrações de save: cada mudança de formato do GameState ganha uma função vN → vN+1 e um teste.
import type { GameState } from '../core/state/types';
import { SAVE_VERSION } from '../core/state/types';

type Migration = (s: Record<string, any>) => Record<string, any>;

/** MIGRATIONS[n] converte um save da versão n para n+1. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: conquistas.
  1: (s) => ({ ...s, achievements: [] }),
  // v2 → v3: Nível de Treinador. XP inicial estimada pelo histórico, para não bloquear áreas que o jogador já usava.
  2: (s) => ({
    ...s,
    player: {
      ...s.player,
      trainerXp: Math.round((s.stats?.battlesWon ?? 0) * 1.5 + (s.stats?.captures ?? 0) * 2 + Object.values(s.pokedex ?? {}).filter((e: any) => e.caught > 0).length * 10),
    },
  }),
};

export function migrate(raw: Record<string, any>): GameState {
  let s = raw;
  let v: number = s?.meta?.saveVersion;
  if (typeof v !== 'number') throw new Error('Save sem versão.');
  if (v > SAVE_VERSION) throw new Error('Save de uma versão mais nova do jogo.');
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`Sem migração da versão ${v}.`);
    s = m(s);
    v++;
    s.meta.saveVersion = v;
  }
  validateShape(s);
  return s as GameState;
}

/** Validação estrutural mínima (evita carregar lixo). */
function validateShape(s: Record<string, any>): void {
  const required = ['meta', 'rng', 'player', 'party', 'pokemon', 'pokedex', 'inventory', 'world', 'exploration', 'settings', 'stats'];
  for (const k of required) if (!(k in s)) throw new Error(`Save inválido: falta "${k}".`);
  if (!Array.isArray(s.party)) throw new Error('Save inválido: equipe.');
  for (const uid of s.party) if (!s.pokemon[uid]) throw new Error('Save inválido: equipe referencia Pokémon inexistente.');
}
