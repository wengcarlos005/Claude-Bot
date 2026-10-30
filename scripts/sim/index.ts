/**
 * Simulador de balanceamento: um bot joga N horas usando o motor real.
 * Uso: npm run sim -- [horas=72] [seed=1] [starter=bulbasaur]
 */
import { loadGameData } from '../../src/data/registry';
import { createInitialState } from '../../src/core/state/create';
import { GameCore } from '../../src/core/game';
import { botDecide } from '../../src/core/bot';
import { caughtSpeciesCount, levelCap } from '../../src/core/world';

const [hours = '72', seed = '1', starter = ''] = process.argv.slice(2);
const data = await loadGameData();
let clock = Date.UTC(2026, 0, 1, 12);
const state = createInitialState(data, clock, Number(seed));
const core = new GameCore(data, state, () => clock);
const fmt = (ms: number) => `${(ms / 3600_000).toFixed(2)}h`;
const milestones: string[] = [];
const dexMarks = [10, 25, 50, 75, 100, 125, 151];
core.on((e) => {
  const t = fmt(state.meta.playTimeMs);
  if (e.type === 'badge') milestones.push(`${t}  🏅 ${e.badgeName}  (equipe: ${state.party.map((u) => `${state.pokemon[u].species} ${state.pokemon[u].level}`).join(', ')})`);
  if (e.type === 'champion') milestones.push(`${t}  🏆 Campeão de ${e.regionId}`);
  if (e.type === 'captured' && e.newSpecies) {
    const n = caughtSpeciesCount(state);
    if (dexMarks.includes(n)) milestones.push(`${t}  📖 ${n} espécies`);
  }
});
if (starter) core.dispatch({ type: 'ChooseStarter', species: starter });
const total = Number(hours) * 3600_000;
const STEP = 500;
const t0 = performance.now();
let lastDecision = -Infinity;
let hourly = '';
while (state.meta.playTimeMs < total) {
  if (state.meta.playTimeMs - lastDecision >= 5 * 60_000) {
    botDecide(core);
    lastDecision = state.meta.playTimeMs;
  }
  core.tick(STEP);
  clock += STEP;
  if (state.meta.playTimeMs % ((Number(process.env.SIM_EVERY) || 6) * 3600_000) === 0) {
    hourly += `${fmt(state.meta.playTimeMs)}: área=${state.world.activeAreaId} teto=${levelCap(state, data)} líder=${state.pokemon[state.party[0]].species} L${state.pokemon[state.party[0]].level} ₽=${state.player.money} PP=${state.player.researchPoints} dex=${caughtSpeciesCount(state)} W/L=${state.stats.battlesWon}/${state.stats.battlesLost}\n`;
  }
}
console.log(`Simulação de ${hours}h (seed ${seed}) em ${((performance.now() - t0) / 1000).toFixed(1)}s de CPU\n`);
console.log(milestones.join('\n'));
console.log('\nA cada 6h:\n' + hourly);
console.log('Estatísticas:', state.stats);
console.log('Melhorias:', state.upgrades);
