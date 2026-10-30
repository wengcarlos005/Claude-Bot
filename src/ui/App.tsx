import { useState } from 'preact/hooks';
import type { GameApp } from '../app/GameApp';
import { itemSprite } from '../app/assets';
import { trainerLevel } from '../core/world';
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
import { AutoPanel, FieldCard, LogPanel, TeamList, TrainerCard } from './hub/Hub';

// Ícones: sprites de itens dos jogos (pixel art no mesmo estilo dos Pokémon).
const SCREENS = [
  { id: 'explore', label: 'Hunt', icon: 'bicycle', C: ExploreScreen },
  { id: 'map', label: 'Mapa', icon: 'town-map', C: MapScreen },
  { id: 'party', label: 'Equipe', icon: 'poke-ball', C: PartyScreen },
  { id: 'pc', label: 'PC', icon: 'storage-key', C: PcScreen },
  { id: 'dex', label: 'Pokédex', icon: 'fame-checker', C: PokedexScreen },
  { id: 'bag', label: 'Mochila', icon: 'poffin-case', C: BagScreen },
  { id: 'shop', label: 'Loja', icon: 'amulet-coin', C: ShopScreen },
  { id: 'research', label: 'Pesquisa', icon: 'journal', C: ResearchScreen },
  { id: 'auto', label: 'Automações', icon: 'machine-part', C: AutoManagerScreen },
  { id: 'stats', label: 'Análises', icon: 'vs-recorder', C: StatsScreen },
  { id: 'settings', label: 'Ajustes', icon: 'up-grade', C: SettingsScreen },
] as const;

export function App({ app }: { app: GameApp }) {
  const [screen, setScreen] = useState<string>('explore');
  app.frame.value; // inscreve o App nas atualizações do loop
  const s = app.state;
  const Current = SCREENS.find((x) => x.id === screen)!.C;
  const go = (id: string) => {
    setScreen(id);
    window.scrollTo({ top: 0 });
  };
  return (
    <AppContext.Provider value={app}>
      <div class="app">
        <header class="pk-shell-bar app-bar">
          <span class="pk-logo"><span class="pk-logo__lens" aria-hidden="true" />Pokémon Idle</span>
          <div class="app-bar__chips">
            <span class="pk-chip app-bar__compact" title="Nível de Treinador"><span class="pk-chip__icon">Nv</span><span class="pk-chip__value">{trainerLevel(s)}</span></span>
            <span class="pk-chip" title="Pokédólares"><span class="pk-chip__icon">₽</span><span class="pk-chip__value">{fmt(s.player.money)}</span></span>
            <span class="pk-chip" title="Pontos de Pesquisa"><span class="pk-chip__icon">PP</span><span class="pk-chip__value">{fmt(s.player.researchPoints)}</span></span>
          </div>
        </header>
        <nav class="toolbar" aria-label="Navegação">
          {SCREENS.map((x) => (
            <button key={x.id} class="tool" onClick={() => go(x.id)} aria-current={screen === x.id ? 'page' : undefined}>
              <img class="tool__icon" src={itemSprite(x.icon)} width={30} height={30} alt="" />
              <span class="tool__label">{x.label}</span>
            </button>
          ))}
        </nav>
        <aside class="side side--left" aria-label="Treinador e equipe">
          <TrainerCard go={go} />
          <FieldCard go={go} />
          <TeamList go={go} />
        </aside>
        <main class="app-main">
          <Current go={go} />
        </main>
        <aside class="side side--right" aria-label="Automações e registro">
          <AutoPanel go={go} />
          <LogPanel />
        </aside>
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
