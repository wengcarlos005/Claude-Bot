import type { Move, TypeChart, TypeId } from '../../data/types';

export function typeEffectiveness(chart: TypeChart, moveType: TypeId, defenderTypes: TypeId[]): number {
  let m = 1;
  for (const t of defenderTypes) m *= chart[moveType]?.[t] ?? 1;
  return m;
}

/** Golpes com efeito colateral que não cabem no combate automático (autodestruição, depende de sono etc.). */
export const EXCLUDED_MOVES = new Set([
  'self-destruct', 'explosion', 'misty-explosion', 'memento', 'final-gambit', 'dream-eater', 'snore', 'sleep-talk',
  'belch', 'last-resort', 'synchronoise', 'focus-punch', 'mind-blown', 'steel-beam', 'chloroblast', 'shell-trap',
  'spit-up', 'natural-gift', 'fling', 'beat-up', 'present', 'magnitude', 'future-sight', 'doom-desire', 'fake-out',
  'first-impression', 'perish-song', 'dragon-rage', 'sonic-boom',
]);

/** Golpes de dois turnos ou com recarga: valem metade do poder por turno no combate automático. */
export const TWO_TURN_MOVES = new Set([
  'hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'rock-wrecker', 'roar-of-time',
  'eternabeam', 'prismatic-laser', 'meteor-assault', 'solar-beam', 'solar-blade', 'sky-attack', 'skull-bash',
  'razor-wind', 'geomancy', 'meteor-beam', 'electro-shot', 'freeze-shock', 'ice-burn', 'shadow-force', 'phantom-force',
  'fly', 'dig', 'dive', 'bounce', 'sky-drop',
]);

export function effectivePower(move: Move): number {
  if (!move.power || move.category === 'status' || EXCLUDED_MOVES.has(move.id)) return 0;
  return TWO_TURN_MOVES.has(move.id) ? move.power / 2 : move.power;
}

export interface DamageInput {
  level: number;
  power: number;
  attack: number;
  defense: number;
  stab: boolean;
  effectiveness: number;
  crit: boolean;
  /** Fator aleatório em [0.85, 1]. */
  roll: number;
  /** Multiplicadores extras (itens segurados etc.). */
  mult?: number;
}

/** Fórmula de dano dos jogos principais (Gen 5+), sem modificadores de status/clima. */
export function calcDamage(i: DamageInput): number {
  if (i.effectiveness === 0) return 0;
  const base = Math.floor(Math.floor((Math.floor((2 * i.level) / 5 + 2) * i.power * i.attack) / i.defense) / 50) + 2;
  const dmg = base * (i.crit ? 1.5 : 1) * i.roll * (i.stab ? 1.5 : 1) * i.effectiveness * (i.mult ?? 1);
  return Math.max(1, Math.floor(dmg));
}

export const CRIT_CHANCE = 1 / 24;
