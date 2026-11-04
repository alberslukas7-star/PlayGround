import { BUILDS } from './config.js';
import { computePlacement } from './physics.js';
import { burstBuild } from './effects.js';

export function placeBuild(g, type, wx, wy, team, silent = false) {
  const p = computePlacement(g, type, wx, wy, team);
  if (!p.valid) {
    if (!silent) {
      g.toast(p.reason, 850);
      g.sound.invalid();
    }
    return false;
  }
  const cfg = BUILDS[type];
  g.teams[team].mats -= cfg.cost;
  g.buildsUsed++;
  const b = {
    type,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    dir: p.dir,
    team,
    hp: cfg.hp,
    maxHp: cfg.hp,
    born: g.time,
    seed: Math.random() * 9999,
    hit: 0,
  };
  g.buildings.push(b);
  if (team === 0) g.stats.builds++;
  g.sound.build();
  burstBuild(g, b, g.teams[team].color);
  g.shake = Math.max(g.shake, 2.5);
  if (!silent) {
    g.addText(g, p.cx, p.y - 16, cfg.label, team === 0 ? '#c9f8ff' : '#ffb0a4', 14);
    g.updateHud(true);
  }
  return true;
}
