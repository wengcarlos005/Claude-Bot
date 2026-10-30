// Painéis fixos do hub: perfil do treinador, Pokémon em campo, equipe (coluna esquerda) e automações + registro
// (coluna direita). Ficam visíveis em todas as telas, como num painel de controle.
import type { ComponentChildren } from 'preact';
import { CroppedSprite, Grade, TypeBadge, fmt, useApp } from '../components';
import { activeMember, displayName, maxHpOf, speciesOf } from '../../core/pokemon';
import { ivGrade } from '../../core/formulas/stats';
import { expForLevel } from '../../core/formulas/experience';
import { caughtSpeciesCount, trainerLevel, trainerXpForLevel } from '../../core/world';
import { upgradeLevel } from '../../core/bonuses';
import type { CaptureRule, Settings } from '../../core/state/types';

export function Panel(props: { title: ComponentChildren; actions?: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <section class={`panel ${props.class ?? ''}`}>
      <header class="panel__head">
        <h2 class="panel__title">{props.title}</h2>
        {props.actions}
      </header>
      <div class="panel__body">{props.children}</div>
    </section>
  );
}

export function Meter(props: { value: number; max: number; kind: 'hp' | 'xp' | 'trainer'; text?: string }) {
  const r = Math.max(0, Math.min(1, props.value / Math.max(1, props.max)));
  const tone = props.kind !== 'hp' ? props.kind : r > 0.5 ? 'hp-high' : r > 0.2 ? 'hp-mid' : 'hp-low';
  return (
    <div class={`meter meter--${tone}`} role="meter" aria-valuemin={0} aria-valuemax={props.max} aria-valuenow={Math.round(props.value)}>
      <i style={{ width: `${r * 100}%` }} />
      {props.text && <span>{props.text}</span>}
    </div>
  );
}

export function TrainerCard({ go }: { go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  const tl = trainerLevel(s);
  const x0 = trainerXpForLevel(tl);
  const x1 = trainerXpForLevel(tl + 1);
  const lead = activeMember(s) ?? (s.party[0] ? s.pokemon[s.party[0]] : null);
  return (
    <section class="panel trainer-card">
      <div class="trainer-card__top">
        <button class="trainer-card__avatar" onClick={() => go('party')} aria-label="Abrir equipe">
          {lead ? <CroppedSprite id={speciesOf(app.data, lead.species).id} shiny={lead.shiny} box={56} /> : null}
        </button>
        <div class="trainer-card__id">
          <div class="trainer-card__name">{s.player.name || 'Treinador'}</div>
          <div class="trainer-card__lvl">Treinador <b>Nv {tl}</b></div>
        </div>
      </div>
      <Meter value={s.player.trainerXp - x0} max={x1 - x0} kind="trainer" text={`${fmt(s.player.trainerXp)} / ${fmt(x1)} XP`} />
      <div class="stat-grid">
        <button class="stat" onClick={() => go('shop')} title="Pokédólares"><span class="stat__icon is-money">₽</span><span class="stat__value">{fmt(s.player.money)}</span></button>
        <button class="stat" onClick={() => go('research')} title="Pontos de Pesquisa"><span class="stat__icon is-pp">PP</span><span class="stat__value">{fmt(s.player.researchPoints)}</span></button>
        <button class="stat" onClick={() => go('map')} title="Insígnias"><span class="stat__icon is-badge">{s.player.badges.length}</span><span class="stat__value">Insígnias</span></button>
        <button class="stat" onClick={() => go('dex')} title="Espécies capturadas"><span class="stat__icon is-dex">◓</span><span class="stat__value">{caughtSpeciesCount(s)} na Pokédex</span></button>
      </div>
    </section>
  );
}

export function FieldCard({ go }: { go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  const pk = activeMember(s);
  if (!pk) {
    return (
      <Panel title="Em campo">
        <p class="panel__empty">{s.party.length ? 'Equipe desmaiada: recuperando no Centro Pokémon.' : 'Escolha seu inicial para começar.'}</p>
      </Panel>
    );
  }
  const sp = speciesOf(app.data, pk.species);
  const max = maxHpOf(s, app.data, pk);
  const x0 = expForLevel(sp.growthRate, pk.level);
  const x1 = pk.level >= 100 ? x0 + 1 : expForLevel(sp.growthRate, pk.level + 1);
  return (
    <Panel title="Em campo" actions={<button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => go('party')}>Detalhes</button>}>
      <div class="field-card">
        <CroppedSprite id={sp.id} shiny={pk.shiny} box={72} animated />
        <div class="field-card__info">
          <div class="field-card__name">{pk.shiny && <span class="pk-shiny">✦ </span>}{displayName(app.data, pk)} <b>Nv {pk.level}</b></div>
          <div class="field-card__tags">
            {sp.types.map((t) => <TypeBadge key={t} type={t} />)}
            <Grade grade={ivGrade(pk.ivs)} />
          </div>
        </div>
      </div>
      <Meter value={pk.hp} max={max} kind="hp" text={`PS ${Math.ceil(pk.hp)} / ${max}`} />
      <Meter value={pk.xp - x0} max={x1 - x0} kind="xp" text={pk.level >= 100 ? 'Nível máximo' : `XP ${fmt(pk.xp - x0)} / ${fmt(x1 - x0)}`} />
    </Panel>
  );
}

export function TeamList({ go }: { go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  const lead = activeMember(s);
  const makeLead = (uid: string) => app.dispatch({ type: 'SetParty', uids: [uid, ...s.party.filter((u) => u !== uid)] });
  return (
    <Panel title={<>Equipe <span class="panel__count">{s.party.length}/6</span></>} actions={<button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => go('party')}>Gerenciar</button>}>
      <ul class="team">
        {s.party.map((uid) => {
          const pk = s.pokemon[uid];
          const sp = speciesOf(app.data, pk.species);
          const max = maxHpOf(s, app.data, pk);
          return (
            <li key={uid}>
              <button class={`team__row ${lead?.uid === uid ? 'is-active' : ''} ${pk.fainted ? 'is-fainted' : ''}`} onClick={() => makeLead(uid)} title="Colocar em campo">
                <CroppedSprite id={sp.id} shiny={pk.shiny} box={40} />
                <span class="team__name">{pk.shiny && <span class="pk-shiny">✦ </span>}{displayName(app.data, pk)}</span>
                <span class="team__lvl">Nv {pk.level}</span>
                <Meter value={pk.fainted ? 0 : pk.hp} max={max} kind="hp" />
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const RULE_SHORT: Record<CaptureRule['when'], string> = {
  shiny: 'Shiny', legendary: 'Lendários', notCaught: 'Fora da Pokédex', betterIvs: 'IVs melhores', species: 'Espécies escolhidas', any: 'Qualquer Pokémon',
};

function Row(p: { label: string; checked: boolean; onChange: () => void; note?: ComponentChildren; disabled?: boolean }) {
  return (
    <label class={`auto-row ${p.disabled ? 'is-disabled' : ''}`}>
      <span class="auto-row__label">{p.label}{p.note && <span class="auto-row__note">{p.note}</span>}</span>
      <input type="checkbox" class="pk-toggle" checked={p.checked} disabled={p.disabled} onChange={p.onChange} />
    </label>
  );
}

export function AutoPanel({ go }: { go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  const st = s.settings;
  const set = (patch: Partial<Settings>) => app.dispatch({ type: 'SetSettings', settings: patch });
  const toggleRule = (id: string) =>
    app.dispatch({ type: 'SetCaptureRules', rules: s.captureRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) });
  const stock = (id: string) => s.inventory[id] ?? 0;
  const potions = ['potion', 'super-potion', 'hyper-potion', 'max-potion'].reduce((a, id) => a + stock(id), 0);
  return (
    <Panel title="Automações" actions={<button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => go('auto')}>Avançado</button>}>
      <div class="auto-group">
        <div class="auto-group__title">Captura</div>
        {s.captureRules.map((r) => (
          <Row key={r.id} label={RULE_SHORT[r.when]} checked={r.enabled} onChange={() => toggleRule(r.id)} note={app.data.items.get(r.ball)?.name} />
        ))}
      </div>
      <div class="auto-group">
        <div class="auto-group__title">Cura</div>
        <Row label="Usar Poções" checked={st.autoPotion} onChange={() => set({ autoPotion: !st.autoPotion })} note={`${fmt(potions)} na mochila`} />
        <div class={`auto-slider ${st.autoPotion ? '' : 'is-disabled'}`}>
          <span>abaixo de</span>
          <input type="range" class="pk-range" min={10} max={90} step={5} value={Math.round(st.autoPotionThreshold * 100)} disabled={!st.autoPotion}
            onInput={(e) => set({ autoPotionThreshold: Number((e.target as HTMLInputElement).value) / 100 })} aria-label="Usar poção abaixo de" />
          <b>{Math.round(st.autoPotionThreshold * 100)}%</b>
        </div>
        <Row label="Usar Revive ao desmaiar" checked={st.autoRevive} onChange={() => set({ autoRevive: !st.autoRevive })} note={`${fmt(stock('revive'))} na mochila`} />
        <Row label="Recuar ao perder" checked={st.autoRetreat} onChange={() => set({ autoRetreat: !st.autoRetreat })} note="volta à última área segura" />
      </div>
      <div class="auto-group">
        <div class="auto-group__title">Coleção</div>
        <Row label="Transferir duplicatas" checked={st.autoTransfer} onChange={() => set({ autoTransfer: !st.autoTransfer })} note={`protege nota ${st.protectGrade} ou melhor`} />
        <Row label="Evoluir automaticamente" checked={st.autoEvolve} onChange={() => set({ autoEvolve: !st.autoEvolve })} />
        <Row label="Repor bolas" checked={st.autoBuy} disabled={upgradeLevel(s, 'auto-buyer') === 0} onChange={() => set({ autoBuy: !st.autoBuy })}
          note={upgradeLevel(s, 'auto-buyer') ? `${app.data.items.get(st.autoBuyItem)?.name ?? ''} · mín. ${st.autoBuyMinStock}` : 'exige Comprador Automático'} />
      </div>
    </Panel>
  );
}

export function LogPanel() {
  const app = useApp();
  return (
    <Panel title="Registro" class="log-panel">
      <ul class="pk-log">
        {app.log.value.map((l) => (
          <li key={l.id} class={l.tone === 'muted' ? '' : `is-${l.tone}`}>{l.text}</li>
        ))}
        {!app.log.value.length && <li>Os acontecimentos da exploração aparecem aqui.</li>}
      </ul>
    </Panel>
  );
}
