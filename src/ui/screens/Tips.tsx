import type { ScreenProps } from '../App';
import { Window, useApp } from '../components';
import { areaUnlocked, caughtSpeciesCount, isFarmArea } from '../../core/world';

/** Dicas contextuais para os primeiros passos (somem conforme o jogador avança). */
export function Tips({ go }: ScreenProps) {
  const app = useApp();
  const s = app.state;
  const tips: { text: string; action?: { label: string; screen: string } }[] = [];
  const unlockedChallenge = [...app.data.areas.values()].find(
    (a) => !isFarmArea(a) && areaUnlocked(s, app.data, a) && !(a.league && s.player.champions.includes(a.regionId)),
  );
  const current = app.data.areas.get(s.world.activeAreaId)!;
  if (caughtSpeciesCount(s) < 3) tips.push({ text: 'Sua equipe captura automaticamente espécies novas com Poké Balls. Ajuste as regras no Auto Manager.', action: { label: 'Auto Manager', screen: 'auto' } });
  if ((s.inventory['poke-ball'] ?? 0) < 5 && s.player.money >= 1000) tips.push({ text: 'Poucas Poké Balls! Compre mais na loja.', action: { label: 'Loja', screen: 'shop' } });
  if (s.world.areas[current.id]?.cleared) tips.push({ text: 'Esta área está concluída. Veja novas áreas no mapa — ou use o Hunt Analyzer para achar a melhor.', action: { label: 'Mapa', screen: 'map' } });
  if (unlockedChallenge && s.player.badges.length < 3) tips.push({ text: `${unlockedChallenge.name} está disponível. Ginásios não regeneram PS entre lutas: leve Poções.`, action: { label: 'Mapa', screen: 'map' } });
  if (s.party.length < 6 && Object.keys(s.pokemon).length > s.party.length) tips.push({ text: 'Há vaga na equipe e Pokémon no PC. Membros extras ganham XP pela Exp. Share.', action: { label: 'PC', screen: 'pc' } });
  if (s.player.researchPoints >= 10 && Object.keys(s.upgrades).length === 0) tips.push({ text: 'Você tem Pontos de Pesquisa para gastar em melhorias permanentes.', action: { label: 'Pesquisa', screen: 'research' } });
  if (!tips.length || s.player.badges.length >= 4) return null;
  return (
    <Window title="Próximos passos">
      <div class="stack" style={{ gap: '6px' }}>
        {tips.slice(0, 3).map((t) => (
          <div key={t.text} class="row spread small">
            <span>{t.text}</span>
            {t.action && <button class="pk-btn pk-btn--sm" onClick={() => go(t.action!.screen)}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </Window>
  );
}
