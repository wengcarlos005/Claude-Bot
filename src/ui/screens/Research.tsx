import type { ScreenProps } from '../App';
import { Window, fmt, useApp } from '../components';
import { requirementText } from '../text';
import { upgradeCost } from '../../core/commands';
import { computeBonuses, upgradeLevel } from '../../core/bonuses';
import { caughtSpeciesCount, checkRequirement } from '../../core/world';
import type { MilestoneReward } from '../../data/content/types';

export function ResearchScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const b = computeBonuses(s, app.data);
  const caught = caughtSpeciesCount(s);
  const rewardText = (r: MilestoneReward) => {
    switch (r.kind) {
      case 'xpMult': return `+${Math.round(r.value * 100)}% XP`;
      case 'moneyMult': return `+${Math.round(r.value * 100)}% ₽`;
      case 'captureMult': return `+${Math.round(r.value * 100)}% captura`;
      case 'statMult': return `+${Math.round(r.value * 100)}% atributos`;
      case 'researchPoints': return `+${r.value} PP`;
      case 'pokemon': return `${app.data.species.get(r.species)?.name} Nv${r.level}`;
      case 'items': return Object.entries(r.items).map(([id, q]) => `${q}× ${app.data.items.get(id)?.name}`).join(', ');
    }
  };
  return (
    <div class="cols">
      <Window title="Melhorias">
        <p class="small muted">Melhorias em ₽ e em Pontos de Pesquisa (PP). PP vêm de novas espécies, treinadores, áreas concluídas, ginásios e transferências.</p>
        <table class="table">
          <tbody>
            {[...app.data.upgrades.values()].map((u) => {
              const lvl = upgradeLevel(s, u.id);
              const cost = upgradeCost(app.core.ctx, s, u.id);
              const reqOk = !u.requires || u.requires.every((r) => checkRequirement(s, r));
              const afford = cost !== null && (u.currency === 'money' ? s.player.money >= cost : s.player.researchPoints >= cost);
              return (
                <tr key={u.id} class={reqOk ? '' : 'locked'}>
                  <td>
                    <b>{u.name}</b> <span class="muted small">Nv {lvl}/{u.maxLevel}</span>
                    <div class="small muted">{u.description}{!reqOk && ` Requer: ${u.requires!.map((r) => requirementText(app.data, r)).join(', ')}.`}</div>
                  </td>
                  <td class="right">
                    {cost === null ? (
                      <span class="good small">Máximo</span>
                    ) : (
                      <button class={`btn btn-sm ${u.currency === 'money' ? 'btn-primary' : 'btn-gold'}`} disabled={!afford || !reqOk} onClick={() => app.dispatch({ type: 'BuyUpgrade', upgradeId: u.id })}>
                        {u.currency === 'money' ? `₽${fmt(cost)}` : `${fmt(cost)} PP`}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Window>
      <div class="stack">
        <Window title="Bônus ativos">
          <div class="metrics">
            <div class="metric"><div class="label">XP</div><div class="value">×{b.xpMult.toFixed(2)}</div></div>
            <div class="metric"><div class="label">₽</div><div class="value">×{b.moneyMult.toFixed(2)}</div></div>
            <div class="metric"><div class="label">Captura</div><div class="value">+{Math.round(b.captureBonus * 100)}%</div></div>
            <div class="metric"><div class="label">Atributos</div><div class="value">×{b.statMult.toFixed(2)}</div></div>
            <div class="metric"><div class="label">Exp. Share</div><div class="value">{Math.round(b.expShare * 100)}%</div></div>
            <div class="metric"><div class="label">Shiny</div><div class="value">1/{fmt(1 / b.shinyChance)}</div></div>
            <div class="metric"><div class="label">Encontro</div><div class="value">{(b.walkMs / 1000).toFixed(1)}s</div></div>
            <div class="metric"><div class="label">Offline</div><div class="value">{Math.round(b.offlineCapMs / 3600_000)}h · {Math.round(b.offlineEfficiency * 100)}%</div></div>
          </div>
        </Window>
        <Window title={<>Pesquisa do Professor <span class="muted small">({caught} espécies)</span></>}>
          <table class="table">
            <tbody>
              {app.data.milestones.map((m) => {
                const done = s.milestonesClaimed.includes(m.id);
                return (
                  <tr key={m.id} class={done ? '' : caught >= m.caught ? 'current' : 'locked'}>
                    <td class="num">{done ? '✅' : '◻'} {m.caught}</td>
                    <td class="small">{m.rewards.map(rewardText).join(' · ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Window>
      </div>
    </div>
  );
}
