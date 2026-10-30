// Ícones em pixel art próprios (onde não há sprite de item dos jogos que sirva).
import { art } from './field/art';

const INK = { K: '#1b2238', W: '#ffffff', R: '#e5484d', r: '#a8282f', B: '#4aa3ff', b: '#2266b8', Y: '#ffcc3d', y: '#c9921a', G: '#9aa6bd', g: '#5c6987', T: '#9a6a3a', t: '#6b4524', S: '#d7e1f2' };

const HOUSE = [
  '.......RR.......', '......RRRR......', '.....RRrrRR.....', '....RRrrrrRR....', '...RRrrrrrrRR...', '..RRrrrrrrrrRR..',
  '.RRRRRRRRRRRRRR.', '..WWWWWWWWWWWW..', '..WSSWWWWWWSSW..', '..WSBWWTTWWSBW..', '..WWWWWTtWWWWW..', '..WWWWWTtWWWWW..',
  '..WWWWWTtWWWWW..', '..ggggggggggggg.',
];
const SWORDS = [
  'S..............S', 'SS............SS', '.SS..........SS.', '..SS........SS..', '...SS......SS...', '....SS....SS....',
  '.....SS..SS.....', '......SSSS......', '......SSSS......', '.....YY..YY.....', '....YYy..yYY....', '...TTy....yTT...',
  '..TT........TT..', '.TT..........TT.',
];

const GEAR = [
  '......SS......', '...S..SS..S....', '..SSSSSSSSSS...', '...SSggggSS....', '..SSg....gSS...', 'SSSg......gSSS.', 'SSSg......gSSS.',
  '..SSg....gSS...', '...SSggggSS....', '..SSSSSSSSSS...', '...S..SS..S....', '......SS.......',
];
const FULL = [
  'SSSS......SSSS', 'S............S', 'S............S', 'S............S', '..............', '..............', '..............',
  '..............', '..............', 'S............S', 'S............S', 'S............S', 'SSSS......SSSS',
];

export const PIXEL_ICONS = { house: art(HOUSE, INK), swords: art(SWORDS, INK), gear: art(GEAR, INK), full: art(FULL, INK) };
