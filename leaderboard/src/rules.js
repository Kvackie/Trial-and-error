// What the service accepts. Kept apart from the request handling so it can be
// tested in Node.

// One entry per game with a leaderboard. max rejects impossible scores.
export const GAMES = {
  'block-drop': { max: 5_000_000 },
  'potion-match': { max: 50_000_000 }, // Zen mode (endless)
  'potion-match-classic': { max: 5_000_000 },
  'lantern-maze': { max: 1_000 }, // deepest level reached
};

export const KEEP_PER_GAME = 100; // older, lower scores are dropped
export const TOP_LIMIT = 50; // most a client can ask for at once
export const MIN_SECONDS_BETWEEN = 15; // per device
export const MAX_PER_HOUR = 30; // per network address

// Sites allowed to call the service: the published site, the Android apps
// (Capacitor serves them from https://localhost) and local development.
export function allowedOrigin(origin) {
  if (!origin) return null;
  if (origin === 'https://kvackie.github.io' || origin === 'https://localhost') return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

const NAME = /^[\p{L}\p{N} _.-]{1,12}$/u;
const CLIENT = /^[A-Za-z0-9-]{8,64}$/;

// A tidied nickname, or null if it isn't allowed.
export function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return NAME.test(name) ? name : null;
}

export const validClient = (client) => typeof client === 'string' && CLIENT.test(client);

// Returns { entry } with cleaned values, or { error } explaining what's wrong.
export function validateSubmission(body) {
  if (!body || typeof body !== 'object') return { error: 'Expected a JSON object.' };
  const { game, score, client } = body;
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!Object.hasOwn(GAMES, game)) return { error: 'Unknown game.' };
  if (!NAME.test(name)) return { error: 'Names are 1 to 12 letters, digits, spaces, dots, dashes or underscores.' };
  if (!Number.isSafeInteger(score) || score < 1 || score > GAMES[game].max) return { error: 'That score is not possible.' };
  if (typeof client !== 'string' || !CLIENT.test(client)) return { error: 'Missing device id.' };
  return { entry: { game, name, score, client } };
}
