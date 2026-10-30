/**
 * Teste E2E de fumaça (Playwright): sobe o build com `vite preview`, escolhe o inicial, joga alguns segundos,
 * navega por todas as telas, salva/recarrega, simula 2 h offline e confere o layout de celular.
 * Uso: npm run build && npm run e2e   (requer o pacote `playwright` com Chromium instalado)
 * Defina E2E_SHOTS=<pasta> para salvar screenshots.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4179;
const shots = process.env.E2E_SHOTS;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const fail = (msg) => {
  console.error('✗', msg);
  server.kill();
  process.exit(1);
};

await new Promise((r) => setTimeout(r, 2500));
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch({ proxy });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('.starters', { timeout: 20000 });
  await page.click('.starter >> nth=0');
  await page.waitForFunction(() => window.pokemonIdle.state.stats.battlesWon + window.pokemonIdle.state.stats.captures > 0, null, { timeout: 20000 });
  const s1 = await page.evaluate(() => ({ won: window.pokemonIdle.state.stats.battlesWon, party: window.pokemonIdle.state.party.length }));
  if (shots) await page.screenshot({ path: `${shots}/explore.png` });
  for (const label of ['Hunt', 'Mapas', 'Equipe', 'PC', 'Pokédex', 'Inventário', 'Loja', 'Oficina', 'Pesquisa', 'Automações', 'Estatísticas', 'Hub']) {
    await page.click(`.sidenav__item:has-text("${label}")`);
    await page.waitForTimeout(300);
    if (shots) await page.screenshot({ path: `${shots}/${label}.png` });
  }
  await page.click('.sidenav__item:has-text("Mapas")');
  await page.click('.place__tabs button:has-text("Detalhes")');
  await page.click('button:has-text("Analisar hunt")');
  await page.waitForSelector('text=XP/h ·', { timeout: 10000 });
  await page.click('.pk-tab:has-text("Lista e filtros")');
  await page.waitForSelector('.chapter', { timeout: 5000 });
  await page.evaluate(() => window.pokemonIdle.save());
  await page.reload();
  await page.waitForFunction(() => window.pokemonIdle?.state.player.starterChosen === true, null, { timeout: 15000 });
  await page.evaluate(async () => {
    const a = window.pokemonIdle;
    a.state.meta.lastTickAt -= 2 * 3600_000;
    await a['handleAway']();
  });
  await page.waitForSelector('text=Bem-vindo de volta!', { timeout: 15000 });
  if (shots) await page.screenshot({ path: `${shots}/offline.png` });
  await page.click('button:has-text("Continuar")');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('.sidenav__item:has-text("Hunt")');
  await page.waitForTimeout(500);
  if (shots) await page.screenshot({ path: `${shots}/mobile.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) fail('rolagem horizontal no layout de celular');
  if (errors.length) fail('erros no console: ' + errors.join(' | '));
  console.log('✓ E2E OK', s1);
} catch (e) {
  fail(e.message);
} finally {
  await browser.close();
  server.kill();
}
