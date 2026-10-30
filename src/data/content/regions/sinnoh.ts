import type { RegionDef, TrainerDef, TrainerMon } from '../types';

const t = (id: string, name: string, trainerClass: string, moneyPerLevel: number, team: [string, number][]): TrainerDef => ({
  id, name, trainerClass, moneyPerLevel, team: team.map(([species, level]): TrainerMon => ({ species, level })),
});
const cleared = (areaId: string) => ({ type: 'areaCleared' as const, areaId });
const badge = (badgeId: string) => ({ type: 'badge' as const, badgeId });
const surf = { type: 'keyItem' as const, itemId: 'hm-surf' };
const champion = { type: 'championOf' as const, regionId: 'sinnoh' };

export const SINNOH: RegionDef = {
  id: 'sinnoh',
  name: 'Sinnoh',
  order: 4,
  unlock: [{ type: 'championOf', regionId: 'hoenn' }],
  levelCaps: [100, 100, 100, 100, 100, 100, 100, 100, 100],
  championCap: 100,
  levelOffset: 70,
  levelScale: 0.5,
  statMult: 1.6,
  starters: ['turtwig', 'chimchar', 'piplup'],
  areas: [
    {
      id: 'sinnoh-route-201', name: 'Rota 201 e Lago Verity', kind: 'route',
      locations: ['sinnoh-route-201', 'lake-verity/before-galactic-intervention'], unlock: [], winsToClear: 10,
    },
    {
      id: 'sinnoh-route-202', name: 'Rota 202', kind: 'route', locations: ['sinnoh-route-202'], unlock: [cleared('sinnoh-route-201')],
      trainers: 2, trainerClasses: ['Youngster', 'Lass'], winsToClear: 10,
    },
    {
      id: 'sinnoh-route-203', name: 'Rota 203 e Portão de Oreburgh', kind: 'route',
      locations: ['sinnoh-route-203', 'oreburgh-gate/1f', 'oreburgh-gate/b1f'], unlock: [cleared('sinnoh-route-202')],
      trainers: 4, trainerClasses: ['Youngster', 'Lass', 'Camper'], winsToClear: 15,
    },
    {
      id: 'sinnoh-oreburgh-mine', name: 'Mina de Oreburgh', kind: 'cave', locations: ['oreburgh-mine/1f', 'oreburgh-mine/b1f'],
      unlock: [cleared('sinnoh-route-203')], trainers: 3, trainerClasses: ['Worker', 'Hiker'], winsToClear: 15, tags: ['cave'],
      extraSlots: [{ species: 'cranidos', weight: 1, min: 12, max: 12 }, { species: 'shieldon', weight: 1, min: 12, max: 12 }],
    },
    {
      id: 'sinnoh-oreburgh-gym', name: 'Ginásio de Oreburgh', kind: 'gym', locations: [], unlock: [cleared('sinnoh-oreburgh-mine')],
      gym: {
        badgeId: 'coal', badgeName: 'Insígnia Carvão', type: 'rock',
        trainers: [
          t('sinnoh-oreburgh-1', 'Jonathon', 'Youngster', 16, [['geodude', 11]]),
          t('sinnoh-oreburgh-2', 'Darius', 'Youngster', 16, [['geodude', 9], ['onix', 10]]),
        ],
        leader: t('sinnoh-roark', 'Roark', 'Líder de Ginásio', 120, [['geodude', 12], ['onix', 12], ['cranidos', 14]]),
        reward: { money: 4000, items: { 'great-ball': 5, potion: 5, 'hard-stone': 1 }, researchPoints: 10 },
      },
    },
    {
      id: 'sinnoh-route-204', name: 'Rota 204 e Caminho Devastado', kind: 'route',
      locations: ['sinnoh-route-204/south-towards-jubilife-city', 'ravaged-path', 'sinnoh-route-204/north-towards-floaroma-town'],
      unlock: [badge('coal')], trainers: 3, trainerClasses: ['Youngster', 'Lass', 'Twins'], winsToClear: 15,
    },
    {
      id: 'sinnoh-valley-windworks', name: 'Usina Eólica do Vale', kind: 'special', locations: ['valley-windworks'],
      unlock: [cleared('sinnoh-route-204')], trainers: 3, trainerClasses: ['Galactic Grunt'], winsToClear: 15,
      extraSlots: [{ species: 'drifloon', weight: 2, min: 15, max: 15 }],
    },
    {
      id: 'sinnoh-route-205', name: 'Rota 205', kind: 'route',
      locations: ['sinnoh-route-205/south-towards-floaroma-town', 'sinnoh-route-205/east-towards-eterna-city'],
      unlock: [cleared('sinnoh-route-204')], trainers: 5, trainerClasses: ['Hiker', 'Fisherman', 'Picnicker', 'Camper'], winsToClear: 15,
      extraSlots: [
        { species: 'burmy', weight: 2, min: 10, max: 12 },
        { species: 'combee', weight: 2, min: 10, max: 12 },
        { species: 'aipom', weight: 1, min: 10, max: 12 },
      ],
    },
    {
      id: 'sinnoh-eterna-forest', name: 'Floresta Eterna', kind: 'forest', locations: ['eterna-forest'], unlock: [cleared('sinnoh-route-205')],
      trainers: 4, trainerClasses: ['Bug Catcher', 'Psychic', 'Lass'], winsToClear: 15,
    },
    {
      id: 'sinnoh-old-chateau', name: 'Velho Castelo', kind: 'building',
      locations: [
        'old-chateau/entrance', 'old-chateau/dining-room', 'old-chateau/2f', 'old-chateau/2f-left-room', 'old-chateau/2f-leftmost-room',
        'old-chateau/2f-middle-room', 'old-chateau/2f-private-room', 'old-chateau/2f-right-room', 'old-chateau/2f-rightmost-room',
      ],
      unlock: [cleared('sinnoh-eterna-forest')], winsToClear: 15,
      extraSlots: [{ species: 'rotom', weight: 1, min: 20, max: 20 }],
    },
    {
      id: 'sinnoh-eterna-gym', name: 'Ginásio de Eterna', kind: 'gym', locations: [], unlock: [cleared('sinnoh-eterna-forest')],
      gym: {
        badgeId: 'forest', badgeName: 'Insígnia Floresta', type: 'grass',
        trainers: [
          t('sinnoh-eterna-1', 'Caroline', 'Lass', 16, [['cherubi', 18], ['budew', 18]]),
          t('sinnoh-eterna-2', 'Jenna', 'Aroma Lady', 32, [['roselia', 19]]),
        ],
        leader: t('sinnoh-gardenia', 'Gardenia', 'Líder de Ginásio', 120, [['turtwig', 20], ['cherrim', 20], ['roserade', 22]]),
        reward: { money: 5500, items: { 'miracle-seed': 1, 'leaf-stone': 1, 'super-potion': 5 }, researchPoints: 15 },
      },
    },
    {
      id: 'sinnoh-route-211-west', name: 'Rota 211 (Oeste) e Mt. Coronet', kind: 'route',
      locations: ['sinnoh-route-211/west-towards-eterna-city', 'mt-coronet/1f-route-211', 'eterna-city'], unlock: [badge('forest')],
      trainers: 2, trainerClasses: ['Hiker', 'Black Belt'], winsToClear: 10,
    },
    {
      id: 'sinnoh-route-206', name: 'Rota 206 (Ciclovia)', kind: 'route', locations: ['sinnoh-route-206'], unlock: [badge('forest')],
      trainers: 5, trainerClasses: ['Cyclist', 'Hiker'], winsToClear: 15,
      extraSlots: [{ species: 'togepi', weight: 1, min: 14, max: 16 }],
    },
    {
      id: 'sinnoh-wayward-cave', name: 'Caverna Wayward', kind: 'cave', locations: ['wayward-cave/1f', 'wayward-cave/b1f'],
      unlock: [cleared('sinnoh-route-206')], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'sinnoh-route-207-208', name: 'Rotas 207–208', kind: 'route',
      locations: ['sinnoh-route-207', 'mt-coronet/1f-route-207', 'sinnoh-route-208'], unlock: [cleared('sinnoh-route-206')],
      trainers: 5, trainerClasses: ['Hiker', 'Black Belt', 'Aroma Lady', 'Fisherman'], winsToClear: 15,
      extraSlots: [
        { species: 'cherubi', weight: 2, min: 16, max: 18 },
        { species: 'turtwig', weight: 1, min: 15, max: 18 },
        { species: 'chimchar', weight: 1, min: 15, max: 18 },
        { species: 'piplup', weight: 1, min: 15, max: 18 },
      ],
    },
    {
      id: 'sinnoh-hearthome-gym', name: 'Ginásio de Hearthome', kind: 'gym', locations: [], unlock: [cleared('sinnoh-route-207-208')],
      gym: {
        badgeId: 'relic', badgeName: 'Insígnia Relíquia', type: 'ghost',
        trainers: [
          t('sinnoh-hearthome-1', 'Marsha', 'Ace Trainer', 48, [['gastly', 22], ['duskull', 22]]),
          t('sinnoh-hearthome-2', 'Chad', 'School Kid', 20, [['misdreavus', 23]]),
        ],
        leader: t('sinnoh-fantina', 'Fantina', 'Líder de Ginásio', 120, [['duskull', 24], ['haunter', 24], ['mismagius', 26]]),
        reward: { money: 7000, items: { 'spell-tag': 1, 'dusk-stone': 1, 'dusk-ball': 5 }, researchPoints: 20 },
      },
    },
    {
      id: 'sinnoh-route-209', name: 'Rota 209', kind: 'route', locations: ['sinnoh-route-209'], unlock: [badge('relic')],
      trainers: 5, trainerClasses: ['Camper', 'Picnicker', 'Fisherman', 'Gentleman'], winsToClear: 15,
      extraSlots: [
        { species: 'happiny', weight: 1, min: 16, max: 18 },
        { species: 'spiritomb', weight: 1, min: 20, max: 20 },
        { species: 'eevee', weight: 1, min: 16, max: 20 },
      ],
    },
    {
      id: 'sinnoh-lost-tower', name: 'Torre Perdida', kind: 'building',
      locations: ['lost-tower/1f', 'lost-tower/2f', 'lost-tower/3f', 'lost-tower/4f', 'lost-tower/5f'],
      unlock: [cleared('sinnoh-route-209')], trainers: 3, trainerClasses: ['Psychic', 'Hex Maniac'], winsToClear: 15,
    },
    {
      id: 'sinnoh-solaceon-ruins', name: 'Ruínas de Solaceon', kind: 'special',
      locations: [
        'solaceon-ruins/1f', 'solaceon-ruins/2f', 'solaceon-ruins/b1f-a', 'solaceon-ruins/b1f-b', 'solaceon-ruins/b1f-c',
        'solaceon-ruins/b2f-a', 'solaceon-ruins/b2f-b', 'solaceon-ruins/b2f-c', 'solaceon-ruins/b3f-a', 'solaceon-ruins/b3f-b',
        'solaceon-ruins/b3f-c', 'solaceon-ruins/b3f-d', 'solaceon-ruins/b3f-e', 'solaceon-ruins/b4f-a', 'solaceon-ruins/b4f-b',
        'solaceon-ruins/b4f-c', 'solaceon-ruins/b4f-d', 'solaceon-ruins/b5f',
      ],
      unlock: [cleared('sinnoh-route-209')], winsToClear: 15,
    },
    {
      id: 'sinnoh-route-210-south', name: 'Rota 210 (Sul)', kind: 'route', locations: ['sinnoh-route-210/south-towards-solaceon-town'],
      unlock: [cleared('sinnoh-route-209')], trainers: 4, trainerClasses: ['Ninja Boy', 'Ace Trainer', 'Rancher'], winsToClear: 15,
    },
    {
      id: 'sinnoh-route-215', name: 'Rota 215', kind: 'route', locations: ['sinnoh-route-215'], unlock: [cleared('sinnoh-route-210-south')],
      trainers: 5, trainerClasses: ['Black Belt', 'Ace Trainer', 'Jogger'], winsToClear: 15,
    },
    {
      id: 'sinnoh-veilstone-gym', name: 'Ginásio de Veilstone', kind: 'gym', locations: [], unlock: [cleared('sinnoh-route-215')],
      gym: {
        badgeId: 'cobble', badgeName: 'Insígnia Paralelepípedo', type: 'fighting',
        trainers: [
          t('sinnoh-veilstone-1', 'Colby', 'Black Belt', 24, [['machoke', 27], ['meditite', 27]]),
          t('sinnoh-veilstone-2', 'Kendal', 'Black Belt', 24, [['croagunk', 28]]),
        ],
        leader: t('sinnoh-maylene', 'Maylene', 'Líder de Ginásio', 120, [['meditite', 28], ['machoke', 29], ['lucario', 32]]),
        reward: { money: 8500, items: { 'black-belt': 1, 'ultra-ball': 5, 'hyper-potion': 3 }, researchPoints: 25 },
      },
    },
    {
      id: 'sinnoh-route-214', name: 'Rota 214 e Caverna do Maníaco', kind: 'route',
      locations: [
        'sinnoh-route-214', 'ruin-maniac-cave/0-9-different-unown-caught', 'ruin-maniac-cave/10-25-different-unown-caught',
        'maniac-tunnel/26-plus-different-unown-caught',
      ],
      unlock: [badge('cobble')], trainers: 5, trainerClasses: ['Ruin Maniac', 'Beauty', 'Pokémon Ranger'], winsToClear: 15,
    },
    {
      id: 'sinnoh-route-213', name: 'Margem do Lago Valor e Rota 213', kind: 'route', locations: ['valor-lakefront', 'sinnoh-route-213'],
      unlock: [cleared('sinnoh-route-214')], trainers: 5, trainerClasses: ['Rich Boy', 'Swimmer', 'Fisherman', 'Tuber'], winsToClear: 15,
    },
    {
      id: 'sinnoh-route-212-south', name: 'Rota 212 (Sul)', kind: 'route', locations: ['sinnoh-route-212/east-towards-pastoria-city', 'pastoria-city'],
      unlock: [cleared('sinnoh-route-214')], trainers: 4, trainerClasses: ['Pokémon Ranger', 'Fisherman'], winsToClear: 15,
    },
    {
      id: 'sinnoh-great-marsh', name: 'Grande Pântano', kind: 'special',
      locations: ['great-marsh/area-1', 'great-marsh/area-2', 'great-marsh/area-3', 'great-marsh/area-4', 'great-marsh/area-5', 'great-marsh/area-6'],
      unlock: [{ type: 'anyOf', of: [cleared('sinnoh-route-213'), cleared('sinnoh-route-212-south')] }], winsToClear: 20,
      extraSlots: [{ species: 'skorupi', weight: 2, min: 22, max: 26 }, { species: 'carnivine', weight: 1, min: 22, max: 26 }],
    },
    {
      id: 'sinnoh-pastoria-gym', name: 'Ginásio de Pastoria', kind: 'gym', locations: [],
      unlock: [{ type: 'anyOf', of: [cleared('sinnoh-route-213'), cleared('sinnoh-route-212-south')] }],
      gym: {
        badgeId: 'fen', badgeName: 'Insígnia Brejo', type: 'water',
        trainers: [
          t('sinnoh-pastoria-1', 'Evan', 'Fisherman', 36, [['magikarp', 30], ['gyarados', 32]]),
          t('sinnoh-pastoria-2', 'Jake', 'Tuber', 16, [['buizel', 31], ['marill', 31]]),
        ],
        leader: t('sinnoh-crasher-wake', 'Crasher Wake', 'Líder de Ginásio', 120, [['gyarados', 33], ['quagsire', 34], ['floatzel', 37]]),
        reward: { money: 10000, items: { 'mystic-water': 1, 'water-stone': 1, 'ultra-ball': 10 }, researchPoints: 35 },
      },
    },
    {
      id: 'sinnoh-route-212-north', name: 'Rota 212 (Norte) e Jardim de Troféus', kind: 'route',
      locations: ['sinnoh-route-212/north-towards-hearthome-city', 'trophy-garden'], unlock: [badge('fen')],
      trainers: 4, trainerClasses: ['Gentleman', 'Socialite', 'Police Officer'], winsToClear: 15,
      extraSlots: [{ species: 'munchlax', weight: 1, min: 20, max: 22 }],
    },
    {
      id: 'sinnoh-route-210-west', name: 'Rota 210 (Oeste), Celestic e Rota 211 (Leste)', kind: 'route',
      locations: ['sinnoh-route-210/west-towards-celestic-town', 'celestic-town', 'sinnoh-route-211/east-towards-celestic-town'],
      unlock: [badge('fen')], trainers: 5, trainerClasses: ['Dragon Tamer', 'Ace Trainer', 'Ninja Boy', 'Hiker'], winsToClear: 20,
    },
    {
      id: 'sinnoh-fuego-ironworks', name: 'Fuego Ironworks', kind: 'building', locations: ['fuego-ironworks'], unlock: [badge('fen')],
      winsToClear: 15,
    },
    {
      id: 'sinnoh-route-218', name: 'Rota 218 e Canalave', kind: 'water', locations: ['sinnoh-route-218', 'canalave-city'],
      unlock: [cleared('sinnoh-route-210-west'), surf], trainers: 4, trainerClasses: ['Fisherman', 'Sailor', 'Guitarist'], winsToClear: 15,
    },
    {
      id: 'sinnoh-canalave-gym', name: 'Ginásio de Canalave', kind: 'gym', locations: [], unlock: [cleared('sinnoh-route-218')],
      gym: {
        badgeId: 'mine', badgeName: 'Insígnia Mina', type: 'steel',
        trainers: [
          t('sinnoh-canalave-1', 'Cesar', 'Worker', 48, [['onix', 36], ['bronzor', 36]]),
          t('sinnoh-canalave-2', 'Breck', 'Ace Trainer', 48, [['magneton', 36], ['steelix', 37]]),
        ],
        leader: t('sinnoh-byron', 'Byron', 'Líder de Ginásio', 120, [['bronzor', 37], ['steelix', 38], ['bastiodon', 41]]),
        reward: { money: 11500, items: { 'metal-coat': 1, 'ultra-ball': 10, 'max-potion': 2 }, researchPoints: 40 },
      },
    },
    {
      id: 'sinnoh-iron-island', name: 'Ilha de Ferro', kind: 'cave',
      locations: [
        'iron-island', 'iron-island/1f', 'iron-island/b1f-left', 'iron-island/b1f-right', 'iron-island/b2f-left',
        'iron-island/b2f-right', 'iron-island/b3f',
      ],
      unlock: [badge('mine')], trainers: 4, trainerClasses: ['Worker', 'Galactic Grunt'], winsToClear: 20, tags: ['cave'],
      extraSlots: [{ species: 'riolu', weight: 1, min: 30, max: 30 }],
    },
    {
      id: 'sinnoh-route-219-221', name: 'Rotas 219–221', kind: 'water',
      locations: ['twinleaf-town', 'sinnoh-route-219', 'sinnoh-sea-route-220', 'sinnoh-route-221'],
      unlock: [cleared('sinnoh-route-218'), surf], trainers: 4, trainerClasses: ['Swimmer', 'Fisherman', 'Ace Trainer'], winsToClear: 15,
    },
    {
      id: 'sinnoh-lake-valor', name: 'Lago Valor', kind: 'special', locations: ['lake-valor'], unlock: [badge('mine')], winsToClear: 15,
      legendaries: [{ species: 'azelf', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'sinnoh-lake-verity-cavern', name: 'Caverna do Lago Verity', kind: 'special', locations: ['lake-verity/after-galactic-intervention'],
      unlock: [cleared('sinnoh-lake-valor')], winsToClear: 10,
      legendaries: [{ species: 'mesprit', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'sinnoh-mt-coronet', name: 'Mt. Coronet (Rota 216)', kind: 'cave', locations: ['mt-coronet/1f-route-216', 'mt-coronet/b1f'],
      unlock: [badge('mine')], winsToClear: 15, tags: ['cave'],
    },
    {
      id: 'sinnoh-route-216', name: 'Rota 216', kind: 'route', locations: ['sinnoh-route-216'], unlock: [cleared('sinnoh-mt-coronet')],
      trainers: 4, trainerClasses: ['Skier', 'Ace Trainer'], winsToClear: 15,
    },
    {
      id: 'sinnoh-route-217', name: 'Rota 217 e Margem do Lago Acuity', kind: 'route', locations: ['sinnoh-route-217', 'acuity-lakefront'],
      unlock: [cleared('sinnoh-route-216')], trainers: 5, trainerClasses: ['Skier', 'Ninja Boy', 'Hiker'], winsToClear: 20,
    },
    {
      id: 'sinnoh-snowpoint-gym', name: 'Ginásio de Snowpoint', kind: 'gym', locations: [], unlock: [cleared('sinnoh-route-217')],
      gym: {
        badgeId: 'icicle', badgeName: 'Insígnia Pingente', type: 'ice',
        trainers: [
          t('sinnoh-snowpoint-1', 'Anton', 'Skier', 24, [['snover', 38]]),
          t('sinnoh-snowpoint-2', 'Alicia', 'Ace Trainer', 48, [['sneasel', 38], ['glalie', 38]]),
        ],
        leader: t('sinnoh-candice', 'Candice', 'Líder de Ginásio', 120, [['sneasel', 38], ['piloswine', 38], ['abomasnow', 40], ['froslass', 42]]),
        reward: { money: 13000, items: { 'never-melt-ice': 1, 'dawn-stone': 1, 'max-potion': 3 }, researchPoints: 50 },
      },
    },
    {
      id: 'sinnoh-lake-acuity', name: 'Lago Acuity', kind: 'special', locations: ['lake-acuity'], unlock: [badge('icicle')], winsToClear: 15,
      legendaries: [{ species: 'uxie', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'sinnoh-mt-coronet-summit', name: 'Cume do Mt. Coronet (Pilar da Lança)', kind: 'cave',
      locations: [
        'mt-coronet/1f-from-exterior', 'mt-coronet/2f', 'mt-coronet/3f', 'mt-coronet/exterior-snowfall', 'mt-coronet/exterior-blizzard',
        'mt-coronet/4f', 'mt-coronet/4f-small-room', 'mt-coronet/5f', 'mt-coronet/6f',
      ],
      unlock: [badge('icicle')], trainers: 6, trainerClasses: ['Galactic Grunt'], winsToClear: 25, tags: ['cave'],
      legendaries: [{ species: 'dialga', level: 70, chance: 1 / 500 }, { species: 'palkia', level: 70, chance: 1 / 500 }],
    },
    {
      id: 'sinnoh-route-222', name: 'Rota 222 e Sunyshore', kind: 'route', locations: ['sinnoh-route-222', 'sunyshore-city'],
      unlock: [cleared('sinnoh-mt-coronet-summit')], trainers: 6, trainerClasses: ['Fisherman', 'Rich Boy', 'Police Officer', 'Lady'], winsToClear: 15,
    },
    {
      id: 'sinnoh-sunyshore-gym', name: 'Ginásio de Sunyshore', kind: 'gym', locations: [], unlock: [cleared('sinnoh-route-222')],
      gym: {
        badgeId: 'beacon', badgeName: 'Insígnia Farol', type: 'electric',
        trainers: [
          t('sinnoh-sunyshore-1', 'Danny', 'Guitarist', 24, [['raichu', 44]]),
          t('sinnoh-sunyshore-2', 'Dwayne', 'Ace Trainer', 48, [['luxio', 45], ['electabuzz', 45]]),
        ],
        leader: t('sinnoh-volkner', 'Volkner', 'Líder de Ginásio', 120, [['jolteon', 46], ['raichu', 46], ['luxray', 48], ['electivire', 50]]),
        reward: { money: 16000, items: { magnet: 1, 'thunder-stone': 1, 'ultra-ball': 15, 'max-potion': 3 }, researchPoints: 60 },
      },
    },
    {
      id: 'sinnoh-route-223', name: 'Rota Marítima 223', kind: 'water', locations: ['sinnoh-sea-route-223', 'sinnoh-pokemon-league'],
      unlock: [badge('beacon'), surf], trainers: 4, trainerClasses: ['Swimmer', 'Fisherman'], winsToClear: 15,
    },
    {
      id: 'sinnoh-victory-road', name: 'Victory Road', kind: 'cave',
      locations: [
        'sinnoh-victory-road/1f', 'sinnoh-victory-road/2f', 'sinnoh-victory-road/b1f',
        'sinnoh-victory-road/inside', 'sinnoh-victory-road/inside-b1f', 'sinnoh-victory-road/inside-exit',
      ],
      unlock: [cleared('sinnoh-route-223')], trainers: 6, trainerClasses: ['Ace Trainer', 'Black Belt', 'Veteran'], winsToClear: 25, tags: ['cave'],
    },
    {
      id: 'sinnoh-league', name: 'Liga Pokémon', kind: 'league', locations: [], unlock: [cleared('sinnoh-victory-road')],
      league: {
        members: [
          t('sinnoh-aaron', 'Aaron', 'Elite Four', 150, [['dustox', 53], ['beautifly', 53], ['vespiquen', 54], ['heracross', 54], ['drapion', 57]]),
          t('sinnoh-bertha', 'Bertha', 'Elite Four', 150, [['whiscash', 55], ['gliscor', 56], ['golem', 56], ['rhyperior', 57], ['hippowdon', 59]]),
          t('sinnoh-flint', 'Flint', 'Elite Four', 150, [['rapidash', 58], ['steelix', 57], ['drifblim', 58], ['lopunny', 57], ['infernape', 61]]),
          t('sinnoh-lucian', 'Lucian', 'Elite Four', 150, [['mr-mime', 59], ['girafarig', 59], ['medicham', 60], ['alakazam', 60], ['bronzong', 63]]),
          t('sinnoh-cynthia', 'Cynthia', 'Campeã', 200, [
            ['spiritomb', 58], ['roserade', 58], ['togekiss', 60], ['lucario', 60], ['milotic', 58], ['garchomp', 62],
          ]),
        ],
        reward: { money: 60000, items: { 'master-ball': 1, 'rare-candy': 5 }, researchPoints: 200 },
      },
    },
    {
      id: 'sinnoh-snowpoint-temple', name: 'Templo de Snowpoint', kind: 'cave',
      locations: [
        'snowpoint-temple/1f', 'snowpoint-temple/b1f', 'snowpoint-temple/b2f', 'snowpoint-temple/b3f', 'snowpoint-temple/b4f', 'snowpoint-temple/b5f',
      ],
      unlock: [champion], winsToClear: 25, tags: ['cave'],
      legendaries: [{ species: 'regigigas', level: 70, chance: 1 / 400 }],
    },
    {
      id: 'sinnoh-route-224', name: 'Rota 224', kind: 'route', locations: ['sinnoh-route-224'], unlock: [champion],
      trainers: 4, trainerClasses: ['Ace Trainer', 'Veteran'], winsToClear: 20,
    },
    {
      id: 'sinnoh-route-225-226', name: 'Rotas 225–226 (Área de Combate)', kind: 'route', locations: ['sinnoh-route-225', 'sinnoh-sea-route-226'],
      unlock: [champion], trainers: 6, trainerClasses: ['Ace Trainer', 'Black Belt', 'Swimmer'], winsToClear: 20,
    },
    {
      id: 'sinnoh-stark-mountain', name: 'Rota 227 e Monte Stark', kind: 'cave',
      locations: ['sinnoh-route-227', 'stark-mountain', 'stark-mountain/entrance', 'stark-mountain/inside'],
      unlock: [cleared('sinnoh-route-225-226')], trainers: 4, trainerClasses: ['Ace Trainer', 'Dragon Tamer'], winsToClear: 30, tags: ['cave'],
      legendaries: [{ species: 'heatran', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'sinnoh-route-228-230', name: 'Rotas 228–230 e Área Resort', kind: 'route',
      locations: ['sinnoh-route-228', 'sinnoh-route-229', 'sinnoh-sea-route-230', 'resort-area'],
      unlock: [cleared('sinnoh-route-225-226')], trainers: 6, trainerClasses: ['Ace Trainer', 'Bird Keeper', 'Swimmer', 'Collector'], winsToClear: 20,
      extraSlots: [{ species: 'porygon', weight: 1, min: 40, max: 45 }],
      legendaries: [{ species: 'cresselia', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'sinnoh-turnback-cave', name: 'Fonte Sendoff e Caverna Turnback', kind: 'cave',
      locations: [
        'sendoff-spring', 'turnback-cave/before-pillar-1', 'turnback-cave/pillar-1', 'turnback-cave/between-pillars-1-and-2',
        'turnback-cave/pillar-2', 'turnback-cave/between-pillars-2-and-3', 'turnback-cave/pillar-3', 'turnback-cave/after-pillar-3',
      ],
      unlock: [champion], winsToClear: 30, tags: ['cave'],
      legendaries: [{ species: 'giratina', level: 47, chance: 1 / 500 }],
    },
  ],
};
