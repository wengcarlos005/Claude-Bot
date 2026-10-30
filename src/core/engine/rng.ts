// Gerador pseudoaleatório determinístico (mulberry32). O estado fica no GameState para que
// saves, testes e o simulador reproduzam exatamente os mesmos resultados.

export interface RngState {
  s: number;
}

export class Rng {
  constructor(public state: RngState) {}

  static seeded(seed: number): Rng {
    return new Rng({ s: seed >>> 0 });
  }

  /** Número em [0, 1). */
  next(): number {
    this.state.s = (this.state.s + 0x6d2b79f5) >>> 0;
    let t = this.state.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [min, max] (inclusivo). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  weighted<T>(list: readonly T[], weight: (x: T) => number): T {
    let total = 0;
    for (const x of list) total += weight(x);
    let r = this.next() * total;
    for (const x of list) {
      r -= weight(x);
      if (r < 0) return x;
    }
    return list[list.length - 1];
  }

  uint32(): number {
    return Math.floor(this.next() * 4294967296) >>> 0;
  }
}
