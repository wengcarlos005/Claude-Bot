import { useState } from 'preact/hooks';
import type { GameApp } from '../app/GameApp';
import { itemSprite, trainerSprite } from '../app/assets';
import { DEFAULT_AVATAR } from '../data/content/avatars';
import { caughtSpeciesCount, trainerLevel, trainerXpForLevel } from '../core/world';
import { AppContext, fmt } from './components';
import { PIXEL_ICONS } from './icons';
import { HubScreen } from './screens/Hub';
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

type Icon = { item: string } | { pixel: keyof typeof PIXEL_ICONS };
const SCREENS: { id: string; label: string; icon: Icon; C: (p: ScreenProps) => preact.JSX.Element | null }[] = [
  { id: 'hub', label: 'Hub', icon: { pixel: 'house' }, C: HubScreen },
  { id: 'map', label: 'Mapas', icon: { item: 'town-map' }, C: MapScreen },
  { id: 'explore', label: 'Hunt', icon: { pixel: 'swords' }, C: ExploreScreen },
  { id: 'dex', label: 'Pokédex', icon: { item: 'poke-radar' }, C: PokedexScreen },
  { id: 'party', label: 'Equipe', icon: { item: 'poke-ball' }, C: PartyScreen },
  { id: 'pc', label: 'PC', icon: { item: 'storage-key' }, C: PcScreen },
  { id: 'bag', label: 'Inventário', icon: { item: 'explorer-kit' }, C: BagScreen },
  { id: 'shop', label: 'Loja', icon: { item: 'amulet-coin' }, C: ShopScreen },
  { id: 'research', label: 'Pesquisa', icon: { item: 'journal' }, C: ResearchScreen },
  { id: 'auto', label: 'Automações', icon: { item: 'machine-part' }, C: AutoManagerScreen },
  { id: 'stats', label: 'Estatísticas', icon: { item: 'vs-recorder' }, C: StatsScreen },
];

export function NavIcon({ icon, size = 28 }: { icon: Icon; size?: number }) {
  if ('pixel' in icon) return <span class="nav-icon" style={{ width: `${size}px`, height: `${size}px`, backgroundImage: PIXEL_ICONS[icon.pixel] }} aria-hidden="true" />;
  return <img class="nav-icon" src={itemSprite(icon.item)} width={size} height={size} alt="" />;
}

export function App({ app }: { app: GameApp }) {
  const [screen, setScreen] = useState<string>('hub');
  app.frame.value; // inscreve o App nas atualizações do loop
  const s = app.state;
  const Current = (screen === 'settings' ? SettingsScreen : SCREENS.find((x) => x.id === screen)!.C);
  const tl = trainerLevel(s);
  const x0 = trainerXpForLevel(tl);
  const x1 = trainerXpForLevel(tl + 1);
  const p = Math.min(1, (s.player.trainerXp - x0) / Math.max(1, x1 - x0));
  const go = (id: string) => {
    setScreen(id);
    window.scrollTo({ top: 0 });
  };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  return (
    <AppContext.Provider value={app}>
      <div class={`app app--${screen}`}>
        <header class="topbar">
          <button class="profile" onClick={() => go('settings')} title="Perfil e ajustes">
            <span class="profile__avatar"><img src={trainerSprite(s.player.avatar ?? DEFAULT_AVATAR)} width={64} height={64} alt="" /></span>
            <span class="profile__info">
              <span class="profile__name">{s.player.name || 'Treinador'}</span>
              <span class="profile__lvl">Nv. {tl}</span>
              <span class="profile__bar" title={`${fmt(s.player.trainerXp)} / ${fmt(x1)} XP de Treinador`}><i style={{ width: `${p * 100}%` }} /></span>
              <span class="profile__pct pk-num">{Math.floor(p * 100)}%</span>
            </span>
          </button>
          <div class="wallet">
            <button class="coin" onClick={() => go('shop')} title="Pokédólares"><img src={itemSprite('nugget')} width={40} height={40} alt="" /><span class="pk-num">{fmt(s.player.money)}</span></button>
            <button class="coin" onClick={() => go('research')} title="Pontos de Pesquisa"><img src={itemSprite('pp-up')} width={40} height={40} alt="" /><span class="pk-num">{fmt(s.player.researchPoints)}</span></button>
            <button class="coin coin--wide" onClick={() => go('dex')} title="Espécies capturadas"><img src={itemSprite('poke-ball')} width={40} height={40} alt="" /><span class="pk-num">{caughtSpeciesCount(s)}</span></button>
          </div>
          <div class="topbar__actions">
            <button class="icon-btn" onClick={fullscreen} title="Tela cheia" aria-label="Tela cheia"><NavIcon icon={{ pixel: 'full' }} size={22} /></button>
            <button class={`icon-btn ${screen === 'settings' ? 'is-on' : ''}`} onClick={() => go('settings')} title="Ajustes" aria-label="Ajustes"><NavIcon icon={{ pixel: 'gear' }} size={24} /></button>
          </div>
        </header>
        <nav class="sidenav" aria-label="Navegação">
          {SCREENS.map((x) => (
            <button key={x.id} class="sidenav__item" onClick={() => go(x.id)} aria-current={screen === x.id ? 'page' : undefined}>
              <NavIcon icon={x.icon} />
              <span>{x.label}</span>
            </button>
          ))}
        </nav>
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
