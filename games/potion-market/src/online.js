// The shared market and "first to brew" records, through the online service.
// Offline or without it (local builds), prices come from a market kept on this device.
import { apiGet, apiPost, askName, leaderboardEnabled } from '../../../shared/leaderboard.js';
import { POTIONS } from './data.js';
import { dayNumber, hotPotion, saleTotal } from './economy.js';
import { addLocalPressure, localPressure } from './shop.js';
import { THEME } from './help.js';

// Resolves to { hot, pressure: { id: n }, online }.
export async function fetchMarket(shop) {
  if (leaderboardEnabled) {
    try {
      const { hot, pressure } = await apiGet('/market');
      return { hot, pressure, online: true };
    } catch {
      // Fall through to the local market.
    }
  }
  const pressure = Object.fromEntries(POTIONS.map((p) => [p.id, localPressure(shop, p.id)]));
  return { hot: hotPotion(dayNumber()), pressure, online: false };
}

// Resolves to the gold the sale brought in. Throws { busy: true } when the service
// refuses for now; falls back to the local market when offline.
export async function sell(shop, id, count, quality) {
  if (leaderboardEnabled) {
    try {
      return (await apiPost('/market/sell', { potion: id, count, quality: Math.round(quality * 1000) / 1000 })).total;
    } catch (error) {
      if (error.status === 429) throw { busy: true };
      if (error.status) throw error;
      // No connection: sell locally.
    }
  }
  const total = saleTotal(id, localPressure(shop, id), quality, count);
  addLocalPressure(shop, id, count);
  return total;
}

export async function fetchFirsts() {
  if (!leaderboardEnabled) return {};
  return (await apiGet('/discoveries?game=potion-market')).found ?? {};
}

// Claims "first to brew". Calls done({ first, you }) or done(null).
export function claimFirstBrew(id, done) {
  if (!leaderboardEnabled) return done(null);
  askName({
    theme: THEME,
    onDone: (name) => {
      if (!name) return done(null);
      apiPost('/discoveries', { game: 'potion-market', key: id, name })
        .then(done)
        .catch(() => done(null));
    },
  });
}
