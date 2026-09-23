// "First to discover" records: the first nickname to find each rare thing in a game.
//   GET  /discoveries?game=<game>                    { found: { key: name } }
//   POST /discoveries { game, key, name, client }    { first: name, you: bool }
import { DISCOVERIES, cleanName, validClient } from './rules.js';
import { TOO_MANY, checkLimit, now, readJson } from './limits.js';

export async function discoveries(request, db, url, reply) {
  if (request.method === 'GET') {
    const game = url.searchParams.get('game');
    if (!Object.hasOwn(DISCOVERIES, game)) return reply(400, { error: 'Unknown game.' });
    const { results } = await db.prepare('SELECT key, name FROM discoveries WHERE game = ?').bind(game).all();
    return reply(200, { found: Object.fromEntries(results.map((r) => [r.key, r.name])) });
  }
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  const body = await readJson(request);
  if (!body || !validClient(body.client)) return reply(400, { error: 'Missing device id.' });
  const { game, key } = body;
  const name = cleanName(body.name);
  if (!Object.hasOwn(DISCOVERIES, game) || !DISCOVERIES[game].has(key)) return reply(400, { error: 'Unknown discovery.' });
  if (!name) return reply(400, { error: 'A name is needed.' });

  const existing = await db.prepare('SELECT name FROM discoveries WHERE game = ? AND key = ?').bind(game, key).first();
  if (existing) return reply(200, { first: existing.name, you: false });
  const limit = await checkLimit(db, request, { action: 'find', client: body.client, seconds: 1, perHour: 60 });
  if (!limit) return reply(429, TOO_MANY);
  const [{ meta }] = await db.batch([
    db.prepare('INSERT OR IGNORE INTO discoveries (game, key, name, client, at) VALUES (?, ?, ?, ?, ?)').bind(game, key, name, body.client, now()),
    ...limit,
  ]);
  if (meta.changes === 1) return reply(201, { first: name, you: true });
  const row = await db.prepare('SELECT name FROM discoveries WHERE game = ? AND key = ?').bind(game, key).first();
  return reply(200, { first: row?.name ?? name, you: false });
}
