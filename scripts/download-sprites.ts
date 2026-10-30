/**
 * Baixa os sprites estáticos (frente, costas, shiny) das 1025 espécies e os ícones de itens para
 * public/assets/sprites/, para servir localmente em vez de usar o repositório público.
 * Uso: npm run sprites:download   (depois defina VITE_SPRITE_BASE=/assets/sprites no .env)
 * Os arquivos ficam fora do git (.gitignore). Verifique os direitos de uso antes de publicar.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import items from '../src/data/generated/items.json';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const OUT = join(process.cwd(), 'public', 'assets', 'sprites');
const MAX = 1025;
const variants = ['', 'shiny/', 'back/', 'back/shiny/'];

const jobs: string[] = [];
for (let id = 1; id <= MAX; id++) for (const v of variants) jobs.push(`pokemon/${v}${id}.png`);
for (const it of items as { id: string }[]) jobs.push(`items/${it.id}.png`);

let done = 0;
let failed = 0;
async function worker() {
  while (jobs.length) {
    const rel = jobs.shift()!;
    const dest = join(OUT, rel);
    if (existsSync(dest)) {
      done++;
      continue;
    }
    try {
      const res = await fetch(`${BASE}/${rel}`);
      if (!res.ok) throw new Error(String(res.status));
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    } catch {
      failed++;
    }
    if (++done % 200 === 0) console.log(`${done} arquivos…`);
  }
}
await Promise.all(Array.from({ length: 16 }, worker));
console.log(`Concluído: ${done} processados, ${failed} indisponíveis (o jogo usa fallback para esses).`);
