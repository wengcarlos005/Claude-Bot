import type { RegionDef, TrainerDef, TrainerMon } from '../types';

const t = (id: string, name: string, trainerClass: string, moneyPerLevel: number, team: [string, number][]): TrainerDef => ({
  id, name, trainerClass, moneyPerLevel, team: team.map(([species, level]): TrainerMon => ({ species, level })),
});
const cleared = (areaId: string) => ({ type: 'areaCleared' as const, areaId });
const badge = (badgeId: string) => ({ type: 'badge' as const, badgeId });
const surf = { type: 'keyItem' as const, itemId: 'hm-surf' };
const champion = { type: 'championOf' as const, regionId: 'hoenn' };

export const HOENN: RegionDef = {
  id: 'hoenn',
  name: 'Hoenn',
  order: 3,
  unlock: [{ type: 'championOf', regionId: 'johto' }],
  levelCaps: [100, 100, 100, 100, 100, 100, 100, 100, 100],
  championCap: 100,
  levelOffset: 85,
  statMultEnd: 1.45,
  xpMult: 0.5,
  winsMult: 2,
  levelScale: 0.25,
  statMult: 1.2,
  starters: ['treecko', 'torchic', 'mudkip'],
  areas: [
    { id: 'hoenn-route-101', name: 'Rota 101', kind: 'route', locations: ['hoenn-route-101'], unlock: [], winsToClear: 10 },
    { id: 'hoenn-route-103', name: 'Rota 103', kind: 'route', locations: ['hoenn-route-103'], unlock: [cleared('hoenn-route-101')], winsToClear: 10 },
    {
      id: 'hoenn-route-102', name: 'Rota 102 e Petalburg', kind: 'route', locations: ['hoenn-route-102', 'petalburg-city'],
      unlock: [cleared('hoenn-route-101')], trainers: 3, trainerClasses: ['Youngster', 'Bug Catcher', 'Fisherman'], winsToClear: 10,
    },
    {
      id: 'hoenn-route-104', name: 'Rota 104', kind: 'route', locations: ['hoenn-route-104'], unlock: [cleared('hoenn-route-102')],
      trainers: 2, trainerClasses: ['Fisherman', 'Rich Boy'], winsToClear: 10,
      extraSlots: [{ species: 'azurill', weight: 1, min: 4, max: 6 }],
    },
    {
      id: 'hoenn-petalburg-woods', name: 'Bosque de Petalburg', kind: 'forest', locations: ['petalburg-woods'], unlock: [cleared('hoenn-route-104')],
      trainers: 2, trainerClasses: ['Bug Catcher', 'Aqua Grunt'], winsToClear: 15,
    },
    {
      id: 'hoenn-rustboro-gym', name: 'Ginásio de Rustboro', kind: 'gym', locations: [], unlock: [cleared('hoenn-petalburg-woods')],
      gym: {
        badgeId: 'stone', badgeName: 'Insígnia Rocha', type: 'rock',
        trainers: [t('hoenn-rustboro-1', 'Josh', 'Youngster', 16, [['geodude', 10]]), t('hoenn-rustboro-2', 'Marc', 'Hiker', 36, [['geodude', 11], ['geodude', 11]])],
        leader: t('hoenn-roxanne', 'Roxanne', 'Líder de Ginásio', 120, [['geodude', 12], ['geodude', 12], ['nosepass', 15]]),
        reward: { money: 3000, items: { 'great-ball': 5, potion: 5, 'hard-stone': 1 }, researchPoints: 10 },
      },
    },
    {
      id: 'hoenn-route-116', name: 'Rota 116', kind: 'route', locations: ['hoenn-route-116'], unlock: [badge('stone')],
      trainers: 4, trainerClasses: ['Youngster', 'Lass', 'Hiker', 'School Kid'], winsToClear: 15,
    },
    {
      id: 'hoenn-rusturf-tunnel', name: 'Túnel Rusturf', kind: 'cave', locations: ['rusturf-tunnel'], unlock: [cleared('hoenn-route-116')],
      winsToClear: 10, tags: ['cave'],
    },
    {
      id: 'hoenn-route-105-106', name: 'Rotas Marítimas 105–106 e Dewford', kind: 'water',
      locations: ['hoenn-route-105', 'hoenn-route-106', 'dewford-town'], unlock: [badge('stone'), surf], winsToClear: 10,
    },
    {
      id: 'hoenn-granite-cave', name: 'Granite Cave', kind: 'cave',
      locations: ['granite-cave/1f', 'granite-cave/1fsmall-room', 'granite-cave/b1f', 'granite-cave/b2f'],
      unlock: [cleared('hoenn-route-105-106')], trainers: 2, trainerClasses: ['Hiker', 'Ruin Maniac'], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'hoenn-dewford-gym', name: 'Ginásio de Dewford', kind: 'gym', locations: [], unlock: [cleared('hoenn-granite-cave')],
      gym: {
        badgeId: 'knuckle', badgeName: 'Insígnia Punho', type: 'fighting',
        trainers: [t('hoenn-dewford-1', 'Laura', 'Battle Girl', 24, [['meditite', 13]]), t('hoenn-dewford-2', 'Hideki', 'Black Belt', 24, [['machop', 14]])],
        leader: t('hoenn-brawly', 'Brawly', 'Líder de Ginásio', 120, [['machop', 16], ['meditite', 16], ['makuhita', 19]]),
        reward: { money: 4500, items: { 'black-belt': 1, 'super-potion': 5 }, researchPoints: 15 },
      },
    },
    {
      id: 'hoenn-route-107-109', name: 'Rotas Marítimas 107–109 e Slateport', kind: 'water',
      locations: ['hoenn-route-107', 'hoenn-route-108', 'hoenn-route-109', 'slateport-city', 'abandoned-ship'],
      unlock: [badge('knuckle'), surf], winsToClear: 15,
    },
    {
      id: 'hoenn-route-110', name: 'Rota 110', kind: 'route', locations: ['hoenn-route-110'], unlock: [cleared('hoenn-route-107-109')],
      trainers: 6, trainerClasses: ['Psychic', 'Cyclist', 'Triathlete', 'Fisherman'], winsToClear: 15,
    },
    {
      id: 'hoenn-mauville-gym', name: 'Ginásio de Mauville', kind: 'gym', locations: [], unlock: [cleared('hoenn-route-110')],
      gym: {
        badgeId: 'dynamo', badgeName: 'Insígnia Dínamo', type: 'electric',
        trainers: [
          t('hoenn-mauville-1', 'Kirk', 'Guitarist', 24, [['electrike', 17], ['voltorb', 17]]),
          t('hoenn-mauville-2', 'Ben', 'Youngster', 16, [['zigzagoon', 19], ['magnemite', 19]]),
        ],
        leader: t('hoenn-wattson', 'Wattson', 'Líder de Ginásio', 120, [['voltorb', 20], ['electrike', 20], ['magneton', 22], ['manectric', 24]]),
        reward: { money: 6000, items: { magnet: 1, 'thunder-stone': 1, 'super-potion': 5 }, researchPoints: 20 },
      },
    },
    {
      id: 'hoenn-route-117', name: 'Rota 117', kind: 'route', locations: ['hoenn-route-117'], unlock: [badge('dynamo')],
      trainers: 4, trainerClasses: ['Triathlete', 'Pokéfan', 'Twins'], winsToClear: 15,
      extraSlots: [
        { species: 'treecko', weight: 1, min: 13, max: 16 },
        { species: 'torchic', weight: 1, min: 13, max: 16 },
        { species: 'mudkip', weight: 1, min: 13, max: 16 },
      ],
    },
    {
      id: 'hoenn-route-111', name: 'Rota 111', kind: 'route', locations: ['hoenn-route-111'], unlock: [badge('dynamo')],
      trainers: 4, trainerClasses: ['Camper', 'Picnicker', 'Hiker'], winsToClear: 15,
    },
    {
      id: 'hoenn-route-112', name: 'Rota 112', kind: 'route', locations: ['hoenn-route-112'], unlock: [cleared('hoenn-route-111')],
      trainers: 2, trainerClasses: ['Hiker', 'Magma Grunt'], winsToClear: 10,
    },
    {
      id: 'hoenn-fiery-path', name: 'Caminho Ardente', kind: 'cave', locations: ['fiery-path'], unlock: [cleared('hoenn-route-112')],
      winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'hoenn-route-113', name: 'Rota 113', kind: 'route', locations: ['hoenn-route-113'], unlock: [cleared('hoenn-fiery-path')],
      trainers: 5, trainerClasses: ['Ninja Boy', 'Parasol Lady', 'Picnicker'], winsToClear: 15,
    },
    {
      id: 'hoenn-route-114', name: 'Rota 114', kind: 'route', locations: ['hoenn-route-114'], unlock: [cleared('hoenn-route-113')],
      trainers: 5, trainerClasses: ['Fisherman', 'Hiker', 'Kindler'], winsToClear: 15,
    },
    {
      id: 'hoenn-meteor-falls', name: 'Cataratas Meteoro', kind: 'cave',
      locations: ['meteor-falls'],
      unlock: [cleared('hoenn-route-114')], trainers: 2, trainerClasses: ['Dragon Tamer', 'Old Couple'], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'hoenn-jagged-pass', name: 'Passagem Irregular (Mt. Chimney)', kind: 'route', locations: ['jagged-pass'],
      unlock: [cleared('hoenn-meteor-falls')], trainers: 4, trainerClasses: ['Hiker', 'Magma Grunt', 'Picnicker'], winsToClear: 15,
    },
    {
      id: 'hoenn-lavaridge-gym', name: 'Ginásio de Lavaridge', kind: 'gym', locations: [], unlock: [cleared('hoenn-jagged-pass')],
      gym: {
        badgeId: 'heat', badgeName: 'Insígnia Calor', type: 'fire',
        trainers: [
          t('hoenn-lavaridge-1', 'Cole', 'Kindler', 32, [['slugma', 22], ['numel', 22]]),
          t('hoenn-lavaridge-2', 'Gerald', 'Cooltrainer', 48, [['numel', 23], ['torkoal', 24]]),
        ],
        leader: t('hoenn-flannery', 'Flannery', 'Líder de Ginásio', 120, [['numel', 24], ['slugma', 24], ['camerupt', 26], ['torkoal', 29]]),
        reward: { money: 7500, items: { charcoal: 1, 'fire-stone': 1, 'hyper-potion': 3 }, researchPoints: 25 },
      },
    },
    {
      id: 'hoenn-route-115', name: 'Rota 115', kind: 'route', locations: ['hoenn-route-115'], unlock: [badge('heat')],
      trainers: 4, trainerClasses: ['Black Belt', 'Battle Girl', 'Psychic'], winsToClear: 15,
    },
    {
      id: 'hoenn-mirage-tower', name: 'Deserto e Torre Miragem', kind: 'special', locations: ['mirage-tower'], unlock: [badge('heat')],
      winsToClear: 15,
      extraSlots: [{ species: 'lileep', weight: 2, min: 20, max: 22 }, { species: 'anorith', weight: 2, min: 20, max: 22 }],
    },
    {
      id: 'hoenn-petalburg-gym', name: 'Ginásio de Petalburg', kind: 'gym', locations: [], unlock: [badge('heat')],
      gym: {
        badgeId: 'balance', badgeName: 'Insígnia Equilíbrio', type: 'normal',
        trainers: [
          t('hoenn-petalburg-1', 'Randall', 'Cooltrainer', 48, [['delcatty', 27]]),
          t('hoenn-petalburg-2', 'Mary', 'Cooltrainer', 48, [['spinda', 27], ['linoone', 27]]),
        ],
        leader: t('hoenn-norman', 'Norman', 'Líder de Ginásio', 120, [['spinda', 27], ['vigoroth', 27], ['linoone', 29], ['slaking', 31]]),
        reward: { money: 9000, items: { 'silk-scarf': 1, 'ultra-ball': 5, 'hyper-potion': 3 }, researchPoints: 35 },
      },
    },
    {
      id: 'hoenn-new-mauville', name: 'Nova Mauville', kind: 'building', locations: ['new-mauville/entrance', 'new-mauville'],
      unlock: [badge('balance'), surf], winsToClear: 15,
    },
    {
      id: 'hoenn-route-118', name: 'Rota 118', kind: 'route', locations: ['hoenn-route-118'], unlock: [badge('balance')],
      trainers: 4, trainerClasses: ['Fisherman', 'Guitarist', 'Bird Keeper'], winsToClear: 15,
    },
    {
      id: 'hoenn-route-119', name: 'Rota 119', kind: 'route', locations: ['hoenn-route-119'], unlock: [cleared('hoenn-route-118')],
      trainers: 6, trainerClasses: ['Bug Maniac', 'Ninja Boy', 'Fisherman', 'Aqua Grunt'], winsToClear: 20,
      extraSlots: [
        { species: 'feebas', weight: 1, min: 20, max: 25, method: 'surf' },
        { species: 'castform', weight: 1, min: 25, max: 25 },
      ],
    },
    {
      id: 'hoenn-fortree-gym', name: 'Ginásio de Fortree', kind: 'gym', locations: [], unlock: [cleared('hoenn-route-119')],
      gym: {
        badgeId: 'feather', badgeName: 'Insígnia Pena', type: 'flying',
        trainers: [
          t('hoenn-fortree-1', 'Jared', 'Bird Keeper', 24, [['doduo', 30], ['skarmory', 30]]),
          t('hoenn-fortree-2', 'Humberto', 'Bird Keeper', 24, [['swellow', 31]]),
        ],
        leader: t('hoenn-winona', 'Winona', 'Líder de Ginásio', 120, [['swablu', 29], ['tropius', 29], ['pelipper', 30], ['skarmory', 31], ['altaria', 33]]),
        reward: { money: 10000, items: { 'sharp-beak': 1, 'ultra-ball': 10 }, researchPoints: 40 },
      },
    },
    {
      id: 'hoenn-route-120', name: 'Rota 120', kind: 'route', locations: ['hoenn-route-120'], unlock: [badge('feather')],
      trainers: 5, trainerClasses: ['Ninja Boy', 'Parasol Lady', 'Bird Keeper'], winsToClear: 15,
    },
    {
      id: 'hoenn-route-121', name: 'Rota 121', kind: 'route', locations: ['hoenn-route-121'], unlock: [cleared('hoenn-route-120')],
      trainers: 5, trainerClasses: ['Beauty', 'Gentleman', 'Aqua Grunt'], winsToClear: 15,
    },
    {
      id: 'hoenn-safari-zone', name: 'Zona Safari', kind: 'special',
      locations: [
        'hoenn-safari-zone/sw', 'hoenn-safari-zone/se', 'hoenn-safari-zone/nwmach-bike-area', 'hoenn-safari-zone/neacro-bike-area',
        'hoenn-safari-zone/expansion-north', 'hoenn-safari-zone/expansion-south',
      ],
      unlock: [cleared('hoenn-route-121')], winsToClear: 25,
    },
    {
      id: 'hoenn-mt-pyre', name: 'Mt. Pyre', kind: 'building',
      locations: [
        'mt-pyre/1f', 'mt-pyre/2f', 'mt-pyre/3f', 'mt-pyre/4f', 'mt-pyre/5f', 'mt-pyre/6f', 'mt-pyre/outside', 'mt-pyre/summit',
      ],
      unlock: [cleared('hoenn-route-121')], trainers: 5, trainerClasses: ['Hex Maniac', 'Psychic', 'Aqua Grunt'], winsToClear: 20,
    },
    {
      id: 'hoenn-route-122-123', name: 'Rotas 122–123 e Lilycove', kind: 'route', locations: ['hoenn-route-122', 'hoenn-route-123', 'lilycove-city'],
      unlock: [cleared('hoenn-route-121')], trainers: 5, trainerClasses: ['Cooltrainer', 'Psychic', 'Aroma Lady'], winsToClear: 15,
    },
    {
      id: 'hoenn-magma-hideout', name: 'Esconderijo Magma', kind: 'cave', locations: ['magma-hideout'], unlock: [cleared('hoenn-mt-pyre')],
      trainers: 6, trainerClasses: ['Magma Grunt'], winsToClear: 20, tags: ['cave'],
    },
    {
      id: 'hoenn-route-124-125', name: 'Rotas Marítimas 124–125 e Mossdeep', kind: 'water',
      locations: ['hoenn-route-124', 'hoenn-route-125', 'mossdeep-city'], unlock: [cleared('hoenn-magma-hideout'), surf],
      trainers: 4, trainerClasses: ['Swimmer', 'Sailor'], winsToClear: 15,
      extraSlots: [
        { species: 'clamperl', weight: 2, min: 25, max: 30, method: 'surf' },
        { species: 'relicanth', weight: 1, min: 30, max: 35, method: 'surf' },
      ],
    },
    {
      id: 'hoenn-shoal-cave', name: 'Caverna Shoal', kind: 'cave',
      locations: ['shoal-cave/low-tide', 'shoal-cave/high-tide', 'shoal-cave/b1f', 'shoal-cave/b2f', 'shoal-cave/b3f'],
      unlock: [cleared('hoenn-route-124-125')], winsToClear: 20, tags: ['cave'],
      legendaries: [{ species: 'regice', level: 40, chance: 1 / 400 }],
    },
    {
      id: 'hoenn-mossdeep-gym', name: 'Ginásio de Mossdeep', kind: 'gym', locations: [], unlock: [cleared('hoenn-route-124-125')],
      gym: {
        badgeId: 'mind', badgeName: 'Insígnia Mente', type: 'psychic',
        trainers: [
          t('hoenn-mossdeep-1', 'Preston', 'Psychic', 24, [['kirlia', 41]]),
          t('hoenn-mossdeep-2', 'Maura', 'Psychic', 24, [['kadabra', 39], ['xatu', 40]]),
        ],
        leader: t('hoenn-tate-liza', 'Tate & Liza', 'Líder de Ginásio', 120, [['claydol', 41], ['xatu', 41], ['lunatone', 42], ['solrock', 42]]),
        reward: { money: 12000, items: { 'twisted-spoon': 1, 'moon-stone': 1, 'max-potion': 3 }, researchPoints: 50 },
      },
    },
    {
      id: 'hoenn-route-126-128', name: 'Rotas Marítimas 126–128 e Sootopolis', kind: 'water',
      locations: ['hoenn-route-126', 'hoenn-route-127', 'hoenn-route-128', 'sootopolis-city'], unlock: [badge('mind'), surf],
      trainers: 4, trainerClasses: ['Swimmer', 'Fisherman'], winsToClear: 20,
    },
    {
      id: 'hoenn-sootopolis-gym', name: 'Ginásio de Sootopolis', kind: 'gym', locations: [], unlock: [cleared('hoenn-route-126-128')],
      gym: {
        badgeId: 'rain', badgeName: 'Insígnia Chuva', type: 'water',
        trainers: [t('hoenn-sootopolis-1', 'Andrea', 'Lass', 16, [['luvdisc', 40]]), t('hoenn-sootopolis-2', 'Connie', 'Beauty', 48, [['goldeen', 40], ['seaking', 41]])],
        leader: t('hoenn-juan', 'Juan', 'Líder de Ginásio', 120, [['luvdisc', 41], ['whiscash', 41], ['sealeo', 43], ['crawdaunt', 43], ['kingdra', 46]]),
        reward: { money: 14000, items: { 'mystic-water': 1, 'water-stone': 1, 'ultra-ball': 10, 'max-potion': 3 }, researchPoints: 60 },
      },
    },
    {
      id: 'hoenn-route-129-131', name: 'Rotas Marítimas 129–131 e Pacifidlog', kind: 'water',
      locations: ['hoenn-route-129', 'hoenn-route-130', 'hoenn-route-131', 'pacifidlog-town', 'mirage-island'],
      unlock: [badge('mind'), surf], trainers: 3, trainerClasses: ['Swimmer', 'Triathlete'], winsToClear: 15,
    },
    {
      id: 'hoenn-victory-road', name: 'Victory Road', kind: 'cave',
      locations: ['hoenn-victory-road/1f', 'hoenn-victory-road/b1f', 'hoenn-victory-road/b2f', 'ever-grande-city'],
      unlock: [badge('rain')], trainers: 6, trainerClasses: ['Cooltrainer', 'Expert'], winsToClear: 25, tags: ['cave'],
    },
    {
      id: 'hoenn-league', name: 'Liga Pokémon', kind: 'league', locations: [], unlock: [cleared('hoenn-victory-road')],
      league: {
        members: [
          t('hoenn-sidney', 'Sidney', 'Elite Four', 150, [['mightyena', 46], ['shiftry', 48], ['cacturne', 46], ['crawdaunt', 48], ['absol', 49]]),
          t('hoenn-phoebe', 'Phoebe', 'Elite Four', 150, [['dusclops', 48], ['banette', 49], ['sableye', 50], ['banette', 49], ['dusclops', 51]]),
          t('hoenn-glacia', 'Glacia', 'Elite Four', 150, [['sealeo', 50], ['glalie', 50], ['sealeo', 52], ['glalie', 52], ['walrein', 53]]),
          t('hoenn-drake', 'Drake', 'Elite Four', 150, [['shelgon', 52], ['altaria', 54], ['flygon', 53], ['flygon', 53], ['salamence', 55]]),
          t('hoenn-wallace', 'Wallace', 'Campeão', 200, [
            ['wailord', 57], ['tentacruel', 55], ['ludicolo', 56], ['whiscash', 56], ['gyarados', 56], ['milotic', 58],
          ]),
        ],
        reward: { money: 50000, items: { 'master-ball': 1, 'rare-candy': 5 }, researchPoints: 200 },
      },
    },
    {
      id: 'hoenn-route-132-134', name: 'Rotas Marítimas 132–134', kind: 'water',
      locations: ['hoenn-route-132', 'hoenn-route-133', 'hoenn-route-134'], unlock: [champion, surf],
      trainers: 4, trainerClasses: ['Swimmer', 'Expert'], winsToClear: 20,
      extraSlots: [{ species: 'beldum', weight: 1, min: 30, max: 35 }],
      legendaries: [
        { species: 'registeel', level: 40, chance: 1 / 400 },
        { species: 'latias', level: 40, chance: 1 / 400 },
        { species: 'latios', level: 40, chance: 1 / 400 },
      ],
    },
    {
      id: 'hoenn-meteor-falls-depths', name: 'Cataratas Meteoro (Profundezas)', kind: 'cave',
      locations: ['meteor-falls/b1f', 'meteor-falls/back', 'meteor-falls/backsmall-room'], unlock: [champion],
      trainers: 2, trainerClasses: ['Dragon Tamer', 'Cooltrainer'], winsToClear: 20, tags: ['cave'],
    },
    {
      id: 'hoenn-desert-underpass', name: 'Passagem Subterrânea do Deserto', kind: 'cave', locations: ['desert-underpass'], unlock: [champion],
      winsToClear: 20, tags: ['cave'],
      legendaries: [{ species: 'regirock', level: 40, chance: 1 / 400 }],
    },
    {
      id: 'hoenn-artisan-cave', name: 'Caverna Artesã', kind: 'cave', locations: ['artisan-cave'], unlock: [champion],
      winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'hoenn-seafloor-cavern', name: 'Caverna do Fundo do Mar', kind: 'cave', locations: ['seafloor-cavern'], unlock: [champion, surf],
      winsToClear: 25, tags: ['cave'],
      legendaries: [{ species: 'kyogre', level: 70, chance: 1 / 500 }],
    },
    {
      id: 'hoenn-cave-of-origin', name: 'Caverna da Origem', kind: 'cave',
      locations: ['cave-of-origin/entrance', 'cave-of-origin/1f', 'cave-of-origin/b1f', 'cave-of-origin/b2f', 'cave-of-origin/b3f'],
      unlock: [cleared('hoenn-seafloor-cavern')], winsToClear: 25, tags: ['cave'],
      legendaries: [{ species: 'groudon', level: 70, chance: 1 / 500 }],
    },
    {
      id: 'hoenn-sky-pillar', name: 'Pilar Celeste', kind: 'building', locations: ['sky-pillar/1f', 'sky-pillar/3f', 'sky-pillar/5f'],
      unlock: [cleared('hoenn-cave-of-origin')], winsToClear: 30,
      legendaries: [{ species: 'rayquaza', level: 70, chance: 1 / 500 }],
    },
  ],
};
