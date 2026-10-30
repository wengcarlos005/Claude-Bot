import { useMemo, useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { CroppedSprite, ItemIcon, TYPE_NAMES, fmt, pct, useApp } from '../components';
import { requirementText } from '../text';
import { TYPES, type TypeId } from '../../data/types';
import type { ResolvedArea } from '../../data/registry';
import type { Requirement } from '../../data/content/types';
import { areaUnlocked, checkRequirement, isFarmArea, regionUnlocked } from '../../core/world';
import { encounterTable } from '../../core/systems/exploration';
import { typeEffectiveness } from '../../core/formulas/damage';
import { estimateHunt, type HuntEstimate } from '../../core/analyzer';
import { speciesOf } from '../../core/pokemon';

interface Filters {
  q: string;
  type: TypeId | '';
  weakTo: TypeId | '';
  notCaught: boolean;
  onlyOpen: boolean;
  legendary: boolean;
}
const EMPTY: Filters = { q: '', type: '', weakTo: '', notCaught: false, onlyOpen: false, legendary: false };

interface Chapter {
  id: string;
  title: string;
  sub: string;
  areas: ResolvedArea[];
  done: boolean;
}

/** Capítulos: cada ginásio/Liga fecha um capítulo com as rotas que vêm antes dele; o pós-jogo é agrupado à parte. */
function chaptersOf(areas: ResolvedArea[], badges: string[], champions: string[]): Chapter[] {
  const out: Chapter[] = [];
  let cur: ResolvedArea[] = [];
  let n = 1;
  const post = new Map<string, ResolvedArea[]>();
  for (const a of areas) {
    const isPost = a.unlock.some((r) => r.type === 'championOf' && r.regionId === a.regionId);
    if (isPost) {
      const key = a.group ?? 'Pós-jogo';
      post.set(key, [...(post.get(key) ?? []), a]);
      continue;
    }
    cur.push(a);
    if (a.gym || a.league) {
      out.push({
        id: a.id,
        title: a.gym ? a.gym.badgeName : 'Liga Pokémon',
        sub: `Capítulo ${n++}`,
        areas: cur,
        done: a.gym ? badges.includes(a.gym.badgeId) : champions.includes(a.regionId),
      });
      cur = [];
    }
  }
  if (cur.length) out.push({ id: 'rest', title: 'Outras áreas', sub: `Capítulo ${n}`, areas: cur, done: false });
  for (const [title, list] of post) out.push({ id: `post-${title}`, title, sub: 'Pós-jogo', areas: list, done: false });
  return out;
}

export function MapList({ go, regionId }: ScreenProps & { regionId: string }) {
  const app = useApp();
  const s = app.state;
  const [f, setF] = useState<Filters>(EMPTY);
  const [estimates, setEstimates] = useState<Record<string, HuntEstimate>>({});
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const region = app.data.regionById.get(regionId)!;
  const hour = new Date().getHours();
  const invKey = Object.keys(s.inventory).length;

  const tables = useMemo(() => {
    const out = new Map<string, { species: string; weight: number }[]>();
    for (const def of region.areas) {
      const a = app.data.areas.get(def.id)!;
      const merged = new Map<string, number>();
      for (const x of encounterTable(s, a, Date.now())) merged.set(x.slot.species, (merged.get(x.slot.species) ?? 0) + x.weight);
      out.set(a.id, [...merged.entries()].map(([species, weight]) => ({ species, weight })).sort((x, y) => y.weight - x.weight));
    }
    return out;
  }, [regionId, hour, invKey]);

  const filtering = f.q.trim() !== '' || f.type !== '' || f.weakTo !== '' || f.notCaught || f.legendary;
  const speciesMatch = (key: string): boolean => {
    const sp = speciesOf(app.data, key);
    const seen = (s.pokedex[key]?.seen ?? 0) > 0;
    if (f.q.trim() && !(seen && sp.name.toLowerCase().includes(f.q.trim().toLowerCase()))) return false;
    if (f.type && !sp.types.includes(f.type)) return false;
    if (f.weakTo && typeEffectiveness(app.data.typeChart, f.weakTo, sp.types) <= 1) return false;
    if (f.notCaught && (s.pokedex[key]?.caught ?? 0) > 0) return false;
    if (f.legendary && !(sp.tags.includes('legendary') || sp.tags.includes('mythical'))) return false;
    return true;
  };

  const areas = region.areas.map((d) => app.data.areas.get(d.id)!);
  const visible = (a: ResolvedArea) => {
    if (f.onlyOpen && !areaUnlocked(s, app.data, a)) return false;
    if (!filtering) return true;
    if (!isFarmArea(a)) return false;
    return [...(tables.get(a.id) ?? []).map((m) => m.species), ...(a.legendaries ?? []).map((l) => l.species)].some(speciesMatch);
  };
  const chapters = chaptersOf(areas, s.player.badges, s.player.champions);
  const visibleCount = areas.filter(visible).length;
  // Abertos por padrão: o capítulo atual e o próximo ainda não concluído; com filtro, todos que têm resultado.
  const currentChapter = chapters.findIndex((c) => c.areas.some((a) => a.id === s.world.activeAreaId));
  const firstOpen = chapters.findIndex((c) => !c.done);
  const isOpen = (c: Chapter, i: number) =>
    toggled[c.id] ?? (filtering || f.onlyOpen ? true : i === currentChapter || i === firstOpen);

  const set = (patch: Partial<Filters>) => setF({ ...f, ...patch });

  return (
    <div class="map">
      {!regionUnlocked(s, region) && (
        <div class="map__notice"><span class="lock" />Região bloqueada · {region.unlock.map((r) => requirementText(app.data, r)).join(', ')}</div>
      )}

      <div class="pk-filter" role="search">
        <input class="pk-input" type="search" id="map-q" placeholder="Buscar Pokémon visto…" value={f.q} onInput={(e) => set({ q: (e.target as HTMLInputElement).value })} aria-label="Buscar Pokémon" />
        <select class="pk-select" id="map-type" value={f.type} onChange={(e) => set({ type: (e.target as HTMLSelectElement).value as TypeId | '' })} aria-label="Tipo do Pokémon">
          <option value="">Qualquer tipo</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_NAMES[t]}</option>)}
        </select>
        <select class="pk-select" id="map-weak" value={f.weakTo} onChange={(e) => set({ weakTo: (e.target as HTMLSelectElement).value as TypeId | '' })} aria-label="Fraco contra">
          <option value="">Fraco contra…</option>
          {TYPES.map((t) => <option key={t} value={t}>Fraco contra {TYPE_NAMES[t]}</option>)}
        </select>
        <button class="pk-chip-btn" aria-pressed={f.notCaught} onClick={() => set({ notCaught: !f.notCaught })}>Não capturados</button>
        <button class="pk-chip-btn" aria-pressed={f.onlyOpen} onClick={() => set({ onlyOpen: !f.onlyOpen })}>Só liberadas</button>
        <button class="pk-chip-btn" aria-pressed={f.legendary} onClick={() => set({ legendary: !f.legendary })}>Lendários</button>
        {(filtering || f.onlyOpen) && <button class="pk-btn pk-btn--ghost pk-btn--sm" onClick={() => setF(EMPTY)}>Limpar</button>}
        <span class="pk-filter__count">{visibleCount} de {areas.length} áreas</span>
      </div>

      {chapters.map((c, i) => {
        const list = c.areas.filter(visible);
        if (!list.length) return null;
        const open = isOpen(c, i);
        const unlocked = c.areas.filter((a) => areaUnlocked(s, app.data, a)).length;
        return (
          <section key={c.id} class={`chapter ${c.done ? 'is-done' : ''}`}>
            <button class="chapter__head" aria-expanded={open} onClick={() => setToggled({ ...toggled, [c.id]: !open })}>
              <span class="chapter__chev" aria-hidden="true" />
              <span class="chapter__sub">{c.sub}</span>
              <span class="chapter__title">{c.title}</span>
              {c.done && <span class="tag tag--gold">Concluído</span>}
              <span class="chapter__count pk-num">{unlocked}/{c.areas.length}</span>
            </button>
            {open && (
              <ul class="routes">
                {list.map((a) => (
                  <RouteRow
                    key={a.id}
                    area={a}
                    table={tables.get(a.id) ?? []}
                    match={filtering ? speciesMatch : undefined}
                    estimate={estimates[a.id]}
                    onAnalyze={() => setEstimates({ ...estimates, [a.id]: estimateHunt(app.data, s, a.id, 20) })}
                    onGo={() => app.dispatch({ type: 'SelectArea', areaId: a.id }).ok && go('explore')}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {!visibleCount && <p class="panel__empty">Nenhuma área desta região tem Pokémon que combinem com o filtro.</p>}
    </div>
  );
}

/** Requisito pendente em forma compacta (cadeado + o que falta). */
function Missing({ r }: { r: Requirement }) {
  const app = useApp();
  if (r.type === 'trainerLevel') return <span class="need" title={`Exige Nível de Treinador ${r.min}`}><span class="lock" />Nv {r.min}</span>;
  if (r.type === 'keyItem') {
    return <span class="need" title={`Exige ${requirementText(app.data, r)}`}><span class="lock" /><ItemIcon id={r.itemId} size={20} /></span>;
  }
  if (r.type === 'badge') return <span class="need" title={`Exige ${requirementText(app.data, r)}`}><span class="lock" />{requirementText(app.data, r).replace('Insígnia ', '')}</span>;
  if (r.type === 'championOf') return <span class="need" title={requirementText(app.data, r)}><span class="lock" />Campeão</span>;
  return <span class="need" title={requirementText(app.data, r)}><span class="lock" />{requirementText(app.data, r)}</span>;
}

function RouteRow(props: {
  area: ResolvedArea;
  table: { species: string; weight: number }[];
  match?: (k: string) => boolean;
  estimate?: HuntEstimate;
  onAnalyze: () => void;
  onGo: () => void;
}) {
  const app = useApp();
  const s = app.state;
  const a = props.area;
  const open = areaUnlocked(s, app.data, a);
  const current = s.world.activeAreaId === a.id;
  const p = s.world.areas[a.id];
  const won = a.gym && s.player.badges.includes(a.gym.badgeId);
  const champion = a.league && s.player.champions.includes(a.regionId);
  const missing = a.unlock.filter((r) => !checkRequirement(s, r));
  const challenge = !!(a.gym || a.league);
  const region = app.data.regionById.get(a.regionId)!;
  const mons = challenge
    ? (a.gym ? a.gym.leader.team : a.league!.members[a.league!.members.length - 1].team).map((m) => ({ species: m.species, label: `Nv ${Math.round(region.levelOffset + m.level * region.levelScale)}` }))
    : [
        ...props.table.map((m) => ({ species: m.species, label: m.weight < 0.01 ? '<1%' : pct(m.weight) })),
        ...(a.legendaries ?? []).map((l) => ({ species: l.species, label: 'Lend.' })),
      ];
  const caught = mons.filter((m) => (s.pokedex[m.species]?.caught ?? 0) > 0).length;
  const state = current ? 'is-current' : won || champion || p?.cleared ? 'is-done' : open ? 'is-open' : 'is-locked';
  return (
    <li class={`route ${state} ${props.match && mons.some((m) => props.match!(m.species)) ? 'is-match' : ''}`}>
      <span class="route__dot" aria-hidden="true" />
      <div class="route__name">
        <span class="route__title">{a.name}{challenge && <span class="route__kind">{a.league ? 'Liga' : 'Ginásio'}</span>}</span>
        <span class="route__meta pk-num">
          Nv {a.levelRange[0]}–{a.levelRange[1]}
          {!challenge && mons.length > 0 && <> · {caught}/{mons.length} capturados</>}
          {current && <> · <b>você está aqui</b></>}
        </span>
      </div>
      <div class="route__mons">
        {mons.slice(0, 12).map((m) => {
          const seen = (s.pokedex[m.species]?.seen ?? 0) > 0;
          const got = (s.pokedex[m.species]?.caught ?? 0) > 0;
          return (
            <span key={m.species} class={`mon ${props.match?.(m.species) ? 'is-match' : ''} ${got ? 'is-caught' : ''}`} title={`${seen ? speciesOf(app.data, m.species).name : 'Ainda não visto'} · ${m.label}`}>
              <CroppedSprite id={speciesOf(app.data, m.species).id} box={36} class={seen ? '' : 'is-silhouette'} />
              <span class="mon__pct">{m.label}</span>
            </span>
          );
        })}
        {mons.length > 12 && <span class="route__more">+{mons.length - 12}</span>}
        {!mons.length && <span class="route__meta">Só pesca ou Surf</span>}
      </div>
      <div class="route__side">
        {props.estimate && (
          <span class="route__est pk-num" title="Projeção do Hunt Analyzer">{fmt(props.estimate.xpPerHour)} XP/h · ₽ {fmt(props.estimate.moneyPerHour)}/h · {pct(props.estimate.winRate)}</span>
        )}
        {!open && !won && missing.map((r, i) => <Missing key={i} r={r} />)}
        {open && isFarmArea(a) && !props.estimate && !current && <button class="pk-btn pk-btn--ghost pk-btn--sm" onClick={props.onAnalyze}>Analisar</button>}
        {open && !current && !won && (
          <button class={`pk-btn pk-btn--sm ${challenge ? 'pk-btn--chassis' : 'pk-btn--primary'}`} onClick={props.onGo}>
            {challenge ? (champion ? 'Revanche' : 'Desafiar') : 'Ir'}
          </button>
        )}
        {won && <span class="tag tag--gold">Insígnia</span>}
      </div>
    </li>
  );
}
