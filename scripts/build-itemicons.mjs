// Gera src/data/generated/itemicons.json: id do item (nomes da PokéAPI) → caminho do ícone com contorno do PokéSprite
// (items-outline/<categoria>/<nome>.png). Uso: node scripts/build-itemicons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const list = await (await fetch('https://data.jsdelivr.com/v1/packages/gh/msikma/pokesprite@master?structure=flat')).json();
const paths = list.files.map((f) => f.name).filter((n) => n.startsWith('/items-outline/') && n.endsWith('.png')).map((n) => n.slice(15, -4));
const byName = new Map();
for (const p of paths) {
  const parts = p.split('/');
  if (parts.length !== 2) continue; // ignora variantes gen3/gen4 em subpastas
  if (!byName.has(parts[1])) byName.set(parts[1], p);
}
const ids = [
  ...JSON.parse(readFileSync('src/data/generated/items.json', 'utf8')).map((i) => i.id),
  ...[...readFileSync('src/data/content/items.ts', 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]),
];
const special = { 'red-shard': 'shard/red', 'blue-shard': 'shard/blue', 'green-shard': 'shard/green', 'yellow-shard': 'shard/yellow', 'hm-surf': 'hm/water' };
const out = {};
const miss = [];
for (const id of new Set(ids)) {
  const cand = [special[id], byName.get(id), id.endsWith('-ball') && byName.has(id.slice(0, -5)) ? byName.get(id.slice(0, -5)) : undefined, byName.get(id.replace(/-/g, ''))].find(Boolean);
  if (cand && paths.includes(cand)) out[id] = cand;
  else miss.push(id);
}
writeFileSync('src/data/generated/itemicons.json', JSON.stringify(out, null, 0) + '\n');
console.log(`${Object.keys(out).length} ícones; sem ícone: ${miss.join(', ') || 'nenhum'}`);

// Nomes dos ícones de Pokémon (pokemon-gen8/regular/<slug>.png) por número da Pokédex.
const mons = await (await fetch('https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/data/pokemon.json')).json();
const slugs = {};
for (const m of Object.values(mons)) slugs[Number(m.idx)] = m.slug.eng;
writeFileSync('src/data/generated/pokeicons.json', JSON.stringify(slugs) + '\n');
console.log(`${Object.keys(slugs).length} ícones de Pokémon`);
