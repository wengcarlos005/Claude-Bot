/**
 * Gera src/ui/styles/tokens.css a partir de design/tokens.json (cópia do Design System publicado).
 * Uso: npm run build:tokens
 * Tema padrão: Noite (escuro). `data-theme="dia"` ativa o claro; sem atributo, segue prefers-color-scheme.
 */
import { readFileSync, writeFileSync } from 'node:fs';

type Tok = { name: string; value: string | Record<string, string> };
const t = JSON.parse(readFileSync('design/tokens.json', 'utf8'));
const themes: string[] = t.color.themes.map((x: { id: string }) => x.id);
const [first, second] = themes;
const val = (tok: Tok, theme: string) => (typeof tok.value === 'string' ? tok.value : tok.value[theme] ?? tok.value[first]);
const colorAndShadow: Tok[] = [...t.color.tokens, ...(t.shadow?.tokens ?? [])];
const decl = (theme: string) => colorAndShadow.map((x) => `  --${x.name}: ${val(x, theme)};`).join('\n');
const flat: Tok[] = ['spacing', 'radius', 'duration'].flatMap((k) => t[k]?.tokens ?? []);
const fam = Object.entries(t.type.families as Record<string, string>).map(([k, v]) => `  --font-${k}: ${v};`).join('\n');

const css = `/* Pokémon Idle — generated from design/tokens.json (npm run build:tokens). Não edite à mão. */
:root, [data-theme="${first}"] {
${decl(first)}
  color-scheme: dark;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="${first}"]) {
${decl(second).replace(/^/gm, '  ')}
    color-scheme: light;
  }
}
[data-theme="${second}"] {
${decl(second)}
  color-scheme: light;
}
:root {
${flat.map((x) => `  --${x.name}: ${x.value};`).join('\n')}
${fam}
}
`;
writeFileSync('src/ui/styles/tokens.css', css);
console.log(`✔ tokens.css: ${colorAndShadow.length} cores/sombras × ${themes.length} temas, ${flat.length} medidas`);
