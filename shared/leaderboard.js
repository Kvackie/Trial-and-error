// Global leaderboard client, shared by the games. The service lives in leaderboard/
// and its address is baked in at build time as VITE_LEADERBOARD_URL (the build
// workflow works it out from the Cloudflare secrets). Without it, everything here
// quietly does nothing and the trophy button isn't shown.
//
//   addTrophyButton(scene, x, y, opts)        round trophy button (or [] if disabled)
//   openLeaderboard({ game, unit, myBest, theme, onClose })
//   promptSubmit({ game, score, unit, theme, onClose })   "new best, add it?"
import { showPanel } from './help-dialog.js';

const BASE = (import.meta.env.VITE_LEADERBOARD_URL ?? '').replace(/\/$/, '');
export const leaderboardEnabled = Boolean(BASE);

// Stored per device, shared by all games (one nickname, one device id).
const KEY = { client: 'leaderboard:client', name: 'leaderboard:name', queue: 'leaderboard:queue' };
const sentKey = (game) => `leaderboard:sent:${game}`;
const NAME = /^[\p{L}\p{N} _.-]{1,12}$/u;

const read = (key, fallback = null) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode): nothing is remembered.
  }
};

function clientId() {
  let id = read(KEY.client);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    write(KEY.client, id);
  }
  return id;
}

export const bestSubmitted = (game) => Number(read(sentKey(game), 0)) || 0;

export async function fetchTop(game, limit = 20) {
  const response = await fetch(`${BASE}/scores?game=${encodeURIComponent(game)}&limit=${limit}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).scores ?? [];
}

// Returns { rank } on success, { queued: true } when offline (sent later), or { error }.
export async function submitScore(game, score, name) {
  let response;
  try {
    response = await fetch(`${BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, score, name, client: clientId() }),
    });
  } catch {
    queue(game, score, name);
    return { queued: true };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { error: data.error ?? 'The leaderboard is unavailable right now.' };
  write(sentKey(game), String(Math.max(score, bestSubmitted(game))));
  return { rank: data.rank };
}

// Offline: keep the best unsent score per game and send it when back online.
function queue(game, score, name) {
  const pending = JSON.parse(read(KEY.queue, '{}'));
  if (!pending[game] || pending[game].score < score) pending[game] = { score, name };
  write(KEY.queue, JSON.stringify(pending));
}

async function flushQueue() {
  const pending = JSON.parse(read(KEY.queue, '{}'));
  const [game] = Object.keys(pending);
  if (!game) return;
  const { score, name } = pending[game];
  const result = await submitScore(game, score, name);
  if (result.queued) return; // still offline
  delete pending[game];
  write(KEY.queue, JSON.stringify(pending));
  // The service allows one score per device every few seconds.
  if (Object.keys(pending).length) setTimeout(flushQueue, 20_000);
}

if (leaderboardEnabled && typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
  setTimeout(flushQueue, 3000);
}

// --- Dialogs ---------------------------------------------------------------------

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Top scores, plus a button to send your own best if it hasn't been sent yet.
export function openLeaderboard({ game, unit = 'Score', myBest = 0, theme = {}, onClose }) {
  const { overlay, close } = showPanel({
    ...theme,
    title: 'Leaderboard',
    onClose,
    html: `<div class="lb-body"><p class="help-status">Loading…</p></div>
      <div class="help-actions lb-actions" hidden><button class="help-danger lb-send"></button></div>`,
  });
  overlay.querySelector('.help-close').focus();
  const body = overlay.querySelector('.lb-body');
  const actions = overlay.querySelector('.lb-actions');
  const send = overlay.querySelector('.lb-send');

  const load = async () => {
    try {
      const scores = await fetchTop(game);
      const me = read(KEY.name);
      body.innerHTML = scores.length
        ? `<table class="help-table"><tbody>${scores
            .map(
              (s, i) =>
                `<tr class="${s.name === me ? 'help-me' : ''}"><td>${i + 1}</td><td>${escapeHtml(s.name)}</td><td>${s.score}</td></tr>`,
            )
            .join('')}</tbody></table>`
        : '<p class="help-status">No scores yet. Be the first!</p>';
    } catch {
      body.innerHTML = '<p class="help-status">Couldn’t reach the leaderboard. Check your connection and try again.</p>';
    }
    const unsent = myBest > bestSubmitted(game);
    actions.hidden = !unsent;
    send.textContent = `Submit my best (${unit.toLowerCase()} ${myBest})`;
  };

  send.addEventListener('click', () => {
    close({ silent: true });
    promptSubmit({ game, score: myBest, unit, theme, onClose: () => openLeaderboard({ game, unit, myBest, theme, onClose }) });
  });
  load();
}

// Ask for a nickname and send a score.
export function promptSubmit({ game, score, unit = 'Score', theme = {}, onClose }) {
  const { overlay, close } = showPanel({
    ...theme,
    title: 'New best!',
    closeButton: false,
    onClose,
    html: `<p>${escapeHtml(unit)} <b>${score}</b>. Add it to the global leaderboard?</p>
      <label for="lb-name">Your name</label>
      <input id="lb-name" class="help-field" maxlength="12" autocomplete="nickname" enterkeyhint="send" />
      <p class="help-status" aria-live="polite"></p>
      <div class="help-actions">
        <button class="help-cancel">Not now</button>
        <button class="help-danger">Submit</button>
      </div>`,
  });
  const field = overlay.querySelector('#lb-name');
  const status = overlay.querySelector('.help-status');
  const submit = overlay.querySelector('.help-danger');
  field.value = read(KEY.name, '');
  field.focus();

  const send = async () => {
    const name = field.value.trim().replace(/\s+/g, ' ');
    if (!NAME.test(name)) {
      status.textContent = 'Use 1 to 12 letters, digits, spaces, dots, dashes or underscores.';
      return;
    }
    write(KEY.name, name);
    submit.disabled = true;
    status.textContent = 'Sending…';
    const result = await submitScore(game, score, name);
    if (result.error) {
      status.textContent = result.error;
      submit.disabled = false;
      return;
    }
    status.textContent = result.queued
      ? 'You’re offline. It will be sent when you’re back online.'
      : result.rank
        ? `You’re number ${result.rank}!`
        : 'Sent! Not in the top 100 yet, keep going.';
    setTimeout(close, 1400);
  };

  submit.addEventListener('click', send);
  field.addEventListener('keydown', (event) => event.key === 'Enter' && send());
  overlay.querySelector('.help-cancel').addEventListener('click', close);
}

// Round trophy button matching addHomeButton(). Returns [circle, icon], or [] when
// the leaderboard isn't configured for this build.
export function addTrophyButton(scene, x, y, { radius = 32, fill = 0x2b2d5c, stroke = 0xe0e2ff, icon = 0xffd23f, onClick } = {}) {
  if (!leaderboardEnabled) return [];
  const circle = scene.add.circle(x, y, radius, fill).setStrokeStyle(3, stroke).setInteractive({ useHandCursor: true });
  const s = radius / 32;
  const g = scene.add.graphics({ x, y });
  g.lineStyle(3 * s, icon);
  g.strokeCircle(-12 * s, -9 * s, 5 * s); // handles
  g.strokeCircle(12 * s, -9 * s, 5 * s);
  g.fillStyle(icon);
  g.fillRect(-11 * s, -17 * s, 22 * s, 9 * s); // cup
  g.fillCircle(0, -8 * s, 11 * s);
  g.fillRect(-2.5 * s, 2 * s, 5 * s, 8 * s); // stem
  g.fillRect(-9 * s, 10 * s, 18 * s, 5 * s); // base
  circle.on('pointerup', () => onClick?.());
  return [circle, g];
}
