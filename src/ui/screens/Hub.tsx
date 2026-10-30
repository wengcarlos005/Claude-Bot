// Hub: a cidade do jogador. Cada prédio leva a uma parte do jogo; o que ainda não existe aparece como "Em breve".
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Cell, renderLayout, type RenderedMap } from '../../app/pret';
import { PmdSprite } from '../field/MapScene';
import { directionRow } from '../../app/pmd';
import type { ScreenProps } from '../App';
import { CroppedSprite, Sprite, duration, fmt, useApp } from '../components';
import { badgeSprite, trainerSprite } from '../../app/assets';
import { DEFAULT_AVATAR } from '../../data/content/avatars';
import type { ResolvedArea } from '../../data/registry';
import { activeMember, displayName, speciesOf } from '../../core/pokemon';
import { areaUnlocked, checkRequirement } from '../../core/world';
import { requirementText } from '../text';
import { arena, fountain, guild, gym, huntGate, lab, lamp, market, mart, pokeCenter, townGround, tree, type Sprite as Art } from '../art/town';

const W = 320;
const H = 180;
const PLAZA = { x: 160, y: 112, rx: 44, ry: 26 };

interface Building {
  id: string;
  art: () => Art;
  x: number;
  y: number;
  title: string;
  sub: string;
  soon?: boolean;
}

const BUILDINGS: Building[] = [
  { id: 'gym', art: gym, x: 160, y: 56, title: 'Ginásio', sub: 'Desafie o próximo líder' },
  { id: 'center', art: pokeCenter, x: 72, y: 76, title: 'Centro Pokémon', sub: 'Cure e organize a equipe' },
  { id: 'shop', art: mart, x: 244, y: 72, title: 'Loja', sub: 'Itens e buffs' },
  { id: 'lab', art: lab, x: 32, y: 124, title: 'Laboratório', sub: 'Pesquisa e melhorias' },
  { id: 'market', art: market, x: 266, y: 128, title: 'Mercado Global', sub: 'Negocie com treinadores', soon: true },
  { id: 'hunt', art: huntGate, x: 60, y: 178, title: 'Áreas de Caça', sub: 'Explore e capture' },
  { id: 'arena', art: arena, x: 160, y: 179, title: 'Arena PvP', sub: 'Batalhe contra jogadores', soon: true },
  { id: 'guild', art: guild, x: 224, y: 176, title: 'Guilda', sub: 'Evolua em grupo', soon: true },
];
const TREES: [number, number][] = [
  [10, 26], [28, 31], [110, 30], [124, 23], [198, 26], [212, 33], [284, 30], [298, 22], [8, 72], [22, 88], [110, 78],
  [210, 82], [104, 166], [120, 156], [200, 156], [6, 150], [14, 178], [100, 180], [302, 84], [140, 34], [182, 36],
];
const LAMPS: [number, number][] = [[114, 96], [206, 96], [118, 136], [202, 136]];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

interface Walker {
  uid: string;
  x: number;
  y: number;
  flip: boolean;
  at: number;
}

export function HubScreen({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const arts = useMemo(() => {
    const b = Object.fromEntries(BUILDINGS.map((x) => [x.id, x.art()]));
    return { b, ground: townGround(BUILDINGS.map((x) => ({ x: x.x, y: x.y })), PLAZA), fountain: fountain(), lamp: lamp(), trees: [tree(0), tree(1), tree(2)] };
  }, []);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Em telas estreitas a cidade rola na horizontal: começa centralizada na praça.
    const w = wrap.current;
    if (w) w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2;
  }, []);
  const lead = activeMember(s) ?? (s.party[0] ? s.pokemon[s.party[0]] : null);
  const nextChallenge = findNextChallenge(app.data.regions.flatMap((r) => r.areas.map((a) => app.data.areas.get(a.id)!)), s.player.badges, s.player.champions);

  // A equipe passeia pela praça (só apresentação).
  const walkers = useRef<Walker[]>([]);
  const now = performance.now();
  walkers.current = s.party.map((uid, i) => {
    const old = walkers.current.find((w) => w.uid === uid);
    if (old && now < old.at) return old;
    const a = Math.random() * Math.PI * 2;
    const k = 0.35 + Math.random() * 0.55;
    const x = PLAZA.x + Math.cos(a) * PLAZA.rx * k;
    const y = PLAZA.y + 6 + Math.sin(a) * PLAZA.ry * k * 0.8;
    return { uid, x, y, flip: old ? x > old.x : i % 2 === 0, at: now + 2500 + Math.random() * 4000 };
  });

  const open = (b: Building) => {
    if (b.soon) return app.toast(`${b.title}: em breve.`, 'normal');
    if (b.id === 'gym') {
      if (nextChallenge && areaUnlocked(s, app.data, nextChallenge)) {
        app.dispatch({ type: 'SelectArea', areaId: nextChallenge.id });
        return go('explore');
      }
      return go('map');
    }
    go(({ center: 'party', shop: 'shop', lab: 'research', hunt: 'map' } as Record<string, string>)[b.id]);
  };

  const procedural = (
      <div class="town-wrap" ref={wrap}>
        <div class="town" style={{ backgroundImage: `url("${arts.ground}")` }}>
          {TREES.map(([x, y], i) => {
            const t = arts.trees[i % 3];
            return <img key={`t${i}`} class="town__prop" src={t.uri} alt="" style={{ left: pct(x, W), top: pct(y, H), width: pct(t.w * 1.6, W), zIndex: y }} />;
          })}
          {LAMPS.map(([x, y], i) => (
            <img key={`l${i}`} class="town__prop" src={arts.lamp.uri} alt="" style={{ left: pct(x, W), top: pct(y, H), width: pct(arts.lamp.w * 1.4, W), zIndex: y }} />
          ))}
          {BUILDINGS.map((b) => {
            const a = arts.b[b.id];
            return (
              <button key={b.id} class={`bld ${b.soon ? 'is-soon' : ''}`} style={{ left: pct(b.x, W), top: pct(b.y, H), width: pct(a.w, W), zIndex: b.y }} onClick={() => open(b)} aria-label={`${b.title}: ${b.sub}${b.soon ? ' (em breve)' : ''}`}>
                <img src={a.uri} alt="" />
                <span class="bld__label">
                  <b>{b.title}</b>
                  <span>{b.soon ? 'Em breve' : b.sub}</span>
                </span>
              </button>
            );
          })}
          <img class="town__prop" src={arts.fountain.uri} alt="" style={{ left: pct(PLAZA.x, W), top: pct(PLAZA.y + 10, H), width: pct(arts.fountain.w, W), zIndex: PLAZA.y + 10 }} />
          {lead && (
            <span class="town__statue" style={{ left: pct(PLAZA.x, W), top: pct(PLAZA.y + 1, H), zIndex: PLAZA.y + 11 }} title={`Estátua de ${speciesOf(app.data, lead.species).name}`}>
              <Sprite id={speciesOf(app.data, lead.species).id} size={96} />
            </span>
          )}
          {walkers.current.map((w) => {
            const pk = s.pokemon[w.uid];
            if (!pk) return null;
            return (
              <span key={w.uid} class="town__mon" style={{ left: pct(w.x, W), top: pct(w.y, H), zIndex: Math.round(w.y) + 1 }}>
                <span style={{ transform: w.flip ? 'scaleX(-1)' : undefined }}><Sprite id={speciesOf(app.data, pk.species).id} shiny={pk.shiny} animated size={96} /></span>
              </span>
            );
          })}
          <span class="town__trainer" style={{ left: pct(PLAZA.x, W), top: pct(PLAZA.y + 28, H), zIndex: PLAZA.y + 28 }}>
            <img src={trainerSprite(s.player.avatar ?? DEFAULT_AVATAR)} alt="Você" />
          </span>
        </div>
      </div>
  );

  return (
    <div class="hub">
      <CityView fallback={procedural} onOpen={(id) => open(BUILDINGS.find((x) => x.id === id)!)} />

      <div class="hub__panels">
        <HuntCard go={go} />
        <section class="panel">
          <header class="panel__head">
            <h2 class="panel__title">Equipe atual</h2>
            <button class="pk-btn pk-btn--sm pk-btn--ghost" onClick={() => go('party')}>Gerenciar</button>
          </header>
          <div class="panel__body">
            <div class="slots">
              {Array.from({ length: 6 }, (_, i) => {
                const pk = s.party[i] ? s.pokemon[s.party[i]] : null;
                if (!pk) return <span key={i} class="slot is-empty" />;
                return (
                  <button key={i} class={`slot ${pk.fainted ? 'is-fainted' : ''}`} onClick={() => go('party')} title={displayName(app.data, pk)}>
                    <CroppedSprite id={speciesOf(app.data, pk.species).id} shiny={pk.shiny} box={64} />
                    <span class="slot__lvl">Nv {pk.level}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <ChallengeCard area={nextChallenge} go={go} />
      </div>
    </div>
  );
}

function findNextChallenge(areas: ResolvedArea[], badges: string[], champions: string[]): ResolvedArea | null {
  return areas.find((a) => (a.gym && !badges.includes(a.gym.badgeId)) || (a.league && !champions.includes(a.regionId))) ?? null;
}

function HuntCard({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const area = app.data.areas.get(s.world.activeAreaId)!;
  const h = s.hunt;
  const hours = Math.max(h.durationMs, 60_000) / 3600_000;
  return (
    <section class="panel">
      <header class="panel__head">
        <h2 class="panel__title"><span class="live-dot" />Hunt ativa</h2>
        <span class="panel__meta pk-num">{duration(h.durationMs)}</span>
      </header>
      <div class="panel__body">
        <div class="hunt-card__where">
          <b>{area.name}</b>
          <span>{app.data.regionById.get(area.regionId)!.name} · Nv {area.levelRange[0]}–{area.levelRange[1]}</span>
        </div>
        <div class="mini-stats">
          <span><b class="pk-num">{fmt(h.xp / hours)}</b>XP/h</span>
          <span><b class="pk-num">{fmt((h.money - (h.spent ?? 0)) / hours)}</b>₽/h</span>
          <span><b class="pk-num">{fmt(h.wins)}</b>abates</span>
          <span><b class="pk-num">{fmt(h.captures)}</b>capturas</span>
        </div>
        <div class="pk-row">
          <button class="btn-go" onClick={() => go('explore')}>Ver hunt</button>
          <button class="pk-btn pk-btn--sm" onClick={() => go('map')}>Trocar área</button>
        </div>
      </div>
    </section>
  );
}

function ChallengeCard({ area, go }: { area: ResolvedArea | null; go: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  if (!area) {
    return (
      <section class="panel"><header class="panel__head"><h2 class="panel__title">Próximo desafio</h2></header>
        <div class="panel__body"><p class="panel__empty">Todas as Ligas vencidas. Complete a Pokédex!</p></div></section>
    );
  }
  const region = app.data.regionById.get(area.regionId)!;
  const leader = area.gym ? area.gym.leader : area.league!.members[area.league!.members.length - 1];
  const ace = leader.team[leader.team.length - 1];
  const open = areaUnlocked(s, app.data, area);
  const missing = area.unlock.filter((r) => !checkRequirement(s, r));
  const gymIndex = app.data.regions.flatMap((r) => r.areas.map((a) => app.data.areas.get(a.id)!)).filter((a) => a.gym).indexOf(area);
  return (
    <section class="panel challenge">
      <header class="panel__head">
        <h2 class="panel__title">Próximo desafio</h2>
        <span class="panel__meta">{region.name}</span>
      </header>
      <div class="panel__body">
        <div class="challenge__row">
          {area.gym && gymIndex >= 0 ? <img class="challenge__badge" src={badgeSprite(gymIndex + 1)} width={36} height={36} alt="" /> : null}
          <div class="challenge__who">
            <b>{area.gym ? area.gym.badgeName : 'Liga Pokémon'}</b>
            <span>{leader.name} · {area.name}</span>
          </div>
          <CroppedSprite id={speciesOf(app.data, ace.species).id} box={64} class={(s.pokedex[ace.species]?.seen ?? 0) > 0 ? '' : 'is-silhouette'} />
        </div>
        {open ? (
          <button class="btn-go" onClick={() => { app.dispatch({ type: 'SelectArea', areaId: area.id }); go('explore'); }}>Desafiar</button>
        ) : (
          <div class="challenge__need">
            <span>Falta: {missing.map((r) => requirementText(app.data, r)).join(', ')}</span>
            <button class="pk-btn pk-btn--sm" onClick={() => go('map')}>Ver no mapa</button>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- cidade real (Celadon, FireRed)

const CITY = 'frlg:CeladonCity';
const CITY_PAD = 1;
/** Prédios do Hub sobre o mapa real (coordenadas em blocos de 16 px do mapa original). */
const SPOTS: { id: string; x: number; y: number; w: number; h: number; title: string; sub: string; soon?: boolean }[] = [
  { id: 'center', x: 46, y: 7.6, w: 5, h: 4.4, title: 'Centro Pokémon', sub: 'Cure e organize a equipe' },
  { id: 'shop', x: 9, y: 5, w: 9, h: 10.2, title: 'Loja', sub: 'Itens e buffs' },
  { id: 'gym', x: 8, y: 26, w: 8, h: 4.4, title: 'Ginásio', sub: 'Desafie o próximo líder' },
  { id: 'lab', x: 18.1, y: 4.6, w: 6.9, h: 7.4, title: 'Laboratório', sub: 'Pesquisa e melhorias' },
  { id: 'arena', x: 27, y: 4.6, w: 7, h: 7.4, title: 'Arena PvP', sub: 'Batalhe contra jogadores', soon: true },
  { id: 'market', x: 31, y: 17.4, w: 7, h: 4.6, title: 'Mercado Global', sub: 'Negocie com treinadores', soon: true },
  { id: 'guild', x: 24, y: 16, w: 6, h: 3.2, title: 'Guilda', sub: 'Evolua em grupo', soon: true },
  { id: 'hunt', x: 54, y: 12.4, w: 6, h: 4, title: 'Áreas de Caça', sub: 'Saída para as rotas' },
];
/** Praça da fonte, onde a equipe passeia. */
const PLAZA_BOX = { x0: 9, y0: 17, x1: 18, y1: 24 };

interface CityWalker { uid: string; x: number; y: number; dir: number; at: number; movingUntil: number }

function CityView({ fallback, onOpen }: { fallback: ComponentChildren; onOpen: (id: string) => void }) {
  const [map, setMap] = useState<RenderedMap | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    renderLayout(CITY, CITY_PAD).then((m) => alive && setMap(m)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  if (failed) return <>{fallback}</>;
  if (!map) return <div class="city is-loading"><div class="mapscene__loading"><span class="spinner" />Carregando a cidade…</div></div>;
  return <City map={map} onOpen={onOpen} />;
}

function City({ map, onOpen }: { map: RenderedMap; onOpen: (id: string) => void }) {
  const app = useApp();
  const s = app.state;
  const box = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  useEffect(() => {
    baseRef.current?.replaceChildren(map.base);
    overRef.current?.replaceChildren(map.over);
    const w = box.current;
    if (w) w.scrollLeft = ((PLAZA_BOX.x0 + CITY_PAD) * 16 * scaleOf(w.clientWidth)) - w.clientWidth / 4;
  }, [map.key]);
  const cw = box.current?.clientWidth ?? 1200;
  const scaleOf = (w: number) => (w >= 900 ? w / (map.w * 16) : 1.5);
  const sc = scaleOf(cw);
  const T = 16 * sc;
  const now = performance.now();

  // A equipe passeia pela praça: um passo por vez nas células andáveis.
  const walkers = useRef<CityWalker[]>([]);
  const walkable = (x: number, y: number) => {
    const c = map.cells[(y + CITY_PAD) * map.w + (x + CITY_PAD)];
    return (c === Cell.Walk || c === Cell.Grass) && x >= PLAZA_BOX.x0 && x <= PLAZA_BOX.x1 && y >= PLAZA_BOX.y0 && y <= PLAZA_BOX.y1;
  };
  walkers.current = s.party.map((uid, i) => {
    let w = walkers.current.find((x) => x.uid === uid);
    if (!w) {
      const spots: [number, number][] = [];
      for (let y = PLAZA_BOX.y0; y <= PLAZA_BOX.y1; y++) for (let x = PLAZA_BOX.x0; x <= PLAZA_BOX.x1; x++) if (walkable(x, y)) spots.push([x, y]);
      const [x, y] = spots[(i * 7 + 3) % Math.max(1, spots.length)] ?? [PLAZA_BOX.x0, PLAZA_BOX.y0];
      w = { uid, x, y, dir: 0, at: now + 800 + i * 400, movingUntil: 0 };
    }
    if (now >= w.at) {
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      w.at = now + 1600 + Math.random() * 2600;
      if (walkable(w.x + dx, w.y + dy) && !walkers.current.some((o) => o.uid !== uid && o.x === w!.x + dx && o.y === w!.y + dy)) {
        w = { ...w, x: w.x + dx, y: w.y + dy, dir: directionRow(dx, dy), movingUntil: now + 700 };
      } else w = { ...w, dir: directionRow(dx, dy) };
    }
    return w;
  });
  const at = (x: number, y: number) => ({ left: `${(x + CITY_PAD) * T + T / 2}px`, top: `${(y + CITY_PAD) * T + T}px`, zIndex: Math.round((y + CITY_PAD) * 10) });
  const W = map.w * T, H = map.h * T;
  return (
    <div class="city" ref={box}>
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
            <button key={b.id} class={`spot ${b.soon ? 'is-soon' : ''}`} onClick={() => onOpen(b.id)}
              style={{ left: `${(b.x + CITY_PAD) * T}px`, top: `${(b.y + CITY_PAD) * T}px`, width: `${b.w * T}px`, height: `${b.h * T}px` }}
              aria-label={`${b.title}: ${b.sub}${b.soon ? ' (em breve)' : ''}`}>
              <span class="bld__label">
                <b>{b.title}</b>
                <span>{b.soon ? 'Em breve' : b.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
