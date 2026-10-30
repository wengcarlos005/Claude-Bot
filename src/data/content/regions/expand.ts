// Expansão do mapa: cada andar/subárea dos jogos vira uma área própria (Mt. Moon 1F, B1F, B2F…) e os locais que os
// dados têm, mas o conteúdo autoral ainda não usava (Ilhas Sevii, Kanto de HG/SS…), entram como áreas extras.
// Assim cada região passa de 100 áreas sem inventar encontros: tudo vem das tabelas reais dos jogos.
import type { LocationEncounters } from '../../types';
import type { AreaDef, AreaKind, Requirement } from '../types';

interface ExtraGroup {
  /** A área depois da qual o grupo entra (ordem = progressão). */
  after: string;
  group?: string;
  prefix?: string;
  kind?: AreaKind;
  unlock: Requirement[];
  locations: string[];
  winsToClear?: number;
}

const champion = (regionId: string): Requirement => ({ type: 'championOf', regionId });
const keyItem = (itemId: string): Requirement => ({ type: 'keyItem', itemId });

const range = (prefix: string, items: (string | number)[]) => items.map((x) => `${prefix}${x}`);

const EXTRAS: Record<string, ExtraGroup[]> = {
  kanto: [
    {
      after: 'kanto-route-21', kind: 'city', unlock: [keyItem('hm-surf')], winsToClear: 10,
      locations: ['pallet-town', 'viridian-city', 'cerulean-city', 'vermilion-city', 'celadon-city', 'fuchsia-city', 'cinnabar-island'],
    },
    {
      after: 'kanto-cerulean-cave', group: 'Ilhas Sevii', unlock: [champion('kanto')], winsToClear: 15,
      locations: [
        'one-island', 'kindle-road', 'treasure-beach', 'mt-ember', 'mt-ember/1f-cave-behind-team-rocket', 'mt-ember/cave',
        'mt-ember/inside', 'mt-ember/b1f', 'mt-ember/b2f', 'mt-ember/b3f', 'mt-ember/summit', 'cape-brink', 'bond-bridge',
        'berry-forest', 'three-isle-port', 'four-island', 'icefall-cave/entrance', 'icefall-cave/1f', 'icefall-cave/b1f',
        'icefall-cave/waterfall', 'five-island', 'five-isle-meadow', 'memorial-pillar', 'water-labyrinth', 'resort-gorgeous',
        ...range('lost-cave/room-', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'lost-cave/item-rooms', 'outcast-island', 'green-path',
        'water-path', 'ruin-valley', 'pattern-bush', ...range('kanto-altering-cave/', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']),
        'canyon-entrance', 'sevault-canyon', 'tanoby-ruins', 'monean-chamber', 'liptoo-chamber', 'weepth-chamber',
        'dilford-chamber', 'scufib-chamber', 'rixy-chamber', 'viapos-chamber', 'trainer-tower',
      ],
    },
  ],
  johto: [
    {
      after: 'johto-league', group: 'Kanto (HG/SS)', prefix: 'Kanto · ', unlock: [champion('johto')], winsToClear: 15,
      locations: [
        'vermilion-city', 'vermilion-city/ss-anne-dock', 'kanto-route-6', 'kanto-route-5', 'cerulean-city', 'kanto-route-24',
        'kanto-route-25', 'kanto-route-9', 'kanto-route-10', 'rock-tunnel/1f', 'rock-tunnel/b1f', 'kanto-route-8', 'kanto-route-7',
        'celadon-city', 'kanto-route-16', 'kanto-route-17', 'kanto-route-18', 'fuchsia-city', 'kanto-route-15', 'kanto-route-14',
        'kanto-route-13', 'kanto-route-12', 'kanto-route-11', 'digletts-cave', 'kanto-route-2/south-towards-viridian-city',
        'viridian-forest', 'kanto-route-2/north-towards-pewter-city', 'kanto-route-3', 'mt-moon/1f', 'mt-moon/2f',
        'mt-moon/mt-moon-square', 'kanto-route-4', 'kanto-route-1', 'pallet-town', 'viridian-city', 'kanto-route-22',
        'kanto-sea-route-21', 'cinnabar-island', 'kanto-sea-route-20', 'seafoam-islands/1f', 'seafoam-islands/b1f',
        'seafoam-islands/b2f', 'seafoam-islands/b3f', 'seafoam-islands/b4f', 'kanto-sea-route-19', 'cerulean-cave/1f',
        'cerulean-cave/2f', 'cerulean-cave/b1f',
      ],
    },
  ],
  hoenn: [{ after: 'hoenn-artisan-cave', kind: 'cave', unlock: [champion('hoenn')], winsToClear: 15, locations: ['hoenn-altering-cave'] }],
  sinnoh: [],
};

// ------------------------------------------------------------------ nomes em português

const BASES: Record<string, string> = {
  'Pokémon Tower': 'Torre Pokémon', 'Safari Zone': 'Zona Safari', 'Johto Safari Zone': 'Zona Safari de Johto',
  'Seafoam Islands': 'Ilhas Seafoam', 'Pokémon Mansion': 'Mansão Pokémon', 'Cerulean Cave': 'Caverna Cerulean',
  'Sprout Tower': 'Torre Sprout', 'National Park': 'Parque Nacional', 'Burned Tower': 'Torre Queimada',
  'Ruins of Alph': 'Ruínas de Alph', 'Slowpoke Well': 'Poço Slowpoke', 'Lake of Rage': 'Lago da Fúria',
  'Whirl Islands': 'Ilhas Redemoinho', 'Bell Tower': 'Torre do Sino', 'Ice Path': 'Caminho de Gelo',
  "Dragon's Den": 'Covil do Dragão', "Diglett's Cave": 'Caverna Diglett', 'Dark Cave': 'Caverna Escura',
  'Abandoned Ship': 'Navio Abandonado', 'New Mauville': 'Nova Mauville', 'Shoal Cave': 'Caverna Shoal',
  'Mirage Island': 'Ilha Miragem', 'Meteor Falls': 'Cataratas Meteoro', 'Cave of Origin': 'Caverna da Origem',
  'Sky Pillar': 'Pilar Celeste', 'Lake Verity': 'Lago Verity', 'Oreburgh Gate': 'Portão de Oreburgh',
  'Oreburgh Mine': 'Mina de Oreburgh', 'Ravaged Path': 'Caminho Devastado', 'Old Chateau': 'Velho Castelo',
  'Wayward Cave': 'Caverna Wayward', 'Lost Tower': 'Torre Perdida', 'Solaceon Ruins': 'Ruínas de Solaceon',
  'Ruin Maniac Cave': 'Caverna do Maníaco', 'Maniac Tunnel': 'Túnel do Maníaco', 'Great Marsh': 'Grande Pântano',
  'Trophy Garden': 'Jardim de Troféus', 'Iron Island': 'Ilha de Ferro', 'Snowpoint Temple': 'Templo de Snowpoint',
  'Stark Mountain': 'Monte Stark', 'Resort Area': 'Área Resort', 'Sendoff Spring': 'Fonte Sendoff',
  'Turnback Cave': 'Caverna Turnback', 'Pokémon League': 'Liga Pokémon', 'Kanto Power Plant': 'Usina Elétrica',
  'Altering Cave': 'Caverna Mutante', 'Lost Cave': 'Caverna Perdida', 'Icefall Cave': 'Caverna da Cascata de Gelo',
  'Tohjo Falls': 'Cachoeiras Tohjo', 'Viridian Forest': 'Floresta de Viridian', 'Ilex Forest': 'Floresta Ilex',
  'Eterna Forest': 'Floresta de Eterna', 'Petalburg Woods': 'Bosque de Petalburg', 'Cinnabar Island': 'Ilha Cinnabar',
  'Berry Forest': 'Floresta das Frutas', 'Bond Bridge': 'Ponte do Laço', 'Canyon Entrance': 'Entrada do Cânion',
  'Cape Brink': 'Cabo Brink', 'Five Isle Meadow': 'Prado da Ilha 5', 'Green Path': 'Trilha Verde',
  'Kindle Road': 'Estrada Kindle', 'Memorial Pillar': 'Pilar Memorial', 'Outcast Island': 'Ilha Pária',
  'Pattern Bush': 'Arbustos Estampados', 'Resort Gorgeous': 'Resort Gorgeous', 'Ruin Valley': 'Vale das Ruínas',
  'Sevault Canyon': 'Cânion Sevault', 'Tanoby Ruins': 'Ruínas Tanoby', 'Three Isle Port': 'Porto da Ilha 3',
  'Trainer Tower': 'Torre dos Treinadores', 'Treasure Beach': 'Praia do Tesouro', 'Water Labyrinth': 'Labirinto Aquático',
  'Water Path': 'Trilha Aquática', 'Valor Lakefront': 'Margem do Lago Valor', 'Acuity Lakefront': 'Margem do Lago Acuity',
  'Lake Acuity': 'Lago Acuity', 'Lake Valor': 'Lago Valor', 'Valley Windworks': 'Usina de Vento do Vale',
  'Fuego Ironworks': 'Siderúrgica Fuego', 'Fiery Path': 'Caminho Ardente', 'Jagged Pass': 'Passagem Irregular',
  'Magma Hideout': 'Esconderijo Magma', 'Mirage Tower': 'Torre Miragem', 'Rusturf Tunnel': 'Túnel Rusturf',
  'Seafloor Cavern': 'Caverna do Fundo do Mar', 'Artisan Cave': 'Caverna Artesã', 'Desert Underpass': 'Passagem Subterrânea do Deserto',
};
const ISLANDS: Record<string, string> = { One: '1', Two: '2', Three: '3', Four: '4', Five: '5', Six: '6', Seven: '7' };

const PARENS: Record<string, string> = {
  Entrance: 'Entrada', Waterfall: 'Cachoeira', Middle: 'Centro', 'Area 1 East': 'Área 1 (Leste)',
  'Area 2 North': 'Área 2 (Norte)', 'Area 3 West': 'Área 3 (Oeste)', 'Item Rooms': 'Salas de Itens',
  '1f Cave Behind Team Rocket': 'Gruta da Equipe Rocket', Cave: 'Gruta', Inside: 'Interior', Summit: 'Cume',
  Desert: 'Deserto', Forest: 'Floresta', Marshland: 'Pântano', Meadow: 'Prado', Mountain: 'Montanha', Peak: 'Pico',
  Plains: 'Planície', 'Rocky Beach': 'Praia Rochosa', Savannah: 'Savana', Swamp: 'Brejo', Wasteland: 'Terra Árida',
  Wetland: 'Charco', 'Blackthorn City Entrance': 'Entrada de Blackthorn', 'Violet City Entrance': 'Entrada de Violet',
  'Cave Gate': 'Portão da Caverna', 'Inside Cave': 'Cliff Cave', 'Mt Moon Square': 'Praça do Mt. Moon',
  'Lower Cave': 'Gruta Inferior', 'Upper Cave': 'Gruta Superior', '1f Top': '1F Superior', Mountainside: 'Encosta',
  Outside: 'Exterior', Top: 'Topo', 'Ss Anne Dock': 'Doca do S.S. Anne', '1fsmall Room': '1F Sala Pequena',
  'Expansion North': 'Expansão Norte', 'Expansion South': 'Expansão Sul', 'Neacro Bike Area': 'Área Nordeste',
  'Nwmach Bike Area': 'Área Noroeste', Se: 'Sudeste', Sw: 'Sudoeste', Back: 'Fundo', 'Backsmall Room': 'Fundo · Sala Pequena',
  'High Tide': 'Maré Alta', 'Low Tide': 'Maré Baixa', 'B1f Left': 'B1F Esquerda', 'B1f Right': 'B1F Direita',
  'B2f Left': 'B2F Esquerda', 'B2f Right': 'B2F Direita', '1f From Exterior': '1F (Exterior)', '1f Route 207': '1F (Rota 207)',
  '1f Route 211': '1F (Rota 211)', '1f Route 216': '1F (Rota 216)', '4f Small Room': '4F Sala Pequena',
  'Exterior Blizzard': 'Nevasca', 'Exterior Snowfall': 'Nevada', '2f Left Room': '2F Sala Esquerda',
  '2f Leftmost Room': '2F Sala do Canto Esquerdo', '2f Middle Room': '2F Sala do Meio', '2f Private Room': '2F Quarto',
  '2f Right Room': '2F Sala Direita', '2f Rightmost Room': '2F Sala do Canto Direito', 'Dining Room': 'Sala de Jantar',
  '0 9 Different Unown Caught': '0–9 Unown', '10 25 Different Unown Caught': '10–25 Unown',
  '26 Plus Different Unown Caught': '26+ Unown', 'Inside B1f': 'Interior B1F', 'Inside Exit': 'Saída',
  'After Pillar 3': 'Após o Pilar 3', 'Before Pillar 1': 'Antes do Pilar 1', 'Between Pillars 1 And 2': 'Entre os Pilares 1 e 2',
  'Between Pillars 2 And 3': 'Entre os Pilares 2 e 3',
};
const DIRECTIONS: Record<string, string> = { North: 'Norte', South: 'Sul', East: 'Leste', West: 'Oeste' };

function translateBase(base: string): string {
  if (BASES[base]) return BASES[base];
  let m: RegExpMatchArray | null;
  if ((m = base.match(/^Sea Route (\d+)$/))) return `Rota Marítima ${m[1]}`;
  if ((m = base.match(/^Route (\d+)$/))) return `Rota ${m[1]}`;
  if ((m = base.match(/^(\w+) Island$/)) && ISLANDS[m[1]]) return `Ilha ${ISLANDS[m[1]]}`;
  if ((m = base.match(/^(.*) Island$/))) return `Ilha ${m[1]}`;
  if ((m = base.match(/^(.*) City$/))) return `Cidade de ${m[1]}`;
  if ((m = base.match(/^(.*) Town$/))) return `Vila ${m[1]}`;
  if ((m = base.match(/^(.*) Chamber$/))) return `Câmara ${m[1]}`;
  return base;
}

/** Tradução da parte entre parênteses: andares, salas, zonas e direções. */
function translateParen(p: string): { text: string; direction: boolean } {
  const dir = p.match(/^(North|South|East|West) Towards /);
  if (dir) return { text: DIRECTIONS[dir[1]], direction: true };
  if (PARENS[p]) return { text: PARENS[p], direction: false };
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^(B?\d+f)( [A-E])?$/i))) return { text: `${m[1].toUpperCase()}${m[2] ?? ''}`, direction: false };
  if ((m = p.match(/^Room (\d+)$/))) return { text: `Sala ${m[1]}`, direction: false };
  if ((m = p.match(/^Area (\d+)$/))) return { text: `Área ${m[1]}`, direction: false };
  if ((m = p.match(/^Pillar (\d+)$/))) return { text: `Pilar ${m[1]}`, direction: false };
  if ((m = p.match(/^Interior ([A-D])$/))) return { text: `Interior ${m[1]}`, direction: false };
  if (/^[A-I]$/.test(p)) return { text: p, direction: false };
  return { text: p, direction: false };
}

function splitName(en: string): { base: string; paren?: string } {
  if (en === 'Unknown; all bugs') return { base: 'National Park', paren: 'Concurso de Insetos' };
  const m = en.match(/^(.*?) \((.*)\)$/);
  return m ? { base: m[1], paren: m[2] } : { base: en };
}

/** Nome em português de um local dos dados (ex.: "Mt. Moon (B1f)" → "Mt. Moon · B1F"). */
export function locationName(en: string, baseOverride?: string): string {
  const { base, paren } = splitName(en);
  const b = baseOverride ?? translateBase(base);
  if (!paren) return b;
  if (paren === 'Concurso de Insetos') return `${b} · ${paren}`;
  if (/Galactic Intervention/.test(paren)) return b;
  const t = translateParen(paren);
  return t.direction ? `${b} (${t.text})` : `${b} · ${t.text}`;
}

const baseKey = (loc: string) => loc.split('/')[0];

/**
 * Expande as áreas de uma região: áreas com vários locais viram uma área por local (a primeira mantém o id original,
 * para não quebrar saves) e os grupos extras entram depois da área indicada.
 */
export function expandAreas(regionId: string, areas: AreaDef[], enc: Record<string, LocationEncounters>): AreaDef[] {
  const out: AreaDef[] = [];
  const extras = EXTRAS[regionId] ?? [];
  const name = (loc: string) => enc[loc]?.name ?? loc;
  for (const area of areas) {
    if (area.locations.length <= 1) out.push(area);
    else {
      const n = area.locations.length;
      const sameBase = area.locations.every((l) => baseKey(l) === baseKey(area.locations[0]));
      const trainers = area.trainers ?? 0;
      area.locations.forEach((loc, i) => {
        const last = i === n - 1;
        const { paren } = splitName(name(loc));
        const subName = sameBase
          ? paren ? locationName(name(loc), area.name) : `${area.name} · Exterior`
          : locationName(name(loc));
        out.push({
          ...area,
          id: i === 0 ? area.id : `${area.id}--${loc.replace(/\//g, '-')}`,
          name: subName,
          locations: [loc],
          trainers: Math.floor(trainers / n) + (i < trainers % n ? 1 : 0),
          winsToClear: Math.max(8, Math.ceil(((area.winsToClear ?? 10) * 1.5) / n)),
          extraSlots: last ? area.extraSlots : undefined,
          legendaries: last ? area.legendaries : undefined,
          clearReward: i === 0 ? area.clearReward : undefined,
          group: area.group,
        });
      });
    }
    for (const g of extras.filter((e) => e.after === area.id)) {
      for (const loc of g.locations) {
        if (!enc[loc]) throw new Error(`Extra de ${regionId}: local "${loc}" não existe`);
        const en = name(loc);
        const kind: AreaKind = g.kind ?? (/cave|tunnel|chamber|mt\.|mountain|path \(|labyrinth/i.test(en) ? 'cave'
          : /forest|woods|meadow|bush|garden/i.test(en) ? 'forest'
          : /sea route|beach|island|port|cape|water/i.test(en) ? 'water'
          : /city|town/i.test(en) ? 'city'
          : /tower|mansion|plant|ship|dock/i.test(en) ? 'building' : 'route');
        out.push({
          id: `${regionId}-x-${loc.replace(/\//g, '-')}`,
          name: `${g.prefix ?? ''}${locationName(en)}`,
          kind,
          locations: [loc],
          unlock: g.unlock,
          winsToClear: g.winsToClear ?? 10,
          group: g.group,
          tags: kind === 'cave' ? ['cave'] : undefined,
        });
      }
    }
  }
  return out;
}
