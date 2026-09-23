// Languages shared by the games and the hub. The choice is stored once per device
// ('settings:lang') so every game and the hub follow it.
//
//   t(key, params)                 shared strings (Game Over, settings, leaderboard…)
//   makeT({ en: {...}, sv: {...} }) a game's own t(); falls back to English
//   bindText(scene, text, () => t('key'))   keeps a Phaser text in the current language
//   onSceneLangChange(scene, fn)  re-run fn when the language changes while the scene lives
//
// Strings may contain {name} placeholders, filled from params.

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'sv', name: 'Svenska' },
];
const KEY = 'settings:lang';
const listeners = new Set();

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    // Storage unavailable: fall back to the browser's language.
  }
  return /^sv\b/i.test(navigator.language ?? '') ? 'sv' : 'en';
}

let current = initial();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = () => current;

export function setLang(code) {
  if (code === current || !LANGUAGES.some((l) => l.code === code)) return;
  current = code;
  document.documentElement.lang = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // Not remembered, but still switched for now.
  }
  listeners.forEach((fn) => fn(code));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function makeT(dict) {
  return (key, params = {}) => {
    const text = dict[current]?.[key] ?? dict.en?.[key] ?? key;
    return String(text).replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '');
  };
}

// --- Phaser helpers --------------------------------------------------------------

export function onSceneLangChange(scene, fn) {
  const off = onLangChange(fn);
  scene.events.once('shutdown', off);
  scene.events.once('destroy', off);
}

export function bindText(scene, text, fn) {
  const update = () => text.setText(fn());
  update();
  onSceneLangChange(scene, update);
  return text;
}

// --- Shared strings --------------------------------------------------------------

export const t = makeT({
  en: {
    'gameOver.title': 'Game Over',
    'gameOver.score': 'Score: {score}\nBest: {best}',
    'gameOver.again': 'Tap or press Space to play again',
    'help.title': 'How to play',
    'dialog.cancel': 'Cancel',
    'dialog.close': 'Close',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.sound': 'Sound',
    'settings.on': 'On',
    'settings.off': 'Off',
    'settings.volume': 'Volume',
    'unit.score': 'Score',
    'unit.level': 'Level',
    'unit.deepest': 'Deepest level',
    'lb.title': 'Leaderboard',
    'lb.loading': 'Loading…',
    'lb.empty': 'No scores yet. Be the first!',
    'lb.offline': 'Couldn’t reach the leaderboard. Check your connection and try again.',
    'lb.submitBest': 'Submit my best ({unit} {score})',
    'lb.newBest': 'New best!',
    'lb.ask': '{unit} {score}. Add it to the global leaderboard?',
    'lb.name': 'Your name',
    'lb.notNow': 'Not now',
    'lb.submit': 'Submit',
    'lb.badName': 'Use 1 to 12 letters, digits, spaces, dots, dashes or underscores.',
    'lb.sending': 'Sending…',
    'lb.queued': 'You’re offline. It will be sent when you’re back online.',
    'lb.rank': 'You’re number {rank}!',
    'lb.sent': 'Sent! Not in the top 100 yet, keep going.',
    'lb.tooMany': 'Too many scores at once. Wait a moment and try again.',
    'lb.rejected': 'That score couldn’t be accepted.',
    'lb.unavailable': 'The leaderboard is unavailable right now.',
    'lb.whoAreYou': 'Pick a name',
    'lb.nameWhy': 'Other players will see this name next to what you share. It’s used in every game.',
    'lb.save': 'Save',
    'net.offline': 'You’re offline right now. Try again when you’re connected.',
  },
  sv: {
    'gameOver.title': 'Spelet är slut',
    'gameOver.score': 'Poäng: {score}\nBästa: {best}',
    'gameOver.again': 'Tryck på skärmen eller mellanslag för att spela igen',
    'help.title': 'Så spelar du',
    'dialog.cancel': 'Avbryt',
    'dialog.close': 'Stäng',
    'settings.title': 'Inställningar',
    'settings.language': 'Språk',
    'settings.sound': 'Ljud',
    'settings.on': 'På',
    'settings.off': 'Av',
    'settings.volume': 'Volym',
    'unit.score': 'Poäng',
    'unit.level': 'Nivå',
    'unit.deepest': 'Djupaste nivå',
    'lb.title': 'Topplista',
    'lb.loading': 'Laddar…',
    'lb.empty': 'Inga resultat än. Bli först!',
    'lb.offline': 'Kunde inte nå topplistan. Kontrollera anslutningen och försök igen.',
    'lb.submitBest': 'Skicka mitt bästa ({unit} {score})',
    'lb.newBest': 'Nytt rekord!',
    'lb.ask': '{unit} {score}. Vill du lägga till det på topplistan?',
    'lb.name': 'Ditt namn',
    'lb.notNow': 'Inte nu',
    'lb.submit': 'Skicka',
    'lb.badName': 'Använd 1 till 12 bokstäver, siffror, mellanslag, punkter, bindestreck eller understreck.',
    'lb.sending': 'Skickar…',
    'lb.queued': 'Du är offline. Det skickas när du är uppkopplad igen.',
    'lb.rank': 'Du är nummer {rank}!',
    'lb.sent': 'Skickat! Inte bland de 100 bästa än, kämpa på.',
    'lb.tooMany': 'För många resultat på en gång. Vänta en stund och försök igen.',
    'lb.rejected': 'Det resultatet kunde inte godkännas.',
    'lb.unavailable': 'Topplistan är inte tillgänglig just nu.',
    'lb.whoAreYou': 'Välj ett namn',
    'lb.nameWhy': 'Andra spelare ser det här namnet bredvid det du delar. Det används i alla spel.',
    'lb.save': 'Spara',
    'net.offline': 'Du är offline just nu. Försök igen när du är uppkopplad.',
  },
});
