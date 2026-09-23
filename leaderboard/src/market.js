// Potion Market: one market shared by every player. Each sale pushes that potion's
// price down; the push fades over a few hours (games/potion-market/src/economy.js).
//   GET  /market                                       { day, hot, pressure: { potion: n } }
//   POST /market/sell { potion, count, quality, client }  { total, pressure }
import { potionById } from '../../games/potion-market/src/data.js';
import { MAX_SELL, dayNumber, decay, hotPotion, saleTotal } from '../../games/potion-market/src/economy.js';
import { validClient } from './rules.js';
import { TOO_MANY, checkLimit, now, readJson } from './limits.js';

const PER_HOUR = 240;

async function pressures(db) {
  const t = now();
  const { results } = await db.prepare('SELECT potion, pressure, updated FROM market').all();
  return Object.fromEntries(results.map((r) => [r.potion, decay(r.pressure, t - r.updated)]));
}

export async function market(request, db, path, reply) {
  if (path === '/market' && request.method === 'GET') {
    const day = dayNumber();
    return reply(200, { day, hot: hotPotion(day), pressure: await pressures(db) });
  }
  if (path !== '/market/sell') return reply(404, { error: 'Not found.' });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  const body = await readJson(request);
  if (!body || !validClient(body.client)) return reply(400, { error: 'Missing device id.' });
  const { potion, count, quality } = body;
  if (!Object.hasOwn(potionById, potion)) return reply(400, { error: 'Unknown potion.' });
  if (!Number.isInteger(count) || count < 1 || count > MAX_SELL) return reply(400, { error: 'Sell 1 to 30 at a time.' });
  if (typeof quality !== 'number' || !(quality >= 0 && quality <= 1)) return reply(400, { error: 'Bad quality.' });

  const limit = await checkLimit(db, request, { action: 'sell', client: body.client, seconds: 1, perHour: PER_HOUR });
  if (!limit) return reply(429, TOO_MANY);
  const pressure = (await pressures(db))[potion] ?? 0;
  const total = saleTotal(potion, pressure, quality, count);
  await db.batch([
    db
      .prepare(
        `INSERT INTO market (potion, pressure, updated) VALUES (?1, ?2, ?3)
         ON CONFLICT (potion) DO UPDATE SET pressure = ?2, updated = ?3`,
      )
      .bind(potion, pressure + count, now()),
    ...limit,
  ]);
  return reply(200, { total, pressure: pressure + count });
}
