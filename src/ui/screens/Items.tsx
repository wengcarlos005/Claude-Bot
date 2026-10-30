import { useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { Empty, ItemIcon, Window, fmt, useApp } from '../components';
import { shopAvailable } from '../../core/systems/items';
import type { ItemCategory } from '../../data/content/types';

const CATS: { id: ItemCategory; name: string }[] = [
  { id: 'ball', name: 'Poké Balls' },
  { id: 'medicine', name: 'Remédios' },
  { id: 'evolution', name: 'Evolução' },
  { id: 'held', name: 'Segurados' },
  { id: 'vitamin', name: 'Vitaminas' },
  { id: 'boost', name: 'Boosts' },
  { id: 'key', name: 'Itens-chave' },
];

export function BagScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const owned = Object.entries(s.inventory).filter(([, q]) => q > 0);
  return (
    <div class="stack">
      {s.boosts.length > 0 && (
        <Window title="Boosts ativos">
          {s.boosts.map((b) => (
            <div key={b.itemId}>{app.data.items.get(b.itemId)?.name}: {Math.ceil(b.remainingMs / 60000)} min restantes</div>
          ))}
        </Window>
      )}
      <Window title="Mochila" actions={<button class="pk-btn pk-btn--sm" onClick={() => go('shop')}>Ir à loja</button>}>
        {!owned.length && <Empty>Mochila vazia.</Empty>}
        {CATS.map((c) => {
          const items = owned.filter(([id]) => app.data.items.get(id)?.category === c.id);
          if (!items.length) return null;
          return (
            <div key={c.id} style={{ marginBottom: '12px' }}>
              <h3>{c.name}</h3>
              <table class="table">
                <tbody>
                  {items.map(([id, q]) => {
                    const it = app.data.items.get(id)!;
                    return (
                      <tr key={id}>
                        <td style={{ width: '32px' }}><ItemIcon id={id} sprite={it.sprite} /></td>
                        <td><b>{it.name}</b> <span class="muted">×{q}</span><div class="small muted">{it.description}</div></td>
                        <td class="right">
                          {it.category === 'boost' && <button class="pk-btn pk-btn--sm" onClick={() => app.dispatch({ type: 'UseItem', itemId: id })}>Usar</button>}
                          {['medicine', 'evolution', 'held', 'vitamin'].includes(it.category) && <span class="small muted">Use pela tela do Pokémon</span>}
                          {it.category !== 'key' && (
                            <button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => app.dispatch({ type: 'SellItem', itemId: id, qty: 1 })} title="Vende pela metade do preço">
                              Vender (₽{fmt(Math.floor((it.price ?? 1000) / 2))})
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </Window>
    </div>
  );
}

export function ShopScreen(_: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [qty, setQty] = useState(1);
  const items = shopAvailable(app.core.ctx, s);
  const locked = [...app.data.items.values()].filter((i) => i.price !== null && (i.shopBadges ?? 0) > s.player.badges.length);
  return (
    <Window
      title="Poké Mart"
      actions={
        <div class="row">
          <span class="small muted">Quantidade:</span>
          {[1, 10, 50, 100].map((n) => (
            <button key={n} class={`pk-btn pk-btn--sm ${qty === n ? 'pk-btn--gold' : ''}`} onClick={() => setQty(n)}>×{n}</button>
          ))}
        </div>
      }
    >
      {CATS.map((c) => {
        const list = items.filter((i) => i.category === c.id);
        if (!list.length) return null;
        return (
          <div key={c.id} style={{ marginBottom: '12px' }}>
            <h3>{c.name}</h3>
            <table class="table">
              <tbody>
                {list.map((it) => (
                  <tr key={it.id}>
                    <td style={{ width: '32px' }}><ItemIcon id={it.id} sprite={it.sprite} /></td>
                    <td><b>{it.name}</b> <span class="muted small">(tem {s.inventory[it.id] ?? 0})</span><div class="small muted">{it.description}</div></td>
                    <td class="num right">₽{fmt(it.price!)}</td>
                    <td class="right">
                      <button class="pk-btn pk-btn--sm pk-btn--primary" disabled={s.player.money < it.price! * qty} onClick={() => app.dispatch({ type: 'BuyItem', itemId: it.id, qty })}>
                        Comprar ×{qty}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {locked.length > 0 && (
        <p class="small muted">
          Mais {locked.length} itens aparecem com mais insígnias (próximo: {[...new Set(locked.map((i) => i.shopBadges))].sort((a, b) => a! - b!)[0]} insígnias).
        </p>
      )}
    </Window>
  );
}
