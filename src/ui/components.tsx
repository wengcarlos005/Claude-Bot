import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { GameApp } from '../app/GameApp';
import { itemSprite, pokemonSprite, staticFallback } from '../app/assets';
import type { TypeId } from '../data/types';
import type { OwnedPokemon } from '../core/state/types';

export const AppContext = createContext<GameApp>(null as unknown as GameApp);
export const useApp = () => useContext(AppContext);

export const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export function duration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${s % 60}s`;
  return `${s}s`;
}

export const TYPE_NAMES: Record<TypeId, string> = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo', fighting: 'Lutador',
  poison: 'Veneno', ground: 'Terra', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma',
  dragon: 'Dragão', dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
};

export function TypeBadge({ type }: { type: TypeId }) {
  return <span class={`type type-${type}`}>{TYPE_NAMES[type]}</span>;
}

export function Sprite(props: { id: number; shiny?: boolean; back?: boolean; animated?: boolean; size?: number; class?: string; title?: string }) {
  const [failed, setFailed] = useState(false);
  const view = props.back ? 'back' : 'front';
  const src = failed ? staticFallback(props.id, view, props.shiny) : pokemonSprite(props.id, { view, shiny: props.shiny, animated: props.animated });
  return (
    <img
      class={`sprite ${props.class ?? ''}`}
      src={src}
      width={props.size ?? 96}
      height={props.size ?? 96}
      alt={props.title ?? ''}
      title={props.title}
      loading="lazy"
      onError={(e) => {
        if (!failed) setFailed(true);
        else (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
      }}
    />
  );
}

export function ItemIcon({ id, sprite, size = 24 }: { id: string; sprite?: string; size?: number }) {
  return (
    <img
      class="item-icon"
      src={itemSprite(id, sprite)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
    />
  );
}

export function Bar({ value, max, kind = 'hp', label }: { value: number; max: number; kind?: 'hp' | 'xp' | 'progress'; label?: string }) {
  const r = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const color = kind !== 'hp' ? '' : r > 0.5 ? 'hp-high' : r > 0.2 ? 'hp-mid' : 'hp-low';
  return (
    <div class={`bar bar-${kind}`} role="progressbar" aria-valuenow={Math.round(r * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div class={`bar-fill ${color}`} style={{ width: `${r * 100}%` }} />
      {label && <span class="bar-label">{label}</span>}
    </div>
  );
}

export function Window({ title, children, actions, class: cls }: { title?: ComponentChildren; children: ComponentChildren; actions?: ComponentChildren; class?: string }) {
  return (
    <section class={`window ${cls ?? ''}`}>
      {(title || actions) && (
        <header class="window-head">
          <h2>{title}</h2>
          {actions && <div class="window-actions">{actions}</div>}
        </header>
      )}
      <div class="window-body">{children}</div>
    </section>
  );
}

export function Modal({ title, onClose, children, wide }: { title: ComponentChildren; onClose?: () => void; children: ComponentChildren; wide?: boolean }) {
  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div class={`modal window ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <header class="window-head">
          <h2>{title}</h2>
          {onClose && (
            <button class="btn btn-ghost" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          )}
        </header>
        <div class="window-body">{children}</div>
      </div>
    </div>
  );
}

export function GenderIcon({ g }: { g: OwnedPokemon['gender'] }) {
  if (!g) return null;
  return <span class={g === 'm' ? 'male' : 'female'}>{g === 'm' ? '♂' : '♀'}</span>;
}

export function Grade({ grade }: { grade: string }) {
  return <span class={`grade grade-${grade}`} title="Qualidade (soma de IVs)">{grade}</span>;
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="empty">{children}</p>;
}
