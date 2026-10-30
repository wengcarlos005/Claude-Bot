import type { GrowthRate } from '../../data/types';

/** XP total necessária para estar no nível `level` (curvas oficiais de crescimento). */
export function expForLevel(rate: GrowthRate, level: number): number {
  const n = Math.max(1, Math.min(100, level));
  if (n === 1) return 0;
  const n3 = n ** 3;
  switch (rate) {
    case 'fast':
      return Math.floor((4 * n3) / 5);
    case 'medium-fast':
      return n3;
    case 'medium-slow':
      return Math.floor((6 / 5) * n3 - 15 * n * n + 100 * n - 140);
    case 'slow':
      return Math.floor((5 * n3) / 4);
    case 'erratic':
      if (n <= 50) return Math.floor((n3 * (100 - n)) / 50);
      if (n <= 68) return Math.floor((n3 * (150 - n)) / 100);
      if (n <= 98) return Math.floor((n3 * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((n3 * (160 - n)) / 100);
    case 'fluctuating':
      if (n <= 15) return Math.floor((n3 * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n <= 36) return Math.floor((n3 * (n + 14)) / 50);
      return Math.floor((n3 * (Math.floor(n / 2) + 32)) / 50);
  }
}

/** Nível correspondente a uma quantidade total de XP. */
export function levelForExp(rate: GrowthRate, xp: number): number {
  let lvl = 1;
  while (lvl < 100 && expForLevel(rate, lvl + 1) <= xp) lvl++;
  return lvl;
}

/** Ritmo global de XP (calibrado com o simulador — ver docs/BALANCE.md). */
export const XP_RATE = 0.25;

/**
 * XP ganha ao derrotar um Pokémon. Base dos jogos principais com a escala da Gen 5:
 *   (baseExp · nívelOponente / 5) · ((2·F + 10) / (F + P + 10))^2,5 · bônus de treinador · XP_RATE
 * O fator de escala reduz a XP quando o Pokémon do jogador (P) está acima do oponente (F) e aumenta quando está
 * abaixo — farmar áreas fracas rende pouco, enfrentar áreas do seu nível rende bem.
 */
export function battleExp(baseExp: number, foeLevel: number, isTrainer: boolean, playerLevel = foeLevel): number {
  const scale = Math.pow((2 * foeLevel + 10) / (foeLevel + playerLevel + 10), 2.5);
  return Math.max(1, Math.floor(((baseExp * foeLevel) / 5) * scale * (isTrainer ? 1.5 : 1) * XP_RATE));
}
