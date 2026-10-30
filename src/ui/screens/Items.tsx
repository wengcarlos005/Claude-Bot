import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { ScreenProps } from '../App';
import { Empty, ItemIcon, Window, fmt, useApp } from '../components';
import { uiIcon } from '../../app/assets';
import { shopAvailable } from '../../core/systems/items';
import { SHOP_CATEGORIES } from '../../core/systems/crafting';
import type { ItemCategory } from '../../data/content/types';
import type { ResolvedItem } from '../../data/registry';

/** Bolsos da Mochila, com o ícone de cada um (PokéSprite). */
const CATS: { id: ItemCategory; name: string; icon: string }[] = [
  { id: 'ball', name: 'Poké Balls', icon: 'ball/poke' },
  { id: 'medicine', name: 'Remédios', icon: 'medicine/potion' },
  { id: 'boost', name: 'Boosts', icon: 'other-item/repel' },
  { id: 'material', name: 'Fragmentos', icon: 'shard/red' },
  { id: 'evolution', name: 'Evolução', icon: 'evo-item/fire-stone' },
  { id: 'held', name: 'Segurados', icon: 'hold-item/leftovers' },
  { id: 'vitamin', name: 'Vitaminas', icon: 'medicine/protein' },
  { id: 'key', name: 'Itens-chave', icon: 'key-item/bicycle' },
];

function ItemCard({ it, qty, children }: { it: ResolvedItem; qty?: number; children?: ComponentChildren }) {
  return (
    <div class="item-card">
      <span class="item-card__icon"><ItemIcon id={it.id} sprite={it.sprite} size={48} /></span>
      <div class="item-card__body">
        <div class="item-card__name"><b>{it.name}</b>{qty !== undefined && <span class="pk-num">×{fmt(qty)}</span>}</div>
        <p class="item-card__desc">{it.description}</p>
      </div>
      {children && <div class="item-card__actions">{children}</div>}
    </div>
  );
}

function Pockets({ cats, value, onChange, counts }: { cats: typeof CATS; value: string; onChange: (id: string) => void; counts: Record<string, number> }) {
  return (
    <nav class="pockets" role="tablist" aria-label="Bolsos">
      <button role="tab" aria-selected={value === 'all'} class="pocket" onClick={() => onChange('all')}>
        <img src={uiIcon('key-item/explorer-kit')} width={36} height={36} alt="" />
        <span>Todos</span>
        <i class="pk-num">{Object.values(counts).reduce((a, b) => a + b, 0)}</i>
      </button>
      {cats.map((c) => (
        <button key={c.id} role="tab" aria-selected={value === c.id} class="pocket" onClick={() => onChange(c.id)}>
          <img src={uiIcon(c.icon)} width={36} height={36} alt="" />
          <span>{c.name}</span>
          <i class="pk-num">{counts[c.id] ?? 0}</i>
        </button>
      ))}
    </nav>
  );
}

export function BagScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const owned = Object.entries(s.inventory).filter(([id, q]) => q > 0 && app.data.items.has(id));
  const counts: Record<string, number> = {};
  for (const [id] of owned) {
    const c = app.data.items.get(id)!.category;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  const cats = CATS.filter((c) => counts[c.id]);
  const [pocket, setPocket] = useState<string>('all');
  const shown = pocket === 'all' ? cats : cats.filter((c) => c.id === pocket);
  const card = (id: string, q: number) => {
    const it = app.data.items.get(id)!;
    return (
      <ItemCard key={id} it={it} qty={q}>
        {it.category === 'boost' && <button class="pk-btn pk-btn--sm pk-btn--primary" onClick={() => app.dispatch({ type: 'UseItem', itemId: id })}>Usar</button>}
        {['medicine', 'evolution', 'held', 'vitamin'].includes(it.category) && (
          <button class="pk-btn pk-btn--sm" onClick={() => go('party')} title="Escolha o Pokémon na Equipe">Usar num Pokémon</button>
        )}
        {it.category === 'material' && <button class="pk-btn pk-btn--sm" onClick={() => go('workshop')}>Oficina</button>}
        {it.category !== 'key' && it.category !== 'material' && (
          <button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => app.dispatch({ type: 'SellItem', itemId: id, qty: 1 })} title="Vende pela metade do preço">
            Vender ₽{fmt(Math.floor((it.price ?? 1000) / 2))}
          </button>
        )}
      </ItemCard>
    );
  };
  return (
    <div class="bag">
      <Pockets cats={cats} value={pocket} onChange={setPocket} counts={counts} />
      <div class="stack">
        {s.boosts.length > 0 && (
          <Window title="Boosts ativos">
            {s.boosts.map((b) => (
              <div key={b.itemId}>{app.data.items.get(b.itemId)?.name}: {Math.ceil(b.remainingMs / 60000)} min restantes</div>
            ))}
          </Window>
        )}
        <Window title="Itens" actions={<button class="pk-btn pk-btn--sm" onClick={() => go('shop')}>Ir à loja</button>}>
          {!owned.length && <Empty>Mochila vazia.</Empty>}
          {shown.map((c) => (
            <section key={c.id} class="shop-sec">
              <h3><img src={uiIcon(c.icon)} width={28} height={28} alt="" />{c.name}</h3>
              <div class="item-grid">{owned.filter(([id]) => app.data.items.get(id)!.category === c.id).map(([id, q]) => card(id, q))}</div>
            </section>
          ))}
        </Window>
      </div>
    </div>
  );
}

export function ShopScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [qty, setQty] = useState(1);
  const items = shopAvailable(app.core.ctx, s);
  const locked = [...app.data.items.values()].filter((i) => i.price !== null && SHOP_CATEGORIES.has(i.category) && (i.shopBadges ?? 0) > s.player.badges.length);
  const nextBadges = [...new Set(locked.map((i) => i.shopBadges ?? 0))].sort((a, b) => a - b)[0];
  return (
    <Window
      title="Produtos"
      actions={
        <div class="row">
          <span class="small muted">Quantidade</span>
          {[1, 10, 50, 100].map((n) => (
            <button key={n} class={`pk-btn pk-btn--sm ${qty === n ? 'pk-btn--gold' : ''}`} onClick={() => setQty(n)}>×{n}</button>
          ))}
        </div>
      }
    >
      {CATS.map((c) => {
        const list = items.filter((i) => i.category === c.id);
        const soon = locked.filter((i) => i.category === c.id).sort((a, b) => (a.shopBadges ?? 0) - (b.shopBadges ?? 0) || (a.price ?? 0) - (b.price ?? 0));
        if (!list.length && !soon.length) return null;
        return (
          <section key={c.id} class="shop-sec">
            <h3><img src={uiIcon(c.icon)} width={28} height={28} alt="" />{c.name}</h3>
            <div class="item-grid">
              {list.map((it) => (
                <ItemCard key={it.id} it={it} qty={s.inventory[it.id] ?? 0}>
                  <span class="item-card__price pk-num">₽{fmt(it.price! * qty)}</span>
                  <button class="pk-btn pk-btn--sm pk-btn--primary" disabled={s.player.money < it.price! * qty} onClick={() => app.dispatch({ type: 'BuyItem', itemId: it.id, qty })}>
                    Comprar ×{qty}
                  </button>
                </ItemCard>
              ))}
              {soon.map((it) => (
                <div key={it.id} class="item-card is-locked">
                  <span class="item-card__icon"><ItemIcon id={it.id} sprite={it.sprite} size={48} /></span>
                  <div class="item-card__body">
                    <div class="item-card__name"><b>{it.name}</b></div>
                    <p class="item-card__desc">{it.description}</p>
                  </div>
                  <div class="item-card__actions"><span class="item-card__lock">Chega com {it.shopBadges} insígnia{it.shopBadges === 1 ? '' : 's'}</span></div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <p class="small muted shop-note">
        {locked.length > 0 && `${locked.length} itens ainda chegam à loja (o próximo com ${nextBadges} insígnia${nextBadges === 1 ? '' : 's'}). `}
        Itens de evolução, seguráveis e vitaminas são fabricados na Oficina.
      </p>
    </Window>
  );
}
