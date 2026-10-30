import type { MilestoneDef, UpgradeDef } from './types';

// Melhorias permanentes. custo(n) = baseCost · growth^n (n = nível atual). Valores analisados em docs/BALANCE.md.
export const UPGRADES: UpgradeDef[] = [
  // ---- Pokédólares ----
  { id: 'running-shoes', name: 'Tênis de Corrida', description: '−8% no intervalo entre encontros por nível.', currency: 'money', baseCost: 1500, growth: 1.9, maxLevel: 10 },
  { id: 'amulet', name: 'Moeda da Sorte', description: '+10% de ₽ por nível.', currency: 'money', baseCost: 2500, growth: 1.8, maxLevel: 10 },
  { id: 'capture-skill', name: 'Técnica de Arremesso', description: '+5% de chance de captura por nível.', currency: 'money', baseCost: 3000, growth: 1.8, maxLevel: 10 },
  { id: 'nurse', name: 'Enfermeira Dedicada', description: '−15% no tempo do Centro Pokémon por nível.', currency: 'money', baseCost: 2000, growth: 2, maxLevel: 5 },
  { id: 'regen', name: 'Lanche de Viagem', description: '+1%/s de regeneração de PS enquanto explora, por nível.', currency: 'money', baseCost: 2000, growth: 2.1, maxLevel: 5 },
  { id: 'academy', name: 'Academia Pokémon', description: '+1% em todos os atributos de todos os seus Pokémon, por nível.', currency: 'money', baseCost: 25000, growth: 1.18, maxLevel: 50, requires: [{ type: 'badgeCount', min: 4 }] },
  { id: 'pc-boxes', name: 'Caixas do PC', description: '+30 espaços no PC por nível.', currency: 'money', baseCost: 5000, growth: 1.5, maxLevel: 30 },
  // ---- Pontos de Pesquisa ----
  { id: 'xp-boost', name: 'Treinamento Avançado', description: '+10% de XP por nível.', currency: 'research', baseCost: 10, growth: 1.7, maxLevel: 10 },
  { id: 'exp-share', name: 'Exp. Share', description: '+10% da XP para quem não lutou, por nível (base 25%).', currency: 'research', baseCost: 15, growth: 1.8, maxLevel: 7 },
  { id: 'battle-speed', name: 'Velocidade de Batalha', description: '−10% no tempo de cada ação em batalha, por nível.', currency: 'research', baseCost: 20, growth: 2, maxLevel: 5 },
  { id: 'extra-throws', name: 'Persistência', description: '+1 arremesso de Poké Ball por encontro, por nível (base 3).', currency: 'research', baseCost: 25, growth: 2.2, maxLevel: 3 },
  { id: 'offline-cap', name: 'Diário de Viagem', description: '+1 h no limite de progresso offline, por nível (base 8 h).', currency: 'research', baseCost: 15, growth: 1.35, maxLevel: 16 },
  { id: 'offline-efficiency', name: 'Equipe Autônoma', description: '+5% de eficiência offline, por nível (base 50%).', currency: 'research', baseCost: 20, growth: 1.5, maxLevel: 10 },
  { id: 'shiny-hunter', name: 'Olhar Treinado', description: '+25% de chance de shiny por nível.', currency: 'research', baseCost: 60, growth: 2, maxLevel: 6 },
  { id: 'auto-buyer', name: 'Comprador Automático', description: 'Recompra Poké Balls automaticamente dentro do orçamento definido.', currency: 'research', baseCost: 30, growth: 1, maxLevel: 1 },
];

// Marcos da Pesquisa do Professor (Pokédex Nacional, espécies capturadas).
export const MILESTONES: MilestoneDef[] = [
  { id: 'dex-5', caught: 5, rewards: [{ kind: 'items', items: { 'poke-ball': 10, potion: 5 } }] },
  { id: 'dex-10', caught: 10, rewards: [{ kind: 'xpMult', value: 0.05 }, { kind: 'researchPoints', value: 10 }] },
  { id: 'dex-20', caught: 20, rewards: [{ kind: 'items', items: { 'great-ball': 10 } }, { kind: 'moneyMult', value: 0.05 }] },
  { id: 'dex-30', caught: 30, rewards: [{ kind: 'items', items: { 'lucky-egg': 1 } }, { kind: 'researchPoints', value: 20 }] },
  { id: 'dex-40', caught: 40, rewards: [{ kind: 'captureMult', value: 0.05 }, { kind: 'statMult', value: 0.02 }] },
  { id: 'dex-50', caught: 50, rewards: [{ kind: 'items', items: { 'amulet-coin': 1 } }, { kind: 'moneyMult', value: 0.1 }] },
  { id: 'dex-65', caught: 65, rewards: [{ kind: 'xpMult', value: 0.1 }, { kind: 'items', items: { 'ultra-ball': 10 } }] },
  { id: 'dex-80', caught: 80, rewards: [{ kind: 'statMult', value: 0.03 }, { kind: 'items', items: { leftovers: 1 } }] },
  { id: 'dex-100', caught: 100, rewards: [{ kind: 'items', items: { 'master-ball': 1, 'oval-charm': 1 } }, { kind: 'captureMult', value: 0.1 }] },
  { id: 'dex-120', caught: 120, rewards: [{ kind: 'xpMult', value: 0.1 }, { kind: 'researchPoints', value: 50 }] },
  { id: 'dex-140', caught: 140, rewards: [{ kind: 'statMult', value: 0.05 }, { kind: 'items', items: { 'rare-candy': 10 } }] },
  { id: 'dex-150', caught: 150, rewards: [{ kind: 'pokemon', species: 'mew', level: 50 }, { kind: 'items', items: { 'shiny-charm': 1 } }] },
  { id: 'dex-200', caught: 200, rewards: [{ kind: 'moneyMult', value: 0.15 }, { kind: 'items', items: { 'master-ball': 1 } }] },
  { id: 'dex-250', caught: 250, rewards: [{ kind: 'xpMult', value: 0.15 }, { kind: 'pokemon', species: 'celebi', level: 60 }] },
  { id: 'dex-300', caught: 300, rewards: [{ kind: 'statMult', value: 0.05 }, { kind: 'researchPoints', value: 150 }] },
  { id: 'dex-386', caught: 386, rewards: [{ kind: 'pokemon', species: 'jirachi', level: 70 }, { kind: 'items', items: { 'master-ball': 2 } }] },
  { id: 'dex-450', caught: 450, rewards: [{ kind: 'captureMult', value: 0.15 }, { kind: 'statMult', value: 0.05 }] },
  { id: 'dex-493', caught: 493, rewards: [{ kind: 'pokemon', species: 'manaphy', level: 80 }, { kind: 'researchPoints', value: 300 }] },
];

// Afinidade (duplicatas da mesma linha evolutiva): pontos acumulados para cada nível. Bônus de +3% de atributos por nível.
export const AFFINITY_THRESHOLDS = [1, 3, 6, 10, 16, 25, 40, 60, 90, 130];
export const AFFINITY_STAT_BONUS = 0.03;

// Maestria (uso da espécie em batalha): vitórias como Pokémon ativo para cada nível. Bônus de +2% de XP e +1% de atributos por nível.
export const MASTERY_THRESHOLDS = [25, 75, 200, 500, 1000, 2000, 4000, 7000, 11000, 16000];
export const MASTERY_STAT_BONUS = 0.01;
export const MASTERY_XP_BONUS = 0.02;
