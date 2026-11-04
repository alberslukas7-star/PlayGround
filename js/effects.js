import { rand, TAU, clamp } from './utils.js';

export function addText(g, x, y, text, color = '#ffd166', size = 20) {
  g.texts.push({ x, y, text, color, size, life: 1.15, maxLife: 1.15, vy: -42 });
  if (g.texts.length > 30) g.texts.shift();
}

export function burstExplosion(g, x, y, radius) {
  const scale = clamp(radius / 100, 0.6, 1.5);
  const ring = { x, y, vx: 0, vy: 0, size: radius * 1.5, life: 0.5, maxLife: 0.5, color: 'rgba(255, 231, 176, 0.85)', type: 'ring', gravity: 0, alpha: 0.8 };
  g.particles.push(ring);
  for (let i = 0; i < 34 * scale; i++) {
    const a = rand(0, TAU);
    const sp = rand(80, 620) * scale;
    g.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
      size: rand(1.4, 4.4), life: rand(0.22, 0.7), maxLife: 0.7,
      color: i % 3 === 0 ? '#fff3bd' : i % 3 === 1 ? '#ffb347' : '#ff6a3d',
      type: 'spark', gravity: 420, drag: 2.2,
    });
  }
  for (let i = 0; i < 15 * scale; i++) {
    const a = rand(0, TAU);
    const sp = rand(20, 130);
    g.particles.push({
      x: x + rand(-12, 12), y: y + rand(-12, 12),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
      size: rand(7, 18) * scale, life: rand(0.6, 1.5), maxLife: 1.5,
      color: i % 2 ? 'rgba(72, 52, 70, 0.5)' : 'rgba(110, 80, 92, 0.42)',
      type: 'smoke', gravity: -55, drag: 1.1, alpha: 0.6,
    });
  }
  for (let i = 0; i < 13 * scale; i++) {
    const a = rand(-Math.PI, 0);
    const sp = rand(110, 420);
    g.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: rand(2.5, 7), life: rand(0.55, 1.25), maxLife: 1.25,
      color: i % 3 ? '#6b4229' : '#3d251c', type: 'debris',
      gravity: 900, drag: 0.25, rot: rand(0, TAU), vr: rand(-12, 12),
    });
  }
  g.flash = Math.min(1, g.flash + 0.34 * scale);
  g.shake = Math.max(g.shake, 10 * scale);
}

export function burstBuild(g, b, color) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    g.particles.push({
      x: b.x + rand(0, b.w), y: b.y + rand(0, b.h),
      vx: rand(-110, 110), vy: rand(-220, -40),
      size: rand(2, 5), life: rand(0.4, 0.85), maxLife: 0.85,
      color: i % 2 ? '#d9a066' : '#8f5a32', type: 'debris',
      gravity: 760, drag: 0.3, rot: rand(0, TAU), vr: rand(-10, 10),
    });
  }
  for (let i = 0; i < 8; i++) {
    g.particles.push({
      x: b.x + rand(0, b.w), y: b.y + rand(0, b.h),
      vx: rand(-30, 30), vy: rand(-40, 10),
      size: rand(2, 4), life: rand(0.3, 0.7), maxLife: 0.7,
      color, type: 'star', gravity: 0, drag: 1,
    });
  }
}

export function burstDeath(g, w) {
  const team = g.teams[w.team];
  for (let i = 0; i < 28; i++) {
    const a = rand(-Math.PI, 0);
    const sp = rand(90, 320);
    g.particles.push({
      x: w.x, y: w.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
      size: rand(2, 5), life: rand(0.7, 1.7), maxLife: 1.7,
      color: i % 3 === 0 ? team.color : i % 3 === 1 ? '#ffe9a8' : '#fff',
      type: i % 2 ? 'confetti' : 'star', gravity: 320, drag: 0.6,
      rot: rand(0, TAU), vr: rand(-8, 8),
    });
  }
}

export function burstLlama(g, l) {
  for (let i = 0; i < 34; i++) {
    const a = rand(-Math.PI, 0);
    const sp = rand(120, 420);
    g.particles.push({
      x: l.x, y: l.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      size: rand(2, 5), life: rand(0.7, 1.6), maxLife: 1.6,
      color: ['#ffd166', '#ff8fd6', '#51d6ff', '#a8ef4f', '#fff'][i % 5],
      type: i % 2 ? 'confetti' : 'star', gravity: 360, drag: 0.5,
      rot: rand(0, TAU), vr: rand(-9, 9),
    });
  }
}

export function burstDust(g, x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    g.particles.push({
      x: x + rand(-8, 8), y: y + rand(-3, 3),
      vx: rand(-55, 55), vy: rand(-50, -8),
      size: rand(2.5, 6), life: rand(0.25, 0.55), maxLife: 0.55,
      color: 'rgba(214, 183, 146, 0.5)', type: 'smoke',
      gravity: 40, drag: 1.3, alpha: 0.6,
    });
  }
}

export function burstMuzzle(g, x, y, color) {
  for (let i = 0; i < 8; i++) {
    const a = rand(0, TAU);
    g.particles.push({
      x, y, vx: Math.cos(a) * rand(30, 150), vy: Math.sin(a) * rand(30, 150),
      size: rand(1.5, 3.5), life: rand(0.15, 0.45), maxLife: 0.45,
      color: i % 2 ? '#fff1b8' : color, type: 'spark', gravity: 60, drag: 3,
    });
  }
}

export function updateParticles(g, dt) {
  const out = [];
  for (const p of g.particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.drag) {
      const f = Math.exp(-p.drag * dt);
      p.vx *= f;
      p.vy *= f;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.vr) p.rot = (p.rot || 0) + p.vr * dt;
    out.push(p);
  }
  if (out.length > 620) out.splice(0, out.length - 620);
  g.particles = out;
}

export function updateTexts(g, dt) {
  const out = [];
  for (const t of g.texts) {
    t.life -= dt;
    if (t.life <= 0) continue;
    t.y += t.vy * dt;
    t.vy *= Math.exp(-2.2 * dt);
    out.push(t);
  }
  g.texts = out;
}
