import { useState } from 'preact/hooks';
import type { GameApp } from '../app/GameApp';
import { caughtSpeciesCount } from '../core/world';
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
  { id: 'explore', label: 'Explorar', ico: '⚔️', C: ExploreScreen },
  { id: 'map', label: 'Mapa', ico: '🗺️', C: MapScreen },
  { id: 'party', label: 'Equipe', ico: '👥', C: PartyScreen },
  { id: 'pc', label: 'PC', ico: '💾', C: PcScreen },
  { id: 'dex', label: 'Pokédex', ico: '📖', C: PokedexScreen },
  { id: 'bag', label: 'Mochila', ico: '🎒', C: BagScreen },
  { id: 'shop', label: 'Loja', ico: '🛒', C: ShopScreen },
  { id: 'research', label: 'Pesquisa', ico: '🔬', C: ResearchScreen },
  { id: 'auto', label: 'Auto Manager', ico: '⚙️', C: AutoManagerScreen },
  { id: 'stats', label: 'Análises', ico: '📊', C: StatsScreen },
  { id: 'settings', label: 'Config.', ico: '🔧', C: SettingsScreen },
] as const;

export function App({ app }: { app: GameApp }) {
  const [screen, setScreen] = useState<string>('explore');
  app.frame.value; // inscreve o App nas atualizações do loop
  const s = app.state;
  const Current = SCREENS.find((x) => x.id === screen)!.C;
  return (
    <AppContext.Provider value={app}>
      <div class="app">
        <header class="topbar">
          <span class="logo">◓ Pokémon Idle</span>
          <div class="stat-chips">
            <span class="chip" title="Pokédólares">₽ <b>{fmt(s.player.money)}</b></span>
            <span class="chip" title="Pontos de Pesquisa">PP <b>{fmt(s.player.researchPoints)}</b></span>
            <span class="chip" title="Insígnias">🏅 <b>{s.player.badges.length}</b></span>
            <span class="chip" title="Espécies capturadas">📖 <b>{caughtSpeciesCount(s)}</b></span>
          </div>
        </header>
        <nav class="sidenav" aria-label="Navegação">
          {SCREENS.map((x) => (
            <button key={x.id} class={`navbtn ${screen === x.id ? 'active' : ''}`} onClick={() => setScreen(x.id)} aria-current={screen === x.id}>
              <span class="ico" aria-hidden="true">{x.ico}</span>
              <span>{x.label}</span>
            </button>
          ))}
        </nav>
        <main class="main">
          <Current go={setScreen} />
        </main>
      </div>
      {!s.player.starterChosen && <StarterPicker />}
      {app.offlineProgress.value !== null && <OfflineProgress value={app.offlineProgress.value} />}
      {app.offlineReport.value && <OfflineModal />}
      <div class="toasts" aria-live="polite">
        {app.toasts.value.map((t) => (
          <div key={t.id} class={`toast tone-${t.tone}`}>{t.text}</div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export type ScreenProps = { go: (id: string) => void };
