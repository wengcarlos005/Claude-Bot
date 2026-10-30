import type { RegionDef, TrainerDef, TrainerMon } from '../types';

const t = (id: string, name: string, trainerClass: string, moneyPerLevel: number, team: [string, number][]): TrainerDef => ({
  id, name, trainerClass, moneyPerLevel, team: team.map(([species, level]): TrainerMon => ({ species, level })),
});
const cleared = (areaId: string) => ({ type: 'areaCleared' as const, areaId });
const badge = (badgeId: string) => ({ type: 'badge' as const, badgeId });
const surf = { type: 'keyItem' as const, itemId: 'hm-surf' };

export const JOHTO: RegionDef = {
  id: 'johto',
  name: 'Johto',
  order: 2,
  unlock: [{ type: 'championOf', regionId: 'kanto' }],
  levelCaps: [72, 75, 78, 81, 85, 88, 91, 95, 100],
  championCap: 100,
  levelOffset: 59,
  xpMult: 0.6,
  winsMult: 1.5,
  levelScale: 0.85,
  statMult: 1,
  starters: ['chikorita', 'cyndaquil', 'totodile'],
  areas: [
    { id: 'johto-route-29', name: 'Rota 29', kind: 'route', locations: ['johto-route-29'], unlock: [], winsToClear: 10 },
    {
      id: 'johto-route-46', name: 'Rota 46', kind: 'route', locations: ['johto-route-46'], unlock: [cleared('johto-route-29')],
      trainers: 2, trainerClasses: ['Hiker', 'Camper'], winsToClear: 10,
    },
    {
      id: 'johto-route-30', name: 'Rota 30', kind: 'route', locations: ['johto-route-30', 'cherrygrove-city'], unlock: [cleared('johto-route-29')],
      trainers: 3, trainerClasses: ['Youngster', 'Bug Catcher'], winsToClear: 10,
    },
    {
      id: 'johto-route-31', name: 'Rota 31', kind: 'route', locations: ['johto-route-31', 'violet-city'], unlock: [cleared('johto-route-30')],
      trainers: 2, trainerClasses: ['Bug Catcher', 'Youngster'], winsToClear: 10,
    },
    {
      id: 'johto-dark-cave', name: 'Caverna Escura', kind: 'cave', locations: ['dark-cave/violet-city-entrance'],
      unlock: [cleared('johto-route-31')], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'johto-sprout-tower', name: 'Torre Sprout', kind: 'building', locations: ['sprout-tower/2f', 'sprout-tower/3f'],
      unlock: [cleared('johto-route-31')], trainers: 5, trainerClasses: ['Sage'], winsToClear: 15,
    },
    {
      id: 'johto-violet-gym', name: 'Ginásio de Violet', kind: 'gym', locations: [], unlock: [cleared('johto-sprout-tower')],
      gym: {
        badgeId: 'zephyr', badgeName: 'Insígnia Zéfiro', type: 'flying',
        trainers: [t('johto-violet-1', 'Abe', 'Bird Keeper', 24, [['spearow', 9]]), t('johto-violet-2', 'Rod', 'Bird Keeper', 24, [['pidgey', 7], ['pidgey', 7]])],
        leader: t('johto-falkner', 'Falkner', 'Líder de Ginásio', 120, [['pidgey', 9], ['pidgeotto', 13]]),
        reward: { money: 2000, items: { 'great-ball': 5, potion: 5, 'sharp-beak': 1 }, researchPoints: 10 },
      },
    },
    {
      id: 'johto-route-32', name: 'Rota 32', kind: 'route', locations: ['johto-route-32'], unlock: [badge('zephyr')],
      trainers: 6, trainerClasses: ['Youngster', 'Fisherman', 'Camper', 'Picnicker', 'Bird Keeper'], winsToClear: 15,
      extraSlots: [{ species: 'togepi', weight: 1, min: 5, max: 6 }],
    },
    {
      id: 'johto-union-cave', name: 'Union Cave', kind: 'cave', locations: ['union-cave/1f', 'union-cave/b1f'],
      unlock: [cleared('johto-route-32')], trainers: 3, trainerClasses: ['Hiker', 'Firebreather', 'Pokémaniac'], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'johto-route-33', name: 'Rota 33', kind: 'route', locations: ['johto-route-33'], unlock: [cleared('johto-union-cave')],
      trainers: 2, trainerClasses: ['Hiker', 'Picnicker'], winsToClear: 10,
      extraSlots: [{ species: 'aipom', weight: 2, min: 5, max: 8 }],
    },
    {
      id: 'johto-slowpoke-well', name: 'Poço Slowpoke', kind: 'cave', locations: ['slowpoke-well/1f'],
      unlock: [cleared('johto-route-33')], trainers: 4, trainerClasses: ['Rocket Grunt'], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'johto-azalea-gym', name: 'Ginásio de Azalea', kind: 'gym', locations: [], unlock: [cleared('johto-slowpoke-well')],
      gym: {
        badgeId: 'hive', badgeName: 'Insígnia Colmeia', type: 'bug',
        trainers: [
          t('johto-azalea-1', 'Al', 'Bug Catcher', 16, [['caterpie', 12], ['weedle', 12], ['caterpie', 12]]),
          t('johto-azalea-2', 'Amy & May', 'Twins', 20, [['spinarak', 10], ['ledyba', 10]]),
        ],
        leader: t('johto-bugsy', 'Bugsy', 'Líder de Ginásio', 120, [['metapod', 15], ['kakuna', 15], ['scyther', 17]]),
        reward: { money: 3000, items: { 'net-ball': 5, 'super-potion': 3, 'silver-powder': 1 }, researchPoints: 15 },
      },
    },
    {
      id: 'johto-ilex-forest', name: 'Floresta Ilex', kind: 'forest', locations: ['ilex-forest'], unlock: [badge('hive')],
      trainers: 1, trainerClasses: ['Bug Catcher'], winsToClear: 15,
      extraSlots: [{ species: 'pineco', weight: 2, min: 5, max: 8 }, { species: 'heracross', weight: 1, min: 6, max: 8 }],
    },
    {
      id: 'johto-route-34', name: 'Rota 34', kind: 'route', locations: ['johto-route-34'], unlock: [cleared('johto-ilex-forest')],
      trainers: 5, trainerClasses: ['Camper', 'Picnicker', 'Pokéfan', 'Officer'], winsToClear: 15,
      extraSlots: [{ species: 'cleffa', weight: 1, min: 8, max: 10 }, { species: 'igglybuff', weight: 1, min: 8, max: 10 }],
    },
    {
      id: 'johto-goldenrod-gym', name: 'Ginásio de Goldenrod', kind: 'gym', locations: [], unlock: [cleared('johto-route-34')],
      gym: {
        badgeId: 'plain', badgeName: 'Insígnia Planície', type: 'normal',
        trainers: [
          t('johto-goldenrod-1', 'Carrie', 'Lass', 16, [['snubbull', 18]]),
          t('johto-goldenrod-2', 'Victoria', 'Beauty', 48, [['sentret', 9], ['sentret', 13], ['sentret', 17]]),
        ],
        leader: t('johto-whitney', 'Whitney', 'Líder de Ginásio', 120, [['clefairy', 17], ['miltank', 19]]),
        reward: { money: 4000, items: { 'super-potion': 5, 'silk-scarf': 1, 'moon-stone': 1 }, researchPoints: 20 },
      },
    },
    {
      id: 'johto-route-35', name: 'Rota 35', kind: 'route', locations: ['johto-route-35'], unlock: [badge('plain')],
      trainers: 5, trainerClasses: ['Camper', 'Picnicker', 'Bird Keeper', 'Juggler', 'Officer'], winsToClear: 15,
      extraSlots: [{ species: 'eevee', weight: 2, min: 10, max: 14 }],
    },
    {
      id: 'johto-national-park', name: 'Parque Nacional', kind: 'special', locations: ['national-park', 'unknown-all-bugs'],
      unlock: [cleared('johto-route-35')], trainers: 4, trainerClasses: ['Schoolboy', 'Lass', 'Pokéfan'], winsToClear: 15,
      extraSlots: [
        { species: 'scyther', weight: 1, min: 12, max: 14 },
        { species: 'pinsir', weight: 1, min: 12, max: 14 },
        { species: 'pichu', weight: 1, min: 8, max: 10 },
      ],
    },
    {
      id: 'johto-route-36', name: 'Rota 36', kind: 'route', locations: ['johto-route-36'], unlock: [badge('plain')],
      trainers: 3, trainerClasses: ['Psychic', 'Schoolboy'], winsToClear: 15,
      extraSlots: [
        { species: 'sudowoodo', weight: 2, min: 20, max: 20 },
        { species: 'chikorita', weight: 1, min: 12, max: 15 },
        { species: 'cyndaquil', weight: 1, min: 12, max: 15 },
        { species: 'totodile', weight: 1, min: 12, max: 15 },
      ],
    },
    {
      id: 'johto-route-37', name: 'Rota 37', kind: 'route', locations: ['johto-route-37', 'ecruteak-city'], unlock: [cleared('johto-route-36')],
      trainers: 3, trainerClasses: ['Twins', 'Psychic'], winsToClear: 10,
      extraSlots: [{ species: 'houndour', weight: 1, min: 14, max: 16 }],
    },
    {
      id: 'johto-burned-tower', name: 'Torre Queimada', kind: 'building', locations: ['burned-tower/1f', 'burned-tower/b1f'],
      unlock: [cleared('johto-route-37')], trainers: 2, trainerClasses: ['Firebreather', 'Super Nerd'], winsToClear: 15,
      extraSlots: [{ species: 'slugma', weight: 1, min: 14, max: 16 }, { species: 'magby', weight: 1, min: 12, max: 14 }],
    },
    {
      id: 'johto-ecruteak-gym', name: 'Ginásio de Ecruteak', kind: 'gym', locations: [], unlock: [cleared('johto-burned-tower')],
      gym: {
        badgeId: 'fog', badgeName: 'Insígnia Névoa', type: 'ghost',
        trainers: [
          t('johto-ecruteak-1', 'Martha', 'Medium', 24, [['gastly', 18], ['haunter', 20], ['gastly', 20]]),
          t('johto-ecruteak-2', 'Jeffrey', 'Sage', 24, [['haunter', 22]]),
        ],
        leader: t('johto-morty', 'Morty', 'Líder de Ginásio', 120, [['gastly', 21], ['haunter', 21], ['haunter', 23], ['gengar', 25]]),
        reward: { money: 5500, items: { 'dusk-ball': 5, 'spell-tag': 1, 'hyper-potion': 2 }, researchPoints: 25 },
      },
    },
    {
      id: 'johto-ruins-of-alph', name: 'Ruínas de Alph', kind: 'special',
      locations: ['ruins-of-alph/outside', 'ruins-of-alph/interior-a', 'ruins-of-alph/interior-b', 'ruins-of-alph/interior-c', 'ruins-of-alph/interior-d'],
      unlock: [badge('fog')], winsToClear: 15,
    },
    {
      id: 'johto-union-cave-b2f', name: 'Union Cave B2F e Poço Slowpoke B1F', kind: 'cave', locations: ['union-cave/b2f', 'slowpoke-well/b1f'],
      unlock: [badge('fog'), surf], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'johto-route-38', name: 'Rota 38', kind: 'route', locations: ['johto-route-38'], unlock: [badge('fog')],
      trainers: 5, trainerClasses: ['Sailor', 'Beauty', 'Bird Keeper', 'Lass'], winsToClear: 15,
      extraSlots: [{ species: 'elekid', weight: 1, min: 13, max: 15 }],
    },
    {
      id: 'johto-route-39', name: 'Rota 39', kind: 'route', locations: ['johto-route-39'], unlock: [cleared('johto-route-38')],
      trainers: 4, trainerClasses: ['Sailor', 'Pokéfan', 'Psychic'], winsToClear: 15,
    },
    {
      id: 'johto-sea-route-40', name: 'Rota Marítima 40 e Olivine', kind: 'water', locations: ['johto-sea-route-40', 'olivine-city'],
      unlock: [cleared('johto-route-39'), surf], winsToClear: 10,
    },
    {
      id: 'johto-sea-route-41', name: 'Rota Marítima 41 e Cianwood', kind: 'water', locations: ['johto-sea-route-41', 'cianwood-city'],
      unlock: [cleared('johto-sea-route-40'), surf], winsToClear: 15,
    },
    {
      id: 'johto-cianwood-gym', name: 'Ginásio de Cianwood', kind: 'gym', locations: [], unlock: [cleared('johto-sea-route-41')],
      gym: {
        badgeId: 'storm', badgeName: 'Insígnia Tempestade', type: 'fighting',
        trainers: [t('johto-cianwood-1', 'Yoshi', 'Black Belt', 24, [['hitmonlee', 27]]), t('johto-cianwood-2', 'Lao', 'Black Belt', 24, [['hitmonchan', 27]])],
        leader: t('johto-chuck', 'Chuck', 'Líder de Ginásio', 120, [['primeape', 27], ['poliwrath', 30]]),
        reward: { money: 7000, items: { 'black-belt': 1, 'ultra-ball': 5, 'hyper-potion': 2 }, researchPoints: 35 },
      },
    },
    {
      id: 'johto-olivine-gym', name: 'Ginásio de Olivine', kind: 'gym', locations: [], unlock: [badge('storm')],
      gym: {
        badgeId: 'mineral', badgeName: 'Insígnia Mineral', type: 'steel',
        trainers: [t('johto-olivine-1', 'Garrett', 'Sailor', 32, [['magnemite', 29], ['magnemite', 29]]), t('johto-olivine-2', 'Preston', 'Gentleman', 48, [['onix', 30]])],
        leader: t('johto-jasmine', 'Jasmine', 'Líder de Ginásio', 120, [['magnemite', 30], ['magnemite', 30], ['steelix', 35]]),
        reward: { money: 8000, items: { 'metal-coat': 1, 'ultra-ball': 5, 'hyper-potion': 3 }, researchPoints: 40 },
      },
    },
    {
      id: 'johto-route-42', name: 'Rota 42', kind: 'route', locations: ['johto-route-42'], unlock: [badge('mineral')],
      trainers: 4, trainerClasses: ['Fisherman', 'Pokémaniac', 'Super Nerd'], winsToClear: 15,
    },
    {
      id: 'johto-mt-mortar', name: 'Mt. Mortar', kind: 'cave',
      locations: ['mt-mortar/1f', 'mt-mortar/b1f', 'mt-mortar/lower-cave', 'mt-mortar/upper-cave'],
      unlock: [cleared('johto-route-42')], trainers: 3, trainerClasses: ['Black Belt', 'Pokémaniac', 'Super Nerd'], winsToClear: 20, tags: ['cave'],
      extraSlots: [{ species: 'tyrogue', weight: 2, min: 15, max: 17 }],
    },
    {
      id: 'johto-route-43', name: 'Rota 43 e Lago da Fúria', kind: 'route', locations: ['johto-route-43', 'lake-of-rage'],
      unlock: [cleared('johto-route-42')], trainers: 5, trainerClasses: ['Camper', 'Picnicker', 'Fisherman', 'Pokémaniac'], winsToClear: 15,
      legendaries: [{ species: 'raikou', level: 40, chance: 1 / 400 }],
    },
    {
      id: 'johto-mahogany-gym', name: 'Ginásio de Mahogany', kind: 'gym', locations: [], unlock: [cleared('johto-route-43')],
      gym: {
        badgeId: 'glacier', badgeName: 'Insígnia Geleira', type: 'ice',
        trainers: [t('johto-mahogany-1', 'Roxanne', 'Skier', 24, [['jynx', 28]]), t('johto-mahogany-2', 'Ronald', 'Boarder', 24, [['seel', 24], ['dewgong', 26]])],
        leader: t('johto-pryce', 'Pryce', 'Líder de Ginásio', 120, [['seel', 30], ['dewgong', 32], ['piloswine', 34]]),
        reward: { money: 10000, items: { 'never-melt-ice': 1, 'water-stone': 1, 'ultra-ball': 10 }, researchPoints: 50 },
      },
    },
    {
      id: 'johto-route-47', name: 'Rotas 47–48 e Cliff Cave', kind: 'route',
      locations: ['johto-route-47', 'johto-route-47/cave-gate', 'johto-route-47/inside-cave', 'johto-route-48'],
      unlock: [badge('glacier')], trainers: 4, trainerClasses: ['Hiker', 'Cooltrainer', 'Black Belt'], winsToClear: 20,
    },
    {
      id: 'johto-safari-zone', name: 'Zona Safari de Johto', kind: 'special',
      locations: [
        'johto-safari-zone/plains', 'johto-safari-zone/meadow', 'johto-safari-zone/savannah', 'johto-safari-zone/peak',
        'johto-safari-zone/rocky-beach', 'johto-safari-zone/wetland', 'johto-safari-zone/forest', 'johto-safari-zone/swamp',
        'johto-safari-zone/marshland', 'johto-safari-zone/mountain', 'johto-safari-zone/desert', 'johto-safari-zone/wasteland',
      ],
      unlock: [cleared('johto-route-47')], winsToClear: 25,
    },
    {
      id: 'johto-whirl-islands', name: 'Ilhas Redemoinho', kind: 'cave',
      locations: ['whirl-islands/1f', 'whirl-islands/b1f', 'whirl-islands/b2f', 'whirl-islands/b3f'],
      unlock: [badge('glacier'), surf], trainers: 2, trainerClasses: ['Swimmer', 'Sage'], winsToClear: 20, tags: ['cave'],
      legendaries: [{ species: 'lugia', level: 45, chance: 1 / 500 }],
    },
    {
      id: 'johto-bell-tower', name: 'Torre do Sino', kind: 'building',
      locations: [
        'bell-tower/2f', 'bell-tower/3f', 'bell-tower/4f', 'bell-tower/5f', 'bell-tower/6f',
        'bell-tower/7f', 'bell-tower/8f', 'bell-tower/9f', 'bell-tower/10f',
      ],
      unlock: [badge('glacier')], trainers: 4, trainerClasses: ['Sage', 'Medium', 'Kimono Girl'], winsToClear: 20,
      legendaries: [{ species: 'ho-oh', level: 45, chance: 1 / 500 }],
    },
    {
      id: 'johto-route-44', name: 'Rota 44', kind: 'route', locations: ['johto-route-44'], unlock: [badge('glacier')],
      trainers: 5, trainerClasses: ['Fisherman', 'Bird Keeper', 'Psychic', 'Cooltrainer'], winsToClear: 15,
    },
    {
      id: 'johto-ice-path', name: 'Caminho de Gelo', kind: 'cave', locations: ['ice-path/1f', 'ice-path/b1f', 'ice-path/b2f', 'ice-path/b3f'],
      unlock: [cleared('johto-route-44')], winsToClear: 20, tags: ['cave'],
      extraSlots: [{ species: 'smoochum', weight: 1, min: 20, max: 22 }],
    },
    {
      id: 'johto-blackthorn-gym', name: 'Ginásio de Blackthorn', kind: 'gym', locations: [], unlock: [cleared('johto-ice-path')],
      gym: {
        badgeId: 'rising', badgeName: 'Insígnia Ascensão', type: 'dragon',
        trainers: [
          t('johto-blackthorn-1', 'Paul', 'Cooltrainer', 48, [['dratini', 34], ['dratini', 34], ['dratini', 34]]),
          t('johto-blackthorn-2', 'Fran', 'Cooltrainer', 48, [['seadra', 37]]),
        ],
        leader: t('johto-clair', 'Clair', 'Líder de Ginásio', 120, [['gyarados', 38], ['dragonair', 38], ['dragonair', 38], ['kingdra', 41]]),
        reward: { money: 12000, items: { 'dragon-fang': 1, 'dragon-scale': 1, 'ultra-ball': 10, 'max-potion': 3 }, researchPoints: 60 },
      },
    },
    {
      id: 'johto-dragons-den', name: 'Covil do Dragão', kind: 'cave', locations: ['dragons-den', 'blackthorn-city'],
      unlock: [badge('rising'), surf], trainers: 2, trainerClasses: ['Cooltrainer', 'Dragon Tamer'], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'johto-route-45', name: 'Rota 45', kind: 'route', locations: ['johto-route-45'], unlock: [badge('rising')],
      trainers: 6, trainerClasses: ['Hiker', 'Black Belt', 'Cooltrainer'], winsToClear: 15,
      legendaries: [{ species: 'entei', level: 40, chance: 1 / 400 }],
    },
    {
      id: 'johto-dark-cave-east', name: 'Caverna Escura (Lado de Blackthorn)', kind: 'cave', locations: ['dark-cave/blackthorn-city-entrance'],
      unlock: [cleared('johto-route-45')], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'johto-route-27', name: 'Rota 27', kind: 'route', locations: ['kanto-route-27', 'new-bark-town'], unlock: [badge('rising')],
      trainers: 5, trainerClasses: ['Cooltrainer', 'Psychic', 'Bird Keeper', 'Fisherman'], winsToClear: 20,
    },
    {
      id: 'johto-tohjo-falls', name: 'Cachoeiras Tohjo', kind: 'cave', locations: ['tohjo-falls'], unlock: [cleared('johto-route-27')],
      winsToClear: 15, tags: ['cave'],
      legendaries: [{ species: 'suicune', level: 40, chance: 1 / 400 }],
    },
    {
      id: 'johto-route-26', name: 'Rota 26', kind: 'route', locations: ['kanto-route-26'], unlock: [cleared('johto-tohjo-falls')],
      trainers: 6, trainerClasses: ['Cooltrainer', 'Psychic', 'Fisherman'], winsToClear: 20,
    },
    {
      id: 'johto-victory-road', name: 'Victory Road', kind: 'cave',
      locations: ['kanto-victory-road-1/1f', 'kanto-victory-road-1/2f', 'kanto-victory-road-1/3f'],
      unlock: [cleared('johto-route-26')], trainers: 4, trainerClasses: ['Cooltrainer', 'Black Belt'], winsToClear: 25, tags: ['cave'],
    },
    {
      id: 'johto-league', name: 'Liga Pokémon', kind: 'league', locations: [], unlock: [cleared('johto-victory-road')],
      league: {
        members: [
          t('johto-will', 'Will', 'Elite Four', 150, [['xatu', 40], ['jynx', 41], ['exeggutor', 41], ['slowbro', 41], ['xatu', 42]]),
          t('johto-koga', 'Koga', 'Elite Four', 150, [['ariados', 40], ['venomoth', 41], ['forretress', 43], ['muk', 42], ['crobat', 44]]),
          t('johto-bruno', 'Bruno', 'Elite Four', 150, [['hitmontop', 42], ['hitmonlee', 42], ['hitmonchan', 42], ['onix', 43], ['machamp', 46]]),
          t('johto-karen', 'Karen', 'Elite Four', 150, [['umbreon', 42], ['vileplume', 42], ['murkrow', 44], ['gengar', 45], ['houndoom', 47]]),
          t('johto-lance', 'Lance', 'Campeão', 200, [
            ['gyarados', 46], ['dragonite', 47], ['dragonite', 47], ['aerodactyl', 46], ['charizard', 46], ['dragonite', 50],
          ]),
        ],
        reward: { money: 40000, items: { 'master-ball': 1, 'rare-candy': 5 }, researchPoints: 200 },
      },
    },
    {
      id: 'johto-route-28', name: 'Rota 28', kind: 'route', locations: ['kanto-route-28'], unlock: [{ type: 'championOf', regionId: 'johto' }],
      trainers: 3, trainerClasses: ['Cooltrainer', 'Hiker'], winsToClear: 20,
    },
    {
      id: 'johto-mt-silver', name: 'Mt. Silver', kind: 'cave',
      locations: [
        'mt-silver/outside', 'mt-silver/mountainside', 'mt-silver/1f', 'mt-silver/1f-top',
        'mt-silver/2f', 'mt-silver/3f', 'mt-silver/4f', 'mt-silver/top',
      ],
      unlock: [cleared('johto-route-28')], trainers: 4, trainerClasses: ['Cooltrainer', 'Hiker'], winsToClear: 30, tags: ['cave'],
    },
  ],
};
