export interface CaptureInput {
  captureRate: number;
  maxHp: number;
  currentHp: number;
  ballMult: number;
  /** Nível do Pokémon ativo do jogador e do selvagem. */
  playerLevel: number;
  wildLevel: number;
  alreadyCaught: boolean;
  /** Bônus somados de melhorias/pesquisa (ex.: 0.15 = +15%). */
  bonus: number;
  master?: boolean;
}

/**
 * Chance de captura por arremesso. Base na fórmula dos jogos principais (p ≈ a/255) com dois fatores próprios:
 *  - fator de nível: Pokémon do jogador mais forte que o selvagem facilita (±2% por nível, limitado a 0,6–1,4)
 *  - bônus de espécie já registrada (+10%)
 */
export function captureChance(i: CaptureInput): number {
  if (i.master) return 1;
  const hpFactor = (3 * i.maxHp - 2 * Math.max(1, i.currentHp)) / (3 * i.maxHp);
  const levelFactor = clamp(1 + (i.playerLevel - i.wildLevel) * 0.02, 0.6, 1.4);
  const caught = i.alreadyCaught ? 1.1 : 1;
  const p = (i.captureRate / 255) * i.ballMult * hpFactor * levelFactor * caught * (1 + i.bonus);
  return clamp(p, 0, 1);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export const BASE_SHINY_CHANCE = 1 / 8192;
