// Hub: Celadon City (mapa real de FireRed) em tela cheia. Cada prédio leva a uma parte do jogo; o que ainda não
// existe aparece como "Em breve". A equipe passeia pela praça e os painéis flutuam sobre a cidade.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ScreenProps } from '../App';
import { CroppedSprite, duration, fmt, useApp } from '../components';
import { badgeSprite, itemSprite, trainerSprite } from '../../app/assets';
import { DEFAULT_AVATAR } from '../../data/content/avatars';
import type { ResolvedArea } from '../../data/registry';
import { activeMember, maxHpOf, speciesOf } from '../../core/pokemon';
import { areaUnlocked, checkRequirement } from '../../core/world';
import { requirementText } from '../text';
import { Cell, renderLayout, type RenderedMap } from '../../app/pret';
import { PmdSprite } from '../field/MapScene';
import { directionRow } from '../../app/pmd';
import { Meter } from '../hub/Hub';

const CITY = 'frlg:CeladonCity';
const PAD = 5;

interface Spot {
  id: string;
  /** Placa alinhada à direita do prédio (prédio na borda do mapa). */
  end?: boolean;
  /** Retângulo do prédio em blocos de 16 px do mapa original. */
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  icon: string;
  go?: string;
  soon?: boolean;
}

const SPOTS: Spot[] = [
  { id: 'center', x: 46, y: 7.6, w: 5, h: 4.4, title: 'Centro Pokémon', sub: 'Cure e organize a equipe', icon: 'potion', go: 'party' },
  { id: 'shop', x: 9, y: 5, w: 9, h: 10.2, title: 'Loja', sub: 'Poké Balls, poções e buffs', icon: 'poke-ball', go: 'shop' },
  { id: 'gym', x: 8, y: 26, w: 8, h: 4.4, title: 'Ginásio', sub: 'Desafie o próximo líder', icon: 'tm-fighting' },
  { id: 'lab', x: 18.1, y: 4.6, w: 6.9, h: 7.4, title: 'Laboratório', sub: 'Pesquisa e Pokédex', icon: 'journal', go: 'research' },
  { id: 'workshop', x: 32, y: 25.6, w: 5, h: 4.4, title: 'Oficina', sub: 'Fabrique equipamentos', icon: 'up-grade', go: 'workshop' },
  { id: 'arena', x: 27, y: 4.6, w: 7, h: 7.4, title: 'Arena PvP', sub: 'Batalhe contra jogadores', icon: 'vs-seeker', soon: true },
  { id: 'market', x: 31, y: 17.4, w: 7, h: 4.6, title: 'Mercado Global', sub: 'Negocie com treinadores', icon: 'nugget', soon: true },
  { id: 'guild', x: 24, y: 16, w: 6, h: 3.2, title: 'Guilda', sub: 'Evolua em grupo', icon: 'comet-shard', soon: true },
  { id: 'hunt', x: 54, y: 12.4, w: 6, h: 4, title: 'Áreas de Caça', sub: 'Saída para as rotas', icon: 'town-map', go: 'map', end: true },
];
/** Praça da fonte, onde a equipe passeia. */
const PLAZA = { x0: 9, y0: 17, x1: 18, y1: 24 };

export function HubScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const [map, setMap] = useState<RenderedMap | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    renderLayout(CITY, PAD).then((m) => alive && setMap(m)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  const all = app.data.regions.flatMap((r) => r.areas.map((a) => app.data.areas.get(a.id)!));
  const next = all.find((a) => (a.gym && !s.player.badges.includes(a.gym.badgeId)) || (a.league && !s.player.champions.includes(a.regionId))) ?? null;

  const open = (b: Spot) => {
    if (b.soon) return app.toast(`${b.title}: em breve.`, 'normal');
    if (b.id === 'gym') {
      if (next && areaUnlocked(s, app.data, next)) {
        app.dispatch({ type: 'SelectArea', areaId: next.id });
        return go('explore');
      }
      return go('map');
    }
    go(b.go!);
  };

  return (
    <div class="hubview">
      {map ? <City map={map} onOpen={open} /> : (
        <div class="city is-loading">
          <div class="mapscene__loading">{failed ? 'Não foi possível carregar a cidade agora.' : <><span class="spinner" />Chegando em Celadon…</>}</div>
        </div>
      )}
      <div class="hub-dock">
        <HuntCard go={go} />
        <TeamCard go={go} />
        <ChallengeCard area={next} go={go} />
      </div>
    </div>
  );
}

interface Walker { uid: string; x: number; y: number; dir: number; at: number; movingUntil: number }

function City({ map, onOpen }: { map: RenderedMap; onOpen: (b: Spot) => void }) {
  const app = useApp();
  const s = app.state;
  const box = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const cw = box.current?.clientWidth ?? 1000;
  const ch = box.current?.clientHeight ?? 600;
  // Enquadra a cidade inteira (com todos os prédios clicáveis) na área visível; a moldura de árvores sobra em volta.
  const view = {
    x0: Math.min(0, ...SPOTS.map((b) => b.x)), y0: Math.min(0, ...SPOTS.map((b) => b.y)),
    x1: Math.max(map.w - 2 * PAD, ...SPOTS.map((b) => b.x + b.w)) + 2, y1: Math.max(map.h - 2 * PAD, ...SPOTS.map((b) => b.y + b.h)) + 1,
  };
  const fit = Math.min(cw / ((view.x1 - view.x0) * 16), ch / ((view.y1 - view.y0) * 16));
  // Cobre a área toda (sem faixas pretas): a moldura de árvores do próprio mapa preenche as sobras.
  const cover = Math.max(cw / (map.w * 16), ch / (map.h * 16));
  const sc = Math.max(cw < 700 ? 1.5 : 1, fit, cover);
  const T = 16 * sc;
  const W = map.w * T, H = map.h * T;
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => bump());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    baseRef.current?.replaceChildren(map.base);
    overRef.current?.replaceChildren(map.over);
    const el = box.current;
    if (!el) return;
    // Centraliza a cidade (no celular a escala mínima deixa arrastar para os lados).
    el.scrollLeft = Math.max(0, ((view.x0 + view.x1) / 2 + PAD) * T - el.clientWidth / 2);
    el.scrollTop = Math.max(0, ((view.y0 + view.y1) / 2 + PAD) * T - el.clientHeight / 2);
    // Arrastar para explorar (mouse); no toque, a rolagem nativa já funciona.
    let drag: { x: number; y: number; l: number; t: number } | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || (e.target as HTMLElement).closest('.spot')) return;
      drag = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
      el.classList.add('is-dragging');
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      el.scrollLeft = drag.l - (e.clientX - drag.x);
      el.scrollTop = drag.t - (e.clientY - drag.y);
    };
    const up = () => {
      drag = null;
      el.classList.remove('is-dragging');
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [map.key, Math.round(sc * 100)]);

  const now = performance.now();
  const walkers = useRef<Walker[]>([]);
  const walkable = (x: number, y: number) => {
    const c = map.cells[(y + PAD) * map.w + (x + PAD)];
    return (c === Cell.Walk || c === Cell.Grass) && x >= PLAZA.x0 && x <= PLAZA.x1 && y >= PLAZA.y0 && y <= PLAZA.y1;
  };
  walkers.current = s.party.map((uid, i) => {
    let w = walkers.current.find((x) => x.uid === uid);
    if (!w) {
      const spots: [number, number][] = [];
      for (let y = PLAZA.y0; y <= PLAZA.y1; y++) for (let x = PLAZA.x0; x <= PLAZA.x1; x++) if (walkable(x, y)) spots.push([x, y]);
      const [x, y] = spots[(i * 7 + 3) % Math.max(1, spots.length)] ?? [PLAZA.x0, PLAZA.y0];
      w = { uid, x, y, dir: 0, at: now + 800 + i * 400, movingUntil: 0 };
    }
    if (now >= w.at) {
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      w = { ...w, at: now + 1600 + Math.random() * 2600 };
      if (walkable(w.x + dx, w.y + dy) && !walkers.current.some((o) => o.uid !== uid && o.x === w!.x + dx && o.y === w!.y + dy)) {
        w = { ...w, x: w.x + dx, y: w.y + dy, dir: directionRow(dx, dy), movingUntil: now + 700 };
      } else w = { ...w, dir: directionRow(dx, dy) };
    }
    return w;
  });
  const at = (x: number, y: number) => ({ left: `${(x + PAD) * T + T / 2}px`, top: `${(y + PAD) * T + T}px`, zIndex: Math.round((y + PAD) * 10) });
  const hour = new Date().getHours();
  const tint = hour >= 20 || hour < 4 ? 'is-night' : hour < 10 ? 'is-morning' : hour >= 17 ? 'is-dusk' : '';
  return (
    <div class={`city ${tint}`} ref={box}>
      <div class="city__world" style={{ width: `${W}px`, height: `${H}px` }}>
        <div ref={baseRef} class="mapscene__layer" />
        {walkers.current.map((w) => {
          const pk = s.pokemon[w.uid];
          if (!pk) return null;
          return <PmdSprite key={w.uid} dex={speciesOf(app.data, pk.species).id} shiny={pk.shiny} anim={now < w.movingUntil ? 'Walk' : 'Idle'} dir={w.dir} scale={sc} bump={bump} class="is-wander" style={at(w.x, w.y)} />;
        })}
        <span class="city__trainer" style={at(13.5, 23.2)}><img src={trainerSprite(s.player.avatar ?? DEFAULT_AVATAR)} alt="Você" /></span>
        <div ref={overRef} class="mapscene__layer is-over" />
        <div class="city__spots">
          {SPOTS.map((b) => (
            <button key={b.id} class={`spot ${b.soon ? 'is-soon' : ''} ${b.end ? 'is-end' : ''}`} onClick={() => onOpen(b)}
              style={{ left: `${(b.x + PAD) * T}px`, top: `${(b.y + PAD) * T}px`, width: `${b.w * T}px`, height: `${b.h * T}px` }}
              aria-label={`${b.title}: ${b.sub}${b.soon ? ' (em breve)' : ''}`}>
              <span class="sign">
                <img class="sign__icon" src={itemSprite(b.icon)} width={30} height={30} alt="" />
                <span class="sign__text">
                  <b>{b.title}</b>
                  <span>{b.soon ? 'Em breve' : b.sub}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HuntCard({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const lead = activeMember(s);
  const h = s.hunt;
  const hours = Math.max(h.durationMs, 60_000) / 3600_000;
  return (
    <section class="dock-card dock-card--hunt">
      <header class="dock-card__head">
        <span class="live-dot" />
        <b>Hunt ativa</b>
        <span class="dock-card__meta pk-num">{duration(h.durationMs)}</span>
      </header>
      <div class="hunt-mini">
        {lead && <CroppedSprite id={speciesOf(app.data, lead.species).id} shiny={lead.shiny} box={56} />}
        <div class="hunt-mini__where">
          <b>{area.name}</b>
          <span>{app.data.regionById.get(area.regionId)!.name} · Nv {area.levelRange[0]}–{area.levelRange[1]}</span>
        </div>
      </div>
      <div class="mini-stats">
        <span><b class="pk-num">{fmt(h.xp / hours)}</b>XP/h</span>
        <span><b class="pk-num">{fmt((h.money - (h.spent ?? 0)) / hours)}</b>₽/h</span>
        <span><b class="pk-num">{fmt(h.captures)}</b>capturas</span>
      </div>
      <button class="btn-go" onClick={() => go('explore')}>Ir para a hunt</button>
    </section>
  );
}

function TeamCard({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  return (
    <section class="dock-card dock-card--team">
      <header class="dock-card__head">
        <b>Equipe atual</b>
        <button class="dock-card__link" onClick={() => go('party')}>Gerenciar</button>
      </header>
      <div class="team-cards">
        {Array.from({ length: 6 }, (_, i) => {
          const pk = s.party[i] ? s.pokemon[s.party[i]] : null;
          if (!pk) return <span key={i} class="team-card is-empty" />;
          return (
            <button key={i} class={`team-card ${pk.fainted ? 'is-fainted' : ''} ${i === 0 ? 'is-lead' : ''}`} onClick={() => go('party')}>
              <CroppedSprite id={speciesOf(app.data, pk.species).id} shiny={pk.shiny} box={64} />
              <span class="team-card__lvl pk-num">Nv {pk.level}</span>
              <Meter value={pk.fainted ? 0 : pk.hp} max={maxHpOf(s, app.data, pk)} kind="hp" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

const leaderSprite = (name: string) => trainerSprite(name.toLowerCase().replace(/[^a-z]/g, ''));

function ChallengeCard({ area, go }: { area: ResolvedArea | null; go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  if (!area) {
    return (
      <section class="dock-card dock-card--challenge">
        <header class="dock-card__head"><b>Próximo desafio</b></header>
        <p class="dock-card__empty">Todas as Ligas vencidas. Complete a Pokédex!</p>
      </section>
    );
  }
  const region = app.data.regionById.get(area.regionId)!;
  const leader = area.gym ? area.gym.leader : area.league!.members[area.league!.members.length - 1];
  const open = areaUnlocked(s, app.data, area);
  const missing = area.unlock.filter((r) => !checkRequirement(s, r));
  const gyms = app.data.regions.flatMap((r) => r.areas.map((a) => app.data.areas.get(a.id)!)).filter((a) => a.gym);
  const gymIndex = gyms.indexOf(area);
  return (
    <section class={`dock-card dock-card--challenge type-${area.gym?.type ?? 'dragon'}`}>
      <img class="challenge-art" src={leaderSprite(leader.name)} alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
      <header class="dock-card__head">
        <b>Próximo desafio</b>
        <span class="dock-card__meta">{region.name}</span>
      </header>
      <div class="challenge-info">
        {area.gym && gymIndex >= 0 && <img class="challenge-info__badge" src={badgeSprite(gymIndex + 1)} width={34} height={34} alt="" />}
        <div>
          <b>{area.gym ? area.gym.badgeName : 'Liga Pokémon'}</b>
          <span>{leader.name} · {area.name}</span>
        </div>
      </div>
      {open ? (
        <button class="btn-go" onClick={() => { app.dispatch({ type: 'SelectArea', areaId: area.id }); go('explore'); }}>Desafiar</button>
      ) : (
        <div class="challenge-need">
          <span>Falta: {missing.map((r) => requirementText(app.data, r)).join(', ')}</span>
          <button class="pk-btn pk-btn--sm" onClick={() => go('map')}>Ver no mapa</button>
        </div>
      )}
    </section>
  );
}
