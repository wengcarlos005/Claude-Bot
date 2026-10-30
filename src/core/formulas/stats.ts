import type { StatKey, Stats } from '../../data/types';
import { STAT_KEYS } from '../../data/types';
import { NATURE_BY_ID } from './natures';

export const MAX_IV = 31;
export const MAX_EV_STAT = 252;
export const MAX_EV_TOTAL = 510;

export function emptyStats(v = 0): Stats {
  return { hp: v, atk: v, def: v, spa: v, spd: v, spe: v };
}

/**
 * Atributos finais (fórmula dos jogos principais) com multiplicador extra de bônus permanentes
 * (Afinidade, Maestria, Pesquisa) aplicado sobre todos os atributos.
 */
export function calcStats(base: Stats, ivs: Stats, evs: Stats, level: number, natureId: string, bonusMult = 1): Stats {
  const nature = NATURE_BY_ID.get(natureId);
  const out = emptyStats();
  for (const k of STAT_KEYS) {
    const core = Math.floor(((2 * base[k] + ivs[k] + Math.floor(evs[k] / 4)) * level) / 100);
    let v: number;
    if (k === 'hp') v = base.hp === 1 ? 1 : core + level + 10; // Shedinja tem sempre 1 PS
    else {
      const nat = nature?.up === k ? 1.1 : nature?.down === k ? 0.9 : 1;
      v = Math.floor((core + 5) * nat);
    }
    out[k] = k === 'hp' && base.hp === 1 ? 1 : Math.floor(v * bonusMult);
  }
  return out;
}

export function ivTotal(ivs: Stats): number {
  return STAT_KEYS.reduce((a, k) => a + ivs[k], 0);
}

/** Qualidade agregada pelos IVs (não substitui os IVs; só facilita a leitura). */
export function ivGrade(ivs: Stats): 'S' | 'A' | 'B' | 'C' | 'D' {
  const pct = ivTotal(ivs) / (MAX_IV * 6);
  if (pct >= 0.9) return 'S';
  if (pct >= 0.75) return 'A';
  if (pct >= 0.55) return 'B';
  if (pct >= 0.35) return 'C';
  return 'D';
}

export function addEvs(evs: Stats, gain: Partial<Record<StatKey, number>>): void {
  let total = STAT_KEYS.reduce((a, k) => a + evs[k], 0);
  for (const k of STAT_KEYS) {
    const g = gain[k] ?? 0;
    if (!g || total >= MAX_EV_TOTAL) continue;
    const add = Math.min(g, MAX_EV_STAT - evs[k], MAX_EV_TOTAL - total);
    if (add > 0) {
      evs[k] += add;
      total += add;
    }
  }
}
