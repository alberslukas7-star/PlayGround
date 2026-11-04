import { G, WORLD, TAU, clamp, angleDiff } from "./state.js";
import { WEAPON_STYLES } from "./data.js";
import { sound } from "./audio-instance.js";
import { spawnEnemyRewards, makeCorpseBurst } from "./drops.js";
import {
  burst, damageText, addEffect, screenShake, screenFlash, spawnParticle
} from "./fx.js";
import { showAnnouncement } from "./ui.js";

export function nearestEnemy(range = 9999, x = G.player.x, y = G.player.y) {
  let best = null;
  let bestD = range * range;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function rollCrit() {
  return Math.random() < G.stats.critChance;
}

export function updatePlayerAttack(dt) {
  const p = G.player;
  p.attackCd -= dt;
  if (p.attackCd > 0) return;
  const weapon = G.equipment.weapon;
  if (!weapon?.weapon) return;
  const style = WEAPON_STYLES[weapon.weapon.style];
  const target = nearestEnemy(style.id === "scythe" ? 230 : 900);
  if (!target) return;
  fireWeapon(target, weapon, style);
}

function fireWeapon(target, weapon, style) {
  const p = G.player;
  const stats = G.stats;
  const angle = Math.atan2(target.y - p.y, target.x - p.x);
  p.facing = angle;
  p.attackAnim = 0.22;
  p.attackCd = style.cooldown / (1 + stats.attackSpeedPct);
  const base = (weapon.weapon.min + weapon.weapon.max) / 2;
  const damage = base * (1 + stats.damagePct);

  if (style.id === "scythe") {
    const area = 1 + stats.areaPct + stats.projBonus * 0.09;
    const range = style.range * area;
    const arc = style.arc * (1 + stats.areaPct * 0.12);
    let hit = 0;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d > range + e.radius) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      if (Math.abs(angleDiff(a, angle)) > arc / 2) continue;
      dealDamage(e, damage, { crit: rollCrit(), source: "weapon" });
      hit++;
      if (hit > 16) break;
    }
    addEffect({
      kind: "slash", x: p.x, y: p.y, angle,
      range, arc, life: 0.22
    });
    for (let i = 0; i < 8; i++) {
      const a = angle + (Math.random() - 0.5) * arc;
      spawnParticle(
        p.x + Math.cos(a) * (range * 0.55), p.y + Math.sin(a) * (range * 0.55),
        Math.cos(a) * 110, Math.sin(a) * 110,
        0.25, 1.6, "#e6535d", { glow: true, drag: 0.86 }
      );
    }
    screenShake(1.1);
    sound.shoot("scythe");
    return;
  }

  const count = Math.max(1, (style.count || 1) + stats.projBonus);
  const spread = style.spread || 0.1;
  const targets = G.enemies.filter(e => !e.dead);
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    let aim = target;
    if (style.id === "wand" && targets.length > 1 && i > 0) {
      aim = targets[Math.floor(Math.random() * targets.length)] || target;
    }
    const shotAngle = Math.atan2(aim.y - p.y, aim.x - p.x) + offset;
    const crit = rollCrit();
    const speed = style.speed;
    G.projectiles.push({
      type: style.id,
      x: p.x + Math.cos(shotAngle) * 18,
      y: p.y + Math.sin(shotAngle) * 18,
      vx: Math.cos(shotAngle) * speed,
      vy: Math.sin(shotAngle) * speed,
      r: style.id === "wand" ? 6 : 5,
      damage,
      crit,
      life: style.id === "wand" ? 1.8 : 1.25,
      hitsLeft: (style.id === "crossbow" ? 1 : style.id === "daggers" ? (style.pierce || 0) : 0) + 1,
      hit: new Set(),
      homing: style.homing || 0,
      target: style.id === "wand" ? aim : null,
      color: style.color
    });
  }
  if (stats.flags.soulsplit && Math.random() < stats.flags.soulsplit) {
    const echoAngle = angle + (Math.random() - 0.5) * 0.22;
    G.projectiles.push({
      type: style.id,
      x: p.x, y: p.y,
      vx: Math.cos(echoAngle) * style.speed,
      vy: Math.sin(echoAngle) * style.speed,
      r: 5, damage: damage * 0.65, crit: rollCrit(), life: 1.1, hitsLeft: 1,
      hit: new Set(), homing: style.homing || 0, target, color: style.color, echo: true
    });
  }
  const muzzleX = p.x + Math.cos(angle) * 24;
  const muzzleY = p.y + Math.sin(angle) * 24;
  burst(muzzleX, muzzleY, style.color, 5, 55, 1.6, 0.3, { glow: true });
  screenShake(0.5);
  sound.shoot(style.id);
}

export function updateProjectiles(dt) {
  const p = G.player;
  for (const proj of G.projectiles) {
    proj.life -= dt;
    if (proj.homing) {
      if (!proj.target || proj.target.dead) proj.target = nearestEnemy(500, proj.x, proj.y);
      if (proj.target) {
        const desired = Math.atan2(proj.target.y - proj.y, proj.target.x - proj.x);
        const current = Math.atan2(proj.vy, proj.vx);
        const diff = angleDiff(desired, current);
        const turn = clamp(diff, -proj.homing * dt, proj.homing * dt);
        const speed = Math.hypot(proj.vx, proj.vy);
        proj.vx = Math.cos(current + turn) * speed;
        proj.vy = Math.sin(current + turn) * speed;
      }
    }
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.x < 0 || proj.x > WORLD || proj.y < 0 || proj.y > WORLD) proj.life = -1;
    if (proj.life <= 0) continue;

    for (const e of G.enemies) {
      if (e.dead || proj.hit.has(e)) continue;
      if (Math.hypot(e.x - proj.x, e.y - proj.y) > e.radius + proj.r) continue;
      proj.hit.add(e);
      dealDamage(e, proj.damage, { crit: proj.crit, source: "weapon" });
      burst(proj.x, proj.y, proj.type === "wand" ? "#c4a4ff" : "#ffd7a2", 7, 75, 1.6, 0.35, { glow: true });
      proj.hitsLeft--;
      if (proj.hitsLeft <= 0) {
        proj.life = -1;
        break;
      }
    }
  }
  G.projectiles = G.projectiles.filter(proj => proj.life > 0 && !proj.dead);
}

export function dealDamage(e, amount, opts = {}) {
  if (!e || e.dead) return 0;
  const stats = G.stats;
  let dmg = amount;
  if (opts.crit) dmg *= stats.critDamage;
  if (stats.flags.reapersdue && e.hp / e.maxHp < 0.35) {
    dmg *= 1 + stats.flags.reapersdue;
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.hitFlash = 0.1;
  damageText(e.x, e.y - e.radius * 0.5, dmg, opts.crit ? "#ffd18b" : "#f3e4ce", opts.crit);
  if (opts.crit) {
    burst(e.x, e.y, "#ffbe6d", 12, 120, 2.2, 0.5, { glow: true });
    screenShake(1.6);
  } else {
    burst(e.x, e.y, "#b53b42", 4, 55, 1.3, 0.28, { glow: true });
  }
  if (stats.lifesteal > 0 && opts.allowLifesteal !== false) {
    const heal = dmg * stats.lifesteal;
    if (G.player.hp < stats.maxHp) {
      G.player.hp = Math.min(stats.maxHp, G.player.hp + heal);
    }
  }
  if (opts.silent !== true && (opts.crit || Math.random() < 0.35)) sound.hit(opts.crit);
  if (e.hp <= 0) killEnemy(e, opts.source || "weapon");
  return dmg;
}

function killEnemy(e, source) {
  if (e.dead) return;
  e.dead = true;
  G.kills++;
  const stats = G.stats;
  spawnEnemyRewards(e);
  makeCorpseBurst(e, source);
  sound.enemyDie();
  if (e.elite) screenShake(2.2);
  if (stats.flags.nightfeast) {
    G.player.hp = Math.min(stats.maxHp, G.player.hp + stats.maxHp * stats.flags.nightfeast);
  }
  if (stats.flags.gravebloom && !e.boss) {
    const radius = 78;
    addEffect({ kind: "explosion", x: e.x, y: e.y, radius, life: 0.45 });
    const weapon = G.equipment.weapon;
    const avg = weapon?.weapon ? (weapon.weapon.min + weapon.weapon.max) / 2 : 8;
    const blast = avg * (1 + stats.damagePct) * stats.flags.gravebloom;
    for (const other of G.enemies) {
      if (other.dead || other === e) continue;
      if (Math.hypot(other.x - e.x, other.y - e.y) < radius + other.radius) {
        dealDamage(other, blast, { source: "gravebloom" });
      }
    }
  }
  if (e.boss) {
    G.victoryPending = 2.8;
    G.player.invuln = 99;
    showAnnouncement("THE CROWN FALLS", "THE HOLLOW KING IS SLAIN", "Dawn bleeds through the trees.", true);
    sound.boss();
    screenShake(15);
    screenFlash(0.8);
  }
}

export function playerTakeDamage(raw, source = null, opts = {}) {
  const p = G.player;
  if (!p || p.invuln > 0 || p.dashTime > 0) return false;
  const stats = G.stats;
  const reduced = raw * (1 - Math.min(0.72, stats.armor / (stats.armor + 115)));
  const dmg = Math.max(1, Math.round(reduced));
  p.hp -= dmg;
  p.invuln = 0.55;
  damageText(p.x, p.y - 26, `-${dmg}`, "#ef777b", false);
  screenFlash(0.45);
  screenShake(5.5);
  sound.hurt();
  burst(p.x, p.y - 5, "#b72b38", 10, 85, 2, 0.45, { glow: true });
  if (stats.thorns > 0 && source && !source.dead) {
    dealDamage(source, stats.thorns, { allowLifesteal: false, source: "thorns" });
  }
  if (stats.flags.thornreflect > 0 && source && !source.dead) {
    dealDamage(source, dmg * stats.flags.thornreflect, { allowLifesteal: false, source: "thorns" });
  }
  if (p.hp <= 0) {
    p.hp = 0;
    G.pendingDeath = true;
  }
  return true;
}

export function playerDash() {
  const p = G.player;
  if (!p || G.mode !== "playing") return false;
  if (p.dashCd > 0) return false;
  let dx = G.input?.x || 0;
  let dy = G.input?.y || 0;
  if (Math.hypot(dx, dy) < 0.1) {
    dx = Math.cos(p.facing);
    dy = Math.sin(p.facing);
  }
  const len = Math.hypot(dx, dy) || 1;
  p.dashDirX = dx / len;
  p.dashDirY = dy / len;
  p.dashTime = 0.17;
  p.dashCd = 3.2 * (1 - G.stats.dashCdPct);
  p.invuln = Math.max(p.invuln, 0.38);
  p.facing = Math.atan2(p.dashDirY, p.dashDirX);
  if (G.stats.flags.windrunner) p.windrunnerTime = 2.5;
  if (G.stats.flags.voiddash) p.voidDash = true;
  sound.dash();
  burst(p.x, p.y, "#a94650", 12, 90, 1.8, 0.45, { glow: true });
  addEffect({ kind: "ring", x: p.x, y: p.y, radius: 48, life: 0.4, rgb: "180,75,82", alpha: 0.6, width: 2 });
  return true;
}

export function playerNova() {
  const p = G.player;
  if (!p || G.mode !== "playing") return false;
  if (p.novaCd > 0) return false;
  const stats = G.stats;
  const radius = 182 * (1 + stats.areaPct);
  const weapon = G.equipment.weapon;
  const avg = weapon?.weapon ? (weapon.weapon.min + weapon.weapon.max) / 2 : 12;
  const damage = avg * 4.35 * (1 + stats.damagePct) * (1 + stats.novaDmgPct);
  p.novaCd = 14 * (1 - stats.novaCdPct);
  addEffect({ kind: "nova", x: p.x, y: p.y, radius, life: 0.85 });
  addEffect({ kind: "ring", x: p.x, y: p.y, radius: radius * 1.05, life: 0.62, rgb: "255,116,103", alpha: 0.55, width: 4 });
  addEffect({ kind: "ring", x: p.x, y: p.y, radius: radius * 0.72, life: 0.48, rgb: "255,211,184", alpha: 0.35, width: 2 });
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < radius + e.radius) {
      dealDamage(e, damage, { crit: rollCrit(), source: "nova" });
    }
  }
  burst(p.x, p.y, "#e3454c", 45, 260, 3.2, 0.85, { glow: true, drag: 0.9 });
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU;
    const r = 25 + Math.random() * radius;
    spawnParticle(
      p.x + Math.cos(a) * r, p.y + Math.sin(a) * r,
      Math.cos(a) * 120, Math.sin(a) * 120,
      0.5, 2.2, "#ff8a78", { glow: true, drag: 0.88 }
    );
  }
  screenShake(9);
  screenFlash(0.4);
  sound.nova();
  return true;
}

export function updateEnemies(dt) {
  const p = G.player;
  const stats = G.stats;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.attackCd = Math.max(0, e.attackCd - dt);
    e.shootFlash = Math.max(0, (e.shootFlash || 0) - dt);
    e.phase += dt * (e.type === "bat" ? 4 : 1);
    e.facing = Math.atan2(p.y - e.y, p.x - e.x);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    if (e.boss) {
      updateBoss(e, dt, d, dx, dy);
      continue;
    }

    if (e.ranged) {
      const desired = e.type === "skeleton" ? 285 : 235;
      if (d > desired + 25) {
        e.x += (dx / d) * e.speed * dt;
        e.y += (dy / d) * e.speed * dt;
      } else if (d < desired - 75) {
        e.x -= (dx / d) * e.speed * 0.75 * dt;
        e.y -= (dy / d) * e.speed * 0.75 * dt;
      } else {
        e.x += Math.cos(e.phase * 0.5 + e.phase) * 12 * dt;
        e.y += Math.sin(e.phase * 0.5) * 12 * dt;
      }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 500) {
        e.shootCd = e.type === "skeleton" ? 2.25 : 2.7;
        e.shootFlash = 0.18;
        shootAtPlayer(e, e.type === "skeleton" ? "bone" : "soul", 250);
      }
    } else {
      const speed = e.speed * (e.type === "bat" ? 1 + Math.sin(e.phase * 2.2) * 0.12 : 1);
      e.x += (dx / d) * speed * dt;
      e.y += (dy / d) * speed * dt;
      if (e.type === "bat") {
        e.x += Math.cos(e.phase * 2.6) * 28 * dt;
        e.y += Math.sin(e.phase * 2.1) * 28 * dt;
      }
      if (d < e.radius + p.radius + 3 && e.attackCd <= 0) {
        e.attackCd = 0.95;
        playerTakeDamage(e.damage, e);
        if (G.pendingDeath) return;
      }
    }
    e.x = clamp(e.x, 24, WORLD - 24);
    e.y = clamp(e.y, 24, WORLD - 24);
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}

function updateBoss(e, dt, d, dx, dy) {
  const p = G.player;
  e.facing = Math.atan2(dy, dx);
  if (d > 105) {
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;
  } else if (d < 65) {
    e.x -= (dx / d) * e.speed * 0.5 * dt;
    e.y -= (dy / d) * e.speed * 0.5 * dt;
  }
  e.patternCd -= dt;
  e.summonCd -= dt;
  if (e.patternCd <= 0) {
    e.patternCd = e.enraged ? 2.9 : 3.8;
    const count = e.enraged ? 18 : 12;
    const offset = Math.random() * TAU;
    for (let i = 0; i < count; i++) {
      const angle = offset + (i / count) * TAU;
      shootProjectile(e.x, e.y, angle, 170, 12, "soul", 7);
    }
    addEffect({ kind: "ring", x: e.x, y: e.y, radius: 120, life: 0.7, rgb: "206,61,64", alpha: 0.5, width: 3 });
    sound.tone({ freq: 94, dur: 0.5, type: "sine", vol: 0.06, slide: 0.7 });
    screenShake(3);
  }
  if (e.summonCd <= 0) {
    e.summonCd = e.enraged ? 6.5 : 8.5;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * TAU + Math.random();
      spawnMinion(e.x + Math.cos(angle) * 60, e.y + Math.sin(angle) * 60, e.enraged ? "wraith" : "bat");
    }
    addEffect({ kind: "explosion", x: e.x, y: e.y, radius: 90, life: 0.5 });
  }
  if (d < e.radius + p.radius + 6 && e.attackCd <= 0) {
    e.attackCd = 1.1;
    playerTakeDamage(e.damage, e);
  }
}

function shootAtPlayer(e, color, speed) {
  const angle = Math.atan2(G.player.y - e.y, G.player.x - e.x);
  shootProjectile(e.x + Math.cos(angle) * 15, e.y + Math.sin(angle) * 15, angle, speed, color === "bone" ? 8 : 11, color, color === "bone" ? 4 : 6);
  sound.tone({ freq: color === "bone" ? 380 : 240, dur: 0.1, type: "triangle", vol: 0.018, slide: 0.7 });
}

export function shootProjectile(x, y, angle, speed, damage, color = "soul", radius = 5) {
  G.foeShots.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, color, r: radius,
    life: 4.2,
    phase: Math.random() * 7
  });
}

export function updateFoeShots(dt) {
  const p = G.player;
  for (const shot of G.foeShots) {
    shot.life -= dt;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.life <= 0 || shot.x < 0 || shot.x > WORLD || shot.y < 0 || shot.y > WORLD) {
      shot.life = -1;
      continue;
    }
    if (Math.hypot(shot.x - p.x, shot.y - p.y) < p.radius + shot.r + 2) {
      if (playerTakeDamage(shot.damage, null)) {
        shot.life = -1;
        burst(shot.x, shot.y, shot.color === "bone" ? "#e4d4af" : "#e1747b", 7, 70, 1.5, 0.3, { glow: true });
      }
    }
  }
  G.foeShots = G.foeShots.filter(shot => shot.life > 0);
}

export function spawnMinion(x, y, type) {
  const base = type === "wraith" ? 74 : 14;
  G.enemies.push({
    type,
    x, y,
    hp: base * (1 + G.time * 0.004),
    maxHp: base * (1 + G.time * 0.004),
    speed: type === "wraith" ? 42 : 102,
    damage: type === "wraith" ? 12 : 5,
    radius: type === "wraith" ? 15 : 9,
    xp: type === "wraith" ? 8 : 2,
    attackCd: 0.5,
    shootCd: 1.3,
    phase: Math.random() * 10,
    hitFlash: 0,
    shootFlash: 0,
    ranged: type === "wraith",
    facing: 0
  });
}
