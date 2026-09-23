// Draws a creature from its genes onto a canvas and adds it as a Phaser texture
// (one per different set of genes). Creatures face right; flip them to swim left.
import { encode } from './genes.js';

export const ART_W = 220;
export const ART_H = 190;
const CX = 110;
const CY = 100;

export const COLOURS = {
  coral: ['#ffa493', '#ff6b57', '#b8392c'],
  sun: ['#ffe48a', '#ffc53a', '#c98a12'],
  leaf: ['#a8f0a0', '#5fcf5a', '#2f8a33'],
  sea: ['#8fdcff', '#35aef5', '#1a6aa8'],
  violet: ['#d3bcff', '#a07bff', '#6446c2'],
  rose: ['#ffc0e2', '#ff7fc4', '#c24486'],
  frost: ['#ffffff', '#dff3ff', '#8fc4e8'],
  ember: ['#ffe066', '#ff8a2a', '#d4231b'],
  night: ['#4c55a8', '#262c66', '#0e1030'],
};

// Half width and half height of each body, and where its back edge is.
const SHAPES = {
  round: { w: 50, h: 44 },
  long: { w: 66, h: 32 },
  drop: { w: 62, h: 38 },
  puff: { w: 48, h: 46 },
  star: { w: 58, h: 56 },
};

function seeded(text) {
  let s = [...text].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function bodyPath(body) {
  const p = new Path2D();
  const { w, h } = SHAPES[body];
  if (body === 'round' || body === 'long') {
    p.ellipse(CX, CY, w, h, 0, 0, Math.PI * 2);
  } else if (body === 'drop') {
    p.moveTo(CX - w, CY);
    p.bezierCurveTo(CX - w + 20, CY - h - 4, CX + 10, CY - h - 8, CX + w - 18, CY - h + 12);
    p.bezierCurveTo(CX + w + 10, CY - 10, CX + w + 10, CY + 18, CX + w - 18, CY + h - 8);
    p.bezierCurveTo(CX + 10, CY + h + 10, CX - w + 20, CY + h + 2, CX - w, CY);
  } else if (body === 'puff') {
    const spikes = 14;
    for (let i = 0; i <= spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 ? w - 8 : w + 4;
      p[i ? 'lineTo' : 'moveTo'](CX + Math.cos(a) * r, CY + Math.sin(a) * r * (h / w));
    }
  } else {
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? w * 0.5 : w;
      p[i ? 'lineTo' : 'moveTo'](CX + Math.cos(a) * r, CY + Math.sin(a) * r);
    }
  }
  p.closePath();
  return p;
}

function fillGradient(ctx, colour, top, bottom) {
  const [light, mid, dark] = COLOURS[colour];
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, light);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, dark);
  return g;
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function drawPattern(ctx, genes, rng) {
  const { w, h } = SHAPES[genes.body];
  const [light, mid, dark] = COLOURS[genes.accent];
  ctx.fillStyle = genes.accent === genes.colour ? dark : mid;
  ctx.globalAlpha = 0.85;
  if (genes.pattern === 'spots') {
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(CX - w + rng() * w * 2, CY - h + rng() * h * 2, 5 + rng() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (genes.pattern === 'stripes') {
    for (let x = CX - w + 14; x < CX + w; x += 24) {
      ctx.beginPath();
      ctx.ellipse(x, CY, 6, h + 10, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (genes.pattern === 'patches') {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(CX - w * 0.6 + rng() * w * 1.2, CY - h * 0.5 + rng() * h, 12 + rng() * 10, 9 + rng() * 8, rng() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (genes.pattern === 'sparkles') {
    ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 3 ? '#ffffff' : '#ffe066';
      sparkle(ctx, CX - w + rng() * w * 2, CY - h + rng() * h * 2, 4 + rng() * 5);
    }
  }
  ctx.globalAlpha = 1;
  void light;
}

export function drawCreature(canvas, genes) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const rng = seeded(encode(genes));
  const { w, h } = SHAPES[genes.body];
  const [light, mid, dark] = COLOURS[genes.colour];
  const accent = COLOURS[genes.accent];
  const outline = genes.colour === 'night' ? '#9aa6ff' : 'rgba(20, 16, 40, 0.55)';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (genes.glow === 'glow') {
    const g = ctx.createRadialGradient(CX, CY, 10, CX, CY, 88);
    g.addColorStop(0, `${light}ee`);
    g.addColorStop(0.5, `${mid}55`);
    g.addColorStop(1, `${mid}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Wings sit behind the body.
  if (genes.fins === 'wings') {
    ctx.fillStyle = 'rgba(235, 245, 255, 0.75)';
    ctx.strokeStyle = accent[2];
    ctx.lineWidth = 3;
    for (const [dx, rot] of [[-14, -0.9], [10, -0.5]]) {
      ctx.beginPath();
      ctx.ellipse(CX + dx, CY - h - 10, 16, 38, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Tail (a star has none).
  if (genes.body !== 'star') {
    const back = CX - w + 6;
    ctx.fillStyle = dark;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(back + 8, CY);
    ctx.quadraticCurveTo(back - 20, CY - 8, back - 36, CY - 30);
    ctx.quadraticCurveTo(back - 26, CY, back - 36, CY + 30);
    ctx.quadraticCurveTo(back - 20, CY + 8, back + 8, CY);
    ctx.fill();
    ctx.stroke();
  }

  // Frills along the top and bottom, behind the body.
  if (genes.fins === 'frills') {
    ctx.fillStyle = accent[1];
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      for (let x = CX - w * 0.5; x <= CX + w * 0.4; x += 18) {
        ctx.beginPath();
        ctx.arc(x, CY + side * (h - 2), 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  const body = bodyPath(genes.body);
  ctx.fillStyle = fillGradient(ctx, genes.colour, CY - h, CY + h);
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  drawPattern(ctx, genes, rng);
  // Soft shine on top.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.ellipse(CX + w * 0.1, CY - h * 0.55, w * 0.5, h * 0.22, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3.5;
  ctx.stroke(body);

  // Small fins under the belly.
  if (genes.fins === 'small') {
    ctx.fillStyle = accent[1];
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX - 22, CY + h * 0.75);
    ctx.quadraticCurveTo(CX - 34, CY + h + 12, CX - 40, CY + h + 20);
    ctx.quadraticCurveTo(CX - 10, CY + h + 16, CX + 10, CY + h * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const front = CX + w * 0.5;
  const eyeY = CY - h * 0.2;

  if (genes.fins === 'whiskers') {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    for (const dy of [4, 14]) {
      ctx.beginPath();
      ctx.moveTo(front + 14, CY + dy);
      ctx.quadraticCurveTo(front + 40, CY + dy - 6, front + 52, CY + dy + 14);
      ctx.stroke();
    }
  }

  // Head decoration.
  const top = CY - h + (genes.body === 'star' ? 10 : 4);
  const headX = CX + w * 0.2;
  if (genes.crest === 'antennae') {
    ctx.strokeStyle = dark;
    ctx.fillStyle = accent[1];
    ctx.lineWidth = 3;
    for (const dx of [-12, 10]) {
      ctx.beginPath();
      ctx.moveTo(headX + dx, top + 6);
      ctx.quadraticCurveTo(headX + dx - 4, top - 18, headX + dx + 6, top - 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(headX + dx + 6, top - 30, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (genes.crest === 'horns') {
    ctx.fillStyle = '#f3ead2';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    for (const dx of [-14, 12]) {
      ctx.beginPath();
      ctx.moveTo(headX + dx - 8, top + 8);
      ctx.quadraticCurveTo(headX + dx - 4, top - 14, headX + dx + 6, top - 22);
      ctx.quadraticCurveTo(headX + dx + 2, top - 6, headX + dx + 8, top + 8);
      ctx.fill();
      ctx.stroke();
    }
  } else if (genes.crest === 'crown') {
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#a8740b';
    ctx.lineWidth = 2.5;
    const x = headX - 20;
    const y = top - 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 2, y - 16);
    ctx.lineTo(x + 11, y - 4);
    ctx.lineTo(x + 20, y - 22);
    ctx.lineTo(x + 29, y - 4);
    ctx.lineTo(x + 38, y - 16);
    ctx.lineTo(x + 40, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8364f';
    ctx.beginPath();
    ctx.arc(x + 20, y + 1, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes.
  const eyes = { one: [[front - 4, eyeY, 14]], two: [[front - 16, eyeY, 10], [front + 6, eyeY - 2, 10]], three: [[front - 22, eyeY + 2, 8], [front - 4, eyeY - 8, 8], [front + 14, eyeY + 2, 8]] }[genes.eyes];
  for (const [x, y, r] of eyes) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#16122a';
    ctx.beginPath();
    ctx.arc(x + r * 0.25, y + r * 0.1, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + r * 0.4, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile.
  ctx.strokeStyle = 'rgba(20, 16, 40, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(front + 2, CY + h * 0.25, 9, 0.2, Math.PI - 0.6);
  ctx.stroke();
  void mid;
}

// Texture key for these genes, creating the texture the first time.
export function creatureTexture(scene, genes) {
  const key = `creature:${encode(genes)}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, ART_W, ART_H);
    drawCreature(texture.getSourceImage(), genes);
    texture.refresh();
  }
  return key;
}
