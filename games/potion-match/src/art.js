// Potion art from Eternal Alchemy. POTIONS index = colour in the board logic.
export const POTIONS = [
  { key: 'emberSovereign', tint: 0xff4d4d },
  { key: 'loamSovereign', tint: 0xffd23f },
  { key: 'clayrillCordial', tint: 0x4ee84e },
  { key: 'tideCommon', tint: 0x3ab8ff },
  { key: 'skysalt', tint: 0xa66bff },
  { key: 'emberGaleGreater', tint: 0xff5fc8 },
];

// Names and descriptions are translated in strings.js ('<special>.name' etc.).
export const SPECIAL_ART = {
  bomb: { key: 'loamGaleGrand', glow: 0xff9f1c },
  cross: { key: 'murk', glow: 0xffffff },
  rainbow: { key: 'embertideElixir', glow: 0xff5fc8 },
};

export const artPath = (key) => `potions/${key}.png`;
