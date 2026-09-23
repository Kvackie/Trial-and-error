// Sound effects shared by the games, synthesised with Web Audio (no audio files).
// Volume and mute are stored once per device ('settings:volume', 'settings:muted')
// and apply to every game.
//
//   playSound('match', { step: 2 })   see SOUNDS below for the names
//   getVolume() / setVolume(0..1), isMuted() / setMuted(bool)

const KEY = { volume: 'settings:volume', muted: 'settings:muted' };

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Not remembered, but applied for now.
  }
};

let volume = Math.min(1, Math.max(0, Number(read(KEY.volume, 0.7))));
let muted = read(KEY.muted, 'false') === 'true';
let ctx = null;
let master = null;

export const getVolume = () => volume;
export const isMuted = () => muted;

export function setVolume(value) {
  volume = Math.min(1, Math.max(0, value));
  write(KEY.volume, volume);
  applyVolume();
}

export function setMuted(value) {
  muted = Boolean(value);
  write(KEY.muted, muted);
  applyVolume();
}

function applyVolume() {
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume * 0.6, ctx.currentTime, 0.01);
}

// Browsers only allow audio after a tap or key press, so start it on the first one.
function audio() {
  if (!ctx) {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.connect(ctx.destination);
    applyVolume();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
if (typeof window !== 'undefined') {
  const unlock = () => audio();
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

// --- Building blocks ---------------------------------------------------------------

function tone(freq, { at = 0, dur = 0.1, type = 'sine', gain = 0.3, to = null } = {}) {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(env).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise({ at = 0, dur = 0.1, gain = 0.25, filter = 'lowpass', freq = 1200 } = {}) {
  const start = ctx.currentTime + at;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.frequency.value = freq;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(shape).connect(env).connect(master);
  source.start(start);
}

const notes = (freqs, { gap = 0.08, at = 0, ...options } = {}) => freqs.forEach((f, i) => tone(f, { ...options, at: at + i * gap }));

// --- The sounds --------------------------------------------------------------------

const SOUNDS = {
  // General
  click: () => tone(880, { dur: 0.05, type: 'square', gain: 0.08, to: 620 }),
  gameOver: () => notes([392, 330, 262, 196], { gap: 0.16, dur: 0.22, type: 'triangle', gain: 0.25 }),
  // Moving pieces
  move: () => tone(520, { dur: 0.04, type: 'triangle', gain: 0.12 }),
  rotate: () => tone(640, { dur: 0.07, type: 'triangle', gain: 0.15, to: 900 }),
  drop: () => {
    noise({ dur: 0.12, gain: 0.25, freq: 700 });
    tone(150, { dur: 0.14, gain: 0.35, to: 70 });
  },
  clear: ({ lines = 1 } = {}) => {
    notes([523, 659, 784, 1047].slice(0, 2 + Math.min(lines, 2)), { gap: 0.07, dur: 0.14, type: 'triangle', gain: 0.25 });
    if (lines >= 4) notes([1319, 1568, 2093], { gap: 0.05, dur: 0.12, gain: 0.15 });
  },
  // Matching
  select: () => tone(660, { dur: 0.05, gain: 0.15 }),
  swap: () => tone(440, { dur: 0.09, type: 'triangle', gain: 0.18, to: 660 }),
  invalid: () => tone(180, { dur: 0.18, type: 'square', gain: 0.1, to: 140 }),
  match: ({ step = 1 } = {}) => {
    const base = 520 * Math.pow(1.12, Math.min(step - 1, 8));
    tone(base, { dur: 0.1, gain: 0.25 });
    tone(base * 1.5, { at: 0.04, dur: 0.1, gain: 0.15 });
  },
  special: () => notes([1200, 1600, 2000, 2400], { gap: 0.04, dur: 0.08, gain: 0.12 }),
  blast: () => {
    noise({ dur: 0.35, gain: 0.35, freq: 1400 });
    tone(110, { dur: 0.3, gain: 0.35, to: 45 });
  },
  shuffle: () => noise({ dur: 0.4, gain: 0.15, filter: 'bandpass', freq: 2500 }),
  // Exploring
  step: () => noise({ dur: 0.05, gain: 0.12, filter: 'bandpass', freq: 500 }),
  bump: () => tone(95, { dur: 0.09, gain: 0.3, to: 70 }),
  chest: () => {
    tone(260, { dur: 0.22, type: 'sawtooth', gain: 0.06, to: 330 });
    notes([392, 523], { at: 0.1, gap: 0.08, dur: 0.12, type: 'triangle', gain: 0.15 });
  },
  correct: () => notes([659, 988, 1319], { gap: 0.07, dur: 0.14, type: 'triangle', gain: 0.22 }),
  wrong: () => tone(220, { dur: 0.3, type: 'sawtooth', gain: 0.12, to: 150 }),
  levelUp: () => notes([523, 659, 784, 1047], { gap: 0.09, dur: 0.18, type: 'triangle', gain: 0.22 }),
  checkpoint: () => notes([392, 523, 659, 784], { gap: 0.12, dur: 0.25, gain: 0.2 }),
};

export function playSound(name, params) {
  if (muted || volume === 0) return;
  if (!audio() || !SOUNDS[name]) return;
  try {
    SOUNDS[name](params);
  } catch {
    // A missed sound effect is never worth breaking the game over.
  }
}
