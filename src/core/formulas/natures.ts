import type { StatKey } from '../../data/types';

export interface Nature {
  id: string;
  name: string;
  up: StatKey | null;
  down: StatKey | null;
}

const N = (id: string, name: string, up: StatKey | null, down: StatKey | null): Nature => ({ id, name, up, down });

export const NATURES: Nature[] = [
  N('hardy', 'Hardy', null, null), N('lonely', 'Lonely', 'atk', 'def'), N('brave', 'Brave', 'atk', 'spe'),
  N('adamant', 'Adamant', 'atk', 'spa'), N('naughty', 'Naughty', 'atk', 'spd'), N('bold', 'Bold', 'def', 'atk'),
  N('docile', 'Docile', null, null), N('relaxed', 'Relaxed', 'def', 'spe'), N('impish', 'Impish', 'def', 'spa'),
  N('lax', 'Lax', 'def', 'spd'), N('timid', 'Timid', 'spe', 'atk'), N('hasty', 'Hasty', 'spe', 'def'),
  N('serious', 'Serious', null, null), N('jolly', 'Jolly', 'spe', 'spa'), N('naive', 'Naive', 'spe', 'spd'),
  N('modest', 'Modest', 'spa', 'atk'), N('mild', 'Mild', 'spa', 'def'), N('quiet', 'Quiet', 'spa', 'spe'),
  N('bashful', 'Bashful', null, null), N('rash', 'Rash', 'spa', 'spd'), N('calm', 'Calm', 'spd', 'atk'),
  N('gentle', 'Gentle', 'spd', 'def'), N('sassy', 'Sassy', 'spd', 'spe'), N('careful', 'Careful', 'spd', 'spa'),
  N('quirky', 'Quirky', null, null),
];

export const NATURE_BY_ID = new Map(NATURES.map((n) => [n.id, n]));
