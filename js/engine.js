import {
  G, WORLD, RUN_LENGTH, BOSS_AT, BAG_SIZE, BASE_SPEED, clamp
} from "./state.js";
import { BOONS, ENEMY_TYPES, SLOT_META } from "./data.js";
import {
  createStartingWeapon, createItem, bestItem, rarityRank, reforgeCost, MEND_COST
} from "./loot.js";
import { recalcStats } from "./player-stats.js";
import {
  collectGear, collectPickup, spawnGear
} from "./drops.js";
import {
  updatePlayerAttack, updateEnemies, updateProjectiles, updateFoeShots,
  playerDash, playerNova, spawnMinion
} from "./combat.js";
import {
  showHUD, hideTitle, showTitle, resetTransientUI, showLevelUp, hideLevelUp,
  showAnnouncement, showPause, hidePause, showEnd, showInventory, hideInventory,
  renderInventory, showToast, setMuted, updateHUD
} from "./ui.js";
import { burst, screenShake, screenFlash } from "./fx.js";
import { sound } from "./audio-instance.js";

const WAVE_ANNOUNCEMENTS = {
  2: ["THE GRAVE BLOOMS", "The moor exhales its dead.", "The dead move faster now."],
  3: ["A COLD WIND RISES", "Something old has caught your scent.", "Wraiths drift between the stones."],
  4: ["THE MOOR HUNGERS", "The graves split wide.", "Brutes answer the Hollow King's call."],
  5: ["THE HOLLOW KING", "The crown stirs beneath the hill.", "Survive the last minute, or cut him down."]
};

export function startRun() {
  G.runId++;
  G.mode = "playing";
  G.time = 0;
  G.kills = 0;
  G.gold = 0;
  G.relics = 0;
  G.shake = 0;
  G.flash = 0;
  G.enemies = [];
  G.projectiles = [];
  G.foeShots = [];
  G.pickups = [];
  G.groundLoot = [];
  G.particles = [];
  G.texts = [];
  G.decals = [];
  G.effects = [];
  G.boss = null;
  G.bossSpawned = false;
  G.victoryPending = 0;
  G.invSelection = null;
  G.inventoryReturn = "playing";
  G.levelupDelay = 0;
  G.levelupChoices = [];
  G.pendingDeath = false;
  G.spawnTimer = 0.7;
  G.eliteTimer = 31;
  G.lastWave = 1;
  G.ambientTimer = 0;
  G.input = { x: 0, y: 0 };
  G.boons = {};
  G.bag = [];
  G.equipment = { weapon: createStartingWeapon() };
  G.stats = null;
  G.player = {
    x: WORLD / 2,
    y: WORLD / 2,
    radius: 14,
    hp: 100,
    level: 1,
    xp: 0,
    xpNext: 18,
    pendingLevels: 0,
    facing: 0,
    walkPhase: 0,
    moving: false,
    attackCd: 0,
    attackAnim: 0,
    dashCd: 0,
    dashTime: 0,
    dashDirX: 1,
    dashDirY: 0,
    novaCd: 0,
    invuln: 0,
    windrunnerTime: 0,
    weaponStyle: "scythe",
    afterimageTimer: 0
  };
  recalcStats();
  G.player.hp = G.stats.maxHp;
  G.camera.x = G.player.x;
  G.camera.y = G.player.y;

  resetTransientUI();
  hideTitle();
  showHUD();
  setMuted(G.muted);
  sound.ensure();
  sound.startAmbient();
  sound.wave();
  showAnnouncement("THE FIRST NIGHT", "HUNT BEGINS", "Survive five minutes. The Hollow King rises at 4:00.");

  // Enemies closing in from the dark.
  const starters = ["ghoul", "ghoul", "ghoul", "bat", "bat", "ghoul"];
  starters.forEach((type, i) => {
    const angle = (i / starters.length) * Math.PI * 2 + 0.4;
    spawnEnemy(type, G.player.x + Math.cos(angle) * (270 + Math.random() * 70), G.player.y + Math.sin(angle) * (250 + Math.random() * 80));
  });

  // A first glimmer of loot, just out of reach.
  spawnGear(G.player.x + 118, G.player.y + 58, "elite");
  showToast("A relic glimmers nearby. Walk over it to claim it.");
  updateHUD();
}

export function updateGame(dt) {
  if (G.mode !== "playing") return;
  const p = G.player;
  if (!p) return;

  G.time += dt;
  G.levelupDelay = Math.max(0, G.levelupDelay - dt);
  p.attackAnim = Math.max(0, p.attackAnim - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.novaCd = Math.max(0, p.novaCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.windrunnerTime = Math.max(0, p.windrunnerTime - dt);
  G.shake = Math.max(0, G.shake - dt * 24);
  G.flash = Math.max(0, G.flash - dt * 1.8);

  updateMovement(dt);

  if (G.pendingDeath) {
    endRun(false, "slain");
    return;
  }

  updateSpawning(dt);
  updatePlayerAttack(dt);
  updateEnemies(dt);
  if (G.pendingDeath) {
    endRun(false, "slain");
    return;
  }
  updateProjectiles(dt);
  updateFoeShots(dt);
  updatePickups(dt);
  updateGroundLoot(dt);
  updateEffectLife(dt);
  updateCamera(dt);
  updateAmbient(dt);

  if (G.pendingDeath) {
    endRun(false, "slain");
    return;
  }

  if (p.pendingLevels > 0 && G.levelupDelay <= 0) {
    openLevelUp();
    return;
  }

  if (G.victoryPending > 0) {
    G.victoryPending -= dt;
    if (G.victoryPending <= 0) {
      endRun(true, "boss");
      return;
    }
  } else if (G.time >= RUN_LENGTH) {
    endRun(true, "dawn");
    return;
  }

  updateHUD();
}

function updateMovement(dt) {
  const p = G.player;
  const stats = G.stats;
  let ix = G.input?.x || 0;
  let iy = G.input?.y || 0;
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  p.moving = len > 0.08;

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.afterimageTimer -= dt;
    p.x += p.dashDirX * 820 * dt;
    p.y += p.dashDirY * 820 * dt;
    if (p.afterimageTimer <= 0) {
      p.afterimageTimer = 0.035;
      G.effects.push({
        kind: "afterimage", x: p.x, y: p.y, rot: Math.atan2(p.dashDirY, p.dashDirX),
        age: 0, life: 0.3
      });
    }
    if (G.stats.flags.voiddash) {
      for (const e of G.enemies) {
        if (!e.dead && !e.voidHit && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 28) {
          e.voidHit = true;
          e.hp -= 20 + (G.equipment.weapon?.weapon?.min || 10);
          e.hitFlash = 0.1;
          burst(e.x, e.y, "#8b7bbd", 5, 60, 1.4, 0.3, { glow: true });
          if (e.hp <= 0) { e.dead = true; G.kills++; }
        }
      }
    }
  } else {
    const wind = p.windrunnerTime > 0 ? 1 + (G.stats.flags.windrunner || 0) : 1;
    const speed = BASE_SPEED * (1 + stats.moveSpeedPct) * wind;
    p.x += ix * speed * dt;
    p.y += iy * speed * dt;
    if (p.moving) {
      p.walkPhase += dt * 8.5;
      if (ix || iy) p.facing = Math.atan2(iy, ix);
    }
  }
  p.x = clamp(p.x, 26, WORLD - 26);
  p.y = clamp(p.y, 26, WORLD - 26);

  if (p.hp < stats.maxHp && stats.regen > 0) {
    p.hp = Math.min(stats.maxHp, p.hp + stats.regen * dt);
  }

  const nearest = nearestEnemyVisual(760);
  if (nearest && !p.moving) {
    p.facing = Math.atan2(nearest.y - p.y, nearest.x - p.x);
  }
}

function nearestEnemyVisual(range) {
  let best = null;
  let bestD = range * range;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = (e.x - G.player.x) ** 2 + (e.y - G.player.y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function updateSpawning(dt) {
  if (G.victoryPending > 0) return;
  if (!G.bossSpawned && G.time >= BOSS_AT) {
    spawnBoss();
  }

  const wave = Math.min(5, Math.floor(G.time / 60) + 1);
  if (wave > G.lastWave) {
    G.lastWave = wave;
    const info = WAVE_ANNOUNCEMENTS[wave];
    if (info && wave < 5) {
      showAnnouncement(`WAVE ${roman(wave)}`, info[0], info[1]);
      sound.wave();
    } else if (info && wave === 5) {
      sound.wave();
    }
    // A ring of fresh dead marks the transition.
    const count = 6 + wave * 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      spawnEnemy(pickType(), G.player.x + Math.cos(a) * 460, G.player.y + Math.sin(a) * 460);
    }
    screenShake(2);
  }

  if (G.enemies.length < 175) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      const wavePressure = Math.min(4, 1 + Math.floor(G.time / 78) + (G.time > 180 ? 1 : 0));
      const count = Math.min(5, wavePressure + (Math.random() < 0.24 ? 1 : 0));
      for (let i = 0; i < count; i++) {
        const pos = edgeSpawnPosition();
        spawnEnemy(pickType(), pos.x, pos.y);
      }
      G.spawnTimer = Math.max(0.24, 0.94 - G.time * 0.0022) * (0.82 + Math.random() * 0.4);
    }
  }

  if (G.time > 26) {
    G.eliteTimer -= dt;
    if (G.eliteTimer <= 0) {
      const pos = edgeSpawnPosition(540);
      spawnEnemy(pickType(true), pos.x, pos.y, true);
      G.eliteTimer = Math.max(19, 34 - G.time * 0.035);
      showToast("An elite stalks the moor.");
      sound.tone({ freq: 98, dur: 0.7, type: "triangle", vol: 0.04, slide: 0.7 });
    }
  }
}

function pickType(elite = false) {
  const pool = [["ghoul", 55], ["bat", G.time > 18 ? 33 : 12]];
  if (G.time > 38) pool.push(["skeleton", 23]);
  if (G.time > 84) pool.push(["wraith", 15]);
  if (G.time > 142) pool.push(["brute", 12]);
  if (elite) {
    const elitePool = [["ghoul", 40], ["skeleton", 25]];
    if (G.time > 84) elitePool.push(["wraith", 25]);
    if (G.time > 142) elitePool.push(["brute", 30]);
    return weightedPick(elitePool);
  }
  return weightedPick(pool);
}

function weightedPick(pool) {
  const total = pool.reduce((n, entry) => n + entry[1], 0);
  let roll = Math.random() * total;
  for (const [type, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return pool[0][0];
}

function edgeSpawnPosition(distance = 560) {
  const camX = G.camera.x;
  const camY = G.camera.y;
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const x = clamp(G.player.x + Math.cos(angle) * (distance + Math.random() * 160), 50, WORLD - 50);
    const y = clamp(G.player.y + Math.sin(angle) * (distance + Math.random() * 160), 50, WORLD - 50);
    const outsideX = Math.abs(x - camX) > w / 2 + 30;
    const outsideY = Math.abs(y - camY) > h / 2 + 30;
    if (outsideX || outsideY) return { x, y };
  }
  const angle = Math.random() * Math.PI * 2;
  return {
    x: clamp(G.player.x + Math.cos(angle) * distance, 50, WORLD - 50),
    y: clamp(G.player.y + Math.sin(angle) * distance, 50, WORLD - 50)
  };
}

function spawnEnemy(type, x, y, elite = false) {
  const cfg = ENEMY_TYPES[type];
  const hpScale = 1 + G.time * 0.0065 + Math.max(0, G.time - 120) * 0.0014;
  const dmgScale = 1 + G.time * 0.0025;
  const speedScale = 1 + Math.min(0.24, G.time / 1250);
  const hpMult = elite ? 7.4 : 1;
  const hp = Math.round(cfg.hp * hpScale * hpMult);
  const enemy = {
    type,
    x, y,
    hp, maxHp: hp,
    speed: cfg.speed * speedScale * (elite ? 0.9 : 1),
    damage: Math.round(cfg.damage * dmgScale * (elite ? 1.35 : 1)),
    radius: cfg.radius * (elite ? 1.28 : 1),
    xp: Math.round(cfg.xp * (1 + G.time / 210) * (elite ? 7 : 1)),
    elite,
    ranged: !!cfg.ranged,
    attackCd: 0.4 + Math.random() * 0.4,
    shootCd: 0.8 + Math.random() * 1.2,
    phase: Math.random() * 10,
    hitFlash: 0,
    shootFlash: 0,
    facing: 0,
    dead: false,
    boss: false
  };
  G.enemies.push(enemy);
  return enemy;
}

function spawnBoss() {
  G.bossSpawned = true;
  G.lastWave = 5;
  const angle = Math.random() * Math.PI * 2;
  const x = clamp(G.player.x + Math.cos(angle) * 470, 130, WORLD - 130);
  const y = clamp(G.player.y + Math.sin(angle) * 470, 130, WORLD - 130);
  const cfg = ENEMY_TYPES.king;
  const hp = Math.round(3600 * (1 + G.time * 0.001));
  const boss = {
    type: "king",
    x, y,
    hp, maxHp: hp,
    speed: cfg.speed,
    damage: Math.round(cfg.damage * (1 + G.time * 0.0015)),
    radius: cfg.radius,
    xp: cfg.xp,
    elite: false,
    boss: true,
    ranged: false,
    attackCd: 1,
    patternCd: 2.2,
    summonCd: 5.4,
    enraged: false,
    phase: 0,
    hitFlash: 0,
    facing: 0,
    dead: false
  };
  G.enemies.push(boss);
  G.boss = boss;
  showAnnouncement("WAVE V", "THE HOLLOW KING RISES", "Kill him before dawn — or simply survive.", true);
  sound.boss();
  screenFlash(0.65);
  screenShake(7);
  addBossEffects(x, y);
}

function addBossEffects(x, y) {
  G.effects.push({ kind: "explosion", x, y, radius: 260, age: 0, life: 1.2 });
  G.effects.push({ kind: "ring", x, y, radius: 280, age: 0, life: 1, rgb: "210,58,62", alpha: 0.65, width: 5 });
  burst(x, y, "#b52f3a", 50, 200, 2.4, 1.2, { glow: true });
}

function updatePickups(dt) {
  const p = G.player;
  const stats = G.stats;
  const magnet = stats.pickup;
  for (const pickup of G.pickups) {
    pickup.phase += dt * 2.2;
    const dx = p.x - pickup.x;
    const dy = p.y - pickup.y;
    const d = Math.hypot(dx, dy) || 1;
    if (pickup.kind !== "health" && d < magnet) {
      const speed = 280 + (1 - d / magnet) * 420;
      pickup.x += (dx / d) * speed * dt;
      pickup.y += (dy / d) * speed * dt;
    } else {
      pickup.x += (pickup.vx || 0) * dt;
      pickup.y += (pickup.vy || 0) * dt;
      pickup.vx *= 0.94;
      pickup.vy *= 0.94;
    }
    if (d < 22 || (pickup.kind === "health" && d < 32)) {
      if (pickup.kind === "xp") {
        gainXp(pickup.value);
        burst(pickup.x, pickup.y, "#4fd6bd", 4, 35, 1.3, 0.35, { glow: true });
      } else {
        const result = collectPickup(pickup);
        if (result.gold) {
          // kept subtle; gold drops constantly
        }
        if (result.health) {
          damageTextLocal(p.x, p.y - 28, `+${result.health}`, "#78d49f");
        }
      }
      pickup.collected = true;
    }
  }
  G.pickups = G.pickups.filter(pickup => !pickup.collected);
}

function damageTextLocal(x, y, value, color) {
  G.texts.push({ x, y, value, color, crit: false, life: 0.8, maxLife: 0.8 });
}

function gainXp(amount) {
  const p = G.player;
  p.xp += amount * G.stats.xpGain;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.pendingLevels++;
    p.xpNext = Math.round(12 + p.level * 5.6 + Math.pow(p.level, 1.17));
  }
}

function updateGroundLoot(dt) {
  const p = G.player;
  for (const loot of G.groundLoot) {
    loot.age += dt;
    if (loot.age < 0.35) continue;
    const d = Math.hypot(loot.x - p.x, loot.y - p.y);
    if (d < 43) {
      if (G.bag.length < BAG_SIZE || !G.equipment[loot.item.slot]) {
        if (collectGear(loot)) loot.collected = true;
      }
    }
  }
  G.groundLoot = G.groundLoot.filter(loot => !loot.collected);
}

function updateEffectLife(dt) {
  for (const particle of G.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += (particle.gravity || 0) * dt;
    const drag = Math.pow(particle.drag ?? 0.93, dt * 60);
    particle.vx *= drag;
    particle.vy *= drag;
  }
  G.particles = G.particles.filter(p => p.life > 0);

  for (const text of G.texts) text.life -= dt;
  G.texts = G.texts.filter(text => text.life > 0);

  for (const effect of G.effects) effect.age += dt;
  G.effects = G.effects.filter(effect => effect.age < effect.life);

  for (const shot of G.foeShots) shot.phase += dt;
}

function updateAmbient(dt) {
  G.ambientTimer -= dt;
  if (G.ambientTimer <= 0 && G.particles.length < 260) {
    G.ambientTimer = 0.06 + Math.random() * 0.1;
    const x = G.camera.x + (Math.random() - 0.5) * (window.innerWidth + 240);
    const y = G.camera.y + (Math.random() - 0.5) * (window.innerHeight + 240);
    G.particles.push({
      x, y, vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 12,
      life: 6 + Math.random() * 6, maxLife: 12, size: 0.7 + Math.random() * 1.4,
      color: "#9d8675", kind: "ash", drag: 0.99, gravity: 0, alpha: 0.5
    });
  }
}

function updateCamera(dt) {
  const p = G.player;
  const w = Math.min(window.innerWidth, WORLD);
  const h = Math.min(window.innerHeight, WORLD);
  const halfW = w / 2;
  const halfH = h / 2;
  const targetX = clamp(p.x, halfW, WORLD - halfW);
  const targetY = clamp(p.y, halfH, WORLD - halfH);
  const ease = 1 - Math.exp(-7.5 * dt);
  G.camera.x += (targetX - G.camera.x) * ease;
  G.camera.y += (targetY - G.camera.y) * ease;
}

function roman(n) {
  return ["I", "II", "III", "IV", "V"][clamp(n, 1, 5) - 1];
}

/* ── level up ─────────────────────────────────────────────────────────────── */

function openLevelUp() {
  if (G.mode !== "playing") return;
  const available = BOONS.filter(boon => (G.boons[boon.id] || 0) < boon.max);
  if (!available.length) {
    G.player.pendingLevels = 0;
    G.gold += 150;
    showToast("All boons mastered. +150 gold.");
    return;
  }
  const choices = [];
  const pool = [...available];
  while (choices.length < Math.min(3, pool.length)) {
    const index = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  G.levelupChoices = choices;
  G.mode = "levelup";
  G.input = { x: 0, y: 0 };
  G.player.pendingLevels = Math.max(0, G.player.pendingLevels);
  G.player.levelupDelay = 0;
  showLevelUp(choices, G.player.level);
  sound.levelup();
}

export function chooseBoon(id) {
  if (G.mode !== "levelup") return;
  const boon = BOONS.find(b => b.id === id);
  if (!boon) return;
  if ((G.boons[id] || 0) >= boon.max) return;
  G.boons[id] = (G.boons[id] || 0) + 1;
  recalcStats();
  if (boon.id === "vitality") {
    G.player.hp = Math.min(G.stats.maxHp, G.player.hp + 18);
  }
  G.player.pendingLevels = Math.max(0, G.player.pendingLevels - 1);
  G.levelupDelay = 0.36;
  G.mode = "playing";
  hideLevelUp();
  sound.click();
  showToast(`${boon.name} — rank ${G.boons[id]}.`);
  updateHUD();
}

/* ── inventory actions ────────────────────────────────────────────────────── */

export function equipItem(item) {
  if (!item || item.slot === undefined) return false;
  const index = G.bag.findIndex(i => i.id === item.id);
  if (index < 0) return false;
  const old = G.equipment[item.slot] || null;
  G.equipment[item.slot] = item;
  G.bag.splice(index, 1);
  if (old) G.bag.push(old);
  recalcStats();
  sound.click();
  showToast(`${item.name} equipped.`);
  return true;
}

export function salvageItem(item) {
  const index = G.bag.findIndex(i => i.id === item.id);
  if (index < 0) return false;
  const value = Math.round(item.salvageValue * (0.8 + (G.stats.goldGain - 1) * 0.35));
  G.bag.splice(index, 1);
  G.gold += value;
  sound.coin();
  showToast(`Salvaged ${item.name} for ${value} gold.`);
  return true;
}

export function salvageCommons() {
  const commons = G.bag.filter(item => item.rarity === "common");
  if (!commons.length) return null;
  let total = 0;
  for (const item of commons) {
    total += Math.round(item.salvageValue * (0.8 + (G.stats.goldGain - 1) * 0.35));
    G.bag.splice(G.bag.indexOf(item), 1);
  }
  G.gold += total;
  sound.coin();
  return { count: commons.length, gold: total };
}

export function reforgeItem(item) {
  if (!item || item.slot === undefined) return false;
  const cost = reforgeCost(item);
  if (G.gold < cost) {
    showToast(`You need ${cost} gold to reforge this relic.`);
    sound.error();
    return false;
  }
  const fresh = createItem({
    slot: item.slot,
    itemLevel: item.itemLevel,
    rarityKey: item.rarity,
    weaponStyle: item.weapon?.style || null
  });
  item.affixes = fresh.affixes;
  item.implicit = fresh.implicit;
  item.weapon = fresh.weapon;
  item.power = fresh.power;
  item.legendaryPower = fresh.legendaryPower;
  G.gold -= cost;
  recalcStats();
  sound.pickup(item.rarity);
  showToast(`${item.name} reforged for ${cost} gold.`);
  return true;
}

export function mendWounds() {
  const p = G.player;
  if (!p || !G.stats) return null;
  if (p.hp >= G.stats.maxHp) {
    showToast("You are already whole.");
    return null;
  }
  if (G.gold < MEND_COST) {
    showToast(`You need ${MEND_COST} gold to mend your wounds.`);
    sound.error();
    return null;
  }
  const healed = Math.min(G.stats.maxHp - p.hp, Math.round(G.stats.maxHp * 0.35));
  G.gold -= MEND_COST;
  p.hp += healed;
  sound.heal();
  showToast(`Mended ${healed} health for ${MEND_COST} gold.`);
  return { healed, cost: MEND_COST };
}

export function unequipItem(item) {
  if (!item || item.slot === "weapon") return false;
  if (G.bag.length >= BAG_SIZE) {
    showToast("Your satchel is full.");
    sound.error();
    return false;
  }
  if (G.equipment[item.slot]?.id !== item.id) return false;
  G.equipment[item.slot] = null;
  G.bag.push(item);
  recalcStats();
  sound.click();
  return true;
}

/* ── pause / inventory / run flow ─────────────────────────────────────────── */

export function pauseGame() {
  if (G.mode !== "playing") return;
  G.mode = "paused";
  G.input = { x: 0, y: 0 };
  showPause();
  sound.click();
}

export function resumeGame() {
  if (G.mode !== "paused") return;
  G.mode = "playing";
  hidePause();
  sound.click();
}

export function openInventory() {
  if (G.mode !== "playing" && G.mode !== "paused") return;
  G.inventoryReturn = G.mode;
  G.mode = "inventory";
  G.input = { x: 0, y: 0 };
  hidePause();
  showInventory();
  renderInventory();
  sound.click();
}

export function closeInventory() {
  if (G.mode !== "inventory") return;
  hideInventory();
  if (G.inventoryReturn === "paused") {
    G.mode = "paused";
    showPause();
  } else {
    G.mode = "playing";
  }
  sound.click();
}

export function toggleMute() {
  G.muted = !G.muted;
  sound.setMuted(G.muted);
  setMuted(G.muted);
}

export function abandonRun() {
  endRun(false, "abandon");
}

export function restartRun() {
  startRun();
}

export function returnToTitle() {
  G.mode = "title";
  resetTransientUI();
  showTitle();
  sound.click();
}

function endRun(victory, reason) {
  if (G.mode === "defeat" || G.mode === "victory") return;
  G.mode = victory ? "victory" : "defeat";
  G.input = { x: 0, y: 0 };
  G.pendingDeath = false;
  G.victoryPending = 0;
  hidePause();
  hideInventory();
  hideLevelUp();

  const allItems = [...G.bag, ...Object.values(G.equipment).filter(Boolean)];
  const best = bestItem(allItems);
  if (best && (!G.bestEver || rarityRank(best.rarity) * 1000 + best.power > rarityRank(G.bestEver.rarity) * 1000 + G.bestEver.power)) {
    G.bestEver = best;
  }

  let kicker = "HERE LIES THE GRAVEBOUND";
  let title = "THE NIGHT TAKES YOU";
  let copy = "But the relics remain.";
  if (victory) {
    kicker = reason === "boss" ? "THE HOLLOW KING FALLS" : "THE NIGHT ENDS";
    title = "DAWN BREAKS";
    copy = reason === "boss"
      ? "The crown is broken. Hollowmoor will remember your name."
      : "You outlasted the dark. The dead return to their graves.";
    sound.victory();
  } else {
    if (reason === "abandon") {
      kicker = "THE HUNT ENDS";
      title = "YOU LEAVE THE MOOR";
      copy = "Some nights are better left unfinished.";
    }
    sound.death();
    screenFlash(0.8);
  }

  showEnd({
    kicker, title, copy,
    time: G.time,
    kills: G.kills,
    relics: G.relics,
    gold: G.gold,
    best
  });
}
