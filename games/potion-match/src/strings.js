import { makeT } from '../../../shared/i18n.js';

export const tr = makeT({
  en: {
    score: 'SCORE',
    moves: 'MOVES',
    shuffling: 'No moves - shuffling!',
    'bomb.name': 'Bomb',
    'bomb.how': 'Match 4 in a row',
    'bomb.does': 'Clears the 3×3 square around it.',
    'cross.name': 'Cross',
    'cross.how': 'Match in an L or T shape',
    'cross.does': 'Clears its whole row and column.',
    'rainbow.name': 'Rainbow',
    'rainbow.how': 'Match 5 in a row',
    'rainbow.does': 'Swap it with a potion to clear every potion of that colour.',
  },
  sv: {
    score: 'POÄNG',
    moves: 'DRAG',
    shuffling: 'Inga drag – blandar!',
    'bomb.name': 'Bomb',
    'bomb.how': 'Matcha 4 i rad',
    'bomb.does': 'Rensar rutorna 3×3 runt den.',
    'cross.name': 'Kors',
    'cross.how': 'Matcha i en L- eller T-form',
    'cross.does': 'Rensar hela sin rad och kolumn.',
    'rainbow.name': 'Regnbåge',
    'rainbow.how': 'Matcha 5 i rad',
    'rainbow.does': 'Byt den med en dryck för att rensa alla drycker i den färgen.',
  },
});
