// Registro de assets: resolve URLs de sprites a partir de um "pacote" configurável.
// Padrão: repositório público de sprites do PokeAPI (todas as 1025 espécies até a Gen 9). Para usar sprites
// locais, rode `npm run sprites:download` e defina VITE_SPRITE_BASE=/assets/sprites no .env.
const BASE: string = import.meta.env.VITE_SPRITE_BASE || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const ANIMATED_MAX_ID = 649; // sprites animados da Gen 5 cobrem até Genesect

export type SpriteView = 'front' | 'back';

export function pokemonSprite(id: number, opts: { view?: SpriteView; shiny?: boolean; animated?: boolean } = {}): string {
  const back = opts.view === 'back' ? 'back/' : '';
  const shiny = opts.shiny ? 'shiny/' : '';
  if (opts.animated && id <= ANIMATED_MAX_ID) {
    return `${BASE}/pokemon/versions/generation-v/black-white/animated/${back}${shiny}${id}.gif`;
  }
  return `${BASE}/pokemon/${back}${shiny}${id}.png`;
}

/** Sprite estático equivalente (fallback quando o animado falha). */
export function staticFallback(id: number, view: SpriteView = 'front', shiny = false): string {
  return pokemonSprite(id, { view, shiny, animated: false });
}

export function itemSprite(itemId: string, override?: string): string {
  return `${BASE}/items/${override ?? itemId}.png`;
}

/** Sprite de treinador (avatar). */
export function trainerSprite(id: string): string {
  return `https://play.pokemonshowdown.com/sprites/trainers/${id}.png`;
}

/** Ícone de insígnia (1–8 Kanto, 9–16 Johto, 17–24 Hoenn, 25–32 Sinnoh). */
export function badgeSprite(n: number): string {
  return `${BASE}/badges/${n}.png`;
}
