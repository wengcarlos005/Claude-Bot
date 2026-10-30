// Conquistas: metas de curto e longo prazo com recompensa em Pontos de Pesquisa.
export type AchievementMetric =
  | 'battlesWon' | 'captures' | 'shiniesCaught' | 'evolutions' | 'dexCaught' | 'badges' | 'champions' | 'moneyEarned'
  | 'transfers' | 'trainersDefeated' | 'affinityMax' | 'level100';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  rewardPP: number;
}

const A = (id: string, name: string, description: string, metric: AchievementMetric, target: number, rewardPP: number): AchievementDef => ({
  id, name, description, metric, target, rewardPP,
});

export const ACHIEVEMENTS: AchievementDef[] = [
  A('win-10', 'Primeiros passos', 'Vença 10 batalhas.', 'battlesWon', 10, 2),
  A('win-1k', 'Treinador dedicado', 'Vença 1.000 batalhas.', 'battlesWon', 1000, 10),
  A('win-10k', 'Veterano', 'Vença 10.000 batalhas.', 'battlesWon', 10000, 30),
  A('win-100k', 'Lenda das rotas', 'Vença 100.000 batalhas.', 'battlesWon', 100000, 100),
  A('cap-1', 'Gotcha!', 'Capture seu primeiro Pokémon.', 'captures', 1, 2),
  A('cap-100', 'Colecionador', 'Faça 100 capturas.', 'captures', 100, 15),
  A('cap-1k', 'Mestre das Poké Balls', 'Faça 1.000 capturas.', 'captures', 1000, 50),
  A('dex-25', 'Pesquisador iniciante', 'Registre 25 espécies.', 'dexCaught', 25, 10),
  A('dex-151', 'Kanto completa?', 'Registre 151 espécies.', 'dexCaught', 151, 50),
  A('dex-251', 'Duas regiões', 'Registre 251 espécies.', 'dexCaught', 251, 75),
  A('dex-493', 'Enciclopédia viva', 'Registre 493 espécies.', 'dexCaught', 493, 200),
  A('evo-1', 'Que transformação!', 'Evolua um Pokémon.', 'evolutions', 1, 3),
  A('evo-50', 'Professor de evolução', 'Realize 50 evoluções.', 'evolutions', 50, 25),
  A('shiny-1', 'Brilho raro', 'Capture um Pokémon shiny.', 'shiniesCaught', 1, 25),
  A('shiny-10', 'Caçador de brilhos', 'Capture 10 Pokémon shiny.', 'shiniesCaught', 10, 100),
  A('badge-1', 'Primeira insígnia', 'Ganhe uma insígnia.', 'badges', 1, 5),
  A('badge-8', 'Oito insígnias', 'Ganhe 8 insígnias.', 'badges', 8, 30),
  A('badge-32', 'Todas as insígnias', 'Ganhe as 32 insígnias.', 'badges', 32, 150),
  A('champ-1', 'Campeão!', 'Vença uma Liga Pokémon.', 'champions', 1, 50),
  A('champ-4', 'Campeão de quatro regiões', 'Vença as Ligas de Kanto, Johto, Hoenn e Sinnoh.', 'champions', 4, 300),
  A('money-1m', 'Milionário', 'Ganhe ₽1.000.000 no total.', 'moneyEarned', 1_000_000, 20),
  A('trainer-100', 'Desafiante', 'Derrote 100 treinadores.', 'trainersDefeated', 100, 15),
  A('transfer-100', 'Amigo do Professor', 'Transfira 100 Pokémon.', 'transfers', 100, 15),
  A('affinity-10', 'Laço inquebrável', 'Leve uma linha evolutiva à Afinidade 10.', 'affinityMax', 10, 50),
  A('lvl-100', 'Nível máximo', 'Tenha um Pokémon no nível 100.', 'level100', 1, 40),
];
