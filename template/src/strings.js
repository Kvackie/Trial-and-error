import { makeT } from '../../../shared/i18n.js';

// The game's own text, in every language. Shared text (Game Over, settings,
// leaderboard…) comes from t() in shared/i18n.js.
export const tr = makeT({
  en: { score: 'Score {score}', time: '{seconds} s', start: 'Tap the circle' },
  sv: { score: 'Poäng {score}', time: '{seconds} s', start: 'Tryck på cirkeln' },
});
