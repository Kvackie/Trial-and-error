// Potion art from Eternal Alchemy. POTIONS index = colour in the board logic.
export const POTIONS = [
  { key: 'emberSovereign', tint: 0xff4d4d },
  { key: 'loamSovereign', tint: 0xffd23f },
  { key: 'clayrillCordial', tint: 0x4ee84e },
  { key: 'tideCommon', tint: 0x3ab8ff },
  { key: 'skysalt', tint: 0xa66bff },
  { key: 'emberGaleGreater', tint: 0xff5fc8 },
];

export const SPECIAL_ART = {
  bomb: { key: 'loamGaleGrand', glow: 0xff9f1c, name: 'Bomb', how: 'Match 4 in a row', does: 'Clears the 3×3 square around it.' },
  cross: { key: 'murk', glow: 0xffffff, name: 'Cross', how: 'Match in an L or T shape', does: 'Clears its whole row and column.' },
  rainbow: {
    key: 'embertideElixir',
    glow: 0xff5fc8,
    name: 'Rainbow',
    how: 'Match 5 in a row',
    does: 'Swap it with a potion to clear every potion of that colour.',
  },
};

export const artPath = (key) => `potions/${key}.png`;
