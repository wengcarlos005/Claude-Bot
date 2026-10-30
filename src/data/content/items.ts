import type { ItemDef } from './types';
import type { TypeId } from '../types';

// Catálogo de itens do jogo. Preços em Pokédólares (₽). `shopBadges` = insígnias (somando todas as regiões)
// necessárias para o item aparecer na loja. Itens de evolução sem definição aqui são gerados no registry.

const typeBoost = (id: string, type: TypeId, name?: string): ItemDef => ({
  id,
  name,
  description: `Segurado: golpes do tipo ${type} causam +20% de dano.`,
  category: 'held',
  price: 3000,
  shopBadges: 4,
  effect: { kind: 'typeBoost', type, mult: 1.2 },
});

export const ITEMS: ItemDef[] = [
  // ---------- Poké Balls ----------
  { id: 'poke-ball', description: 'Bola básica. Multiplicador ×1.', category: 'ball', price: 200, shopBadges: 0, effect: { kind: 'ball', mult: 1 } },
  { id: 'great-ball', description: 'Multiplicador ×1,5.', category: 'ball', price: 600, shopBadges: 1, effect: { kind: 'ball', mult: 1.5 } },
  { id: 'ultra-ball', description: 'Multiplicador ×2.', category: 'ball', price: 1200, shopBadges: 4, effect: { kind: 'ball', mult: 2 } },
  {
    id: 'net-ball', description: '×3 contra Pokémon de Água ou Inseto; ×1 nos demais.', category: 'ball', price: 1000, shopBadges: 2,
    effect: { kind: 'ball', mult: 1, bonus: { kind: 'types', types: ['water', 'bug'], mult: 3 } },
  },
  {
    id: 'dusk-ball', description: '×3 à noite (18h–6h) ou em cavernas; ×1 nos demais.', category: 'ball', price: 1000, shopBadges: 3,
    effect: { kind: 'ball', mult: 1, bonus: { kind: 'nightOrCave', mult: 3 } },
  },
  {
    id: 'quick-ball', description: '×4 no primeiro arremesso da batalha; ×1 depois.', category: 'ball', price: 1000, shopBadges: 3,
    effect: { kind: 'ball', mult: 1, bonus: { kind: 'firstThrow', mult: 4 } },
  },
  {
    id: 'repeat-ball', description: '×3,5 em espécies já capturadas; ×1 nas novas.', category: 'ball', price: 1000, shopBadges: 3,
    effect: { kind: 'ball', mult: 1, bonus: { kind: 'alreadyCaught', mult: 3.5 } },
  },
  { id: 'master-ball', description: 'Captura garantida. Não é vendida.', category: 'ball', price: null, effect: { kind: 'ball', mult: 1, bonus: { kind: 'master' } } },

  // ---------- Remédios ----------
  { id: 'potion', description: 'Recupera 20 PS.', category: 'medicine', price: 300, shopBadges: 0, effect: { kind: 'heal', hp: 20 } },
  { id: 'super-potion', description: 'Recupera 60 PS.', category: 'medicine', price: 700, shopBadges: 2, effect: { kind: 'heal', hp: 60 } },
  { id: 'hyper-potion', description: 'Recupera 120 PS.', category: 'medicine', price: 1500, shopBadges: 5, effect: { kind: 'heal', hp: 120 } },
  { id: 'max-potion', description: 'Recupera todos os PS.', category: 'medicine', price: 2500, shopBadges: 7, effect: { kind: 'heal', hp: 'full' } },
  { id: 'revive', description: 'Reanima um Pokémon desmaiado com 50% dos PS.', category: 'medicine', price: 2000, shopBadges: 3, effect: { kind: 'revive', fraction: 0.5 } },
  { id: 'rare-candy', description: 'Sobe 1 nível (respeita o teto de nível).', category: 'medicine', price: null, effect: { kind: 'rareCandy' } },

  // ---------- Vitaminas (+10 EVs, até 252 por atributo) ----------
  { id: 'hp-up', description: '+10 EVs de PS.', category: 'vitamin', price: 9800, shopBadges: 5, effect: { kind: 'vitamin', stat: 'hp' } },
  { id: 'protein', description: '+10 EVs de Ataque.', category: 'vitamin', price: 9800, shopBadges: 5, effect: { kind: 'vitamin', stat: 'atk' } },
  { id: 'iron', description: '+10 EVs de Defesa.', category: 'vitamin', price: 9800, shopBadges: 5, effect: { kind: 'vitamin', stat: 'def' } },
  { id: 'calcium', description: '+10 EVs de Ataque Especial.', category: 'vitamin', price: 9800, shopBadges: 5, effect: { kind: 'vitamin', stat: 'spa' } },
  { id: 'zinc', description: '+10 EVs de Defesa Especial.', category: 'vitamin', price: 9800, shopBadges: 5, effect: { kind: 'vitamin', stat: 'spd' } },
  { id: 'carbos', description: '+10 EVs de Velocidade.', category: 'vitamin', price: 9800, shopBadges: 5, effect: { kind: 'vitamin', stat: 'spe' } },

  // ---------- Itens segurados ----------
  typeBoost('charcoal', 'fire'),
  typeBoost('mystic-water', 'water'),
  typeBoost('miracle-seed', 'grass'),
  typeBoost('magnet', 'electric'),
  typeBoost('never-melt-ice', 'ice'),
  typeBoost('black-belt', 'fighting'),
  typeBoost('poison-barb', 'poison'),
  typeBoost('soft-sand', 'ground'),
  typeBoost('sharp-beak', 'flying'),
  typeBoost('twisted-spoon', 'psychic'),
  typeBoost('silver-powder', 'bug'),
  typeBoost('hard-stone', 'rock'),
  typeBoost('spell-tag', 'ghost'),
  typeBoost('dragon-fang', 'dragon'),
  typeBoost('black-glasses', 'dark'),
  typeBoost('silk-scarf', 'normal'),
  { ...typeBoost('metal-coat', 'steel'), description: 'Segurado: +20% em golpes de Aço. Também usado em evoluções por Cabo de Ligação.' },
  { id: 'muscle-band', description: 'Segurado: +10% de dano físico.', category: 'held', price: 4000, shopBadges: 5, effect: { kind: 'categoryBoost', category: 'physical', mult: 1.1 } },
  { id: 'wise-glasses', description: 'Segurado: +10% de dano especial.', category: 'held', price: 4000, shopBadges: 5, effect: { kind: 'categoryBoost', category: 'special', mult: 1.1 } },
  { id: 'leftovers', description: 'Segurado: recupera 1/16 dos PS a cada turno em batalha.', category: 'held', price: null, effect: { kind: 'leftovers' } },
  { id: 'lucky-egg', description: 'Segurado: +50% de XP para quem segura.', category: 'held', price: null, effect: { kind: 'xpBoost', mult: 1.5 } },
  { id: 'amulet-coin', description: 'Segurado: +50% de ₽ nas batalhas em que o Pokémon lutar.', category: 'held', price: null, effect: { kind: 'moneyBoost', mult: 1.5 } },
  { id: 'everstone', description: 'Segurado: impede a evolução.', category: 'held', price: 3000, shopBadges: 1, effect: { kind: 'everstone' } },
  { id: 'soothe-bell', description: 'Segurado: a amizade cresce 2× mais rápido.', category: 'held', price: 5000, shopBadges: 3, effect: { kind: 'friendshipBoost', mult: 2 } },

  // ---------- Boosts temporários (contam tempo de jogo, inclusive offline) ----------
  { id: 'repel', description: '30 min: ignora selvagens com nível abaixo do seu líder −5 (só encontros úteis).', category: 'boost', price: 400, shopBadges: 1, effect: { kind: 'repel', minutes: 30 } },
  { id: 'super-repel', description: '60 min de Repel.', category: 'boost', price: 700, shopBadges: 3, effect: { kind: 'repel', minutes: 60 } },
  { id: 'max-repel', description: '120 min de Repel.', category: 'boost', price: 1100, shopBadges: 5, effect: { kind: 'repel', minutes: 120 } },

  // ---------- Itens-chave ----------
  // ---- Fragmentos (caem nas hunts; usados na Oficina; negociáveis no Mercado no futuro) ----
  { id: 'red-shard', name: 'Fragmento Vermelho', description: 'Material comum. Cai de selvagens e treinadores.', category: 'material', price: null, effect: { kind: 'material' } },
  { id: 'blue-shard', name: 'Fragmento Azul', description: 'Material incomum. Treinadores e desafios rendem mais.', category: 'material', price: null, effect: { kind: 'material' } },
  { id: 'green-shard', name: 'Fragmento Verde', description: 'Material raro. Ginásios e Ligas garantem alguns.', category: 'material', price: null, effect: { kind: 'material' } },
  { id: 'yellow-shard', name: 'Fragmento Amarelo', description: 'Material épico. Insígnias, títulos de Campeão, shinies e lendários.', category: 'material', price: null, effect: { kind: 'material' } },
  { id: 'bicycle', description: 'Reduz o intervalo entre encontros em 20%.', category: 'key', price: null, effect: { kind: 'key' } },
  { id: 'old-rod', description: 'Libera encontros de pesca (Vara Velha).', category: 'key', price: null, effect: { kind: 'key' } },
  { id: 'good-rod', description: 'Libera encontros de pesca (Vara Boa).', category: 'key', price: null, effect: { kind: 'key' } },
  { id: 'super-rod', description: 'Libera encontros de pesca (Super Vara).', category: 'key', price: null, effect: { kind: 'key' } },
  { id: 'hm-surf', name: 'HM Surf', description: 'Libera encontros na água e rotas marítimas.', category: 'key', price: null, effect: { kind: 'key' }, sprite: 'hm-water' },
  { id: 'shiny-charm', description: 'Recompensa de Pokédex: chance de shiny ×2.', category: 'key', price: null, effect: { kind: 'key' } },
  { id: 'oval-charm', description: 'Recompensa de Pokédex: +10% de chance de captura.', category: 'key', price: null, effect: { kind: 'key' } },
  { id: 'link-cable', name: 'Cabo de Ligação', description: 'Substitui a troca: evolui Pokémon que evoluem por troca (consumido).', category: 'evolution', price: 3000, shopBadges: 3, effect: { kind: 'evolution' }, sprite: 'link-cable' },
];

/** Pedras e itens de evolução: preço padrão e insígnias para aparecer na loja. */
export const EVOLUTION_STONES = new Set([
  'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone',
  'dawn-stone', 'ice-stone',
]);
