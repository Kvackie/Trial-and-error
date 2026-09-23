// Online service for the games.
//   GET  /scores?game=<game>&limit=<n>     top scores, best first
//   POST /scores  { game, name, score, client }   submit a score; returns its rank
//   /discoveries, /pond…, /market…         see discoveries.js, pond.js, market.js
import { GAMES, KEEP_PER_GAME, MAX_PER_HOUR, MIN_SECONDS_BETWEEN, TOP_LIMIT, allowedOrigin, validateSubmission } from './rules.js';
import { hashAddress } from './limits.js';
import { discoveries } from './discoveries.js';
import { pond } from './pond.js';
import { market } from './market.js';

// Other routes, by the first part of the path.
const ROUTES = {
  discoveries: (request, env, url, reply) => discoveries(request, env.DB, url, reply),
  pond: (request, env, url, reply) => pond(request, env.DB, url.pathname, reply),
  market: (request, env, url, reply) => market(request, env.DB, url.pathname, reply),
};

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request.headers.get('Origin'));
    const cors = origin
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
      : {};
    const reply = (status, data) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors });
    const url = new URL(request.url);
    const route = ROUTES[url.pathname.split('/')[1]];
    if (url.pathname !== '/scores' && !route) return reply(404, { error: 'Not found.' });

    try {
      if (route) {
        if (request.method === 'POST' && !origin) return reply(403, { error: 'Not allowed from this site.' });
        return await route(request, env, url, reply);
      }
      if (request.method === 'GET') return reply(200, await top(env.DB, url));
      if (request.method === 'POST') {
        if (!origin) return reply(403, { error: 'Not allowed from this site.' });
        return await submit(env.DB, request, reply);
      }
      return reply(405, { error: 'Method not allowed.' });
    } catch (error) {
      console.error(error);
      return reply(500, { error: 'Something went wrong. Try again later.' });
    }
  },
};

async function top(db, url) {
  const game = url.searchParams.get('game');
  if (!Object.hasOwn(GAMES, game)) return { error: 'Unknown game.', scores: [] };
  const limit = Math.min(TOP_LIMIT, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const { results } = await db
    .prepare('SELECT name, score, created_at AS at FROM scores WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?')
    .bind(game, limit)
    .all();
  return { game, scores: results };
}

async function submit(db, request, reply) {
  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'Expected JSON.' });
  }
  const { entry, error } = validateSubmission(body);
  if (error) return reply(400, { error });

  const now = Math.floor(Date.now() / 1000);
  const address = await hashAddress(request);
  const [device, network] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM recent WHERE key = ? AND at > ?').bind(`c:${entry.client}`, now - MIN_SECONDS_BETWEEN),
    db.prepare('SELECT COUNT(*) AS n FROM recent WHERE key = ? AND at > ?').bind(`a:${address}`, now - 3600),
  ]);
  if (device.results[0].n > 0 || network.results[0].n >= MAX_PER_HOUR) {
    return reply(429, { error: 'Too many scores at once. Wait a moment and try again.' });
  }

  await db.batch([
    db.prepare('INSERT INTO scores (game, name, score, client, created_at) VALUES (?, ?, ?, ?, ?)').bind(entry.game, entry.name, entry.score, entry.client, now),
    db.prepare('INSERT INTO recent (key, at) VALUES (?, ?), (?, ?)').bind(`c:${entry.client}`, now, `a:${address}`, now),
    db.prepare('DELETE FROM recent WHERE at < ?').bind(now - 3600),
    // Keep only the best KEEP_PER_GAME entries for this game.
    db.prepare(
      `DELETE FROM scores WHERE game = ?1 AND id NOT IN (
         SELECT id FROM scores WHERE game = ?1 ORDER BY score DESC, created_at ASC LIMIT ?2)`,
    ).bind(entry.game, KEEP_PER_GAME),
  ]);
  const { results } = await db
    .prepare('SELECT COUNT(*) + 1 AS rank FROM scores WHERE game = ? AND score > ?')
    .bind(entry.game, entry.score)
    .all();
  const rank = results[0].rank;
  return reply(201, { rank: rank <= KEEP_PER_GAME ? rank : null });
}
