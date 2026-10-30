// Mapa ilustrado da região: localidades numa trilha sobre a ilha, painel de detalhes à direita e progresso embaixo.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { hasWorld, renderWorld, worldPos } from '../../app/pret';
import type { ScreenProps } from '../App';
import { CroppedSprite, fmt, pct, useApp } from '../components';
import { badgeSprite } from '../../app/assets';
import type { ResolvedArea } from '../../data/registry';
import type { Requirement } from '../../data/content/types';
import { areaUnlocked, checkRequirement, isFarmArea, regionUnlocked, winsToClear } from '../../core/world';
import { encounterTable } from '../../core/systems/exploration';
import { estimateHunt, type HuntEstimate } from '../../core/analyzer';
import { speciesOf } from '../../core/pokemon';
import { hashString } from '../art/pixel';
import { worldMap, type NodeKind } from '../art/world';
import { fieldArt } from '../field/art';
import { requirementText } from '../text';
import { MapList } from './MapList';

interface Place {
  key: string;
  name: string;
  kind: NodeKind;
  areas: ResolvedArea[];
  post: boolean;
}

/** Agrupa subáreas (andares, salas, zonas) numa localidade só do mapa. */
function placesOf(areas: ResolvedArea[]): Place[] {
  const out: Place[] = [];
  const byKey = new Map<string, Place>();
  for (const a of areas) {
    const key = a.id.includes('--') ? a.id.split('--')[0] : a.id.includes('-x-') ? `x:${a.locations[0].split('/')[0]}` : a.id;
    let pl = byKey.get(key);
    if (!pl) {
      const kind: NodeKind = a.gym || a.league ? 'town' : a.kind === 'cave' ? 'cave' : a.kind === 'forest' ? 'forest' : a.kind === 'water' ? 'water'
        : a.kind === 'building' ? 'building' : 'route';
      const name = a.gym ? a.name.replace(/^Ginásio d[eo] /, '') : a.league ? 'Liga Pokémon' : a.name.split(' · ')[0];
      pl = { key, name, kind, areas: [], post: a.unlock.some((r) => r.type === 'championOf' && r.regionId === a.regionId) };
      byKey.set(key, pl);
      out.push(pl);
    }
    pl.areas.push(a);
  }
  return out;
}

export function MapScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const current = app.data.areas.get(s.world.activeAreaId)!;
  const [regionId, setRegion] = useState(current.regionId);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const region = app.data.regionById.get(regionId)!;
  const areas = useMemo(() => region.areas.map((d) => app.data.areas.get(d.id)!), [regionId]);
  const places = useMemo(() => placesOf(areas), [regionId]);
  const world = useMemo(() => worldMap(hashString(regionId), places.map((p) => ({ key: p.key, kind: p.kind }))), [regionId]);
  // Kanto e Hoenn: o mundo real do jogo (mapas montados pelas conexões); Johto e Sinnoh: mapa ilustrado.
  const [real, setReal] = useState<{ region: string; url: string; w: number; h: number } | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!hasWorld(regionId)) return;
    let alive = true;
    setProgress(null);
    renderWorld(regionId, (d, t) => alive && setProgress([d, t])).then((r) => alive && setReal({ region: regionId, ...r })).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [regionId]);
  const realReady = real && real.region === regionId ? real : null;
  const posOf = (pl: Place): { x: number; y: number } | null => {
    if (!realReady) return world.pos.get(pl.key) ?? null;
    for (const a of pl.areas) {
      const p = worldPos(a.id);
      if (p) return { x: (p[0] / realReady.w) * 100, y: (p[1] / realReady.h) * 100 };
    }
    return null;
  };
  const unplaced = realReady ? places.filter((pl) => !posOf(pl)) : [];
  const currentPlace = places.find((p) => p.areas.some((a) => a.id === current.id));
  const [selKey, setSel] = useState<string | null>(null);
  const firstOpen = [...places].reverse().find((p) => p.areas.some((a) => areaUnlocked(s, app.data, a)));
  const sel = places.find((p) => p.key === selKey) ?? currentPlace ?? firstOpen ?? places[0];
  const unlocked = areas.filter((a) => areaUnlocked(s, app.data, a)).length;
  const gymAreas = areas.filter((a) => a.gym);
  const gymBase = app.data.regions.slice(0, app.data.regions.indexOf(region)).reduce((n, r) => n + r.areas.filter((a) => app.data.areas.get(a.id)!.gym).length, 0);

  return (
    <div class="atlas">
      <div class="region-tabs" role="tablist">
        {app.data.regions.map((r) => {
          const ra = r.areas.map((d) => app.data.areas.get(d.id)!);
          const open = regionUnlocked(s, r);
          return (
            <button key={r.id} role="tab" aria-selected={r.id === regionId} class={`region-tab ${open ? '' : 'is-locked'}`} onClick={() => { setRegion(r.id); setSel(null); }}>
              <RegionThumb id={r.id} count={placesOf(ra).length} />
              <b>{r.name}</b>
              <span class="pk-num">{ra.filter((a) => areaUnlocked(s, app.data, a)).length}/{ra.length} áreas</span>
              {!open && <span class="region-tab__lock" aria-label="bloqueada" />}
            </button>
          );
        })}
      </div>

      {mode === 'list' ? (
        <MapList go={go} regionId={regionId} />
      ) : (
        <div class="atlas__main">
          <div class={`world ${realReady ? 'is-real' : ''}`} aria-label={`Mapa de ${region.name}`}>
            {hasWorld(regionId) && !realReady && (
              <div class="mapscene__loading world__loading"><span class="spinner" />Montando o mapa de {region.name}{progress ? ` · ${progress[0]}/${progress[1]}` : '…'}</div>
            )}
            <div class="world__canvas" style={{ backgroundImage: `url("${realReady ? realReady.url : world.uri}")`, aspectRatio: realReady ? `${realReady.w} / ${realReady.h}` : `${world.w} / ${world.h}` }}>
              {places.map((pl) => {
                const pos = posOf(pl);
                if (!pos) return null;
                const open = pl.areas.some((a) => areaUnlocked(s, app.data, a));
                const here = pl === currentPlace;
                const done = pl.areas.every((a) => (a.gym ? s.player.badges.includes(a.gym.badgeId) : a.league ? s.player.champions.includes(a.regionId) : s.world.areas[a.id]?.cleared));
                const big = pl.kind === 'town';
                const label = big || here || pl === sel;
                return (
                  <button key={pl.key} class={`pin ${big ? 'pin--town' : ''} ${open ? 'is-open' : 'is-locked'} ${here ? 'is-here' : ''} ${done ? 'is-done' : ''} ${pl === sel ? 'is-sel' : ''}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={() => setSel(pl.key)} title={pl.name}>
                    {here && <span class="pin__marker" aria-hidden="true" />}
                    <span class="pin__dot" />
                    {label && (
                      <span class="pin__label">
                        <b>{pl.name}</b>
                        <span class="pk-num">Nv {Math.min(...pl.areas.map((a) => a.levelRange[0]))}–{Math.max(...pl.areas.map((a) => a.levelRange[1]))}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {unplaced.length > 0 && (
              <div class="world__others">
                <span>Outras localidades</span>
                {unplaced.map((pl) => (
                  <button key={pl.key} class={`sub ${pl === sel ? 'is-sel' : ''} ${pl.areas.some((a) => areaUnlocked(s, app.data, a)) ? '' : 'is-locked'}`} aria-selected={pl === sel} onClick={() => setSel(pl.key)}>{pl.name}</button>
                ))}
              </div>
            )}
          </div>
          {sel && <PlacePanel key={sel.key} place={sel} go={go} />}
        </div>
      )}

      <div class="atlas__progress panel">
        <span class="atlas__ball" aria-hidden="true" />
        <div class="atlas__text">
          <b>Progresso de {region.name}</b>
          <span class="pk-num">{unlocked}/{areas.length} áreas liberadas</span>
          <span class="atlas__bar"><i style={{ width: `${(unlocked / Math.max(1, areas.length)) * 100}%` }} /></span>
        </div>
        <div class="atlas__badges">
          {gymAreas.map((a, i) => {
            const has = s.player.badges.includes(a.gym!.badgeId);
            return (
              <span key={a.id} class={`badge-slot ${has ? 'is-on' : ''}`} title={`${a.gym!.badgeName}${has ? '' : ' (bloqueada)'}`}>
                {has ? <img src={badgeSprite(gymBase + i + 1)} width={28} height={28} alt="" /> : <span class="lock" />}
              </span>
            );
          })}
        </div>
        <button class="pk-btn" onClick={() => setMode(mode === 'map' ? 'list' : 'map')}>{mode === 'map' ? 'Ver lista e filtros' : 'Ver mapa'}</button>
      </div>
    </div>
  );
}

function RegionThumb({ id, count }: { id: string; count: number }) {
  const uri = useMemo(() => worldMap(hashString(id), Array.from({ length: Math.min(count, 14) }, (_, i) => ({ key: String(i), kind: (['route', 'forest', 'cave', 'town'] as NodeKind[])[i % 4] }))).uri, [id]);
  return <span class="region-tab__thumb" style={{ backgroundImage: `url("${uri}")` }} />;
}

function PlacePanel({ place, go }: { place: Place; go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  const [areaId, setArea] = useState(place.areas.find((a) => a.id === s.world.activeAreaId)?.id ?? place.areas[0].id);
  const [tab, setTab] = useState<'mons' | 'info'>('mons');
  const [est, setEst] = useState<HuntEstimate | null>(null);
  const a = app.data.areas.get(areaId)!;
  const region = app.data.regionById.get(a.regionId)!;
  const open = areaUnlocked(s, app.data, a);
  const here = s.world.activeAreaId === a.id;
  const missing = a.unlock.filter((r) => !checkRequirement(s, r));
  const won = a.gym && s.player.badges.includes(a.gym.badgeId);
  const champion = a.league && s.player.champions.includes(a.regionId);
  const art = useMemo(() => fieldArt(a), [a.id]);
  const hour = new Date().getHours();
  const table = useMemo(() => {
    const merged = new Map<string, number>();
    for (const x of encounterTable(s, a, Date.now())) merged.set(x.slot.species, (merged.get(x.slot.species) ?? 0) + x.weight);
    return [...merged.entries()].sort((x, y) => y[1] - x[1]);
  }, [a.id, hour, Object.keys(s.inventory).length]);
  const common = table.filter(([, w]) => w >= 0.02);
  const rare = table.filter(([, w]) => w < 0.02);
  const challengeTeam = a.gym ? a.gym.leader.team : a.league ? a.league.members[a.league.members.length - 1].team : null;

  return (
    <aside class="place panel">
      <div class="place__banner" style={{ backgroundImage: `url("${art.ground}")` }}>
        <div class="place__title">
          <h2>{a.name}</h2>
          <span>{region.name} · {a.gym ? 'Ginásio' : a.league ? 'Liga' : kindName(a.kind)}</span>
        </div>
        <div class="place__chips">
          <span class="chip chip--lvl pk-num">Nv {a.levelRange[0]}–{a.levelRange[1]}</span>
          {won || champion ? <span class="chip chip--gold">{won ? 'Insígnia conquistada' : 'Campeão'}</span>
            : open ? <span class="chip chip--ok">{here ? 'Você está aqui' : 'Disponível'}</span>
            : missing.map((r, i) => <Need key={i} r={r} />)}
        </div>
      </div>
      {place.areas.length > 1 && (
        <div class="place__subs" role="tablist" aria-label="Subáreas">
          {place.areas.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === a.id} class={`sub ${areaUnlocked(s, app.data, x) ? '' : 'is-locked'}`} onClick={() => { setArea(x.id); setEst(null); }}>
              {x.name.includes(' · ') ? x.name.split(' · ').slice(1).join(' · ') : x.name}
            </button>
          ))}
        </div>
      )}
      <div class="place__tabs pk-tabs" role="tablist">
        <button class="pk-tab" role="tab" aria-selected={tab === 'mons'} onClick={() => setTab('mons')}>Pokémon</button>
        <button class="pk-tab" role="tab" aria-selected={tab === 'info'} onClick={() => setTab('info')}>Detalhes</button>
      </div>
      <div class="place__body">
        {tab === 'mons' ? (
          challengeTeam ? (
            <>
              <h3 class="place__h">Time do {a.gym ? 'líder' : 'Campeão'}</h3>
              <div class="dex-grid">
                {challengeTeam.map((m, i) => <Mon key={i} k={m.species} label={`Nv ${Math.round(region.levelOffset + m.level * region.levelScale)}`} />)}
              </div>
            </>
          ) : (
            <>
              <h3 class="place__h">Pokémon encontrados <span>chance por encontro</span></h3>
              {common.length ? <div class="dex-grid">{common.map(([k, w]) => <Mon key={k} k={k} label={pct(w)} />)}</div>
                : <p class="panel__empty">Sem encontros a pé agora: exige Vara de Pesca, Surf ou outro horário.</p>}
              {(rare.length > 0 || (a.legendaries ?? []).length > 0) && (
                <>
                  <h3 class="place__h">Raros (baixa chance)</h3>
                  <div class="dex-grid is-rare">
                    {rare.map(([k, w]) => <Mon key={k} k={k} label={w < 0.01 ? '<1%' : pct(w)} />)}
                    {(a.legendaries ?? []).map((l) => <Mon key={l.species} k={l.species} label="Lendário" />)}
                  </div>
                </>
              )}
            </>
          )
        ) : (
          <dl class="place__facts">
            <dt>Treinadores</dt><dd class="pk-num">{a.routeTrainers.length}</dd>
            <dt>Concluir a área</dt><dd class="pk-num">{winsToClear(a) ? `${Math.min(s.world.areas[a.id]?.wins ?? 0, winsToClear(a))}/${winsToClear(a)} vitórias` : '—'}</dd>
            <dt>Tier</dt><dd class="pk-num">×{a.statMult.toFixed(2)}</dd>
            <dt>Nível de Treinador</dt><dd class="pk-num">{a.trainerLevel}</dd>
            {est && <><dt>Projeção</dt><dd class="pk-num">{fmt(est.xpPerHour)} XP/h · ₽ {fmt(est.moneyPerHour)}/h · vitória {pct(est.winRate)}</dd></>}
            {open && isFarmArea(a) && !est && <dd class="place__analyze"><button class="pk-btn pk-btn--sm" onClick={() => setEst(estimateHunt(app.data, s, a.id, 20))}>Analisar hunt</button></dd>}
          </dl>
        )}
        <h3 class="place__h">Seu time</h3>
        <div class="place__team">
          {s.party.map((uid) => {
            const pk = s.pokemon[uid];
            return (
              <span key={uid} class="place__mon">
                <CroppedSprite id={speciesOf(app.data, pk.species).id} shiny={pk.shiny} box={48} />
                <span class="pk-num">Nv {pk.level}</span>
              </span>
            );
          })}
        </div>
      </div>
      <div class="place__cta">
        {here ? <button class="btn-go" onClick={() => go('explore')}>Ver hunt</button>
          : open && !won ? (
            <button class="btn-go" onClick={() => app.dispatch({ type: 'SelectArea', areaId: a.id }).ok && go('explore')}>
              {a.gym || a.league ? (champion ? 'Revanche' : 'Desafiar') : 'Iniciar hunt'}
            </button>
          ) : <button class="btn-go" disabled>{won ? 'Insígnia conquistada' : 'Bloqueado'}</button>}
      </div>
    </aside>
  );
}

function Mon({ k, label }: { k: string; label: string }) {
  const app = useApp();
  const s = app.state;
  const sp = speciesOf(app.data, k);
  const seen = (s.pokedex[k]?.seen ?? 0) > 0;
  const caught = (s.pokedex[k]?.caught ?? 0) > 0;
  return (
    <div class={`dex-cell ${caught ? 'is-caught' : ''}`} title={seen ? sp.name : 'Ainda não visto'}>
      <CroppedSprite id={sp.id} box={56} class={seen ? '' : 'is-silhouette'} />
      <span class="dex-cell__name">{seen ? sp.name : '???'}</span>
      <span class="dex-cell__pct pk-num">{label}</span>
    </div>
  );
}

function kindName(k: string): string {
  return ({ route: 'Rota', cave: 'Caverna', forest: 'Floresta', water: 'Água', building: 'Construção', city: 'Cidade', special: 'Especial' } as Record<string, string>)[k] ?? 'Área';
}

function Need({ r }: { r: Requirement }) {
  const app = useApp();
  const text = r.type === 'trainerLevel' ? `Treinador Nv ${r.min}` : r.type === 'championOf' ? 'Campeão da região' : requirementText(app.data, r);
  return <span class="chip chip--lock"><span class="lock" />{text}</span>;
}
