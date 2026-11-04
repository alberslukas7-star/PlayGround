import { G, BAG_SIZE, clamp } from "./state.js";
import { createItemForDrop, comparisonFor } from "./loot.js";
import { recalcStats } from "./player-stats.js";
import { sound } from "./audio-instance.js";
import { lootToast, showToast } from "./ui.js";
import { burst, addEffect, addDecal, spawnParticle, screenShake } from "./fx.js";

export function spawnGear(x, y, source = "normal") {
  const item = createItemForDrop(G.time, G.stats?.luck || 0, source);
  G.groundLoot.push({
    x: x + (Math.random() - 0.5) * 22,
    y: y + (Math.random() - 0.5) * 14,
    item,
    phase: Math.random() * Math.PI * 2,
    age: 0
  });
  if (item.rarity === "legendary" || item.rarity === "rare") {
    addEffect({ kind: "pillar", x, y, height: item.rarity === "legendary" ? 150 : 90, life: 1.1 });
    burst(x, y - 4, item.color, 10, 55, 1.8, 0.9, { glow: true });
  }
  return item;
}

export function spawnEnemyRewards(e) {
  const luck = G.stats?.luck || 0;
  const xpValue = Math.max(1, Math.round(e.xp));
  G.pickups.push({
    kind: "xp", x: e.x + (Math.random() - 0.5) * 12, y: e.y + (Math.random() - 0.5) * 10,
    value: xpValue, phase: Math.random() * 7, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30
  });

  if (Math.random() < 0.36) {
    G.pickups.push({
      kind: "gold", x: e.x + (Math.random() - 0.5) * 18, y: e.y + (Math.random() - 0.5) * 14,
      value: Math.max(1, Math.round((1 + Math.random() * 4) * (1 + G.time / 140) * (e.elite ? 4 : 1))),
      phase: Math.random() * 7, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30
    });
  }

  if (Math.random() < 0.035) {
    G.pickups.push({
      kind: "health", x: e.x + 8, y: e.y - 4,
      value: 18, phase: Math.random() * 7, vx: 0, vy: 0
    });
  }

  if (e.boss) {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.3;
      spawnGear(e.x + Math.cos(angle) * 46, e.y + Math.sin(angle) * 30, "boss");
    }
    return;
  }

  const chance = e.elite ? 1 : 0.055 + clamp(luck, 0, 120) * 0.0011;
  if (Math.random() < chance) {
    spawnGear(e.x, e.y, e.elite ? "elite" : "normal");
  }
  if (e.elite && Math.random() < 0.38) {
    spawnGear(e.x + 16, e.y + 8, "elite");
  }
}

export function collectGear(loot) {
  const item = loot.item;
  if (!item) return false;
  if (G.bag.length >= BAG_SIZE && G.equipment[item.slot]) {
    showToast("Your satchel is full. Salvage a relic first.");
    sound.error();
    return false;
  }
  const comparison = comparisonFor(item, G.equipment, G.boons);
  let autoEquipped = false;
  if (!G.equipment[item.slot]) {
    G.equipment[item.slot] = item;
    recalcStats();
    autoEquipped = true;
  } else {
    G.bag.push(item);
  }
  G.relics++;
  lootToast(item, comparison);
  sound.pickup(item.rarity);
  burst(loot.x, loot.y, item.color, item.rarity === "legendary" ? 26 : 12, item.rarity === "legendary" ? 120 : 65, 2.2, 0.8, { glow: true });
  if (item.rarity === "legendary") {
    screenShake(3.5);
    addEffect({ kind: "ring", x: loot.x, y: loot.y, radius: 110, life: 0.9, rgb: "255,139,66", alpha: 0.65, width: 3 });
  }
  if (autoEquipped) {
    showToast(`${item.name} equipped.`);
  }
  return true;
}

export function collectPickup(pickup) {
  if (pickup.kind === "xp") return { xp: pickup.value };
  if (pickup.kind === "gold") {
    const amount = Math.max(1, Math.round(pickup.value * (G.stats?.goldGain || 1)));
    G.gold += amount;
    sound.coin();
    burst(pickup.x, pickup.y, "#e1b965", 5, 35, 1.3, 0.35, { glow: true });
    return { gold: amount };
  }
  if (pickup.kind === "health") {
    const p = G.player;
    if (!p || p.hp >= G.stats.maxHp) return { health: 0 };
    const amount = Math.min(G.stats.maxHp - p.hp, pickup.value);
    p.hp += amount;
    sound.heal();
    burst(pickup.x, pickup.y, "#d74758", 8, 45, 1.5, 0.45, { glow: true });
    return { health: amount };
  }
  return {};
}

export function makeCorpseBurst(e, damage) {
  addDecal(e.x, e.y, e.boss ? 2.2 : e.elite ? 1.5 : 1, e.type === "wraith" ? "39,56,75" : "74,16,23", e.type === "wraith" ? 0.12 : 0.22);
  burst(e.x, e.y, e.type === "wraith" ? "#72b9c3" : "#8b2029", e.boss ? 55 : e.elite ? 24 : 10, e.boss ? 230 : 95, e.boss ? 4 : 2, 0.65, { glow: true, gravity: 40 });
  for (let i = 0; i < (e.boss ? 9 : 3); i++) {
    spawnParticle(e.x + (Math.random() - 0.5) * 20, e.y, (Math.random() - 0.5) * 40, -30 - Math.random() * 50, 0.9, 2 + Math.random() * 2, "#6c2440", { kind: "smoke", drag: 0.95 });
  }
  if (e.boss) {
    addEffect({ kind: "explosion", x: e.x, y: e.y, radius: 260, life: 1.5 });
    addEffect({ kind: "ring", x: e.x, y: e.y, radius: 300, life: 1.4, rgb: "255,91,78", alpha: 0.8, width: 5 });
    screenShake(14);
  }
}
