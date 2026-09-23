// The shared pond and "first to find" records, through the online service.
// Without it (local builds), fishing catches wild creatures and nothing is shared.
import { apiGet, apiPost, askName, getName, leaderboardEnabled } from '../../../shared/leaderboard.js';
import { decode, encode, wildGenes } from './genes.js';
import { THEME } from './help.js';

export const online = leaderboardEnabled;

export async function releaseCreature(genes) {
  if (!online) return;
  // Released creatures are gone either way; a failed send just means nobody catches it.
  await apiPost('/pond/release', { genes: encode(genes), name: getName() }).catch(() => {});
}

// Resolves to { genes, from } or throws when offline.
export async function catchCreature() {
  if (!online) return { genes: wildGenes(), from: null };
  const { genes, name } = await apiPost('/pond/catch', {});
  return { genes: decode(genes) ?? wildGenes(), from: name ?? null };
}

export async function fetchFirsts() {
  if (!online) return {};
  return (await apiGet('/discoveries?game=wild-pond')).found ?? {};
}

// Claims a rare find. Calls done({ first, you }) or done(null) when there's no name or connection.
export function claimFind(key, done) {
  if (!online) return done(null);
  askName({
    theme: THEME,
    onDone: (name) => {
      if (!name) return done(null);
      apiPost('/discoveries', { game: 'wild-pond', key, name })
        .then(done)
        .catch(() => done(null));
    },
  });
}
