import { WORLD_W as W, WORLD_H as H, GRID } from './config.js';
import { clamp, lerp, TAU, roundRect, mulberry32, rectCircle } from './utils.js';

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function drawScreenSky(ctx, g) {
  const { cw, ch } = g.view;
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, '#120d29');
  sky.addColorStop(0.34, '#33205f');
  sky.addColorStop(0.62, '#7a3e78');
  sky.addColorStop(0.82, '#e77966');
  sky.addColorStop(1, '#ffb27a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cw, ch);

  const haze = ctx.createRadialGradient(cw * 0.58, ch * 0.64, 10, cw * 0.58, ch * 0.64, cw * 0.6);
  haze.addColorStop(0, 'rgba(255, 178, 122, 0.18)');
  haze.addColorStop(1, 'rgba(255, 178, 122, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, cw, ch);
}

function drawSun(ctx, g) {
  const sx = W * 0.74;
  const sy = H * 0.19;
  const pulse = 1 + Math.sin(g.time * 0.55) * 0.025;

  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 310);
  glow.addColorStop(0, 'rgba(255, 232, 170, 0.35)');
  glow.addColorStop(0.35, 'rgba(255, 180, 120, 0.12)');
  glow.addColorStop(1, 'rgba(255, 140, 110, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 310, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffe3a3';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + g.time * 0.012;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a - 0.06) * 520, sy + Math.sin(a - 0.06) * 520);
    ctx.lineTo(sx + Math.cos(a + 0.06) * 520, sy + Math.sin(a + 0.06) * 520);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const disc = ctx.createRadialGradient(sx - 18, sy - 18, 4, sx, sy, 72 * pulse);
  disc.addColorStop(0, '#fffbe0');
  disc.addColorStop(0.45, '#ffe08b');
  disc.addColorStop(0.85, '#ffad63');
  disc.addColorStop(1, 'rgba(255, 145, 100, 0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sx, sy, 70 * pulse, 0, TAU);
  ctx.fill();
}

function drawCloud(ctx, x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const puffs = [
    [0, 0, 40], [34, -9, 32], [-38, 4, 30], [8, -22, 24], [-12, 12, 26], [58, 7, 20],
  ];
  const grad = ctx.createLinearGradient(0, y - 40 * s, 0, y + 26 * s);
  grad.addColorStop(0, '#ffd9d2');
  grad.addColorStop(0.55, '#e5a4b8');
  grad.addColorStop(1, '#a06f9f');
  ctx.fillStyle = grad;
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, r * s, r * 0.72 * s, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawMountainRange(ctx, points, baseY, topColor, botColor, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-60, H);
  ctx.lineTo(-60, baseY);
  for (const [x, y] of points) ctx.lineTo(x, y);
  ctx.lineTo(W + 60, baseY);
  ctx.lineTo(W + 60, H);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, baseY - 260, 0, baseY + 100);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, botColor);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

export function drawWorldBackground(ctx, g) {
  drawSun(ctx, g);

  for (const c of g.clouds) {
    drawCloud(ctx, c.x, c.y, c.s, c.o);
  }

  // Three parallax-ish mountain layers.
  drawMountainRange(ctx, [
    [-80, H * 0.73], [80, H * 0.58], [220, H * 0.64], [360, H * 0.48],
    [510, H * 0.6], [640, H * 0.52], [790, H * 0.63], [930, H * 0.47],
    [1080, H * 0.58], [1210, H * 0.5], [1360, H * 0.61], [W + 80, H * 0.55],
  ], H * 0.78, 'rgba(93, 61, 133, 0.55)', 'rgba(58, 39, 96, 0.2)', 0.7);

  drawMountainRange(ctx, [
    [-80, H * 0.82], [140, H * 0.67], [320, H * 0.74], [500, H * 0.63],
    [700, H * 0.73], [900, H * 0.65], [1100, H * 0.74], [1260, H * 0.68],
    [1420, H * 0.76], [W + 80, H * 0.7],
  ], H * 0.85, 'rgba(56, 38, 96, 0.65)', 'rgba(33, 22, 62, 0.4)', 0.8);

  // horizon fog
  const fog = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.85);
  fog.addColorStop(0, 'rgba(255, 174, 137, 0)');
  fog.addColorStop(0.55, 'rgba(255, 174, 137, 0.09)');
  fog.addColorStop(1, 'rgba(60, 34, 72, 0.16)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, H * 0.55, W, H * 0.35);

  // Back silhouettes of pines on the horizon.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#24173f';
  for (let i = 0; i < 24; i++) {
    const x = (i * 197 + 61) % W;
    const baseY = H * 0.71 + Math.sin(i * 2.2) * 15;
    const s = 0.65 + ((i * 37) % 10) / 16;
    ctx.beginPath();
    ctx.moveTo(x, baseY - 54 * s);
    ctx.lineTo(x + 17 * s, baseY);
    ctx.lineTo(x - 17 * s, baseY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawWindStreaks(ctx, g) {
  if (Math.abs(g.wind) < 18) return;
  const dir = Math.sign(g.wind);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < g.streaks.length; i++) {
    const s = g.streaks[i];
    const speed = 70 + Math.abs(g.wind) * 0.55;
    let x = ((s.x + g.time * speed * dir) % (W + 400) + W + 400) % (W + 400) - 200;
    const len = 40 + Math.abs(g.wind) * 0.28 * s.s;
    ctx.beginPath();
    ctx.moveTo(x, s.y);
    ctx.quadraticCurveTo(x + len * 0.5, s.y - 5, x + len, s.y);
    ctx.strokeStyle = `rgba(255, 244, 220, ${0.04 + s.s * 0.035})`;
    ctx.lineWidth = 1 + s.s * 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function buildingPath(ctx, b) {
  if (b.type === 'ramp') {
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + b.h);
    ctx.lineTo(b.x + b.w, b.y + b.h);
    if (b.dir === 1) ctx.lineTo(b.x + b.w, b.y);
    else ctx.lineTo(b.x, b.y);
    ctx.closePath();
  } else if (b.type === 'floor') {
    roundRect(ctx, b.x, b.y, b.w, b.h, 2);
  } else {
    roundRect(ctx, b.x, b.y, b.w, b.h, 3);
  }
}

export function drawBuilding(ctx, g, b) {
  const age = Math.max(0, g.time - b.born);
  const pop = age < 0.22 ? 0.62 + 0.38 * easeOutBack(age / 0.22) : 1;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const team = g.teams[b.team];
  const hurt = 1 - b.hp / b.maxHp;
  const rng = mulberry32((b.seed || 1) * 9973);

  ctx.save();
  if (pop !== 1) {
    ctx.translate(cx, cy);
    ctx.scale(pop, pop);
    ctx.translate(-cx, -cy);
  }

  // soft contact shadow for grounded pieces
  if (b.type !== 'ramp') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, b.y + b.h + 4, b.w * 0.46, 5, 0, 0, TAU);
    ctx.fill();
  }

  buildingPath(ctx, b);
  const base = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  base.addColorStop(0, '#e0ac72');
  base.addColorStop(0.45, '#c18752');
  base.addColorStop(1, '#966134');
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = '#58381f';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  buildingPath(ctx, b);
  ctx.clip();

  if (b.type === 'ramp') {
    ctx.strokeStyle = 'rgba(88, 56, 31, 0.5)';
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      ctx.beginPath();
      if (b.dir === 1) {
        ctx.moveTo(b.x + b.w * t, b.y + b.h);
        ctx.lineTo(b.x + b.w * t, b.y + b.h * (1 - t));
      } else {
        ctx.moveTo(b.x + b.w * t, b.y);
        ctx.lineTo(b.x + b.w * t, b.y + b.h * t);
      }
      ctx.stroke();
    }
    // up-slope arrow
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = team.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const ax = b.x + b.w * 0.5;
    ctx.moveTo(ax, b.y + b.h * 0.72);
    ctx.lineTo(ax, b.y + b.h * 0.34);
    ctx.stroke();
    ctx.restore();
  } else {
    const planks = b.type === 'floor' ? 1 : 3;
    const pw = b.w / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(96, 56, 30, 0.18)' : 'rgba(255, 227, 173, 0.1)';
      ctx.fillRect(b.x + i * pw, b.y, pw, b.h);
      if (i > 0) {
        ctx.strokeStyle = 'rgba(83, 51, 27, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x + i * pw, b.y + 2);
        ctx.lineTo(b.x + i * pw, b.y + b.h - 2);
        ctx.stroke();
      }
    }
    // diagonal brace
    ctx.strokeStyle = 'rgba(88, 53, 28, 0.34)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(b.x + 5, b.y + b.h - 6);
    ctx.lineTo(b.x + b.w - 5, b.y + 6);
    ctx.stroke();
  }

  // darken with damage
  if (hurt > 0) {
    ctx.fillStyle = `rgba(31, 16, 12, ${hurt * 0.34})`;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = `rgba(28, 14, 10, ${0.3 + hurt * 0.4})`;
    ctx.lineWidth = 1.8;
    const cracks = Math.ceil(hurt * 5);
    for (let i = 0; i < cracks; i++) {
      let px = b.x + 8 + rng() * (b.w - 16);
      let py = b.y + 6 + rng() * (b.h - 12);
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 3; s++) {
        px += (rng() - 0.5) * 18;
        py += rng() * 14;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // team-colored top edge
  ctx.fillStyle = team.color;
  ctx.globalAlpha = 0.85;
  if (b.type === 'ramp') {
    if (b.dir === 1) ctx.fillRect(b.x + b.w * 0.62, b.y + 6, b.w * 0.38, 3.5);
    else ctx.fillRect(b.x, b.y + 6, b.w * 0.38, 3.5);
  } else {
    ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 3.5);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // nails
  if (b.type !== 'floor') {
    ctx.fillStyle = 'rgba(60, 38, 22, 0.75)';
    for (const [nx, ny] of [[b.x + 8, b.y + 8], [b.x + b.w - 8, b.y + 8], [b.x + 8, b.y + b.h - 8], [b.x + b.w - 8, b.y + b.h - 8]]) {
      ctx.beginPath();
      ctx.arc(nx, ny, 1.7, 0, TAU);
      ctx.fill();
    }
  }

  // build sparkle
  if (age < 0.4) {
    const a = 1 - age / 0.4;
    ctx.strokeStyle = `rgba(255, 245, 190, ${a * 0.9})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, b.w * 0.6 + age * 40, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();

  if (b.hp < b.maxHp) {
    const w = b.w * 0.62;
    const hx = cx - w / 2;
    const hy = b.y - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, hx, hy, w, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = b.hp / b.maxHp > 0.4 ? '#a8ef4f' : '#ffb35c';
    roundRect(ctx, hx, hy, w * (b.hp / b.maxHp), 5, 2.5);
    ctx.fill();
  }
}

export function drawLlama(ctx, g, l) {
  if (!l.alive) return;
  const bob = Math.sin(g.time * 2.1 + l.phase) * 2;
  const x = l.x;
  const y = l.y + bob;
  const sway = Math.sin(g.time * 1.4 + l.phase) * 0.04;

  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 52);
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.25)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 52, 0, TAU);
  ctx.fill();

  ctx.translate(x, y);
  ctx.rotate(sway);

  // legs
  ctx.strokeStyle = '#7f3a8a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const lx of [-10, -3, 7, 13]) {
    ctx.beginPath();
    ctx.moveTo(lx, 6);
    ctx.lineTo(lx + (lx > 0 ? 2 : -1), 17);
    ctx.stroke();
  }
  // tail
  ctx.beginPath();
  ctx.moveTo(17, -2);
  ctx.quadraticCurveTo(27, -8, 23, -16);
  ctx.strokeStyle = '#d16bc4';
  ctx.lineWidth = 5;
  ctx.stroke();
  // body
  const body = ctx.createLinearGradient(-20, -18, 18, 16);
  body.addColorStop(0, '#e57ad2');
  body.addColorStop(0.55, '#bd4db0');
  body.addColorStop(1, '#8f3297');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 14, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#66236b';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // blanket
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 14, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-9, -14, 10, 28);
  ctx.fillStyle = '#51d6ff';
  ctx.fillRect(-3, -14, 4, 28);
  ctx.restore();
  // neck + head
  ctx.fillStyle = '#d16bc4';
  ctx.beginPath();
  ctx.ellipse(-16, -10, 9, 12, -0.25, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#66236b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e88cdb';
  ctx.beginPath();
  ctx.ellipse(-20, -21, 9, 8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // ears
  ctx.fillStyle = '#f39ce5';
  ctx.beginPath();
  ctx.moveTo(-24, -27);
  ctx.lineTo(-27, -37);
  ctx.lineTo(-19, -30);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-17, -28);
  ctx.lineTo(-15, -38);
  ctx.lineTo(-11, -28);
  ctx.closePath();
  ctx.fill();
  // muzzle + eye
  ctx.fillStyle = '#ffd8cb';
  ctx.beginPath();
  ctx.ellipse(-25, -19, 4.2, 3.2, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a1445';
  ctx.beginPath();
  ctx.arc(-19, -23, 1.7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-19.6, -23.6, 0.6, 0, TAU);
  ctx.fill();

  // sparkles
  for (let i = 0; i < 3; i++) {
    const a = g.time * 1.7 + i * 2.1 + l.phase;
    const sx = Math.cos(a) * 30;
    const sy = Math.sin(a * 1.3) * 21 - 12;
    const tw = 0.5 + Math.sin(g.time * 4 + i) * 0.5;
    ctx.fillStyle = `rgba(255, 224, 140, ${0.35 + tw * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 3);
    ctx.lineTo(sx + 1.5, sy);
    ctx.lineTo(sx, sy + 3);
    ctx.lineTo(sx - 1.5, sy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (l.hp < l.maxHp) {
    const w = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, x - w / 2, y - 44, w, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    roundRect(ctx, x - w / 2, y - 44, w * (l.hp / l.maxHp), 5, 2.5);
    ctx.fill();
  }
}

function drawBaseWorm(ctx, color, dark, light, flash, face, g, w) {
  // feet
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(-7, 15, 5.5, 3.4, 0, 0, TAU);
  ctx.ellipse(7, 15, 5.5, 3.4, 0, 0, TAU);
  ctx.fill();

  // backpack
  ctx.save();
  ctx.translate(-face * 8, -2);
  ctx.fillStyle = '#5b4632';
  roundRect(ctx, face === 1 ? -8 : -2, -9, 10, 16, 3);
  ctx.fill();
  ctx.strokeStyle = '#33241a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = '#c9b18a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(0, 2);
  ctx.stroke();
  ctx.fillStyle = '#9ba3b0';
  ctx.beginPath();
  ctx.moveTo(-5, -13);
  ctx.lineTo(5, -13);
  ctx.lineTo(0, -8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // body
  const body = ctx.createLinearGradient(-15, -18, 13, 16);
  body.addColorStop(0, light);
  body.addColorStop(0.35, color);
  body.addColorStop(1, dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16.5, 17.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // belly
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 5.5, 10, 8, 0, 0, TAU);
  ctx.fill();

  // helmet
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, -8, 15.5, 11.5, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath();
  ctx.ellipse(-4, -14, 6.5, 3, -0.3, 0, TAU);
  ctx.fill();

  // goggles
  ctx.fillStyle = 'rgba(16, 24, 42, 0.9)';
  roundRect(ctx, -10, -11, 20, 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 245, 255, 0.92)';
  ctx.beginPath();
  ctx.ellipse(-4.4, -7, 4.2, 2.7, 0, 0, TAU);
  ctx.ellipse(4.4, -7, 4.2, 2.7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-5.6, -8, 1.2, 0, TAU);
  ctx.arc(3.2, -8, 1.2, 0, TAU);
  ctx.fill();

  // eyes peeking under visor
  const blink = Math.sin(g.time * 1.3 + w.phase) > 0.96 ? 0.2 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(face * 5 - 2, 2, 3, 3.2 * blink, 0, 0, TAU);
  ctx.ellipse(face * 5 + 5, 2, 3, 3.2 * blink, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#241733';
  ctx.beginPath();
  ctx.arc(face * 5 - 2 + face * 0.8, 2, 1.4 * blink, 0, TAU);
  ctx.arc(face * 5 + 5 + face * 0.8, 2, 1.4 * blink, 0, TAU);
  ctx.fill();

  // mouth
  ctx.strokeStyle = 'rgba(40, 18, 48, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(face * 2, 8, 3.4, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // team bandana
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-21, -9);
  ctx.lineTo(-14, -11);
  ctx.closePath();
  ctx.fill();

  if (flash > 0) {
    ctx.globalAlpha = mutedFlash(flash);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 18, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function mutedFlash(f) {
  return Math.min(0.75, f * 0.7);
}

export function drawWorm(ctx, g, w) {
  if (!w.alive) return;
  const team = g.teams[w.team];
  const isActive = g.active === w && (g.state === 'aim' || g.state === 'enemy');
  const aimRad = (g.aim.angle * Math.PI) / 180;
  const face = isActive ? (Math.cos(aimRad) >= 0 ? 1 : -1) : (w.team === 0 ? 1 : -1);
  const bob = w.grounded ? Math.sin(g.time * 3.2 + w.phase) * 0.8 : 0;

  // ground shadow
  ctx.save();
  const groundY = w.y + 16 + 6;
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(w.x, groundY, 18, 5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // active aura
  if (isActive) {
    ctx.save();
    const pulse = 0.55 + Math.sin(g.time * 3.2) * 0.2;
    ctx.strokeStyle = team.color;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + 16 + 4, 25, 8, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const glow = ctx.createRadialGradient(w.x, w.y, 5, w.x, w.y, 46);
    glow.addColorStop(0, `${team.color}22`);
    glow.addColorStop(1, `${team.color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 46, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // launcher for active worm (drawn in world space)
  if (isActive) {
    ctx.save();
    ctx.translate(w.x, w.y - 4);
    ctx.rotate(-aimRad);
    const kick = w.recoil || 0;
    ctx.translate(-kick * 5, 0);
    const tube = ctx.createLinearGradient(0, -6, 0, 6);
    tube.addColorStop(0, '#6d7488');
    tube.addColorStop(0.5, '#444b5d');
    tube.addColorStop(1, '#2b3040');
    ctx.fillStyle = tube;
    roundRect(ctx, 2, -5.5, 38, 11, 4);
    ctx.fill();
    ctx.strokeStyle = '#1e2230';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#ffb45c';
    roundRect(ctx, 36, -7.5, 5, 15, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(ctx, 8, -4.4, 22, 2, 1);
    ctx.fill();
    // grip
    ctx.fillStyle = '#2a2f3d';
    roundRect(ctx, 13, 4, 7, 7, 2);
    ctx.fill();
    // charge glow at the muzzle
    const glow = 0.4 + Math.sin(g.time * 5) * 0.15;
    ctx.fillStyle = `rgba(255, 209, 102, ${glow})`;
    ctx.beginPath();
    ctx.arc(43, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // body
  ctx.save();
  ctx.translate(w.x, w.y + bob);
  drawBaseWorm(ctx, team.color, team.dark, team.light, w.flash || 0, face, g, w);
  ctx.restore();

  // active marker
  if (isActive) {
    const by = w.y - 48 + Math.sin(g.time * 4) * 4;
    ctx.fillStyle = team.color;
    ctx.beginPath();
    ctx.moveTo(w.x, by + 8);
    ctx.lineTo(w.x - 8, by - 2);
    ctx.lineTo(w.x + 8, by - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // name + health
  const hpW = 42;
  const hpY = w.y - 31;
  ctx.font = '800 9px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = isActive ? team.color : 'rgba(255,255,255,0.7)';
  ctx.fillText(w.name, w.x, hpY - 5);
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  roundRect(ctx, w.x - hpW / 2, hpY, hpW, 5, 2.5);
  ctx.fill();
  const ratio = clamp(w.health / w.maxHealth, 0, 1);
  ctx.fillStyle = ratio > 0.55 ? '#8cf07a' : ratio > 0.28 ? '#ffc35c' : '#ff6b5e';
  roundRect(ctx, w.x - hpW / 2, hpY, hpW * ratio, 5, 2.5);
  ctx.fill();
  if (w.health < w.maxHealth) {
    ctx.font = '700 8px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(Math.ceil(w.health), w.x + hpW / 2 + 11, hpY + 5);
  }
}

export function drawDeadWorm(ctx, g, d) {
  const t = d.t;
  if (t > 3.4) return;
  const rise = t * 26;
  const alpha = 1 - clamp((t - 2.1) / 1.2, 0, 1);
  const team = g.teams[d.team];
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.translate(d.x, d.y - rise);
  // halo
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -28, 10, 3.5, 0, 0, TAU);
  ctx.stroke();
  // ghost body
  ctx.fillStyle = 'rgba(235, 240, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 17, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(-5, -3, 2, 0, TAU);
  ctx.arc(5, -3, 2, 0, TAU);
  ctx.fill();
  // wings
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-15, 0, 11, 5, -0.5, 0, TAU);
  ctx.ellipse(15, 0, 11, 5, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = team.color;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawProjectile(ctx, g, p) {
  // trail
  if (p.trail.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < p.trail.length; i++) {
      const t = i / p.trail.length;
      const a = t * 0.52;
      ctx.strokeStyle = p.cfg.trail.replace(/[\d.]+\)$/, `${a})`);
      ctx.lineWidth = 1 + t * 4.2;
      ctx.beginPath();
      ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
      ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.cfg.id === 'rocket') {
    const ang = Math.atan2(p.vy, p.vx);
    ctx.rotate(ang);
    // flame
    const flick = 0.7 + Math.sin(g.time * 40 + p.x) * 0.3;
    const flame = ctx.createLinearGradient(-12, 0, -30 * flick, 0);
    flame.addColorStop(0, 'rgba(255, 240, 170, 0.95)');
    flame.addColorStop(0.5, 'rgba(255, 150, 60, 0.8)');
    flame.addColorStop(1, 'rgba(255, 90, 40, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-11, -5);
    ctx.lineTo(-24 * flick - 9, 0);
    ctx.lineTo(-11, 5);
    ctx.closePath();
    ctx.fill();
    // body
    ctx.fillStyle = '#596273';
    roundRect(ctx, -12, -5, 22, 10, 4);
    ctx.fill();
    ctx.strokeStyle = '#272d38';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(17, 0);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3c4350';
    ctx.beginPath();
    ctx.moveTo(-9, -5);
    ctx.lineTo(-14, -10);
    ctx.lineTo(-4, -5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.lineTo(-14, 10);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
  } else if (p.cfg.id === 'grenade') {
    ctx.rotate(p.age * 9);
    ctx.fillStyle = '#3f5b34';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#20301c';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#7ea34f';
    roundRect(ctx, -2, -9, 4, 4, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-2, -2, 3.2, Math.PI * 0.9, Math.PI * 1.7);
    ctx.stroke();
    const blink = (g.time * 6) % 1 > 0.5;
    ctx.fillStyle = blink ? '#ff5a4c' : '#7a221e';
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, TAU);
    ctx.fill();
  } else {
    ctx.rotate(p.age * 12);
    ctx.fillStyle = '#a77bd8';
    ctx.beginPath();
    ctx.arc(0, 0, 5.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#efe0ff';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#fff3bd';
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawParticles(ctx, g) {
  for (const p of g.particles) {
    const lifeT = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = lifeT * (p.alpha ?? 1);
    if (p.type === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
      ctx.stroke();
    } else if (p.type === 'smoke') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.7 - lifeT * 0.7), 0, TAU);
      ctx.fill();
    } else if (p.type === 'debris' || p.type === 'confetti') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
    } else if (p.type === 'ring') {
      const t = 1 - lifeT;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * lifeT + 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.2 + t), 0, TAU);
      ctx.stroke();
    } else if (p.type === 'star') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        const r = i % 2 ? p.size * 0.35 : p.size;
        const px = p.x + Math.cos(a) * r;
        const py = p.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawTexts(ctx, g) {
  for (const t of g.texts) {
    const a = clamp(t.life / t.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `900 ${t.size}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20, 12, 34, 0.75)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

export function drawAimPreview(ctx, g, preview, alpha = 1) {
  if (!preview || !preview.pts.length) return;
  const pts = preview.pts;
  const team = g.teams[g.active?.team ?? 0];
  ctx.save();
  ctx.globalAlpha = 0.85 * alpha;
  for (let i = 0; i < pts.length; i += 2) {
    const t = i / pts.length;
    const r = 3.2 - t * 1.2;
    ctx.fillStyle = t < 0.55 ? 'rgba(255, 247, 210, 0.95)' : 'rgba(255, 209, 102, 0.7)';
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, Math.max(1.1, r), 0, TAU);
    ctx.fill();
  }
  const end = pts[pts.length - 1];
  if (preview.blocked) {
    ctx.globalAlpha = 0.9 * alpha;
    ctx.strokeStyle = preview.hitEnemy ? '#ff7a6a' : team.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 10, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x - 5, end.y - 5);
    ctx.lineTo(end.x + 5, end.y + 5);
    ctx.moveTo(end.x + 5, end.y - 5);
    ctx.lineTo(end.x - 5, end.y + 5);
    ctx.stroke();
  }
  ctx.restore();
}

function ghostPath(ctx, type, x, y, w, h, dir) {
  if (type === 'ramp') {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    if (dir === 1) ctx.lineTo(x + w, y);
    else ctx.lineTo(x, y);
    ctx.closePath();
  } else if (type === 'floor') {
    roundRect(ctx, x, y, w, h, 2);
  } else {
    roundRect(ctx, x, y, w, h, 3);
  }
}

export function drawBuildGhost(ctx, g, preview) {
  if (!preview) return;
  const { x, y, w, h, valid, type, dir, cost } = preview;
  const team = g.teams[0];
  const color = valid ? '#a8ef4f' : '#ff6b5e';

  ctx.save();
  ghostPath(ctx, type, x, y, w, h, dir);
  ctx.fillStyle = valid ? 'rgba(168, 239, 79, 0.18)' : 'rgba(255, 107, 94, 0.17)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (type === 'ramp') {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (dir === 1) {
      ctx.moveTo(x + w * 0.2, y + h * 0.8);
      ctx.lineTo(x + w * 0.8, y + h * 0.2);
    } else {
      ctx.moveTo(x + w * 0.2, y + h * 0.2);
      ctx.lineTo(x + w * 0.8, y + h * 0.8);
    }
    ctx.stroke();
  }

  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(15, 10, 30, 0.8)';
  ctx.strokeText(`${cost} WOOD`, x + w / 2, y - 10);
  ctx.fillStyle = color;
  ctx.fillText(`${cost} WOOD`, x + w / 2, y - 10);
  ctx.restore();
}

export function drawRangeRing(ctx, g) {
  if (!g.active) return;
  const team = g.teams[0];
  ctx.save();
  ctx.strokeStyle = 'rgba(168, 239, 79, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(g.active.x, g.active.y, 250, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // build grid around the worm
  ctx.strokeStyle = 'rgba(168, 239, 79, 0.07)';
  ctx.lineWidth = 1;
  const cx = Math.round(g.active.x / GRID) * GRID;
  const cy = Math.round(g.active.y / GRID) * GRID;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * GRID, cy - 4 * GRID);
    ctx.lineTo(cx + i * GRID, cy + 4 * GRID);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4 * GRID, cy + i * GRID);
    ctx.lineTo(cx + 4 * GRID, cy + i * GRID);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawScreenOverlay(ctx, g) {
  const { cw, ch } = g.view;
  if (g.vignetteCache) {
    ctx.drawImage(g.vignetteCache, 0, 0, cw, ch);
  } else {
    const vignette = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.32, cw / 2, ch / 2, Math.max(cw, ch) * 0.78);
    vignette.addColorStop(0, 'rgba(10, 6, 22, 0)');
    vignette.addColorStop(1, 'rgba(10, 6, 22, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);
  }

  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255, 236, 190, ${Math.min(0.36, g.flash * 0.4)})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  // gentle dust motes
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const seed = i * 137.7;
    const x = ((seed * 3.7 + g.time * (8 + (i % 5) * 4)) % (cw + 40)) - 20;
    const y = ((seed * 1.9 + Math.sin(g.time * 0.4 + i) * 24) % (ch + 20));
    const a = 0.05 + (Math.sin(g.time * 0.9 + i * 1.7) + 1) * 0.035;
    ctx.fillStyle = `rgba(255, 243, 210, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + (i % 3) * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
