import { WORLD_W as W, WORLD_H as H, GRAV, WORM_R as R, WEAPONS, BOMBLET } from './config.js';
import { clamp, dist, rand, pointInTriangle } from './utils.js';
import { muzzle, buildingHit } from './physics.js';
import {
  addText, burstExplosion, burstMuzzle, burstDeath, burstBuild,
} from './effects.js';

function nearestOnRect(b, x, y) {
  return {
    x: clamp(x, b.x, b.x + b.w),
    y: clamp(y, b.y, b.y + b.h),
  };
}

export function fire(g) {
  if (g.state !== 'aim' && g.state !== 'enemy') return false;
  const w = g.active;
  if (!w || !w.alive) return false;
  let weapon = WEAPONS[g.selectedWeapon];
  if ((w.ammo[weapon.id] ?? 0) <= 0) {
    g.selectedWeapon = 0;
    weapon = WEAPONS[0];
  }
  if (Number.isFinite(w.ammo[weapon.id])) {
    w.ammo[weapon.id] = Math.max(0, w.ammo[weapon.id] - 1);
  }
  g.lastAim[w.team] = { angle: g.aim.angle, power: g.aim.power };

  const rad = (g.aim.angle * Math.PI) / 180;
  const speed = 320 + (clamp(g.aim.power, 0, 100) / 100) * (weapon.speedMax - 320);
  const m = muzzle(w, g.aim.angle);
  const p = {
    cfg: weapon,
    owner: w,
    team: w.team,
    x: m.x,
    y: m.y,
    vx: Math.cos(rad) * speed,
    vy: -Math.sin(rad) * speed,
    age: 0,
    bounces: 0,
    trail: [],
    dead: false,
    isBomblet: false,
  };
  g.projectiles.push(p);
  w.recoil = 1;
  w.grounded = false;
  w.vy = Math.min(w.vy, -55);
  g.state = 'flying';
  g.buildMode = false;
  g.settleFocus = null;
  g.flightTime = 0;
  g.pointer = null;
  if (w.team === 0) g.stats.shots++;
  g.sound.shoot(weapon.id);
  burstMuzzle(g, m.x, m.y, weapon.color);
  g.shake = Math.max(g.shake, 6);
  g.toast?.(`${weapon.name} AWAY`, 600);
  g.updateHud(true);
  return true;
}

function spawnBomblets(g, p) {
  for (let i = 0; i < 3; i++) {
    g.projectiles.push({
      cfg: BOMBLET,
      owner: p.owner,
      team: p.team,
      x: p.x + rand(-6, 6),
      y: p.y - 8 + rand(-4, 4),
      vx: p.vx * 0.28 + rand(-150, 150),
      vy: -rand(90, 280),
      age: 0,
      bounces: 0,
      trail: [],
      dead: false,
      isBomblet: true,
    });
  }
  g.sound.split();
  addText(g, p.x, p.y - 20, 'SPLIT!', '#e3b8ff', 16);
}

export function detonate(g, p, x = p.x, y = p.y, directWorm = null) {
  if (p.dead) return;
  p.dead = true;
  if (p.cfg.split && !p.isBomblet) {
    spawnBomblets(g, p);
    explode(g, x, y, 46, 12, p.team, p.owner, p.cfg, null);
    return;
  }
  explode(g, x, y, p.cfg.radius, p.cfg.dmg, p.team, p.owner, p.cfg, directWorm);
}

export function stepProjectile(g, p, dt) {
  if (p.dead) return;
  p.age += dt;
  p.trail.push({ x: p.x, y: p.y });
  if (p.trail.length > 26) p.trail.shift();

  const cfg = p.cfg;
  const steps = clamp(Math.ceil(dt / 0.004), 1, 24);
  const h = dt / steps;

  for (let i = 0; i < steps; i++) {
    p.vy += GRAV * cfg.gravity * h;
    p.vx += g.wind * cfg.wind * h;
    p.x += p.vx * h;
    p.y += p.vy * h;

    if (p.x < -260 || p.x > W + 260 || p.y < -520 || p.y > H + 200) {
      p.dead = true;
      return;
    }

    // worm collision
    if (p.age > 0.1) {
      for (const w of g.worms) {
        if (!w.alive || w === p.owner) continue;
        if (dist(p.x, p.y, w.x, w.y) < R + 3) {
          detonate(g, p, w.x, w.y, w);
          return;
        }
      }
    }

    // building collision
    let hitB = null;
    for (const b of g.buildings) {
      if (buildingHit(b, p.x, p.y)) { hitB = b; break; }
    }
    if (hitB) {
      if (cfg.bounce && p.age > 0.12 && p.bounces < 8) {
        p.bounces++;
        p.x -= p.vx * h;
        p.y -= p.vy * h;
        const n = nearestOnRect(hitB, p.x, p.y);
        const dx = p.x - n.x;
        const dy = p.y - n.y;
        if (Math.abs(dx) > Math.abs(dy)) p.vx = -p.vx * 0.46;
        else p.vy = -Math.abs(p.vy) * 0.46 - 25;
        p.vx *= 0.72;
        p.x -= Math.sign(p.vx || dx || 1) * 1.5;
        p.y -= 2;
        continue;
      }
      detonate(g, p, p.x, p.y);
      return;
    }

    // terrain collision
    if (g.terrain.solidAt(p.x, p.y)) {
      if (cfg.bounce && p.bounces < 8) {
        p.bounces++;
        p.x -= p.vx * h;
        p.y -= p.vy * h;
        p.vy = -p.vy * 0.46;
        p.vx *= 0.7;
        for (let k = 0; k < 10 && g.terrain.solidAt(p.x, p.y); k++) p.y -= 3;
        if (Math.abs(p.vy) < 40) p.vy = -55;
        continue;
      }
      detonate(g, p, p.x, p.y);
      return;
    }

    if (cfg.fuse && p.age >= cfg.fuse) {
      detonate(g, p, p.x, p.y);
      return;
    }
  }
}

export function updateProjectiles(g, dt) {
  if (g.state !== 'flying') return;
  const list = g.projectiles;
  g.projectiles = [];
  for (const p of list) {
    stepProjectile(g, p, dt);
    if (!p.dead) g.projectiles.push(p);
  }
  g.flightTime += dt;
  if (g.projectiles.length === 0) {
    g.beginSettle();
  }
}

export function explode(g, x, y, radius, dmg, sourceTeam, sourceWorm, cfg, directWorm = null) {
  g.terrain.carve(x, y, radius * 0.86);
  g.lastExplosion = { x, y, radius };

  for (const b of g.buildings) {
    const n = nearestOnRect(b, x, y);
    const d = dist(x, y, n.x, n.y);
    if (d < radius + 12) {
      const fall = clamp(1 - d / (radius + 12), 0, 1);
      damageBuilding(g, b, dmg * (0.3 + fall * 0.85));
    }
  }
  g.buildings = g.buildings.filter((b) => b.hp > 0);

  for (const w of g.worms) {
    if (!w.alive) continue;
    const d = dist(x, y, w.x, w.y);
    if (d > radius + R) continue;
    const fall = clamp(1 - d / (radius + R), 0, 1);
    let amount = dmg * (0.3 + fall * 0.75);
    if (w === directWorm) amount *= 1.15;
    damageWorm(g, w, amount, sourceTeam, 'blast', sourceWorm);
    const nx = (w.x - x) / (d || 1);
    const force = 70 + fall * 260;
    w.vx += nx * force;
    w.vy = Math.min(w.vy, -force * 0.72);
    w.grounded = false;
  }

  for (const l of g.llamas) {
    if (!l.alive) continue;
    const d = dist(x, y, l.x, l.y);
    if (d < radius + 22) {
      damageLlama(g, l, 65, sourceTeam);
    }
  }

  burstExplosion(g, x, y, radius);
  g.sound.explosion(radius / 100);
  g.shake = Math.max(g.shake, 13);
  g.flash = Math.min(1, g.flash + 0.18);
  if (sourceTeam === 0) {
    const hit = g.worms.some((w) => w.team === 1 && w.alive && dist(x, y, w.x, w.y) < radius);
    if (hit) g.stats.hits++;
  }
}

export function damageWorm(g, w, amount, sourceTeam, cause = 'blast', sourceWorm = null) {
  if (!w.alive) return;
  amount = Math.max(0, amount);
  w.health = Math.max(0, w.health - amount);
  w.flash = 1;
  w.lastHit = g.time;
  if (sourceTeam === 0 && w.team === 1) g.stats.damage += amount;
  if (sourceTeam === 1 && w.team === 0) g.stats.taken += amount;
  if (cause !== 'fall') {
    addText(g, w.x + rand(-6, 6), w.y - 34, `-${Math.round(amount)}`, w.team === 0 ? '#ff8f83' : '#ffe28a', 19);
    g.sound.hurt();
  }
  if (w.health <= 0) killWorm(g, w);
}

export function killWorm(g, w) {
  if (!w.alive) return;
  w.alive = false;
  w.health = 0;
  g.deadWorms.push({ x: w.x, y: w.y, team: w.team, t: 0, name: w.name });
  burstDeath(g, w);
  g.shake = Math.max(g.shake, 8);
  addText(g, w.x, w.y - 56, w.team === 0 ? 'MAN DOWN!' : 'ELIMINATED!', w.team === 0 ? '#ff9a8f' : '#ffd166', 24);
  g.sound.hurt();
}

export function damageLlama(g, l, amount, sourceTeam) {
  if (!l.alive) return;
  l.hp -= amount;
  l.hit = 0.3;
  if (l.hp > 0) {
    addText(g, l.x, l.y - 30, 'OUCH!', '#ffd166', 14);
    return;
  }
  l.alive = false;
  const team = sourceTeam === 0 || sourceTeam === 1 ? sourceTeam : null;
  if (team !== null) {
    g.teams[team].mats = Math.min(180, g.teams[team].mats + 50);
    addText(g, l.x, l.y - 20, '+50 WOOD', '#ffd166', 22);
  }
  if (sourceTeam === 0) g.stats.llamas++;
  g.sound.llama();
  burstDeath(g, { x: l.x, y: l.y, team: 1 });
}

export function damageBuilding(g, b, amount) {
  b.hp -= amount;
  b.hit = 0.25;
  if (b.hp <= 0) {
    b.hp = 0;
    b.destroyed = true;
    burstBuild(g, b, g.teams[b.team]?.color || '#d9a066');
  }
}
