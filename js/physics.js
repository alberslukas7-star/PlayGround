import {
  WORLD_W as W, WORLD_H as H, WORM_R as R, GRAV, GRID, BUILD_LIMIT, BUILDS, WEAPONS,
} from './config.js';
import { clamp, dist, pointInTriangle, rectCircle } from './utils.js';

export function muzzle(actor, angle) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: actor.x + Math.cos(rad) * (R + 18),
    y: actor.y - 4 - Math.sin(rad) * (R + 18),
    vx: Math.cos(rad),
    vy: -Math.sin(rad),
  };
}

export function buildingSurfaceAt(b, x) {
  if (x < b.x - 3 || x > b.x + b.w + 3) return null;
  if (b.type === 'ramp') {
    const t = clamp((x - b.x) / b.w, 0, 1);
    return b.dir === 1 ? b.y + b.h - t * b.h : b.y + t * b.h;
  }
  return b.y;
}

export function supportAt(g, worm, x, minY, maxY) {
  let best = g.terrain.surfaceBelow(x, minY, maxY);
  for (const b of g.buildings) {
    const sy = buildingSurfaceAt(b, x);
    if (sy !== null && sy >= minY && sy <= maxY && (best === null || sy < best)) best = sy;
  }
  return best;
}

export function blockedAt(g, x, y, worm) {
  if (x < 14 || x > W - 14) return true;
  if (g.terrain.solidAt(x, y) || g.terrain.solidAt(x, y + R - 4)) return true;
  for (const b of g.buildings) {
    if (b.type === 'ramp') continue;
    if (rectCircle(b, x, y, R * 0.76)) return true;
  }
  return false;
}

export function walkWorm(g, w, dx) {
  if (!w.alive) return 0;
  const oldX = w.x;
  const nx = clamp(w.x + dx, 16, W - 16);
  if (blockedAt(g, nx, w.y, w)) return 0;
  const feet = w.y + R;
  const sup = supportAt(g, w, nx, feet - 24, feet + 40);
  w.x = nx;
  if (sup !== null && sup <= feet + 10) {
    w.y = sup - R;
    w.grounded = true;
    w.vy = 0;
  } else {
    w.grounded = false;
  }
  return w.x - oldX;
}

export function updateWorm(g, w, dt) {
  if (!w.alive) return;
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.4);
  if (w.recoil > 0) w.recoil = Math.max(0, w.recoil - dt * 5);

  // knockback
  if (Math.abs(w.vx) > 2) {
    const nx = clamp(w.x + w.vx * dt, 16, W - 16);
    if (!blockedAt(g, nx, w.y, w)) w.x = nx;
    w.vx *= Math.exp(-4.2 * dt);
  } else w.vx = 0;

  if (!w.grounded) {
    w.vy = Math.min(w.vy + GRAV * dt, 1600);
    const feet = w.y + R;
    const nextFeet = feet + w.vy * dt;
    const sup = w.vy > 0 ? supportAt(g, w, w.x, feet - 3, nextFeet + 2) : null;
    if (sup !== null) {
      const impact = w.vy;
      w.y = sup - R;
      w.vy = 0;
      w.grounded = true;
      if (impact > 1050) {
        const dmg = clamp((impact - 1050) / 38, 4, 34);
        g.damageWorm(w, dmg, -1, 'fall');
      }
    } else {
      const prevY = w.y;
      w.y += w.vy * dt;
      if (w.vy < 0 && g.terrain.solidAt(w.x, w.y - R * 0.6)) {
        w.y = prevY;
        w.vy = 0;
      }
      if (w.y > H + 80) {
        w.y = H - R;
        w.vy = 0;
        w.grounded = true;
        g.damageWorm(w, 40, -1, 'fall');
      }
    }
  } else {
    const feet = w.y + R;
    const sup = supportAt(g, w, w.x, feet - 16, feet + 28);
    if (sup === null || sup > feet + 12) {
      w.grounded = false;
    } else {
      w.y = sup - R;
      w.vy = 0;
    }
  }
}

export function buildingHit(b, x, y) {
  if (b.type === 'ramp') {
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return false;
    if (b.dir === 1) return pointInTriangle(x, y, b.x, b.y + b.h, b.x + b.w, b.y + b.h, b.x + b.w, b.y);
    return pointInTriangle(x, y, b.x, b.y + b.h, b.x + b.w, b.y + b.h, b.x, b.y);
  }
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function computePlacement(g, type, wx, wy, team) {
  const cfg = BUILDS[type];
  const gx = Math.round((wx - GRID / 2) / GRID) * GRID + GRID / 2;
  const gy = Math.round((wy - GRID / 2) / GRID) * GRID + GRID / 2;
  const x = gx - cfg.w / 2;
  const y = gy - cfg.h / 2;
  const dir = type === 'ramp' ? (team === 0 ? g.rampDir : -1) : 1;
  const cost = cfg.cost;
  const res = {
    type, x, y, w: cfg.w, h: cfg.h, dir, cost, cx: gx, cy: gy,
    valid: true, reason: '', team,
  };
  if (g.teams[team].mats < cost) return { ...res, valid: false, reason: 'NEED MORE WOOD' };
  if (g.buildsUsed >= BUILD_LIMIT) return { ...res, valid: false, reason: 'BUILD LIMIT REACHED' };
  if (x < 12 || x + cfg.w > W - 12 || y < 64 || y + cfg.h > H - 8) {
    return { ...res, valid: false, reason: 'OUT OF BOUNDS' };
  }
  const actor = g.active;
  if (actor && dist(gx, gy, actor.x, actor.y) > 250) {
    return { ...res, valid: false, reason: 'TOO FAR AWAY' };
  }
  // amount of terrain inside the piece
  let solid = 0;
  let total = 0;
  for (let iy = 0; iy < 4; iy++) {
    for (let ix = 0; ix < 4; ix++) {
      const px = x + ((ix + 0.5) / 4) * cfg.w;
      const py = y + ((iy + 0.5) / 4) * cfg.h;
      total++;
      if (g.terrain.solidAt(px, py)) solid++;
    }
  }
  const maxSolid = type === 'floor' ? 0.75 : 0.42;
  if (solid / total > maxSolid) return { ...res, valid: false, reason: 'BLOCKED BY TERRAIN' };

  for (const b of g.buildings) {
    if (x + cfg.w > b.x + 3 && x < b.x + b.w - 3 && y + cfg.h > b.y + 3 && y < b.y + b.h - 3) {
      return { ...res, valid: false, reason: 'SPACE OCCUPIED' };
    }
  }
  for (const w of g.worms) {
    if (!w.alive) continue;
    if (rectCircle({ x, y, w: cfg.w, h: cfg.h }, w.x, w.y, R + 4)) {
      return { ...res, valid: false, reason: 'WORM IN THE WAY' };
    }
  }
  return res;
}

export function simulateTrajectory(g, actor, angle, power, weapon, preview = false) {
  const rad = (angle * Math.PI) / 180;
  const speed = 320 + (clamp(power, 0, 100) / 100) * (weapon.speedMax - 320);
  const m = muzzle(actor, angle);
  let x = m.x;
  let y = m.y;
  let vx = Math.cos(rad) * speed;
  let vy = -Math.sin(rad) * speed;
  const dt = 1 / 100;
  const maxT = weapon.fuse ? weapon.fuse + 0.2 : 5.2;
  let t = 0;
  let bounces = 0;
  const pts = [];
  let blocked = false;
  let hitWorm = null;
  let hitBuilding = null;

  if (preview) pts.push({ x, y });

  while (t < maxT) {
    t += dt;
    vy += GRAV * weapon.gravity * dt;
    vx += g.wind * weapon.wind * dt;
    const px = x;
    const py = y;
    x += vx * dt;
    y += vy * dt;

    if (x < -220 || x > W + 220 || y > H + 120 || y < -420) {
      blocked = true;
      break;
    }

    // own worm is ignored
    for (const w of g.worms) {
      if (!w.alive || w === actor) continue;
      if (t < 0.1) continue;
      if (dist(x, y, w.x, w.y) < R + 3) {
        hitWorm = w;
        blocked = true;
        break;
      }
    }
    if (hitWorm) break;

    let building = null;
    for (const b of g.buildings) {
      if (buildingHit(b, x, y)) { building = b; break; }
    }
    if (building) {
      if (weapon.bounce && bounces < 7) {
        bounces++;
        x = px;
        y = py;
        vy = -vy * weapon.bounce;
        vx *= 0.68;
        y -= 3;
        if (preview) pts.push({ x, y });
        continue;
      }
      hitBuilding = building;
      blocked = true;
      break;
    }

    if (g.terrain.solidAt(x, y)) {
      if (weapon.bounce && bounces < 7) {
        bounces++;
        x = px;
        y = py;
        vy = -vy * weapon.bounce;
        vx *= 0.68;
        for (let i = 0; i < 8 && g.terrain.solidAt(x, y); i++) y -= 3;
        if (preview) pts.push({ x, y });
        continue;
      }
      blocked = true;
      break;
    }

    if (preview && pts.length < 220) {
      if (t % 0.04 < dt) pts.push({ x, y });
    }

    if (weapon.fuse && t >= weapon.fuse) {
      blocked = true;
      break;
    }
  }

  if (preview) {
    if (pts.length === 0 || dist(pts[pts.length - 1].x, pts[pts.length - 1].y, x, y) > 1) {
      pts.push({ x, y });
    }
  }
  const end = { x, y };
  return {
    end, pts, blocked, hitWorm, hitBuilding,
    endX: x, endY: y, time: t,
    hitEnemy: hitWorm ? hitWorm.team !== actor.team : false,
  };
}

export function pickAmmo(w, id) {
  return w.ammo[id] ?? 0;
}

export function availableWeapons(w) {
  return WEAPONS.filter((wp) => pickAmmo(w, wp.id) > 0);
}
