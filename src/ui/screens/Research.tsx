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
      <Window title="Melhorias de pesquisa">
        <table class="table">
          <tbody>
            {[...app.data.upgrades.values()].filter((u) => u.currency !== 'money').map((u) => {
              const lvl = upgradeLevel(s, u.id);
              const cost = upgradeCost(app.core.ctx, s, u.id);
              const reqOk = !u.requires || u.requires.every((r) => checkRequirement(s, r));
              const afford = cost !== null && s.player.researchPoints >= cost;
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
                      <button class="pk-btn pk-btn--sm pk-btn--gold" disabled={!afford || !reqOk} onClick={() => app.dispatch({ type: 'BuyUpgrade', upgradeId: u.id })}>
                        {fmt(cost)} PP
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
          <div class="pk-metrics">
            <div class="pk-metric"><div class="pk-metric__label">XP</div><div class="pk-metric__value">×{b.xpMult.toFixed(2)}</div></div>
            <div class="pk-metric"><div class="pk-metric__label">₽</div><div class="pk-metric__value">×{b.moneyMult.toFixed(2)}</div></div>
            <div class="pk-metric"><div class="pk-metric__label">Captura</div><div class="pk-metric__value">+{Math.round(b.captureBonus * 100)}%</div></div>
            <div class="pk-metric"><div class="pk-metric__label">Atributos</div><div class="pk-metric__value">×{b.statMult.toFixed(2)}</div></div>
            <div class="pk-metric"><div class="pk-metric__label">Exp. Share</div><div class="pk-metric__value">{Math.round(b.expShare * 100)}%</div></div>
            <div class="pk-metric"><div class="pk-metric__label">Shiny</div><div class="pk-metric__value">1/{fmt(1 / b.shinyChance)}</div></div>
            <div class="pk-metric"><div class="pk-metric__label">Encontro</div><div class="pk-metric__value">{(b.walkMs / 1000).toFixed(1)}s</div></div>
            <div class="pk-metric"><div class="pk-metric__label">Offline</div><div class="pk-metric__value">{Math.round(b.offlineCapMs / 3600_000)}h · {Math.round(b.offlineEfficiency * 100)}%</div></div>
          </div>
        </Window>
        <Window title={<>Pesquisa do Professor <span class="muted small">({caught} espécies)</span></>}>
          <table class="table">
            <tbody>
              {app.data.milestones.map((m) => {
                const done = s.milestonesClaimed.includes(m.id);
                return (
                  <tr key={m.id} class={done ? '' : caught >= m.caught ? 'current' : 'locked'}>
                    <td class="num">{done ? '◓' : '·'} {m.caught}</td>
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
