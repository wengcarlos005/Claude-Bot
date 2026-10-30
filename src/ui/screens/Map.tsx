import { useMemo, useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { CroppedSprite, TYPE_NAMES, fmt, pct, useApp } from '../components';
import { requirementText } from '../text';
import { Odds } from './Explore';
import { TYPES, type TypeId } from '../../data/types';
import type { ResolvedArea } from '../../data/registry';
import { areaUnlocked, checkRequirement, isFarmArea, regionUnlocked, trainerLevel, winsToClear } from '../../core/world';
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

export function MapScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const currentRegion = app.data.areas.get(s.world.activeAreaId)!.regionId;
  const [regionId, setRegion] = useState(currentRegion);
  const [f, setF] = useState<Filters>(EMPTY);
  const [estimates, setEstimates] = useState<Record<string, HuntEstimate>>({});
  const region = app.data.regionById.get(regionId)!;
  const hour = new Date().getHours();
  const invKey = Object.keys(s.inventory).length;

  // Tabela de encontros (como está disponível agora) de cada área da região.
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
  const visible = areas.filter((a) => {
    if (f.onlyOpen && !areaUnlocked(s, app.data, a)) return false;
    if (!filtering) return true;
    if (!isFarmArea(a)) return false;
    const mons = [...(tables.get(a.id) ?? []).map((m) => m.species), ...(a.legendaries ?? []).map((l) => l.species)];
    return mons.some(speciesMatch);
  });

  const set = (patch: Partial<Filters>) => setF({ ...f, ...patch });
  const analyze = (areaId: string) => setEstimates({ ...estimates, [areaId]: estimateHunt(app.data, s, areaId, 20) });

  return (
    <div class="col">
      <section class="area-head">
        <div>
          <div class="area-head__eyebrow">Mapa</div>
          <h1 class="area-head__name">{region.name}</h1>
          <div class="area-head__meta">
            <span>Treinador Nv {trainerLevel(s)}</span>
            <span>Áreas liberadas {areas.filter((a) => areaUnlocked(s, app.data, a)).length}/{areas.length}</span>
          </div>
        </div>
        <div class="pk-tabs" role="tablist">
          {app.data.regions.map((r) => (
            <button key={r.id} class="pk-tab" role="tab" aria-selected={r.id === regionId} onClick={() => setRegion(r.id)}>
              {r.name}{!regionUnlocked(s, r) && <span class="pk-tab__lock"> · bloqueada</span>}
            </button>
          ))}
        </div>
      </section>

      {!regionUnlocked(s, region) && (
        <p class="pk-route__req is-bad" style={{ margin: 0 }}>Região bloqueada: {region.unlock.map((r) => requirementText(app.data, r)).join(', ')}.</p>
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
        <span class="pk-filter__count">{visible.length} de {areas.length} áreas</span>
      </div>

      <div class="route-list">
        {visible.map((a) => (
          <RouteCard
            key={a.id}
            area={a}
            table={tables.get(a.id) ?? []}
            match={filtering ? speciesMatch : undefined}
            estimate={estimates[a.id]}
            onAnalyze={() => analyze(a.id)}
            onGo={() => app.dispatch({ type: 'SelectArea', areaId: a.id }).ok && go('explore')}
          />
        ))}
        {!visible.length && <p class="pk-muted">Nenhuma área desta região tem Pokémon que combinem com o filtro.</p>}
      </div>
    </div>
  );
}

function RouteCard(props: {
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
  const hasMatch = props.match && [...props.table.map((m) => m.species), ...(a.legendaries ?? []).map((l) => l.species)].some(props.match);

  let status: preact.ComponentChildren;
  if (current) status = <span class="pk-route__req">Você está aqui{isFarmArea(a) && !p?.cleared && winsToClear(a) > 0 ? ` · ${Math.min(p?.wins ?? 0, winsToClear(a))}/${winsToClear(a)} vitórias para concluir` : ''}</span>;
  else if (won) status = <span class="pk-route__req good">{a.gym!.badgeName} conquistada</span>;
  else if (champion) status = <span class="pk-route__req good">Campeão · revanche disponível</span>;
  else if (!open) status = <span class="pk-route__req is-bad">Requer {missing.map((r) => requirementText(app.data, r)).join(' e ')}</span>;
  else if (p?.cleared) status = <span class="pk-route__req good">Concluída</span>;
  else status = <span class="pk-route__req">Liberada{a.trainerLevel > 1 ? ` · Treinador Nv ${a.trainerLevel}` : ''}</span>;

  const team = a.gym ? a.gym.leader.team : a.league ? a.league.members[a.league.members.length - 1].team : [];
  return (
    <article class={`pk-route ${current ? 'is-current' : ''} ${!open && !won ? 'is-locked' : ''} ${hasMatch ? 'is-match' : ''}`}>
      <div class="route-main">
        <div class="pk-route__title">
          {a.name}
          <span class="pk-route__lv">Nv {a.levelRange[0]}–{a.levelRange[1]}</span>
          {a.statMult > 1 && <span class="pk-route__lv">×{a.statMult.toFixed(2)}</span>}
          {challenge && <span class="kind">{a.league ? 'Liga' : 'Ginásio'}</span>}
        </div>
        {status}
        {props.estimate && (
          <span class="pk-route__req pk-num">
            Projeção: {fmt(props.estimate.xpPerHour)} XP/h · ₽ {fmt(props.estimate.moneyPerHour)}/h · vitória {pct(props.estimate.winRate)} · {props.estimate.capturesPerHour.toFixed(1)} capturas/h
          </span>
        )}
      </div>
      <div class="pk-row route-actions">
        {open && isFarmArea(a) && !props.estimate && <button class="pk-btn pk-btn--ghost pk-btn--sm" onClick={props.onAnalyze}>Analisar</button>}
        {open && !current && !won && (
          <button class={`pk-btn pk-btn--sm ${challenge ? 'pk-btn--chassis' : 'pk-btn--primary'}`} onClick={props.onGo}>
            {challenge ? (champion ? 'Revanche' : 'Desafiar') : 'Ir'}
          </button>
        )}
      </div>
      <div class="pk-route__mons">
        {challenge
          ? team.map((m, i) => (
              <div key={i} class="pk-odds" title={app.state.pokedex[m.species]?.seen ? speciesOf(app.data, m.species).name : 'Ainda não visto'}>
                <CroppedSprite id={speciesOf(app.data, m.species).id} box={56} class={(app.state.pokedex[m.species]?.seen ?? 0) > 0 ? '' : 'is-silhouette'} />
                <span class="pk-odds__pct">Nv {Math.round(app.data.regionById.get(a.regionId)!.levelOffset + m.level * app.data.regionById.get(a.regionId)!.levelScale)}</span>
              </div>
            ))
          : props.table.map((m) => <Odds key={m.species} speciesKey={m.species} weight={m.weight} match={props.match?.(m.species)} />)}
        {(a.legendaries ?? []).map((l) => <Odds key={l.species} speciesKey={l.species} label="Lendário" match={props.match?.(l.species)} />)}
        {!challenge && !props.table.length && !(a.legendaries ?? []).length && (
          <span class="pk-route__req">Sem encontros a pé: exige Vara de Pesca ou Surf.</span>
        )}
      </div>
    </article>
  );
}
