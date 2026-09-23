// Rate limiting shared by the service's routes. Recent actions are kept in the
// `recent` table for an hour: per device (the random id the games make) and per
// network address (kept only as a salted hash).

export const now = () => Math.floor(Date.now() / 1000);

export async function hashAddress(request) {
  const value = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const bytes = new TextEncoder().encode(`trial-and-error:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Returns the statements that record this action, or null when it comes too soon
// after the device's last one or the network has used up its hourly allowance.
export async function checkLimit(db, request, { action, client, seconds, perHour }) {
  const t = now();
  const device = `${action}:c:${client}`;
  const network = `${action}:a:${await hashAddress(request)}`;
  const [mine, theirs] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM recent WHERE key = ? AND at > ?').bind(device, t - seconds),
    db.prepare('SELECT COUNT(*) AS n FROM recent WHERE key = ? AND at > ?').bind(network, t - 3600),
  ]);
  if (mine.results[0].n > 0 || theirs.results[0].n >= perHour) return null;
  return [
    db.prepare('INSERT INTO recent (key, at) VALUES (?, ?), (?, ?)').bind(device, t, network, t),
    db.prepare('DELETE FROM recent WHERE at < ?').bind(t - 3600),
  ];
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export const TOO_MANY = { error: 'Too many requests. Wait a moment and try again.' };
