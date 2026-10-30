// Cabeçalho das telas de menu: o NPC da tela (sprite de treinador), uma caixa de diálogo no estilo GBA e os números
// principais com ícones. Dá identidade a cada menu e tira a sensação de "caixa vazia".
import { trainerSprite, uiIcon } from '../app/assets';
import { DEFAULT_AVATAR } from '../data/content/avatars';
import { useApp, fmt } from './components';
import { caughtSpeciesCount, trainerLevel } from '../core/world';
import { FRAGMENTS } from '../core/systems/crafting';
import { pcCount } from '../core/pokemon';
import type { GameApp } from '../app/GameApp';

interface Stat { icon: string; label: string; value: string }
interface Hero { npc: string | null; name: string; title: string; say: string; stats: Stat[] }

const sum = (app: GameApp, cat: string) =>
  Object.entries(app.state.inventory).reduce((n, [id, q]) => n + (app.data.items.get(id)?.category === cat ? q : 0), 0);

const HEROES: Record<string, (app: GameApp) => Hero> = {
  dex: (app) => {
    const caught = caughtSpeciesCount(app.state);
    const seen = Object.values(app.state.pokedex).filter((e) => e.seen > 0).length;
    return {
      npc: 'oak-gen3', name: 'Prof. Carvalho', title: 'Pokédex',
      say: caught < 10 ? 'Cada espécie nova rende Pontos de Pesquisa. Vá encher essa Pokédex!' : `Impressionante! ${caught} espécies registradas. Ainda há muito para descobrir.`,
      stats: [
        { icon: 'ball/poke', label: 'Capturados', value: fmt(caught) },
        { icon: 'key-item/poke-radar', label: 'Vistos', value: fmt(seen) },
        { icon: 'key-item/shiny-charm', label: 'Shinies', value: fmt(Object.values(app.state.pokedex).filter((e) => e.shinyCaught).length) },
      ],
    };
  },
  party: (app) => ({
    npc: 'nurse', name: 'Enfermeira Joy', title: 'Equipe',
    say: 'O primeiro da fila luta primeiro; os outros entram se ele desmaiar. Toque num Pokémon para ver golpes e itens.',
    stats: [
      { icon: 'ball/poke', label: 'Na equipe', value: `${app.state.party.length}/6` },
      { icon: 'medicine/potion', label: 'Poções', value: fmt(sum(app, 'medicine')) },
      { icon: 'medicine/rare-candy', label: 'Nv. Treinador', value: fmt(trainerLevel(app.state)) },
    ],
  }),
  pc: (app) => ({
    npc: 'bill', name: 'Bill', title: 'PC de armazenamento',
    say: `Montei esse sistema de caixas! Cabem ${fmt(app.state.pcCapacity)} Pokémon; capturas além da equipe vêm para cá.`,
    stats: [
      { icon: 'storage/pokemon-box', label: 'Guardados', value: `${fmt(pcCount(app.state))}/${fmt(app.state.pcCapacity)}` },
      { icon: 'key-item/secret-key-kanto', label: 'Protegidos', value: fmt(Object.values(app.state.pokemon).filter((p) => p.locked).length) },
      { icon: 'key-item/shiny-charm', label: 'Shinies', value: fmt(Object.values(app.state.pokemon).filter((p) => p.shiny).length) },
    ],
  }),
  bag: (app) => ({
    npc: null, name: app.state.player.name || 'Treinador', title: 'Mochila',
    say: 'Bolas e remédios são usados sozinhos durante a hunt; itens de evolução e segurados, pela tela do Pokémon.',
    stats: [
      { icon: 'ball/poke', label: 'Poké Balls', value: fmt(sum(app, 'ball')) },
      { icon: 'medicine/potion', label: 'Remédios', value: fmt(sum(app, 'medicine')) },
      { icon: 'shard/red', label: 'Fragmentos', value: fmt(sum(app, 'material')) },
    ],
  }),
  shop: (app) => ({
    npc: 'clerk', name: 'Vendedor', title: 'Poké Mart',
    say: 'Olá! Bem-vindo à Poké Mart. Com mais insígnias, chegam bolas e remédios melhores.',
    stats: [
      { icon: 'valuable-item/relic-gold', label: 'Dinheiro', value: `₽${fmt(app.state.player.money)}` },
      { icon: 'key-item/medal-box', label: 'Insígnias', value: fmt(app.state.player.badges.length) },
    ],
  }),
  workshop: (app) => ({
    npc: 'scientist-gen3', name: 'Cientista', title: 'Oficina',
    say: 'Traga fragmentos das hunts e eu fabrico melhorias e itens. Regiões mais difíceis rendem mais fragmentos!',
    stats: FRAGMENTS.map((id) => ({ icon: `shard/${id.split('-')[0]}`, label: app.data.items.get(id)!.name.replace('Fragmento ', ''), value: fmt(app.state.inventory[id] ?? 0) })),
  }),
  research: (app) => ({
    npc: 'oak', name: 'Prof. Carvalho', title: 'Pesquisa',
    say: 'Pontos de Pesquisa vêm de espécies novas, treinadores, ginásios e transferências. Invista bem!',
    stats: [
      { icon: 'medicine/pp-up', label: 'PP', value: fmt(app.state.player.researchPoints) },
      { icon: 'ball/poke', label: 'Espécies', value: fmt(caughtSpeciesCount(app.state)) },
      { icon: 'key-item/journal', label: 'Marcos', value: `${app.state.milestonesClaimed.length}/${app.data.milestones.length}` },
    ],
  }),
  auto: (app) => ({
    npc: 'supernerd-gen3', name: 'Programador', title: 'Automações',
    say: 'Defina as regras e a equipe captura, cura e evolui sozinha, até offline. A primeira regra que combinar decide a bola.',
    stats: [
      { icon: 'ball/great', label: 'Regras ativas', value: fmt(app.state.captureRules.filter((r) => r.enabled).length) },
      { icon: 'medicine/potion', label: 'Poções', value: app.state.settings.autoPotion ? 'Ligado' : 'Desligado' },
    ],
  }),
  stats: (app) => ({
    npc: 'veteran', name: 'Veterano', title: 'Estatísticas',
    say: 'Números não mentem: compare as áreas no Hunt Analyzer antes de escolher onde treinar.',
    stats: [
      { icon: 'key-item/vs-recorder', label: 'Vitórias', value: fmt(app.state.stats.battlesWon) },
      { icon: 'ball/poke', label: 'Capturas', value: fmt(app.state.stats.captures) },
      { icon: 'key-item/medal-box', label: 'Conquistas', value: fmt(app.state.achievements.length) },
    ],
  }),
  settings: (app) => ({
    npc: null, name: app.state.player.name || 'Treinador', title: 'Ajustes',
    say: 'Escolha seu avatar, o tema e faça backup do save quando quiser.',
    stats: [{ icon: 'key-item/teachy-tv', label: 'Tempo de jogo', value: `${Math.floor(app.state.meta.playTimeMs / 3_600_000)} h` }],
  }),
};

export function hasHero(screen: string): boolean {
  return screen in HEROES;
}

export function ScreenHero({ screen }: { screen: string }) {
  const app = useApp();
  const make = HEROES[screen];
  if (!make) return null;
  const h = make(app);
  const sprite = h.npc ?? app.state.player.avatar ?? DEFAULT_AVATAR;
  return (
    <header class="hero">
      <img class="hero__npc" src={trainerSprite(sprite)} alt="" />
      <div class="hero__talk">
        <h1 class="hero__title">{h.title}</h1>
        <div class="hero__box">
          <b>{h.name}</b>
          <p>{h.say}</p>
        </div>
      </div>
      <dl class="hero__stats">
        {h.stats.map((st) => (
          <div key={st.label} class="hero__stat">
            <img src={uiIcon(st.icon)} width={40} height={40} alt="" />
            <dt>{st.label}</dt>
            <dd class="pk-num">{st.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
