export const WORLD_W = 1500;
export const WORLD_H = 900;
export const GRAV = 1180;
export const WORM_R = 16;
export const GRID = 72;
export const BUILD_LIMIT = 4;
export const MOVE_BUDGET = 140;
export const TURN_TIME = 45;
export const TEAM_COLORS = [
  { name: 'YOUR SQUAD', short: 'YOU', color: '#51d6ff', dark: '#12658c', light: '#c9f8ff', accent: '#4fd1ff' },
  { name: 'RIVALS', short: 'RIVAL', color: '#ff6b5e', dark: '#8d2626', light: '#ffd8cf', accent: '#ff6b5e' },
];

export const WEAPONS = [
  {
    id: 'rocket', name: 'RPG', icon: '🚀', ammo: Infinity,
    dmg: 50, radius: 84, speedMax: 1180, gravity: 0.52, wind: 0.55,
    color: '#ffd166', trail: 'rgba(255, 190, 90, 0.7)',
    blurb: 'Straight-ish arc. Reliable.',
  },
  {
    id: 'grenade', name: 'GRENADE', icon: '💣', ammo: 3,
    dmg: 60, radius: 104, speedMax: 1210, gravity: 1, wind: 0.35,
    fuse: 2.9, bounce: 0.46, color: '#b6ff7a', trail: 'rgba(160, 255, 120, 0.55)',
    blurb: 'Bounces, then blows.',
  },
  {
    id: 'cluster', name: 'CLUSTER', icon: '✦', ammo: 2,
    dmg: 26, radius: 74, speedMax: 1120, gravity: 0.9, wind: 0.4,
    split: true, color: '#d59bff', trail: 'rgba(220, 160, 255, 0.6)',
    blurb: 'Splits into three bomblets.',
  },
];

export const BOMBLET = {
  id: 'bomblet', name: 'BOMBLET', dmg: 27, radius: 78, gravity: 0.95, wind: 0.35,
  color: '#d59bff', trail: 'rgba(220, 160, 255, 0.5)',
};

export const BUILDS = {
  wall: { w: 72, h: 72, cost: 20, hp: 120, label: 'WALL' },
  floor: { w: 72, h: 18, cost: 15, hp: 80, label: 'FLOOR' },
  ramp: { w: 72, h: 72, cost: 25, hp: 100, label: 'RAMP' },
};

export const NAMES = [
  ['BOLT', 'PIP'],
  ['RUST', 'VEX'],
];
