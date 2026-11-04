export const WORLD = 2500;
export const RUN_LENGTH = 300;
export const BOSS_AT = 240;
export const BAG_SIZE = 36;
export const BASE_SPEED = 188;
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const angleDiff = (a, b) => {
  let d = (a - b + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const worldRng = mulberry32(43117);
const rr = (a, b) => a + worldRng() * (b - a);
const pick = (arr) => arr[Math.floor(worldRng() * arr.length)];
const TAU_ = Math.PI * 2;

const G = {
  mode: "title",
  time: 0,
  camera: { x: WORLD / 2, y: WORLD / 2 },
  shake: 0,
  flash: 0,
  player: null,
  equipment: {},
  bag: [],
  boons: {},
  stats: null,
  enemies: [],
  projectiles: [],
  foeShots: [],
  pickups: [],
  groundLoot: [],
  particles: [],
  texts: [],
  decals: [],
  effects: [],
  decor: null,
  titleMotes: [],
  kills: 0,
  gold: 0,
  relics: 0,
  spawnTimer: 0.8,
  eliteTimer: 32,
  lastWave: 0,
  boss: null,
  bossSpawned: false,
  victoryPending: 0,
  invSelection: null,
  inventoryReturn: "playing",
  levelupDelay: 0,
  muted: false,
  runId: 0,
  bestEver: null
};

export { G };

export function initWorld() {
  const props = [];
  const kinds = [
    ["grave", 26], ["cross", 12], ["tree", 8], ["candle", 17],
    ["rubble", 19], ["statue", 4], ["fence", 6], ["mushroom", 8]
  ];
  const totalWeight = kinds.reduce((n, k) => n + k[1], 0);
  const rollKind = () => {
    let roll = worldRng() * totalWeight;
    for (const [kind, weight] of kinds) {
      roll -= weight;
      if (roll <= 0) return kind;
    }
    return "grave";
  };
  for (let i = 0; i < 115; i++) {
    let x, y, tries = 0;
    do {
      x = rr(90, WORLD - 90);
      y = rr(90, WORLD - 90);
      tries++;
    } while (Math.hypot(x - WORLD / 2, y - WORLD / 2) < 120 && tries < 10);
    const kind = rollKind();
    props.push({
      kind, x, y,
      scale: rr(0.72, 1.28),
      rot: rr(-0.2, 0.2),
      seed: rr(0, 100),
      variant: Math.floor(rr(0, 4))
    });
  }

  const splotches = [];
  for (let i = 0; i < 115; i++) {
    splotches.push({
      x: rr(0, WORLD), y: rr(0, WORLD),
      rx: rr(24, 130), ry: rr(16, 75),
      rot: rr(0, TAU_), alpha: rr(0.018, 0.065),
      color: worldRng() < 0.65 ? "20,17,22" : "28,22,24"
    });
  }

  const runes = [
    { x: WORLD / 2, y: WORLD / 2, r: 128, seed: 12 },
    { x: WORLD * 0.27, y: WORLD * 0.3, r: 72, seed: 44 },
    { x: WORLD * 0.75, y: WORLD * 0.72, r: 92, seed: 91 },
    { x: WORLD * 0.73, y: WORLD * 0.24, r: 58, seed: 61 }
  ];

  G.decor = { props, splotches, runes };

  const motes = [];
  for (let i = 0; i < 64; i++) {
    motes.push({
      x: worldRng(), y: worldRng(),
      vx: rr(-0.005, 0.005), vy: rr(-0.018, -0.002),
      size: rr(0.6, 2.2), phase: rr(0, TAU_), warm: worldRng() < 0.35
    });
  }
  G.titleMotes = motes;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDawn(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function roman(n) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][Math.max(0, n - 1)] || "I";
}
