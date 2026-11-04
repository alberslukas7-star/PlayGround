import { G } from "./state.js";

export function spawnParticle(x, y, vx, vy, life, size, color, opts = {}) {
  if (G.particles.length > 620) G.particles.shift();
  G.particles.push({
    x, y, vx, vy,
    life, maxLife: life, size, color,
    kind: opts.kind || "spark",
    gravity: opts.gravity || 0,
    drag: opts.drag ?? 0.93,
    glow: opts.glow ?? false,
    streak: opts.streak ?? false,
    alpha: opts.alpha ?? 1,
    rot: opts.rot || 0,
    spin: opts.spin || 0
  });
}

export function burst(x, y, color, count = 8, speed = 90, size = 2, life = 0.5, opts = {}) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.8);
    spawnParticle(
      x + (Math.random() - 0.5) * 4,
      y + (Math.random() - 0.5) * 4,
      Math.cos(angle) * s,
      Math.sin(angle) * s,
      life * (0.6 + Math.random() * 0.7),
      size * (0.55 + Math.random() * 0.8),
      color,
      opts
    );
  }
}

export function damageText(x, y, value, color = "#f1e4cf", crit = false) {
  if (G.texts.length > 90) G.texts.shift();
  G.texts.push({
    x: x + (Math.random() - 0.5) * 12,
    y: y - 16,
    value: `${Math.round(value)}`,
    color: crit ? "#ffcf83" : color,
    crit,
    life: crit ? 0.9 : 0.68,
    maxLife: crit ? 0.9 : 0.68
  });
}

export function addEffect(effect) {
  if (G.effects.length > 140) G.effects.shift();
  G.effects.push({ age: 0, ...effect });
}

export function addDecal(x, y, scale = 1, color = "73,17,24", alpha = 0.2) {
  if (G.decals.length > 95) G.decals.shift();
  G.decals.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 8,
    rx: (8 + Math.random() * 12) * scale,
    ry: (3 + Math.random() * 6) * scale,
    rot: Math.random() * Math.PI,
    color, alpha
  });
}

export function screenShake(amount) {
  G.shake = Math.min(18, Math.max(G.shake, amount));
}

export function screenFlash(amount) {
  G.flash = Math.min(1, Math.max(G.flash, amount));
}
