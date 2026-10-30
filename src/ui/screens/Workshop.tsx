import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { ItemIcon, Window, fmt, useApp } from '../components';
import { requirementText } from '../text';
import { FRAGMENTS, canAfford, craftableItems, itemCraftCost, nextUpgradeCost, type CraftCost } from '../../core/systems/crafting';
import { upgradeLevel } from '../../core/bonuses';
import { checkRequirement } from '../../core/world';

const TABS = { evolution: 'Evolução', held: 'Seguráveis', vitamin: 'Vitaminas' } as const;

/** Oficina: melhorias de treinador e itens fabricados com fragmentos (que caem nas hunts) + taxa em ₽. */
export function WorkshopScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const upgrades = [...app.data.upgrades.values()].filter((u) => u.currency === 'money');
  const [tab, setTab] = useState<keyof typeof TABS>('evolution');
  const items = craftableItems(app.core.ctx).filter((i) => i.category === tab);

  const Cost = ({ cost }: { cost: CraftCost }) => (
    <span class="craft-cost">
      {Object.entries(cost.mats).map(([id, n]) => {
        const have = s.inventory[id] ?? 0;
        return (
          <span key={id} class={`craft-mat ${have >= (n ?? 0) ? '' : 'is-short'}`} title={`${app.data.items.get(id)?.name}: ${fmt(have)}/${fmt(n ?? 0)}`}>
            <ItemIcon id={id} size={22} />
            {fmt(n ?? 0)}
          </span>
        );
      })}
      <span class={`craft-mat craft-mat--money ${s.player.money >= cost.money ? '' : 'is-short'}`}>₽{fmt(cost.money)}</span>
    </span>
  );

  return (
    <div class="stack">
      <section class="frag-bar" aria-label="Fragmentos">
        {FRAGMENTS.map((id) => {
          const it = app.data.items.get(id)!;
          return (
            <div key={id} class={`frag frag--${id}`} title={it.description}>
              <ItemIcon id={id} size={36} />
              <div>
                <b class="pk-num">{fmt(s.inventory[id] ?? 0)}</b>
                <span>{it.name.replace('Fragmento ', '')}</span>
              </div>
            </div>
          );
        })}
        <p class="frag-bar__hint small muted">Fragmentos caem de selvagens, treinadores, desafios, ginásios, shinies e lendários. Regiões mais avançadas rendem mais.</p>
      </section>

      <div class="cols">
        <Window title="Melhorias de treinador">
          <ul class="craft-list">
            {upgrades.map((u) => {
              const lvl = upgradeLevel(s, u.id);
              const cost = nextUpgradeCost(app.core.ctx, s, u.id);
              const reqOk = !u.requires || u.requires.every((r) => checkRequirement(s, r));
              return (
                <li key={u.id} class={`craft-row ${reqOk ? '' : 'locked'}`}>
                  <div class="craft-row__info">
                    <b>{u.name}</b> <span class="muted small">Nv {lvl}/{u.maxLevel}</span>
                    <div class="small muted">{u.description}{!reqOk && ` Requer: ${u.requires!.map((r) => requirementText(app.data, r)).join(', ')}.`}</div>
                    {cost && <Cost cost={cost} />}
                  </div>
                  {cost === null ? (
                    <span class="good small">Máximo</span>
                  ) : (
                    <button class="pk-btn pk-btn--sm pk-btn--primary" disabled={!reqOk || !canAfford(s, cost)} onClick={() => app.dispatch({ type: 'BuyUpgrade', upgradeId: u.id })}>
                      Fabricar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Window>

        <div class="stack">
          <Window title="Itens">
            <div class="pk-seg craft-tabs" role="tablist">
              {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
                <button key={k} role="tab" aria-selected={tab === k} class={`pk-btn pk-btn--sm ${tab === k ? 'pk-btn--primary' : 'pk-btn--ghost'}`} onClick={() => setTab(k)}>{TABS[k]}</button>
              ))}
            </div>
            <ul class="craft-list craft-list--grid">
              {items.map((it) => {
                const cost = itemCraftCost(it)!;
                return (
                  <li key={it.id} class="craft-row">
                    <ItemIcon id={it.id} sprite={it.sprite} size={32} />
                    <div class="craft-row__info">
                      <b>{it.name}</b> <span class="muted small">× {fmt(s.inventory[it.id] ?? 0)}</span>
                      <Cost cost={cost} />
                    </div>
                    <button class="pk-btn pk-btn--sm pk-btn--primary" disabled={!canAfford(s, cost)} onClick={() => app.dispatch({ type: 'Craft', itemId: it.id, qty: 1 })}>
                      Fabricar
                    </button>
                  </li>
                );
              })}
            </ul>
          </Window>
          <Window title="Mercado de jogadores">
            <p class="small muted">Em breve: compre e venda melhorias e itens fabricados por outros treinadores.</p>
          </Window>
        </div>
      </div>
    </div>
  );
}
