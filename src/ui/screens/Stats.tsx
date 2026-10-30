import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Window, duration, fmt, pct, useApp } from '../components';
import { uiIcon } from '../../app/assets';
import { estimateHunt, type HuntEstimate } from '../../core/analyzer';
import { areaUnlocked, isFarmArea } from '../../core/world';
import { ACHIEVEMENTS } from '../../data/content/achievements';
import { metricValue } from '../../core/systems/achievements';

const LABELS: Record<string, string> = {
  battlesWon: 'Batalhas vencidas', battlesLost: 'Batalhas perdidas', wildDefeated: 'Selvagens derrotados',
  trainersDefeated: 'Treinadores derrotados', encounters: 'Encontros', encountersSinceShiny: 'Encontros desde o último shiny',
  captures: 'Capturas', captureAttempts: 'Arremessos', shiniesFound: 'Shinies encontrados', shiniesCaught: 'Shinies capturados',
  evolutions: 'Evoluções', moneyEarned: '₽ ganhos', moneySpent: '₽ gastos', xpEarned: 'XP ganha', transfers: 'Transferências',
};

export function StatsScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [results, setResults] = useState<HuntEstimate[]>([]);
  const [running, setRunning] = useState<number | null>(null);
  const farms = [...app.data.areas.values()].filter((a) => isFarmArea(a) && areaUnlocked(s, app.data, a));

  const compare = async () => {
    setResults([]);
    const out: HuntEstimate[] = [];
    for (let i = 0; i < farms.length; i++) {
      setRunning(i / farms.length);
      await new Promise((r) => setTimeout(r, 0));
      out.push(estimateHunt(app.data, s, farms[i].id, 10));
    }
    setRunning(null);
    setResults(out.sort((a, b) => b.efficiency - a.efficiency));
  };

  return (
    <div class="cols">
      <div class="stack">
        <Window
          title="Hunt Analyzer"
          actions={<button class="pk-btn pk-btn--sm pk-btn--primary" disabled={running !== null} onClick={compare}>{running !== null ? `Analisando… ${pct(running)}` : 'Comparar áreas liberadas'}</button>}
        >
          <p class="small muted">
            Projeção: simula 10 min da sua equipe atual (com suas melhorias, regras de captura e itens) em cada área liberada, usando o motor real do
            jogo com semente fixa. Eficiência = XP/h × (taxa de vitória)². Os valores reais variam com sorte, horário e mudanças na equipe.
          </p>
          {results.length > 0 && (
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Área</th><th>XP/h</th><th>₽/h</th><th>Encontros/h</th><th>Capturas/h</th><th>Derrotas/h</th><th>Vitória</th></tr></thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.areaId} class={i === 0 ? 'current' : ''}>
                      <td>
                        {i === 0 && <span class="pk-chip-btn" aria-pressed="true">Melhor</span>} {app.data.areas.get(r.areaId)?.name}{' '}
                        <button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => app.dispatch({ type: 'SelectArea', areaId: r.areaId })}>Ir</button>
                      </td>
                      <td class="num">{fmt(r.xpPerHour)}</td>
                      <td class="num">{fmt(r.moneyPerHour)}</td>
                      <td class="num">{fmt(r.encountersPerHour)}</td>
                      <td class="num">{r.capturesPerHour.toFixed(1)}</td>
                      <td class={`num ${r.lossesPerHour > 0 ? 'bad' : ''}`}>{r.lossesPerHour.toFixed(1)}</td>
                      <td class="num">{pct(r.winRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Window>
        <Window title="Estatísticas da conta">
          <div class="stat-tiles">
            <div class="stat-tile"><span>Tempo de jogo</span><b class="pk-num">{duration(s.meta.playTimeMs)}</b></div>
            <div class="stat-tile"><span>Tempo offline</span><b class="pk-num">{duration(s.stats.offlineMs)}</b></div>
            {Object.entries(s.stats).filter(([k]) => LABELS[k]).map(([k, v]) => (
              <div key={k} class="stat-tile"><span>{LABELS[k]}</span><b class="pk-num">{fmt(v)}</b></div>
            ))}
            <div class="stat-tile"><span>Captura por arremesso</span><b class="pk-num">{s.stats.captureAttempts ? pct(s.stats.captures / s.stats.captureAttempts) : '—'}</b></div>
          </div>
        </Window>
      </div>
      <Window title={<>Conquistas <span class="muted small">({s.achievements.length}/{ACHIEVEMENTS.length})</span></>}>
        <ul class="achv">
          {ACHIEVEMENTS.map((a) => {
            const done = s.achievements.includes(a.id);
            const v = Math.min(metricValue(s, a.metric), a.target);
            return (
              <li key={a.id} class={`achv__item ${done ? 'is-done' : ''}`}>
                <img src={uiIcon(done ? 'key-item/medal-box' : 'ball/poke')} width={32} height={32} alt="" />
                <div>
                  <b>{a.name}</b>
                  <span class="small muted">{a.description}</span>
                  {!done && <span class="achv__bar"><i style={{ width: `${(v / a.target) * 100}%` }} /></span>}
                </div>
                <span class="achv__val pk-num">{done ? `+${a.rewardPP} PP` : `${fmt(v)}/${fmt(a.target)}`}</span>
              </li>
            );
          })}
        </ul>
      </Window>
    </div>
  );
}
