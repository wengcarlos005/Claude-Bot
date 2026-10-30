import type { ScreenProps } from '../App';
import { Window, useApp } from '../components';
import type { CaptureRule, Settings } from '../../core/state/types';
import { upgradeLevel } from '../../core/bonuses';

const WHEN: Record<CaptureRule['when'], string> = {
  shiny: 'Se for shiny',
  legendary: 'Se for lendário/mítico',
  notCaught: 'Se não estiver na Pokédex',
  betterIvs: 'Se tiver IVs melhores que a minha melhor cópia',
  species: 'Se for uma das espécies:',
  any: 'Qualquer Pokémon (farm de Afinidade)',
};

export function AutoManagerScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const balls = [...app.data.items.values()].filter((i) => i.category === 'ball' && i.id !== 'safari-ball');
  const rules = s.captureRules;
  const setRules = (r: CaptureRule[]) => app.dispatch({ type: 'SetCaptureRules', rules: r });
  const upd = (i: number, patch: Partial<CaptureRule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const moveRule = (i: number, d: number) => {
    const r = [...rules];
    const j = i + d;
    if (j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]];
    setRules(r);
  };
  const set = (patch: Partial<Settings>) => app.dispatch({ type: 'SetSettings', settings: patch });
  const st = s.settings;
  const hasAutoBuyer = upgradeLevel(s, 'auto-buyer') > 0;
  return (
    <div class="cols">
      <Window title="Regras de captura">
        <p class="small muted">
          Avaliadas de cima para baixo: a primeira regra que combinar decide a bola. A equipe enfraquece o selvagem (sem nocautear) e arremessa
          quando ele está com ≤50% de PS (Quick Ball e Master Ball: imediatamente). Se as tentativas acabarem, a batalha segue normalmente.
        </p>
        <div class="stack" style={{ gap: '8px' }}>
          {rules.map((r, i) => (
            <div key={r.id} class="row spread" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
              <label class="row grow">
                <input type="checkbox" checked={r.enabled} onChange={() => upd(i, { enabled: !r.enabled })} />
                <span>{i + 1}. {WHEN[r.when]}</span>
                {r.when === 'species' && (
                  <input
                    placeholder="ex.: pikachu, eevee"
                    value={(r.species ?? []).join(', ')}
                    onChange={(e) => upd(i, { species: (e.target as HTMLInputElement).value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) })}
                  />
                )}
              </label>
              <div class="row">
                <select value={r.ball} onChange={(e) => upd(i, { ball: (e.target as HTMLSelectElement).value })}>
                  {balls.map((b) => <option key={b.id} value={b.id}>{b.name} ({s.inventory[b.id] ?? 0})</option>)}
                </select>
                <label class="row small" title="Se a bola acabar, usa a mais barata disponível (nunca a Master Ball)">
                  <input type="checkbox" checked={r.fallback} onChange={() => upd(i, { fallback: !r.fallback })} /> reserva
                </label>
                <button class="btn btn-sm btn-ghost" onClick={() => moveRule(i, -1)} aria-label="Subir">▲</button>
                <button class="btn btn-sm btn-ghost" onClick={() => moveRule(i, 1)} aria-label="Descer">▼</button>
                {r.when === 'species' && <button class="btn btn-sm btn-ghost" onClick={() => setRules(rules.filter((_, j) => j !== i))}>✕</button>}
              </div>
            </div>
          ))}
          <button
            class="btn btn-sm"
            onClick={() => setRules([...rules, { id: `r-${Date.now()}`, enabled: true, when: 'species', species: [], ball: 'poke-ball', fallback: true }])}
          >
            + Regra por espécie
          </button>
        </div>
      </Window>
      <div class="stack">
        <Window title="Cura e derrotas">
          <div class="stack" style={{ gap: '8px' }}>
            <label class="row"><input type="checkbox" checked={st.autoPotion} onChange={() => set({ autoPotion: !st.autoPotion })} /> Usar Poções automaticamente entre batalhas</label>
            <label class="row small">
              Quando o PS estiver abaixo de {Math.round(st.autoPotionThreshold * 100)}%
              <input type="range" min={10} max={90} step={5} value={st.autoPotionThreshold * 100} onChange={(e) => set({ autoPotionThreshold: Number((e.target as HTMLInputElement).value) / 100 })} />
            </label>
            <label class="row"><input type="checkbox" checked={st.autoRevive} onChange={() => set({ autoRevive: !st.autoRevive })} /> Usar Revive automaticamente em desmaiados</label>
            <label class="row"><input type="checkbox" checked={st.autoRetreat} onChange={() => set({ autoRetreat: !st.autoRetreat })} /> Recuar para a área anterior após 3 derrotas seguidas</label>
            <label class="row"><input type="checkbox" checked={st.autoEvolve} onChange={() => set({ autoEvolve: !st.autoEvolve })} /> Evoluir automaticamente ao subir de nível</label>
          </div>
        </Window>
        <Window title="Coleção">
          <div class="stack" style={{ gap: '8px' }}>
            <label class="row"><input type="checkbox" checked={st.autoTransfer} onChange={() => set({ autoTransfer: !st.autoTransfer })} /> Transferir duplicatas capturadas ao Professor (₽ + PP)</label>
            <label class="row small">
              Nunca transferir automaticamente qualidade ≥
              <select value={st.protectGrade} onChange={(e) => set({ protectGrade: (e.target as HTMLSelectElement).value as Settings['protectGrade'] })}>
                {['S', 'A', 'B', 'C', 'D'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <p class="small muted">Shinies, Pokémon protegidos 🔒 e cópias com IVs melhores nunca são transferidos automaticamente.</p>
          </div>
        </Window>
        <Window title="Comprador automático">
          {!hasAutoBuyer ? (
            <p class="small muted">Desbloqueie a melhoria "Comprador Automático" na Pesquisa.</p>
          ) : (
            <div class="stack" style={{ gap: '8px' }}>
              <label class="row"><input type="checkbox" checked={st.autoBuy} onChange={() => set({ autoBuy: !st.autoBuy })} /> Ativado</label>
              <label class="row small">
                Item:
                <select value={st.autoBuyItem} onChange={(e) => set({ autoBuyItem: (e.target as HTMLSelectElement).value })}>
                  {balls.filter((b) => b.price !== null).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label class="row small">
                Repor quando abaixo de
                <input type="number" min={1} max={500} value={st.autoBuyMinStock} onChange={(e) => set({ autoBuyMinStock: Math.max(1, Number((e.target as HTMLInputElement).value)) })} style={{ width: '70px' }} />
              </label>
              <label class="row small">
                Gastar no máximo {Math.round(st.autoBuyBudget * 100)}% do dinheiro por compra
                <input type="range" min={5} max={100} step={5} value={st.autoBuyBudget * 100} onChange={(e) => set({ autoBuyBudget: Number((e.target as HTMLInputElement).value) / 100 })} />
              </label>
            </div>
          )}
        </Window>
      </div>
    </div>
  );
}
