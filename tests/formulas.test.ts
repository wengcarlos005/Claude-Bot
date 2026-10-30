import { describe, expect, it } from 'vitest';
import { expForLevel, levelForExp, battleExp } from '../src/core/formulas/experience';
import { calcStats } from '../src/core/formulas/stats';
import { calcDamage, typeEffectiveness } from '../src/core/formulas/damage';
import { captureChance } from '../src/core/formulas/capture';
import { Rng } from '../src/core/engine/rng';
import { data } from './helpers';

describe('experiência', () => {
  it('bate os totais oficiais no nível 100', () => {
    expect(expForLevel('fast', 100)).toBe(800_000);
    expect(expForLevel('medium-fast', 100)).toBe(1_000_000);
    expect(expForLevel('medium-slow', 100)).toBe(1_059_860);
    expect(expForLevel('slow', 100)).toBe(1_250_000);
    expect(expForLevel('erratic', 100)).toBe(600_000);
    expect(expForLevel('fluctuating', 100)).toBe(1_640_000);
  });
  it('nível 1 começa em 0 e as curvas são crescentes', () => {
    for (const r of ['fast', 'medium-fast', 'medium-slow', 'slow', 'erratic', 'fluctuating'] as const) {
      expect(expForLevel(r, 1)).toBe(0);
      for (let l = 2; l <= 100; l++) expect(expForLevel(r, l)).toBeGreaterThan(expForLevel(r, l - 1));
      expect(levelForExp(r, expForLevel(r, 37))).toBe(37);
    }
  });
  it('XP diminui quando o jogador está acima do nível do oponente (escala Gen 5)', () => {
    expect(battleExp(100, 20, false, 20)).toBeGreaterThan(battleExp(100, 20, false, 40));
    expect(battleExp(100, 20, false, 10)).toBeGreaterThan(battleExp(100, 20, false, 20));
    expect(battleExp(100, 20, true, 20)).toBeGreaterThan(battleExp(100, 20, false, 20));
  });
});

describe('atributos', () => {
  it('bate os valores máximos de referência (Nv100, IV 31, EV 252)', () => {
    const iv = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const ev = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };
    const base100 = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
    const neutral = calcStats(base100, iv, ev, 100, 'hardy');
    expect(neutral).toEqual({ hp: 404, atk: 299, def: 299, spa: 299, spd: 299, spe: 299 });
    const adamant = calcStats(base100, iv, ev, 100, 'adamant');
    expect(adamant.atk).toBe(328);
    expect(adamant.spa).toBe(269);
    expect(calcStats({ hp: 255, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 }, iv, ev, 100, 'hardy').hp).toBe(714); // Blissey
  });
  it('Shedinja sempre tem 1 PS', () => {
    const z = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    expect(calcStats({ hp: 1, atk: 90, def: 45, spa: 30, spd: 30, spe: 40 }, z, z, 50, 'hardy').hp).toBe(1);
  });
});

describe('tipos e dano', () => {
  it('tabela de tipos', async () => {
    const d = await data();
    expect(typeEffectiveness(d.typeChart, 'fire', ['grass'])).toBe(2);
    expect(typeEffectiveness(d.typeChart, 'water', ['fire', 'rock'])).toBe(4);
    expect(typeEffectiveness(d.typeChart, 'normal', ['ghost'])).toBe(0);
    expect(typeEffectiveness(d.typeChart, 'electric', ['ground'])).toBe(0);
    expect(typeEffectiveness(d.typeChart, 'fire', ['water', 'dragon'])).toBe(0.25);
    expect(typeEffectiveness(d.typeChart, 'fairy', ['dragon'])).toBe(2);
  });
  it('dano: imunidade zera, STAB e efetividade multiplicam', () => {
    const base = { level: 50, power: 80, attack: 120, defense: 100, stab: false, effectiveness: 1, crit: false, roll: 1 };
    const d = calcDamage(base);
    expect(d).toBeGreaterThan(0);
    expect(calcDamage({ ...base, effectiveness: 0 })).toBe(0);
    expect(calcDamage({ ...base, stab: true })).toBe(Math.floor(d * 1.5));
    expect(calcDamage({ ...base, effectiveness: 2 })).toBe(d * 2);
  });
});

describe('captura', () => {
  const base = { captureRate: 45, maxHp: 100, currentHp: 100, ballMult: 1, playerLevel: 20, wildLevel: 20, alreadyCaught: false, bonus: 0 };
  it('menos PS, bola melhor e espécie registrada aumentam a chance', () => {
    const c = captureChance(base);
    expect(captureChance({ ...base, currentHp: 1 })).toBeGreaterThan(c);
    expect(captureChance({ ...base, ballMult: 2 })).toBeCloseTo(c * 2);
    expect(captureChance({ ...base, alreadyCaught: true })).toBeCloseTo(c * 1.1);
  });
  it('fica entre 0 e 1, e Master Ball garante', () => {
    expect(captureChance({ ...base, captureRate: 255, ballMult: 10 })).toBe(1);
    expect(captureChance({ ...base, captureRate: 3, master: true })).toBe(1);
    expect(captureChance({ ...base, playerLevel: 100, wildLevel: 1, captureRate: 3 })).toBeLessThan(0.03);
  });
});

describe('RNG', () => {
  it('é determinístico pela semente', () => {
    const a = Rng.seeded(42);
    const b = Rng.seeded(42);
    const xs = Array.from({ length: 50 }, () => a.next());
    expect(Array.from({ length: 50 }, () => b.next())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
