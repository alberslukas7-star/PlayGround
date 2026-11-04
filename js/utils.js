export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choose = (arr) => arr[(Math.random() * arr.length) | 0];
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const smoothstep = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const roundRect = (ctx, x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

export function rectCircle(rect, cx, cy, cr) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= cr * cr;
}

export function formatNumber(n) {
  return Math.round(n).toString();
}

export const ROMAN = ['I', 'II', 'III', 'IV'];

export function seededNoise(seed) {
  const rng = mulberry32(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rng() * 2 - 1;
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const t = f * f * (3 - 2 * f);
    return lerp(a, b, t);
  };
}
