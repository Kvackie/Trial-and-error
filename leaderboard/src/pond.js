// Wild Pond: the shared pond players release creatures into and fish them out of.
//   GET  /pond                                  { count }
//   POST /pond/release { genes, name, client }  put a creature in
//   POST /pond/catch   { client }               take a random creature someone else released
// Genes are checked with the game's own rules (games/wild-pond/src/genes.js).
import { decode, encode, wildGenes } from '../../games/wild-pond/src/genes.js';
import { cleanName, validClient } from './rules.js';
import { TOO_MANY, checkLimit, now, readJson } from './limits.js';

export const POND_SIZE = 400; // oldest creatures swim off when it's fuller than this
const PER_HOUR = 120;

export async function pond(request, db, path, reply) {
  if (path === '/pond' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT COUNT(*) AS n FROM pond').all();
    return reply(200, { count: results[0].n });
  }
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });
  const body = await readJson(request);
  if (!body || !validClient(body.client)) return reply(400, { error: 'Missing device id.' });

  if (path === '/pond/release') {
    const genes = decode(body.genes);
    const name = cleanName(body.name);
    if (!genes) return reply(400, { error: 'That creature is not possible.' });
    const limit = await checkLimit(db, request, { action: 'pond', client: body.client, seconds: 2, perHour: PER_HOUR });
    if (!limit) return reply(429, TOO_MANY);
    await db.batch([
      db.prepare('INSERT INTO pond (genes, name, client, at) VALUES (?, ?, ?, ?)').bind(encode(genes), name, body.client, now()),
      db.prepare('DELETE FROM pond WHERE id <= (SELECT MAX(id) FROM pond) - ?').bind(POND_SIZE),
      ...limit,
    ]);
    return reply(201, { ok: true });
  }

  if (path === '/pond/catch') {
    const limit = await checkLimit(db, request, { action: 'pond', client: body.client, seconds: 2, perHour: PER_HOUR });
    if (!limit) return reply(429, TOO_MANY);
    await db.batch(limit);
    // A random creature someone else released. Two tries in case another player
    // catches the same one at the same moment.
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await db
        .prepare(
          `SELECT id, genes, name FROM pond WHERE client != ?1 AND id >= (
             SELECT MIN(id) + ABS(RANDOM()) % (MAX(id) - MIN(id) + 1) FROM pond)
           ORDER BY id LIMIT 1`,
        )
        .bind(body.client)
        .first();
      if (!row) break;
      const { meta } = await db.prepare('DELETE FROM pond WHERE id = ?').bind(row.id).run();
      if (meta.changes === 1) return reply(200, { genes: row.genes, name: row.name });
    }
    // Nothing (or only your own) in the pond: a wild one bites instead.
    return reply(200, { genes: encode(wildGenes()), name: null });
  }
  return reply(404, { error: 'Not found.' });
}
