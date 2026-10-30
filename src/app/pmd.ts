// Sprites de Pokémon vistos de cima, em 8 direções, do PMDCollab (SpriteCollab, licença CC BY-NC 4.0).
// Carregados por URL como os demais sprites; só lemos o AnimData.xml para saber tamanho e duração dos quadros.

const BASES = ['https://cdn.jsdelivr.net/gh/PMDCollab/SpriteCollab@master/sprite/', 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/'];

export type AnimName = 'Walk' | 'Idle' | 'Attack' | 'Hurt' | 'Faint';

export interface PmdAnim {
  url: string;
  fw: number;
  fh: number;
  frames: number;
  /** Duração total de um ciclo em ms (as durações do XML são em quadros de 1/60 s). */
  ms: number;
}

export type PmdSet = Partial<Record<AnimName, PmdAnim>>;

/** Linhas da folha: 0 baixo, 1 baixo-dir., 2 direita, 3 cima-dir., 4 cima, 5 cima-esq., 6 esquerda, 7 baixo-esq. */
export function directionRow(dx: number, dy: number): number {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 0;
  const a = Math.atan2(dy, dx); // 0 = direita, π/2 = baixo
  const oct = Math.round(a / (Math.PI / 4));
  return ({ 0: 2, 1: 1, 2: 0, 3: 7, 4: 6, [-4]: 6, [-3]: 5, [-2]: 4, [-1]: 3 } as Record<number, number>)[oct] ?? 0;
}

const cache = new Map<string, Promise<PmdSet | null>>();

async function fetchText(path: string): Promise<{ text: string; base: string } | null> {
  for (const base of BASES) {
    try {
      const r = await fetch(base + path);
      if (r.ok) return { text: await r.text(), base };
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

/** Carrega as animações de uma espécie (por número da Pokédex). Devolve null se o PMDCollab não tiver a espécie. */
export function loadPmd(dexId: number, shiny = false): Promise<PmdSet | null> {
  const folder = String(dexId).padStart(4, '0') + (shiny ? '/0000/0001' : '');
  let p = cache.get(folder);
  if (!p) {
    p = (async () => {
      const got = await fetchText(`${folder}/AnimData.xml`);
      if (!got) return shiny ? loadPmd(dexId, false) : null;
      const doc = new DOMParser().parseFromString(got.text, 'text/xml');
      const nodes = [...doc.getElementsByTagName('Anim')];
      const byName = new Map(nodes.map((n) => [n.getElementsByTagName('Name')[0]?.textContent ?? '', n]));
      const resolve = (name: string, depth = 0): Element | null => {
        const n = byName.get(name);
        if (!n) return null;
        const copy = n.getElementsByTagName('CopyOf')[0]?.textContent;
        return copy && depth < 4 ? resolve(copy, depth + 1) : n;
      };
      const set: PmdSet = {};
      for (const name of ['Walk', 'Idle', 'Attack', 'Hurt', 'Faint'] as AnimName[]) {
        const n = resolve(name);
        if (!n) continue;
        const real = n.getElementsByTagName('Name')[0]?.textContent ?? name;
        const durations = [...n.getElementsByTagName('Duration')].map((d) => Number(d.textContent) || 1);
        set[name] = {
          url: `${got.base}${folder}/${real}-Anim.png`,
          fw: Number(n.getElementsByTagName('FrameWidth')[0]?.textContent) || 32,
          fh: Number(n.getElementsByTagName('FrameHeight')[0]?.textContent) || 32,
          frames: durations.length,
          ms: Math.max(120, (durations.reduce((a, b) => a + b, 0) * 1000) / 60),
        };
      }
      return set.Walk ? set : null;
    })().catch(() => null);
    cache.set(folder, p);
  }
  return p;
}
