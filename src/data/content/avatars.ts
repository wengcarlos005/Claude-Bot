// Avatares do treinador (cosméticos). Sprites de treinador do Pokémon Showdown, carregados por URL como os de Pokémon.
export interface AvatarDef {
  id: string;
  name: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'red', name: 'Red' }, { id: 'leaf', name: 'Leaf' }, { id: 'ethan', name: 'Ethan' }, { id: 'lyra', name: 'Lyra' },
  { id: 'brendan', name: 'Brendan' }, { id: 'may', name: 'May' }, { id: 'lucas', name: 'Lucas' }, { id: 'dawn', name: 'Dawn' },
  { id: 'hilbert', name: 'Hilbert' }, { id: 'hilda', name: 'Hilda' },
];
export const DEFAULT_AVATAR = 'red';
