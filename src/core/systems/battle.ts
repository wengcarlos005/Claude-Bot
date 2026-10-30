// Mecânica de batalha automática: escolha de golpe, ordem de ação e dano.
import type { GameContext } from '../context';
import { CRIT_CHANCE, calcDamage, effectivePower, typeEffectiveness } from '../formulas/damage';
import type { Combatant } from '../state/types';
import { heldEffectMult } from './items';

export interface AttackResult {
  moveId: string;
  damage: number;
  effectiveness: number;
  crit: boolean;
  missed: boolean;
}

/** Dano esperado de um golpe (sem aleatoriedade) — base da IA e do Hunt Analyzer. */
export function expectedDamage(ctx: GameContext, att: Combatant, def: Combatant, moveId: string): number {
  const m = ctx.data.moves.get(moveId);
  if (!m) return 0;
  const power = moveId === 'struggle' ? 50 : effectivePower(m);
  if (power <= 0) return 0;
  const special = m.category === 'special';
  const eff = moveId === 'struggle' ? 1 : typeEffectiveness(ctx.data.typeChart, m.type, def.types);
  const stab = moveId !== 'struggle' && att.types.includes(m.type);
  const dmg = calcDamage({
    level: att.level, power, attack: special ? att.stats.spa : att.stats.atk, defense: special ? def.stats.spd : def.stats.def,
    stab, effectiveness: eff, crit: false, roll: 0.925, mult: heldEffectMult(ctx, att, m.type, m.category),
  });
  return eff === 0 ? 0 : dmg * ((m.accuracy ?? 100) / 100);
}

/** IA: escolhe o golpe com maior dano esperado. */
export function chooseMove(ctx: GameContext, att: Combatant, def: Combatant): string {
  let best = att.moves[0] ?? 'struggle';
  let bestDmg = -1;
  for (const id of att.moves) {
    const d = expectedDamage(ctx, att, def, id);
    if (d > bestDmg) {
      bestDmg = d;
      best = id;
    }
  }
  return best;
}

/** Ordem da rodada: prioridade do golpe, depois Velocidade; empate decidido no sorteio. */
export function roundOrder(ctx: GameContext, p: Combatant, f: Combatant): ('player' | 'foe')[] {
  const pm = ctx.data.moves.get(chooseMove(ctx, p, f));
  const fm = ctx.data.moves.get(chooseMove(ctx, f, p));
  const pp = pm?.priority ?? 0;
  const fp = fm?.priority ?? 0;
  if (pp !== fp) return pp > fp ? ['player', 'foe'] : ['foe', 'player'];
  if (p.stats.spe !== f.stats.spe) return p.stats.spe > f.stats.spe ? ['player', 'foe'] : ['foe', 'player'];
  return ctx.rng.chance(0.5) ? ['player', 'foe'] : ['foe', 'player'];
}

/**
 * Executa um ataque e aplica o dano. `keepAlive` limita o dano para deixar o alvo com 1 PS
 * (usado quando a equipe está tentando capturar o selvagem).
 */
export function attack(ctx: GameContext, att: Combatant, def: Combatant, keepAlive = false): AttackResult {
  const moveId = chooseMove(ctx, att, def);
  const m = ctx.data.moves.get(moveId)!;
  const acc = m.accuracy ?? 100;
  if (!ctx.rng.chance(acc / 100)) return { moveId, damage: 0, effectiveness: 1, crit: false, missed: true };
  const special = m.category === 'special';
  const struggle = moveId === 'struggle';
  const eff = struggle ? 1 : typeEffectiveness(ctx.data.typeChart, m.type, def.types);
  const crit = ctx.rng.chance(CRIT_CHANCE);
  let damage = calcDamage({
    level: att.level,
    power: struggle ? 50 : effectivePower(m),
    attack: special ? att.stats.spa : att.stats.atk,
    defense: special ? def.stats.spd : def.stats.def,
    stab: !struggle && att.types.includes(m.type),
    effectiveness: eff,
    crit,
    roll: 0.85 + ctx.rng.next() * 0.15,
    mult: heldEffectMult(ctx, att, m.type, m.category),
  });
  if (eff === 0) damage = 0;
  if (keepAlive) damage = Math.min(damage, Math.max(0, def.hp - 1));
  def.hp = Math.max(0, def.hp - damage);
  if (att.heldItem === 'leftovers' && att.hp > 0) att.hp = Math.min(att.maxHp, att.hp + Math.floor(att.maxHp / 16));
  return { moveId, damage, effectiveness: eff, crit, missed: false };
}
