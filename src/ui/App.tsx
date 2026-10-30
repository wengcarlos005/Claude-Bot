import { useState } from 'preact/hooks';
import type { GameApp } from '../app/GameApp';
import { caughtSpeciesCount, trainerLevel, trainerXpForLevel } from '../core/world';
import { AppContext, fmt } from './components';
import { ExploreScreen } from './screens/Explore';
import { MapScreen } from './screens/Map';
import { PartyScreen } from './screens/Party';
import { PcScreen } from './screens/Pc';
import { PokedexScreen } from './screens/Pokedex';
import { BagScreen, ShopScreen } from './screens/Items';
import { ResearchScreen } from './screens/Research';
import { AutoManagerScreen } from './screens/AutoManager';
import { StatsScreen } from './screens/Stats';
import { SettingsScreen } from './screens/Settings';
import { OfflineModal, OfflineProgress, StarterPicker } from './screens/Modals';

const SCREENS = [
  { id: 'explore', label: 'Explorar', mobile: true, C: ExploreScreen },
  { id: 'map', label: 'Mapa', mobile: true, C: MapScreen },
  { id: 'party', label: 'Equipe', mobile: true, C: PartyScreen },
  { id: 'dex', label: 'Pokédex', mobile: true, C: PokedexScreen },
  { id: 'pc', label: 'PC', mobile: false, C: PcScreen },
  { id: 'bag', label: 'Mochila', mobile: false, C: BagScreen },
  { id: 'shop', label: 'Loja', mobile: false, C: ShopScreen },
  { id: 'research', label: 'Pesquisa', mobile: false, C: ResearchScreen },
  { id: 'auto', label: 'Auto Manager', mobile: false, C: AutoManagerScreen },
  { id: 'stats', label: 'Análises', mobile: false, C: StatsScreen },
  { id: 'settings', label: 'Configurações', mobile: false, C: SettingsScreen },
] as const;

export function App({ app }: { app: GameApp }) {
  const [screen, setScreen] = useState<string>('explore');
  const [more, setMore] = useState(false);
  app.frame.value; // inscreve o App nas atualizações do loop
  const s = app.state;
  const Current = SCREENS.find((x) => x.id === screen)!.C;
  const tl = trainerLevel(s);
  const x0 = trainerXpForLevel(tl);
  const x1 = trainerXpForLevel(tl + 1);
  const go = (id: string) => {
    setScreen(id);
    setMore(false);
  };
  return (
    <AppContext.Provider value={app}>
      <div class="app">
        <header class="pk-shell-bar app-bar">
          <span class="pk-logo"><span class="pk-logo__lens" aria-hidden="true" />Pokémon Idle</span>
          <div class="app-bar__chips">
            <span class="trainer" title={`XP de Treinador ${fmt(s.player.trainerXp)} / ${fmt(x1)}`}>
              <span class="trainer__label">Treinador</span>
              <span class="trainer__lvl">Nv {tl}</span>
              <span class="trainer__bar"><span style={{ width: `${Math.min(100, ((s.player.trainerXp - x0) / Math.max(1, x1 - x0)) * 100)}%` }} /></span>
            </span>
            <span class="pk-chip" title="Pokédólares"><span class="pk-chip__icon">₽</span><span class="pk-chip__value">{fmt(s.player.money)}</span></span>
            <span class="pk-chip" title="Pontos de Pesquisa"><span class="pk-chip__icon">PP</span><span class="pk-chip__value">{fmt(s.player.researchPoints)}</span></span>
            <span class="pk-chip pk-chip--gold app-bar__opt" title="Insígnias"><span class="pk-chip__icon">{s.player.badges.length}</span><span class="pk-chip__value">insígnias</span></span>
            <span class="pk-chip app-bar__opt" title="Espécies capturadas"><span class="pk-chip__icon">◓</span><span class="pk-chip__value">{caughtSpeciesCount(s)}</span></span>
          </div>
        </header>
        <nav class="pk-nav app-nav" aria-label="Navegação">
          {SCREENS.map((x) => (
            <button key={x.id} class={`pk-nav-item ${x.mobile ? '' : 'app-nav__desk'}`} onClick={() => go(x.id)} aria-current={screen === x.id ? 'page' : undefined}>
              <span class="pk-nav-item__dot" aria-hidden="true" />
              {x.label}
            </button>
          ))}
          <button class="pk-nav-item app-nav__more" onClick={() => setMore(!more)} aria-expanded={more}>
            <span class="pk-nav-item__dot" aria-hidden="true" />
            Mais
          </button>
        </nav>
        {more && (
          <div class="app-more" role="menu">
            {SCREENS.filter((x) => !x.mobile).map((x) => (
              <button key={x.id} class="pk-btn" role="menuitem" onClick={() => go(x.id)}>{x.label}</button>
            ))}
          </div>
        )}
        <main class="app-main">
          <Current go={go} />
        </main>
      </div>
      {!s.player.starterChosen && <StarterPicker />}
      {app.offlineProgress.value !== null && <OfflineProgress value={app.offlineProgress.value} />}
      {app.offlineReport.value && <OfflineModal />}
      <div class="app-toasts" aria-live="polite">
        {app.toasts.value.map((t) => (
          <div key={t.id} class={`pk-toast pk-toast--${t.tone === 'great' ? 'great' : t.tone === 'bad' ? 'bad' : t.tone === 'good' ? 'good' : 'info'}`} role="status">
            <span class="pk-toast__dot" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export type ScreenProps = { go: (id: string) => void };
