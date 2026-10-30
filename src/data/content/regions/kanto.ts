import type { RegionDef, TrainerDef, TrainerMon } from '../types';

const t = (id: string, name: string, trainerClass: string, moneyPerLevel: number, team: [string, number][]): TrainerDef => ({
  id, name, trainerClass, moneyPerLevel, team: team.map(([species, level]): TrainerMon => ({ species, level })),
});
const cleared = (areaId: string) => ({ type: 'areaCleared' as const, areaId });
const badge = (badgeId: string) => ({ type: 'badge' as const, badgeId });

export const KANTO: RegionDef = {
  id: 'kanto',
  name: 'Kanto',
  order: 1,
  unlock: [],
  levelCaps: [16, 23, 27, 32, 45, 46, 50, 53, 65],
  championCap: 70,
  levelOffset: 0,
  levelScale: 1,
  starters: ['bulbasaur', 'charmander', 'squirtle'],
  areas: [
    { id: 'kanto-route-1', name: 'Rota 1', kind: 'route', locations: ['kanto-route-1'], unlock: [], winsToClear: 10 },
    { id: 'kanto-route-22', name: 'Rota 22', kind: 'route', locations: ['kanto-route-22'], unlock: [cleared('kanto-route-1')], winsToClear: 10 },
    {
      id: 'kanto-route-2', name: 'Rota 2', kind: 'route',
      locations: ['kanto-route-2/south-towards-viridian-city'],
      unlock: [cleared('kanto-route-1')], winsToClear: 10,
    },
    {
      id: 'kanto-viridian-forest', name: 'Floresta de Viridian', kind: 'forest', locations: ['viridian-forest'],
      unlock: [cleared('kanto-route-2')], trainers: 3, trainerClasses: ['Bug Catcher'], winsToClear: 15,
    },
    {
      id: 'kanto-pewter-gym', name: 'Ginásio de Pewter', kind: 'gym', locations: [], unlock: [cleared('kanto-viridian-forest')],
      gym: {
        badgeId: 'boulder', badgeName: 'Insígnia Pedra', type: 'rock',
        trainers: [t('pewter-1', 'Liam', 'Camper', 20, [['geodude', 10], ['sandshrew', 11]])],
        leader: t('brock', 'Brock', 'Líder de Ginásio', 120, [['geodude', 12], ['onix', 14]]),
        reward: { money: 1500, items: { 'great-ball': 5, potion: 5 }, researchPoints: 10 },
      },
    },
    {
      id: 'kanto-route-3', name: 'Rota 3', kind: 'route', locations: ['kanto-route-3'], unlock: [badge('boulder')],
      trainers: 5, trainerClasses: ['Youngster', 'Lass', 'Bug Catcher'], winsToClear: 15,
    },
    {
      id: 'kanto-mt-moon', name: 'Mt. Moon', kind: 'cave', locations: ['mt-moon/1f', 'mt-moon/b1f', 'mt-moon/b2f'],
      unlock: [cleared('kanto-route-3')], trainers: 4, trainerClasses: ['Hiker', 'Super Nerd', 'Rocket Grunt'], winsToClear: 20,
      extraSlots: [{ species: 'omanyte', weight: 2, min: 12, max: 14 }, { species: 'kabuto', weight: 2, min: 12, max: 14 }],
      tags: ['cave'],
    },
    {
      id: 'kanto-route-4', name: 'Rota 4', kind: 'route', locations: ['kanto-route-4'], unlock: [cleared('kanto-mt-moon')],
      trainers: 1, trainerClasses: ['Lass'], winsToClear: 10,
    },
    {
      id: 'kanto-cerulean-gym', name: 'Ginásio de Cerulean', kind: 'gym', locations: [], unlock: [cleared('kanto-route-4')],
      gym: {
        badgeId: 'cascade', badgeName: 'Insígnia Cascata', type: 'water',
        trainers: [t('cerulean-1', 'Diana', 'Picnicker', 20, [['goldeen', 19]]), t('cerulean-2', 'Luis', 'Swimmer', 16, [['horsea', 16], ['shellder', 16]])],
        leader: t('misty', 'Misty', 'Líder de Ginásio', 120, [['staryu', 18], ['starmie', 21]]),
        reward: { money: 2500, items: { 'super-potion': 5, 'net-ball': 5 }, researchPoints: 15 },
      },
      clearReward: { items: { bicycle: 1 } },
    },
    {
      id: 'kanto-route-24', name: 'Rota 24 (Ponte Nugget)', kind: 'route', locations: ['kanto-route-24'], unlock: [badge('cascade')],
      trainers: 6, trainerClasses: ['Youngster', 'Lass', 'Camper', 'Rocket Grunt'], winsToClear: 15,
      extraSlots: [{ species: 'charmander', weight: 1, min: 10, max: 12 }],
    },
    {
      id: 'kanto-route-25', name: 'Rota 25', kind: 'route', locations: ['kanto-route-25'], unlock: [cleared('kanto-route-24')],
      trainers: 5, trainerClasses: ['Hiker', 'Lass', 'Youngster'], winsToClear: 15,
      extraSlots: [{ species: 'bulbasaur', weight: 1, min: 10, max: 12 }, { species: 'squirtle', weight: 1, min: 10, max: 12 }],
    },
    { id: 'kanto-route-5', name: 'Rota 5', kind: 'route', locations: ['kanto-route-5'], unlock: [badge('cascade')], winsToClear: 10 },
    {
      id: 'kanto-route-6', name: 'Rota 6', kind: 'route', locations: ['kanto-route-6'], unlock: [cleared('kanto-route-5')],
      trainers: 4, trainerClasses: ['Bug Catcher', 'Camper', 'Picnicker'], winsToClear: 15,
    },
    {
      id: 'kanto-ss-anne', name: 'S.S. Anne', kind: 'building', locations: ['ss-anne'], unlock: [cleared('kanto-route-6')],
      trainers: 6, trainerClasses: ['Sailor', 'Gentleman', 'Fisherman'], trainerLevel: 18, winsToClear: 5,
      clearReward: { items: { 'old-rod': 1 } },
    },
    {
      id: 'kanto-vermilion-gym', name: 'Ginásio de Vermilion', kind: 'gym', locations: [], unlock: [cleared('kanto-ss-anne')],
      gym: {
        badgeId: 'thunder', badgeName: 'Insígnia Trovão', type: 'electric',
        trainers: [t('vermilion-1', 'Tucker', 'Engineer', 48, [['voltorb', 21], ['magnemite', 21]]), t('vermilion-2', 'Dwayne', 'Sailor', 32, [['pikachu', 21], ['pikachu', 21]])],
        leader: t('lt-surge', 'Lt. Surge', 'Líder de Ginásio', 120, [['voltorb', 21], ['pikachu', 18], ['raichu', 24]]),
        reward: { money: 3500, items: { 'dusk-ball': 5, 'quick-ball': 5, revive: 2 }, researchPoints: 20 },
      },
    },
    {
      id: 'kanto-route-11', name: 'Rota 11', kind: 'route', locations: ['kanto-route-11'], unlock: [badge('thunder')],
      trainers: 6, trainerClasses: ['Youngster', 'Engineer', 'Gambler'], winsToClear: 15,
    },
    { id: 'kanto-digletts-cave', name: "Diglett's Cave", kind: 'cave', locations: ['digletts-cave'], unlock: [badge('thunder')], winsToClear: 15, tags: ['cave'] },
    {
      id: 'kanto-route-9', name: 'Rota 9', kind: 'route', locations: ['kanto-route-9'], unlock: [badge('thunder')],
      trainers: 5, trainerClasses: ['Hiker', 'Picnicker', 'Bug Catcher'], winsToClear: 15,
    },
    {
      id: 'kanto-route-10', name: 'Rota 10', kind: 'route', locations: ['kanto-route-10'], unlock: [cleared('kanto-route-9')],
      trainers: 4, trainerClasses: ['Hiker', 'Super Nerd'], winsToClear: 15,
    },
    {
      id: 'kanto-rock-tunnel', name: 'Rock Tunnel', kind: 'cave', locations: ['rock-tunnel/1f', 'rock-tunnel/b1f'], unlock: [cleared('kanto-route-10')],
      trainers: 6, trainerClasses: ['Hiker', 'Pokémaniac', 'Picnicker'], winsToClear: 20, tags: ['cave'],
    },
    {
      id: 'kanto-route-8', name: 'Rota 8', kind: 'route', locations: ['kanto-route-8'], unlock: [cleared('kanto-rock-tunnel')],
      trainers: 6, trainerClasses: ['Lass', 'Gambler', 'Biker'], winsToClear: 15,
      extraSlots: [{ species: 'hitmonlee', weight: 1, min: 25, max: 25 }, { species: 'hitmonchan', weight: 1, min: 25, max: 25 }],
    },
    {
      id: 'kanto-route-7', name: 'Rota 7', kind: 'route', locations: ['kanto-route-7'], unlock: [cleared('kanto-route-8')], winsToClear: 10,
      extraSlots: [{ species: 'eevee', weight: 2, min: 20, max: 22 }, { species: 'porygon', weight: 1, min: 22, max: 24 }],
    },
    {
      id: 'kanto-celadon-gym', name: 'Ginásio de Celadon', kind: 'gym', locations: [], unlock: [cleared('kanto-route-7')],
      gym: {
        badgeId: 'rainbow', badgeName: 'Insígnia Arco-Íris', type: 'grass',
        trainers: [t('celadon-1', 'Lisa', 'Beauty', 56, [['oddish', 23], ['bellsprout', 23], ['gloom', 25]]), t('celadon-2', 'Tamia', 'Lass', 16, [['bulbasaur', 24], ['ivysaur', 26]])],
        leader: t('erika', 'Erika', 'Líder de Ginásio', 120, [['victreebel', 29], ['tangela', 24], ['vileplume', 29]]),
        reward: { money: 5000, items: { 'ultra-ball': 5, 'leaf-stone': 1 }, researchPoints: 25 },
      },
    },
    {
      id: 'kanto-pokemon-tower', name: 'Torre Pokémon', kind: 'building',
      locations: ['pokemon-tower/3f', 'pokemon-tower/4f', 'pokemon-tower/5f', 'pokemon-tower/6f', 'pokemon-tower/7f'],
      unlock: [badge('rainbow')], trainers: 5, trainerClasses: ['Channeler', 'Rocket Grunt'], winsToClear: 20,
    },
    {
      id: 'kanto-route-12', name: 'Rota 12', kind: 'route', locations: ['kanto-route-12'], unlock: [cleared('kanto-pokemon-tower')],
      trainers: 5, trainerClasses: ['Fisherman', 'Rocker', 'Camper'], winsToClear: 15,
      extraSlots: [{ species: 'snorlax', weight: 1, min: 30, max: 30 }],
      clearReward: { items: { 'good-rod': 1 } },
    },
    {
      id: 'kanto-route-13', name: 'Rota 13', kind: 'route', locations: ['kanto-route-13'], unlock: [cleared('kanto-route-12')],
      trainers: 6, trainerClasses: ['Bird Keeper', 'Beauty', 'Biker'], winsToClear: 15,
    },
    {
      id: 'kanto-route-14', name: 'Rota 14', kind: 'route', locations: ['kanto-route-14'], unlock: [cleared('kanto-route-13')],
      trainers: 6, trainerClasses: ['Bird Keeper', 'Biker'], winsToClear: 15,
    },
    {
      id: 'kanto-route-15', name: 'Rota 15', kind: 'route', locations: ['kanto-route-15'], unlock: [cleared('kanto-route-14')],
      trainers: 6, trainerClasses: ['Beauty', 'Biker', 'Picnicker'], winsToClear: 15,
    },
    {
      id: 'kanto-route-16', name: 'Rota 16 (Ciclovia)', kind: 'route', locations: ['kanto-route-16'], unlock: [cleared('kanto-pokemon-tower')],
      trainers: 5, trainerClasses: ['Biker', 'Cue Ball'], winsToClear: 15,
      extraSlots: [{ species: 'snorlax', weight: 1, min: 30, max: 30 }],
    },
    {
      id: 'kanto-route-17', name: 'Rota 17', kind: 'route', locations: ['kanto-route-17'], unlock: [cleared('kanto-route-16')],
      trainers: 6, trainerClasses: ['Biker', 'Cue Ball'], winsToClear: 15,
    },
    {
      id: 'kanto-route-18', name: 'Rota 18', kind: 'route', locations: ['kanto-route-18'], unlock: [cleared('kanto-route-17')],
      trainers: 3, trainerClasses: ['Bird Keeper'], winsToClear: 15,
    },
    {
      id: 'kanto-fuchsia-gym', name: 'Ginásio de Fuchsia', kind: 'gym', locations: [],
      unlock: [{ type: 'anyOf', of: [cleared('kanto-route-15'), cleared('kanto-route-18')] }],
      gym: {
        badgeId: 'soul', badgeName: 'Insígnia Alma', type: 'poison',
        trainers: [t('fuchsia-1', 'Kirk', 'Juggler', 40, [['drowzee', 34], ['kadabra', 36]]), t('fuchsia-2', 'Phil', 'Tamer', 40, [['arbok', 37], ['sandslash', 37]])],
        leader: t('koga', 'Koga', 'Líder de Ginásio', 120, [['koffing', 37], ['muk', 39], ['koffing', 37], ['weezing', 43]]),
        reward: { money: 7000, items: { 'ultra-ball': 10, 'hyper-potion': 3 }, researchPoints: 30 },
      },
    },
    {
      id: 'kanto-safari-zone', name: 'Zona Safari', kind: 'special',
      locations: ['kanto-safari-zone/middle', 'kanto-safari-zone/area-1-east', 'kanto-safari-zone/area-2-north', 'kanto-safari-zone/area-3-west'],
      unlock: [badge('soul')], winsToClear: 25,
      clearReward: { items: { 'hm-surf': 1, 'super-rod': 1 } },
    },
    {
      id: 'kanto-saffron-gym', name: 'Ginásio de Saffron', kind: 'gym', locations: [], unlock: [badge('soul')],
      gym: {
        badgeId: 'marsh', badgeName: 'Insígnia Pântano', type: 'psychic',
        trainers: [t('saffron-1', 'Johan', 'Psychic', 24, [['kadabra', 38], ['slowpoke', 38]]), t('saffron-2', 'Cameron', 'Psychic', 24, [['mr-mime', 37], ['kadabra', 38]])],
        leader: t('sabrina', 'Sabrina', 'Líder de Ginásio', 120, [['kadabra', 38], ['mr-mime', 37], ['venomoth', 38], ['alakazam', 43]]),
        reward: { money: 8000, items: { 'ultra-ball': 10, 'max-potion': 2 }, researchPoints: 35 },
      },
    },
    {
      id: 'kanto-sea-routes', name: 'Rotas Marítimas 19–20', kind: 'water', locations: ['kanto-sea-route-19', 'kanto-sea-route-20'],
      unlock: [badge('marsh'), { type: 'keyItem', itemId: 'hm-surf' }], trainers: 6, trainerClasses: ['Swimmer', 'Beauty'], winsToClear: 15,
      extraSlots: [{ species: 'lapras', weight: 2, min: 25, max: 30, method: 'surf' }],
    },
    {
      id: 'kanto-seafoam-islands', name: 'Ilhas Seafoam', kind: 'cave',
      locations: ['seafoam-islands/1f', 'seafoam-islands/b1f', 'seafoam-islands/b2f', 'seafoam-islands/b3f', 'seafoam-islands/b4f'],
      unlock: [cleared('kanto-sea-routes')], winsToClear: 20, tags: ['cave'],
      legendaries: [{ species: 'articuno', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'kanto-pokemon-mansion', name: 'Mansão Pokémon', kind: 'building',
      locations: ['pokemon-mansion/1f', 'pokemon-mansion/2f', 'pokemon-mansion/3f', 'pokemon-mansion/b1f'],
      unlock: [cleared('kanto-seafoam-islands')], trainers: 4, trainerClasses: ['Burglar', 'Scientist'], winsToClear: 20,
      extraSlots: [{ species: 'aerodactyl', weight: 1, min: 30, max: 32 }],
    },
    {
      id: 'kanto-cinnabar-gym', name: 'Ginásio de Cinnabar', kind: 'gym', locations: [], unlock: [cleared('kanto-pokemon-mansion')],
      gym: {
        badgeId: 'volcano', badgeName: 'Insígnia Vulcão', type: 'fire',
        trainers: [t('cinnabar-1', 'Derek', 'Super Nerd', 24, [['ponyta', 40], ['charmeleon', 40]]), t('cinnabar-2', 'Zac', 'Burglar', 36, [['growlithe', 41], ['magmar', 41]])],
        leader: t('blaine', 'Blaine', 'Líder de Ginásio', 120, [['growlithe', 42], ['ponyta', 40], ['rapidash', 42], ['arcanine', 47]]),
        reward: { money: 9000, items: { 'fire-stone': 1, 'max-potion': 3 }, researchPoints: 40 },
      },
    },
    {
      id: 'kanto-power-plant', name: 'Usina Elétrica', kind: 'building', locations: ['kanto-power-plant'],
      unlock: [badge('volcano')], winsToClear: 20,
      legendaries: [{ species: 'zapdos', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'kanto-route-21', name: 'Rota Marítima 21', kind: 'water', locations: ['kanto-sea-route-21'], unlock: [badge('volcano')],
      trainers: 5, trainerClasses: ['Swimmer', 'Fisherman'], winsToClear: 15,
    },
    {
      id: 'kanto-viridian-gym', name: 'Ginásio de Viridian', kind: 'gym', locations: [], unlock: [badge('volcano')],
      gym: {
        badgeId: 'earth', badgeName: 'Insígnia Terra', type: 'ground',
        trainers: [t('viridian-1', 'Jason', 'Cooltrainer', 48, [['sandslash', 43], ['dugtrio', 43]]), t('viridian-2', 'Atsushi', 'Black Belt', 24, [['machoke', 43], ['primeape', 43]])],
        leader: t('giovanni', 'Giovanni', 'Líder de Ginásio', 120, [['rhyhorn', 45], ['dugtrio', 42], ['nidoqueen', 44], ['nidoking', 45], ['rhydon', 50]]),
        reward: { money: 10000, items: { 'ultra-ball': 15, revive: 5 }, researchPoints: 50 },
      },
    },
    {
      id: 'kanto-route-23', name: 'Rota 23', kind: 'route', locations: ['kanto-route-23'], unlock: [badge('earth')], winsToClear: 15,
    },
    {
      id: 'kanto-victory-road', name: 'Victory Road', kind: 'cave',
      locations: ['kanto-victory-road-2/1f', 'kanto-victory-road-2/2f', 'kanto-victory-road-2/3f'],
      unlock: [cleared('kanto-route-23')], trainers: 6, trainerClasses: ['Cooltrainer', 'Black Belt'], winsToClear: 25, tags: ['cave'],
      legendaries: [{ species: 'moltres', level: 50, chance: 1 / 400 }],
    },
    {
      id: 'kanto-indigo-plateau', name: 'Planalto Índigo (Liga)', kind: 'league', locations: [], unlock: [cleared('kanto-victory-road')],
      league: {
        members: [
          t('lorelei', 'Lorelei', 'Elite Four', 150, [['dewgong', 52], ['cloyster', 51], ['slowbro', 52], ['jynx', 54], ['lapras', 54]]),
          t('bruno', 'Bruno', 'Elite Four', 150, [['onix', 51], ['hitmonchan', 53], ['hitmonlee', 53], ['onix', 54], ['machamp', 56]]),
          t('agatha', 'Agatha', 'Elite Four', 150, [['gengar', 54], ['golbat', 54], ['haunter', 53], ['arbok', 56], ['gengar', 58]]),
          t('lance', 'Lance', 'Elite Four', 150, [['gyarados', 56], ['dragonair', 54], ['dragonair', 54], ['aerodactyl', 58], ['dragonite', 60]]),
          t('blue', 'Blue', 'Campeão', 200, [['pidgeot', 59], ['alakazam', 57], ['rhydon', 59], ['exeggutor', 59], ['arcanine', 61], ['blastoise', 63]]),
        ],
        reward: { money: 30000, items: { 'master-ball': 1, 'rare-candy': 5 }, researchPoints: 150 },
      },
    },
    {
      id: 'kanto-cerulean-cave', name: 'Caverna Cerulean', kind: 'cave', locations: ['cerulean-cave/1f', 'cerulean-cave/2f', 'cerulean-cave/b1f'],
      unlock: [{ type: 'championOf', regionId: 'kanto' }], winsToClear: 30, tags: ['cave'],
      legendaries: [{ species: 'mewtwo', level: 70, chance: 1 / 500 }],
    },
  ],
};
