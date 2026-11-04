/* Procedural textures, faces and cheap wall art. Everything is drawn on a canvas
   so the whole game ships as code. No external images. */

import * as THREE from '../vendor/three.module.js';

const TAU = Math.PI * 2;

function cv(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

function speckle(ctx, w, h, amount, colors, alpha = 0.18) {
  for (let i = 0; i < amount; i++) {
    ctx.globalAlpha = Math.random() * alpha;
    ctx.fillStyle = pick(colors);
    const s = Math.random() < 0.85 ? 1 : 2;
    ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, s, s);
  }
  ctx.globalAlpha = 1;
}

function stain(ctx, x, y, r, color, alpha = 0.08) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function texture(canvas, { repeatX = 1, repeatY = 1, nearest = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (nearest) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

// THREE is imported as a module so textures work as soon as the scene is built.
function makeTexture(canvas, opts) {
  return texture(canvas, opts);
}

/* ------------------------------------------------------------------ */
/* room textures                                                       */
/* ------------------------------------------------------------------ */

export function wallpaperTexture() {
  const { canvas, ctx } = cv(256, 256);
  ctx.fillStyle = '#cdbfa3';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(140, 118, 84, 0.14)';
  for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 8, 256);
  ctx.fillStyle = 'rgba(255, 246, 222, 0.22)';
  for (let x = 24; x < 256; x += 32) ctx.fillRect(x, 0, 2, 256);

  // faded flowers
  for (let y = 18; y < 256; y += 64) {
    for (let x = 16; x < 256; x += 64) {
      ctx.save();
      ctx.translate(x + ((y / 64) % 2) * 22, y);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#7e6650';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 4, 2.4, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#5f4a38';
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  stain(ctx, 48, 210, 60, '#6a563d', 0.11);
  stain(ctx, 210, 40, 40, '#5f4a35', 0.08);
  speckle(ctx, 256, 256, 1600, ['#7a664c', '#efe1c4', '#9d8768'], 0.16);
  return makeTexture(canvas, { repeatX: 3, repeatY: 1.4 });
}

export function floorTexture() {
  const { canvas, ctx } = cv(256, 256);
  ctx.fillStyle = '#7b5534';
  ctx.fillRect(0, 0, 256, 256);
  const plankH = 32;
  for (let y = 0; y < 256; y += plankH) {
    ctx.fillStyle = `hsl(28 34% ${26 + Math.random() * 8}%)`;
    ctx.fillRect(0, y, 256, plankH - 1);
    ctx.fillStyle = 'rgba(30, 18, 10, 0.55)';
    ctx.fillRect(0, y + plankH - 1, 256, 1);
    // plank seams
    ctx.fillStyle = 'rgba(35, 20, 10, 0.4)';
    const seam = (y / plankH) % 2 === 0 ? 120 : 60;
    ctx.fillRect(seam, y, 1.5, plankH);
    // grain
    ctx.strokeStyle = 'rgba(45, 26, 12, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const yy = y + 4 + Math.random() * (plankH - 8);
      ctx.moveTo(0, yy);
      for (let x = 0; x <= 256; x += 32) {
        ctx.lineTo(x, yy + Math.sin(x * 0.05 + y) * 1.6 + rand(-1, 1));
      }
      ctx.stroke();
    }
  }
  speckle(ctx, 256, 256, 900, ['#2f1b0c', '#b18356', '#5c3a1d'], 0.18);
  return makeTexture(canvas, { repeatX: 4, repeatY: 4 });
}

export function rugTexture() {
  const { canvas, ctx } = cv(256, 180);
  ctx.fillStyle = '#8e3b32';
  ctx.fillRect(0, 0, 256, 180);
  ctx.strokeStyle = '#e3c27f';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 164);
  ctx.strokeStyle = '#3e2b3a';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 216, 140);
  ctx.fillStyle = 'rgba(227, 194, 127, 0.8)';
  for (let x = 40; x < 230; x += 34) {
    ctx.save();
    ctx.translate(x, 90);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(32, 20, 30, 0.35)';
  ctx.fillRect(0, 78, 256, 24);
  speckle(ctx, 256, 180, 700, ['#5a201d', '#d8b774', '#2c1d24'], 0.2);
  // fringe
  ctx.fillStyle = '#d8c9a8';
  for (let x = 0; x < 256; x += 8) {
    ctx.fillRect(x, 0, 3, 5);
    ctx.fillRect(x, 175, 3, 5);
  }
  return makeTexture(canvas);
}

export function doorTexture() {
  const { canvas, ctx } = cv(256, 512);
  ctx.fillStyle = '#6d4528';
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = '#7b5030';
  ctx.fillRect(10, 10, 236, 492);

  // panels
  const panel = (x, y, w, h) => {
    ctx.strokeStyle = 'rgba(52, 31, 17, 0.9)';
    ctx.lineWidth = 7;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(147, 103, 63, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    ctx.fillStyle = 'rgba(45, 27, 14, 0.16)';
    ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
  };
  panel(34, 42, 188, 170);
  panel(34, 252, 188, 210);

  // grain
  ctx.strokeStyle = 'rgba(45, 26, 13, 0.18)';
  for (let i = 0; i < 22; i++) {
    ctx.beginPath();
    const x = rand(0, 256);
    ctx.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 40) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 3, y);
    ctx.stroke();
  }
  speckle(ctx, 256, 512, 1800, ['#3a2312', '#a87a4d', '#5c3a1f'], 0.16);
  return makeTexture(canvas);
}

export function porchTexture() {
  const { canvas, ctx } = cv(256, 256);
  ctx.fillStyle = '#4c4136';
  ctx.fillRect(0, 0, 256, 256);
  const h = 26;
  for (let y = 0; y < 256; y += h) {
    ctx.fillStyle = `hsl(32 12% ${20 + Math.random() * 7}%)`;
    ctx.fillRect(0, y, 256, h - 2);
    ctx.fillStyle = 'rgba(10, 9, 8, 0.5)';
    ctx.fillRect(0, y + h - 2, 256, 2);
    ctx.strokeStyle = 'rgba(15, 13, 11, 0.3)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const yy = y + rand(2, h - 3);
      ctx.moveTo(0, yy);
      ctx.lineTo(256, yy + rand(-1, 1));
      ctx.stroke();
    }
  }
  speckle(ctx, 256, 256, 1200, ['#1b1917', '#7d6c58', '#3c342c'], 0.2);
  return makeTexture(canvas, { repeatX: 3, repeatY: 3 });
}

export function ceilingTexture() {
  const { canvas, ctx } = cv(128, 128);
  ctx.fillStyle = '#cfc4b0';
  ctx.fillRect(0, 0, 128, 128);
  speckle(ctx, 128, 128, 600, ['#a99d87', '#eee6d4', '#8b7f6b'], 0.2);
  stain(ctx, 32, 40, 34, '#7d6a50', 0.16);
  stain(ctx, 100, 100, 26, '#8a7960', 0.12);
  return makeTexture(canvas, { repeatX: 3, repeatY: 3 });
}

export function doormatTexture() {
  const { canvas, ctx } = cv(256, 136);
  ctx.fillStyle = '#5a4a34';
  ctx.fillRect(0, 0, 256, 136);
  ctx.strokeStyle = '#33291d';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 244, 124);
  ctx.fillStyle = '#c6b48c';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WELCOME', 128, 68);
  ctx.fillStyle = 'rgba(20, 15, 10, 0.35)';
  for (let i = 0; i < 120; i++) ctx.fillRect(rand(0, 256), rand(0, 136), 2, 1);
  return makeTexture(canvas);
}

export function tvTexture() {
  const { canvas, ctx } = cv(192, 144);
  const draw = (t, mode = 'static') => {
    if (mode === 'party') {
      ctx.fillStyle = '#1c1035';
      ctx.fillRect(0, 0, 192, 144);
      const hue = (t * 60) % 360;
      ctx.fillStyle = `hsl(${hue} 80% 55%)`;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PARTY', 96, 62);
      ctx.font = 'bold 16px monospace';
      ctx.fillText('!!!!!', 96, 88);
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      for (let i = 0; i < 6; i++) ctx.fillRect(0, (i * 24 + t * 20) % 144, 192, 1);
    } else if (mode === 'dead') {
      ctx.fillStyle = '#170404';
      ctx.fillRect(0, 0, 192, 144);
      ctx.fillStyle = '#9c1616';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO SIGNAL', 96, 76);
    } else {
      // static
      for (let y = 0; y < 144; y += 3) {
        for (let x = 0; x < 192; x += 3) {
          const v = (Math.random() * 255) | 0;
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(x, y, 3, 3);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 108, 192, 36);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CH 4', 8, 124);
      ctx.fillText('COOKING WITH GARY', 42, 124);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (let y = 0; y < 144; y += 4) ctx.fillRect(0, y, 192, 1);
    }
  };
  draw(0);
  const tex = makeTexture(canvas);
  return { texture: tex, canvas, draw };
}

export function paintingTexture(kind = 0) {
  const { canvas, ctx } = cv(128, 128);
  if (kind === 0) {
    // cat portrait
    ctx.fillStyle = '#cbb98d';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#2e241d';
    ctx.beginPath();
    ctx.arc(64, 78, 34, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(36, 52); ctx.lineTo(40, 22); ctx.lineTo(56, 42); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(92, 52); ctx.lineTo(88, 22); ctx.lineTo(72, 42); ctx.fill();
    ctx.fillStyle = '#9fc45b';
    ctx.beginPath(); ctx.arc(52, 72, 7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(76, 72, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(52, 72, 2.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(76, 72, 2.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(58, 92); ctx.lineTo(64, 96); ctx.lineTo(70, 92); ctx.stroke();
    ctx.fillStyle = '#d8c49c';
    ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('MR. BISCUITS', 64, 120);
  } else if (kind === 1) {
    // family
    ctx.fillStyle = '#8aa2a8';
    ctx.fillRect(0, 0, 128, 128);
    const person = (x, s, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x - 9 * s, 90, 18 * s, 30);
      ctx.fillStyle = '#e8bb94';
      ctx.beginPath(); ctx.arc(x, 82, 10 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b1b12';
      ctx.beginPath(); ctx.arc(x, 78, 10 * s, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(x - 5 * s, 80, 2, 2);
      ctx.fillRect(x + 3 * s, 80, 2, 2);
    };
    person(38, 1, '#b64040');
    person(64, 0.8, '#3f6fa0');
    person(88, 0.9, '#c8a13d');
    ctx.fillStyle = '#e8d8b6';
    ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HAPPY TIMES', 64, 20);
  } else {
    // landscape
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#d9a45f');
    g.addColorStop(0.55, '#e7c88e');
    g.addColorStop(1, '#5b7b5f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#f4e7c4';
    ctx.beginPath(); ctx.arc(96, 34, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3f5c47';
    ctx.beginPath(); ctx.moveTo(0, 108); ctx.lineTo(38, 66); ctx.lineTo(72, 104); ctx.lineTo(102, 74); ctx.lineTo(128, 108); ctx.fill();
    ctx.fillStyle = '#2b4034';
    ctx.fillRect(0, 108, 128, 20);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.26)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 120, 120);
  speckle(ctx, 128, 128, 500, ['#2a2118', '#efe3c9'], 0.12);
  return makeTexture(canvas);
}

export function bannerTexture() {
  const { canvas, ctx } = cv(512, 160);
  ctx.fillStyle = '#f0cf55';
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#b63a2c';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 142, 512, 18);
  ctx.font = 'bold 78px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a241a';
  ctx.fillText('HAPPY 50', 256, 70);
  ctx.font = 'bold 28px monospace';
  ctx.fillText('G U E S T S', 256, 122);
  // hand-drawn streamers
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = ['#3a76b8', '#4b9b5e', '#b63a2c'][i % 3];
    ctx.beginPath();
    ctx.arc(rand(20, 492), rand(20, 140), rand(2, 5), 0, TAU);
    ctx.fill();
  }
  speckle(ctx, 512, 160, 400, ['#5e4512', '#fff2b0'], 0.2);
  return makeTexture(canvas);
}

export function signTexture() {
  const { canvas, ctx } = cv(128, 128);
  ctx.fillStyle = '#c9b489';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#4a3922';
  ctx.lineWidth = 7;
  ctx.strokeRect(7, 7, 114, 114);
  ctx.fillStyle = '#3a2c1a';
  ctx.font = 'bold 76px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('4', 64, 70);
  speckle(ctx, 128, 128, 220, ['#3a2c1a', '#efe1c0'], 0.16);
  return makeTexture(canvas);
}

export function starTexture() {
  const { canvas, ctx } = cv(32, 32);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,240,1)');
  g.addColorStop(0.35, 'rgba(255,255,230,0.8)');
  g.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return makeTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* faces                                                               */
/* ------------------------------------------------------------------ */

const SKIN_TONES = ['#f2c9a5', '#e5b58f', '#d3a077', '#bd835b', '#9a613f', '#7b4a2e', '#5f3822', '#f6d8bd'];
const EYE_COLORS = ['#3b2a1a', '#2b1c12', '#3d5a80', '#4c6b3f', '#5a3f2a'];

function drawEye(ctx, x, y, r, spec, closed = false) {
  ctx.save();
  if (closed) {
    ctx.strokeStyle = spec.eyeLine || '#2a1b12';
    ctx.lineWidth = Math.max(2, r * 0.32);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // socket shadow
  ctx.fillStyle = 'rgba(70, 42, 25, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.12, r * 1.1, r * 0.95, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = spec.sclera || '#f5efe1';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.82, 0, 0, TAU);
  ctx.fill();

  const pr = r * (spec.pupilScale || 0.42);
  ctx.fillStyle = spec.eyeColor || '#2b1c12';
  ctx.beginPath();
  ctx.arc(x + (spec.lookX || 0) * r, y + (spec.lookY || 0) * r, pr, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - pr * 0.4, y - pr * 0.45, Math.max(1, pr * 0.32), 0, TAU);
  ctx.fill();

  // lid
  ctx.strokeStyle = spec.eyeLine || '#2a1b12';
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 1.06, Math.PI * 1.94);
  ctx.stroke();
  ctx.restore();
}

export function faceCanvas(spec = {}, size = 96, closed = false) {
  const { canvas, ctx } = cv(size, size);
  const s = size / 96;
  ctx.scale(s, s);

  const skin = spec.skin || pick(SKIN_TONES);
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 96, 96);

  // face shading
  const g = ctx.createRadialGradient(48, 38, 8, 48, 48, 62);
  g.addColorStop(0, 'rgba(255,255,255,0.13)');
  g.addColorStop(1, 'rgba(60,25,10,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);

  // subtle texture
  speckle(ctx, 96, 96, size * 3, ['#7b4b2e', '#ffe6c9', '#5a3520'], 0.13);

  // ears
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(7, 52, 6, 9, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(89, 52, 6, 9, 0, 0, TAU); ctx.fill();

  // hair fringe
  if (spec.hairFringe !== false && spec.hair) {
    ctx.fillStyle = spec.hair;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(96, 0);
    ctx.lineTo(96, 11 + rand(0, 4));
    const teeth = 6;
    for (let i = teeth; i >= 0; i--) {
      const x = (i / teeth) * 96;
      const y = 11 + Math.random() * 10;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  if (spec.bald) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.ellipse(48, 15, 26, 10, 0, 0, TAU); ctx.fill();
  }

  // eyes
  const eyeR = spec.eyeSize || 8.2;
  const ey = spec.eyeY || 38;
  const eyeColor = spec.eyeColor || pick(EYE_COLORS);

  if (spec.eyeCount === 0) {
    // empty sockets
    ctx.fillStyle = 'rgba(40,20,12,0.85)';
    ctx.beginPath(); ctx.ellipse(31, ey, 8, 5.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(65, ey, 8, 5.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(25,10,6,0.9)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(24 + i * 4, ey - 7);
      ctx.lineTo(26 + i * 4, ey + 6);
      ctx.stroke();
    }
  } else if (spec.eyeCount === 1) {
    drawEye(ctx, 48, ey, spec.eyeSize || 16, { ...spec, eyeColor }, closed);
  } else if (spec.eyeCount === 3) {
    drawEye(ctx, 28, ey, eyeR, { ...spec, eyeColor }, closed);
    drawEye(ctx, 68, ey, eyeR, { ...spec, eyeColor }, closed);
    drawEye(ctx, 48, 16, eyeR * 0.85, { ...spec, eyeColor: spec.thirdEyeColor || '#8c1414' }, closed);
  } else if (spec.eyeCount === 4) {
    drawEye(ctx, 28, ey - 8, eyeR * 0.85, { ...spec, eyeColor }, closed);
    drawEye(ctx, 68, ey - 8, eyeR * 0.85, { ...spec, eyeColor }, closed);
    drawEye(ctx, 30, ey + 11, eyeR * 0.75, { ...spec, eyeColor }, closed);
    drawEye(ctx, 66, ey + 11, eyeR * 0.75, { ...spec, eyeColor }, closed);
  } else if (spec.mismatch) {
    drawEye(ctx, 30, ey, eyeR * 0.55, { ...spec, eyeColor }, closed);
    drawEye(ctx, 67, ey, eyeR * 1.55, { ...spec, eyeColor: '#6b0f0f' }, closed);
  } else {
    drawEye(ctx, 31, ey, eyeR, { ...spec, eyeColor }, closed);
    drawEye(ctx, 65, ey, eyeR, { ...spec, eyeColor }, closed);
  }

  // eyebrows
  if (spec.brows !== 'none' && !closed) {
    ctx.strokeStyle = spec.browColor || spec.hair || '#3a2416';
    ctx.lineWidth = spec.browThick || 3;
    ctx.lineCap = 'round';
    const tilt = spec.browTilt ?? 0;
    if (spec.eyeCount === 1) {
      ctx.beginPath();
      ctx.moveTo(30, 22);
      ctx.lineTo(66, 22 - tilt * 4);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(20, 25 + tilt * 3);
      ctx.lineTo(40, 23 - tilt * 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(56, 23 - tilt * 3);
      ctx.lineTo(76, 25 + tilt * 3);
      ctx.stroke();
    }
  }

  // nose
  if (spec.noNose !== true) {
    ctx.strokeStyle = 'rgba(90,45,25,0.5)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(48, 44);
    ctx.lineTo(45, 53);
    ctx.quadraticCurveTo(48, 56, 51, 53);
    ctx.stroke();
  }

  // mouth
  const my = spec.mouthY || 68;
  const mouth = spec.mouth || 'smile';
  ctx.lineCap = 'round';
  if (mouth === 'smile') {
    ctx.strokeStyle = '#5b2b20';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(48, my - 5, 13, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'flat') {
    ctx.strokeStyle = '#5b2b20';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(37, my);
    ctx.lineTo(59, my);
    ctx.stroke();
  } else if (mouth === 'frown') {
    ctx.strokeStyle = '#5b2b20';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(48, my + 9, 13, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'open' || mouth === 'scream') {
    const w = mouth === 'scream' ? 20 : 14;
    const h = mouth === 'scream' ? 24 : 13;
    ctx.fillStyle = '#2a0b08';
    ctx.beginPath();
    ctx.ellipse(48, my + 4, w, h, 0, 0, TAU);
    ctx.fill();
    if (mouth === 'scream') {
      ctx.fillStyle = '#efe3c9';
      ctx.fillRect(35, my - 6, 26, 4);
      ctx.fillRect(37, my + 14, 22, 3);
    }
  } else if (mouth === 'grin' || mouth === 'teeth') {
    const wide = spec.grinWide ? 37 : 27;
    ctx.fillStyle = '#2a0b08';
    ctx.beginPath();
    ctx.ellipse(48, my + 3, wide, 15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0e6cf';
    ctx.fillRect(48 - wide + 3, my - 6, wide * 2 - 6, 8);
    ctx.fillStyle = 'rgba(60,40,25,0.35)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(48 - wide + 3 + i * ((wide * 2 - 6) / 8), my - 6, 1.5, 8);
    }
    ctx.strokeStyle = '#3a1410';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(48, my + 3, wide, 15, 0, 0, TAU);
    ctx.stroke();
  } else if (mouth === 'stitch') {
    ctx.strokeStyle = '#4a2018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(28, my);
    ctx.quadraticCurveTo(48, my + 6, 68, my);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(31 + i * 6, my - 4);
      ctx.lineTo(34 + i * 6, my + 5);
      ctx.stroke();
    }
  } else if (mouth === 'none') {
    // nothing
  }

  // mustache / beard
  if (spec.mustache) {
    ctx.fillStyle = spec.hair || '#3a2416';
    ctx.beginPath();
    ctx.ellipse(38, my - 8, 11, 3.5, -0.12, 0, TAU);
    ctx.ellipse(58, my - 8, 11, 3.5, 0.12, 0, TAU);
    ctx.fill();
  }
  if (spec.beard) {
    ctx.fillStyle = spec.hair || '#3a2416';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(48, 62, 27, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.lineTo(75, 80);
    ctx.quadraticCurveTo(48, 96, 21, 80);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // mouth cutout
    ctx.fillStyle = '#2a0b08';
    ctx.beginPath();
    ctx.ellipse(48, my, 12, 4, 0, 0, TAU);
    ctx.fill();
  }

  if (spec.glasses) {
    ctx.strokeStyle = spec.glassesColor || '#241a12';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(31, ey, 12, 9, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(65, ey, 12, 9, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(43, ey); ctx.lineTo(53, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, ey); ctx.lineTo(10, ey - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(77, ey); ctx.lineTo(86, ey - 2); ctx.stroke();
  }

  if (spec.blush) {
    ctx.fillStyle = 'rgba(200, 80, 70, 0.25)';
    ctx.beginPath(); ctx.ellipse(20, 58, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(76, 58, 9, 5, 0, 0, TAU); ctx.fill();
  }

  if (spec.freckles) {
    ctx.fillStyle = 'rgba(100,55,30,0.45)';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(rand(22, 74), rand(52, 60), 1.5, 1.5);
    }
  }

  if (spec.scar) {
    ctx.strokeStyle = 'rgba(120,40,40,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(68, 18);
    ctx.lineTo(76, 40);
    ctx.stroke();
  }

  return canvas;
}

export function makeFace(spec = {}) {
  const open = faceCanvas(spec, 96, false);
  const blink = faceCanvas(spec, 96, true);
  const toTex = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  };
  return {
    openTex: toTex(open),
    blinkTex: toTex(blink),
    openCanvas: open,
    dataURL: open.toDataURL(),
    spec,
  };
}

export function humanFaceSpec(seed = Math.random()) {
  const r = mulberry(seed * 100000);
  const skins = SKIN_TONES;
  const hairs = ['#2b1d15', '#4a2f1c', '#7a4a26', '#c7a15e', '#d8b26a', '#a33c2c', '#8a8a8a', '#1a1a1a', '#5b3a56', '#b56a3c'];
  const mouths = ['smile', 'smile', 'smile', 'flat', 'open', 'frown'];
  return {
    skin: skins[(r() * skins.length) | 0],
    hair: hairs[(r() * hairs.length) | 0],
    hairFringe: r() > 0.18,
    bald: r() < 0.14,
    eyeCount: 2,
    eyeSize: 6.5 + r() * 3.2,
    eyeY: 36 + r() * 4,
    eyeColor: EYE_COLORS[(r() * EYE_COLORS.length) | 0],
    pupilScale: 0.36 + r() * 0.15,
    lookX: (r() - 0.5) * 0.3,
    lookY: (r() - 0.5) * 0.2,
    mouth: mouths[(r() * mouths.length) | 0],
    mouthY: 66 + r() * 6,
    brows: 'normal',
    browTilt: (r() - 0.5) * 1.6,
    browThick: 2 + r() * 2,
    glasses: r() < 0.18,
    mustache: r() < 0.13,
    beard: r() < 0.12,
    blush: r() < 0.2,
    freckles: r() < 0.22,
    scar: r() < 0.06,
    glassesColor: '#241a12',
  };
}

export function anomalyFaceSpec(kind = 'eyes', base = {}) {
  const spec = { ...humanFaceSpec(Math.random()), ...base };
  spec.eyeCount = 2;
  spec.mouth = 'smile';
  if (kind === 'eyes') {
    spec.eyeCount = Math.random() < 0.5 ? 3 : 4;
    spec.eyeSize = 7 + Math.random() * 2;
    spec.mouth = 'smile';
  } else if (kind === 'noFace') {
    spec.eyeCount = 0;
    spec.mouth = 'none';
    spec.noNose = true;
    spec.hairFringe = true;
  } else if (kind === 'wideMouth') {
    spec.mouth = 'grin';
    spec.grinWide = true;
    spec.eyeSize = 4.2;
    spec.eyeY = 32;
  } else if (kind === 'mismatch') {
    spec.mismatch = true;
    spec.eyeSize = 10;
    spec.mouth = 'open';
  } else if (kind === 'smile') {
    spec.mouth = 'grin';
    spec.eyeSize = 3.2;
    spec.pupilScale = 0.6;
    spec.eyeY = 36;
  } else if (kind === 'skin') {
    spec.skin = ['#9fb08a', '#b7b7a9', '#8f9c8a', '#6f7d75', '#c9b8a4'][(Math.random() * 5) | 0];
    spec.eyeColor = '#b01818';
    spec.mouth = 'flat';
    spec.pupilScale = 0.5;
  } else if (kind === 'thirdEye') {
    spec.eyeCount = 3;
    spec.mouth = 'smile';
  } else if (kind === 'scream') {
    spec.mouth = 'scream';
    spec.eyeSize = 4;
    spec.pupilScale = 0.18;
    spec.sclera = '#ded6c0';
  }
  return spec;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { pick, rand };
