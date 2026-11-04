import {
  RARITIES, RARITY_ORDER, SLOT_META, SLOT_ORDER, WEAPON_STYLES, AFFIX_POOL,
  IMPLICITS, LEGENDARY_POWERS, LEGENDARY_NAMES, ENEMY_TYPES
} from "./data.js";

let nextItemId = 1;
const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
const rand = (min, max, rng = Math.random) => min + rng() * (max - min);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function rollRarity(luck = 0, source = "normal", rng = Math.random) {
  if (source === "boss") return "legendary";
  let weights;
  if (source === "elite") {
    weights = { common: 0, magic: 32, rare: 53 + luck * 0.2, legendary: 15 + luck * 0.16 };
  } else {
    weights = {
      common: Math.max(18, 44 - luck * 0.22),
      magic: 38,
      rare: 15 + luck * 0.32,
      legendary: 3 + luck * 0.12
    };
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const key of RARITY_ORDER) {
    roll -= weights[key];
    if (roll <= 0) return key;
  }
  return "common";
}

export function chooseSlot(rng = Math.random) {
  const roll = rng();
  if (roll < 0.23) return "weapon";
  const others = ["helm", "chest", "boots", "amulet", "ring"];
  return others[Math.floor(rng() * others.length)];
}

export function itemLevelFor(runTime = 0, source = "normal", rng = Math.random) {
  let level = 1 + Math.floor(runTime / 23) + Math.floor(rand(-1, 2, rng));
  if (source === "elite") level += 1;
  if (source === "boss") level = 15;
  return clamp(level, 1, 15);
}

function makeAffix(level, slot, used, rng) {
  const pool = AFFIX_POOL.filter(a => a.slots.includes(slot) && !used.has(a.id));
  const totalWeight = pool.reduce((sum, a) => sum + a.weight, 0);
  let roll = rng() * totalWeight;
  let affix = pool[0];
  for (const a of pool) {
    roll -= a.weight;
    if (roll <= 0) { affix = a; break; }
  }
  if (!affix) return null;
  used.add(affix.id);
  let value;
  if (affix.flat) value = 1;
  else {
    value = rand(affix.min, affix.max, rng) + level * affix.perLevel;
    value = Math.max(affix.min, value);
    if (affix.decimals === 0) value = Math.round(value);
    else value = Math.round(value * 10) / 10;
  }
  return { ...affix, value };
}

export function createItem({
  slot = "weapon",
  itemLevel = 1,
  rarityKey = "common",
  weaponStyle = null,
  rng = Math.random,
  legendaryPower = null
} = {}) {
  const rarity = RARITIES[rarityKey] || RARITIES.common;
  const style = slot === "weapon" ? (WEAPON_STYLES[weaponStyle] || pick(Object.values(WEAPON_STYLES), rng)) : null;
  const used = new Set();
  const affixes = [];
  let count = rarity.affixes;

  // Small level-based chance for one extra affix on high-end magic and rare items.
  if (rarityKey === "magic" && rng() < 0.22) count += 1;
  if (rarityKey === "rare" && rng() < 0.28) count += 1;

  for (let i = 0; i < count; i++) {
    const affix = makeAffix(itemLevel, slot, used, rng);
    if (affix) affixes.push(affix);
  }

  let implicit = null;
  let weapon = null;
  let baseName = SLOT_META[slot].label;

  if (slot === "weapon") {
    baseName = pick(style.names, rng);
    const base = (6.8 + itemLevel * 3.25) * style.coefficient;
    const min = Math.max(2, Math.round(base * rand(0.82, 0.97, rng)));
    const max = Math.max(min + 2, Math.round(base * rand(1.03, 1.22, rng)));
    weapon = {
      style: style.id,
      min,
      max,
      cooldown: style.cooldown,
      description: style.describe
    };
  } else {
    const imp = IMPLICITS[slot];
    const value = Math.round(rand(imp.min, imp.max, rng) + itemLevel * imp.perLevel);
    implicit = {
      stat: imp.stat,
      value,
      label: imp.label,
      pct: imp.pct,
      display: imp.pct ? `+${value}% ${imp.label}` : `+${value} ${imp.label}`
    };
  }

  let name = baseName;
  if (rarityKey === "magic") {
    const prefix = pick(["Bleak", "Sanguine", "Grave", "Cursed", "Pale", "Dusk", "Grim", "Hollow", "Ashen", "Bloodied", "Mournful", "Raven"], rng);
    name = `${prefix} ${baseName}`;
    if (rng() < 0.3) name += ` ${pick(["of the Wolf", "of Ruin", "of Thorns", "of the Leech", "of Echoes", "of the Drowned", "of Night", "of Hunger"], rng)}`;
  } else if (rarityKey === "rare") {
    name = pick(["Widow's Lament", "Gravehowl", "Ashen Oath", "Bonewright", "Crimson Dirge", "Night's Tithe", "The Quiet Vow", "Sepulchre", "Duskbiter", "Marrow Song", "Pale Communion", "The Last Rite", "Gallows Bloom", "Sorrow's Wake", "Black Benediction", "Thornfall"], rng);
  } else if (rarityKey === "legendary") {
    const names = LEGENDARY_NAMES[slot === "weapon" ? style.id : slot] || ["The Unnamed Relic"];
    name = pick(names, rng);
  }

  const power = Math.round(
    itemLevel * 7.2 +
    rarity.power +
    affixes.reduce((sum, a) => sum + (a.flat ? 24 : Math.min(24, Math.abs(a.value) * 0.35)), 0) +
    rand(0, 8, rng)
  );

  let powerDef = null;
  if (rarityKey === "legendary") {
    powerDef = legendaryPower || pick(LEGENDARY_POWERS, rng);
  }

  const typeLabel = style ? style.label : SLOT_META[slot].label;
  return {
    id: `item-${nextItemId++}`,
    slot,
    name,
    baseName,
    typeLabel,
    rarity: rarityKey,
    rarityLabel: rarity.label,
    color: rarity.color,
    itemLevel,
    power,
    icon: slot === "weapon" ? style.id : SLOT_META[slot].icon,
    implicit,
    weapon,
    affixes,
    legendaryPower: powerDef,
    flavor: pick([
      "The leather still smells of grave soil.",
      "Its former owner did not let go easily.",
      "A prayer is scratched into the lining.",
      "Cold to the touch, even under a red moon.",
      "The metal hums when the dead draw near.",
      "Every notch is a name someone stopped saying.",
      "It was buried once. It did not stay buried.",
      "The Hollowmoor makes relics of us all."
    ], rng),
    salvageValue: Math.round((rarityKey === "legendary" ? 190 : rarityKey === "rare" ? 72 : rarityKey === "magic" ? 28 : 10) * (1 + itemLevel * 0.16))
  };
}

export function createStartingWeapon() {
  return createItem({ slot: "weapon", itemLevel: 1, rarityKey: "common", weaponStyle: "scythe", legendaryPower: null });
}

export const MEND_COST = 30;

export function reforgeCost(item) {
  if (!item) return 0;
  const base = item.rarity === "legendary" ? 120 : item.rarity === "rare" ? 62 : item.rarity === "magic" ? 30 : 14;
  return Math.round(base + item.itemLevel * 6);
}

export function createItemForDrop(runTime, luck, source = "normal") {
  const rarityKey = rollRarity(luck, source);
  const slot = chooseSlot();
  const itemLevel = itemLevelFor(runTime, source);
  return createItem({ slot, itemLevel, rarityKey });
}

export function itemStatMap(item) {
  const map = {};
  if (!item) return map;
  if (item.implicit) map[item.implicit.stat] = (map[item.implicit.stat] || 0) + item.implicit.value;
  for (const affix of item.affixes) {
    map[affix.id] = (map[affix.id] || 0) + affix.value;
  }
  return map;
}

const BOON_EFFECTS = {
  might: s => { s.damagePct += 0.12; },
  haste: s => { s.attackSpeedPct += 0.10; },
  keen: s => { s.critChance += 0.05; },
  brutal: s => { s.critDamage += 0.20; },
  bloodthirst: s => { s.lifesteal += 0.012; },
  multishot: s => { s.projBonus += 1; },
  nova: s => { s.novaDmgPct += 0.22; s.novaCdPct += 0.04; },
  vitality: s => { s.maxHp += 18; },
  aegis: s => { s.armor += 8; },
  regen: s => { s.regen += 0.6; },
  thorns: s => { s.thorns += 6; },
  fleet: s => { s.moveSpeedPct += 0.08; },
  harvest: s => { s.xpGain += 0.15; },
  magnet: s => { s.pickup += 35; },
  fortune: s => { s.luck += 8; },
  shadowstep: s => { s.dashCdPct += 0.08; },
  area: s => { s.areaPct += 0.10; },
  greed: s => { s.goldGain += 0.10; }
};

export function buildStats(equipment = {}, boons = {}) {
  const stats = {
    maxHp: 100,
    damagePct: 0,
    attackSpeedPct: 0,
    critChance: 0.05,
    critDamage: 1.5,
    armor: 0,
    moveSpeedPct: 0,
    pickup: 70,
    luck: 0,
    xpGain: 1,
    lifesteal: 0,
    thorns: 0,
    dashCdPct: 0,
    novaDmgPct: 0,
    novaCdPct: 0,
    goldGain: 1,
    regen: 0,
    areaPct: 0,
    projBonus: 0,
    flags: {}
  };

  for (const item of Object.values(equipment)) {
    if (!item) continue;
    const map = itemStatMap(item);
    for (const [stat, value] of Object.entries(map)) {
      switch (stat) {
        case "damagePct": stats.damagePct += value / 100; break;
        case "attackSpeedPct": stats.attackSpeedPct += value / 100; break;
        case "critChance": stats.critChance += value / 100; break;
        case "critDamage": stats.critDamage += value / 100; break;
        case "maxHp": stats.maxHp += value; break;
        case "armor": stats.armor += value; break;
        case "moveSpeedPct": stats.moveSpeedPct += value / 100; break;
        case "pickup": stats.pickup += value; break;
        case "luck": stats.luck += value; break;
        case "xpGain": stats.xpGain += value / 100; break;
        case "lifesteal": stats.lifesteal += value / 100; break;
        case "thorns": stats.thorns += value; break;
        case "dashCdPct": stats.dashCdPct += value / 100; break;
        case "novaDmgPct": stats.novaDmgPct += value / 100; break;
        case "goldGain": stats.goldGain += value / 100; break;
        case "regen": stats.regen += value; break;
        case "areaPct": stats.areaPct += value / 100; break;
        case "projBonus": stats.projBonus += value; break;
        default: break;
      }
    }
    if (item.legendaryPower) {
      for (const [flag, value] of Object.entries(item.legendaryPower.flags)) {
        if (flag === "soulsplit") stats.flags.soulsplit = (stats.flags.soulsplit || 0) + value;
        else if (flag === "gravebloom") stats.flags.gravebloom = (stats.flags.gravebloom || 0) + value;
        else if (flag === "nightfeast") stats.flags.nightfeast = (stats.flags.nightfeast || 0) + value;
        else if (flag === "reapersdue") stats.flags.reapersdue = (stats.flags.reapersdue || 0) + value;
        else if (flag === "windrunner") stats.flags.windrunner = (stats.flags.windrunner || 0) + value;
        else if (flag === "gilded") stats.goldGain += value;
        else if (flag === "thornreflect") stats.flags.thornreflect = (stats.flags.thornreflect || 0) + value;
        else if (flag === "voiddash") stats.flags.voiddash = true;
        else if (flag === "bloodpact") { stats.damagePct += value; stats.maxHp *= 0.88; stats.flags.bloodpact = true; }
        else if (flag === "ravensgaze") { stats.critChance += value; stats.critDamage += 0.3; }
        else if (flag === "thornmail") stats.armor += value;
        else if (flag === "eternal") stats.regen += value;
        else if (flag === "eternalhp") stats.maxHp *= 1 + value;
        else if (flag === "voidstep") stats.dashCdPct += value;
      }
    }
  }

  for (const [id, count] of Object.entries(boons)) {
    if (!count) continue;
    const effect = BOON_EFFECTS[id];
    if (effect) for (let i = 0; i < count; i++) effect(stats);
  }

  stats.critChance = clamp(stats.critChance, 0, 0.95);
  stats.critDamage = Math.max(1.5, stats.critDamage);
  stats.dashCdPct = clamp(stats.dashCdPct, 0, 0.75);
  stats.novaCdPct = clamp(stats.novaCdPct, 0, 0.5);
  stats.moveSpeedPct = Math.max(-0.3, stats.moveSpeedPct);
  stats.maxHp = Math.max(25, Math.round(stats.maxHp));
  return stats;
}

export function weaponDisplay(item) {
  if (!item?.weapon) return "—";
  return `${item.weapon.min}–${item.weapon.max} Damage`;
}

export function attackRateOf(stats, item) {
  if (!item?.weapon) return 0;
  return 1 / (item.weapon.cooldown / (1 + stats.attackSpeedPct));
}

export function estimateDps(stats, equipment) {
  const weapon = equipment.weapon;
  if (!weapon?.weapon) return 0;
  const avg = (weapon.weapon.min + weapon.weapon.max) / 2;
  const rate = attackRateOf(stats, weapon);
  const crit = 1 + stats.critChance * (stats.critDamage - 1);
  const style = WEAPON_STYLES[weapon.weapon.style] || WEAPON_STYLES.scythe;
  const count = style.count || 1;
  const multi = style.id === "scythe" ? 1.35 : 1;
  return avg * (1 + stats.damagePct) * rate * crit * count * multi;
}

export function armorReduction(armor) {
  return Math.min(0.72, armor / (armor + 115));
}

export function combatIndex(stats, equipment) {
  const dps = estimateDps(stats, equipment);
  const ehp = stats.maxHp / (1 - armorReduction(stats.armor));
  const utility = 1 + stats.moveSpeedPct * 0.4 + stats.luck * 0.003 + stats.lifesteal * 2;
  return dps * 0.82 + Math.sqrt(ehp) * 3.1 + utility * 8;
}

export function comparisonFor(item, equipment, boons) {
  const current = equipment[item.slot] || null;
  if (!current) {
    return { current: null, summaryLabel: "EQUIPPED", summaryPct: 100, summaryGood: true, lines: [] };
  }
  const oldEq = { ...equipment };
  const newEq = { ...equipment, [item.slot]: item };
  const oldStats = buildStats(oldEq, boons);
  const newStats = buildStats(newEq, boons);
  let pct;
  let label;
  if (item.slot === "weapon") {
    const oldDps = estimateDps(oldStats, oldEq);
    const newDps = estimateDps(newStats, newEq);
    pct = oldDps > 0 ? (newDps / oldDps - 1) * 100 : 100;
    label = "DPS";
  } else {
    const oldIndex = combatIndex(oldStats, oldEq);
    const newIndex = combatIndex(newStats, newEq);
    pct = oldIndex > 0 ? (newIndex / oldIndex - 1) * 100 : 100;
    label = "POWER";
  }
  const lines = compareAffixLines(item, current);
  return {
    current,
    summaryLabel: label,
    summaryPct: pct,
    summaryGood: pct >= 0,
    lines
  };
}

function compareAffixLines(item, current) {
  const a = itemStatMap(item);
  const b = itemStatMap(current);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const lines = [];
  for (const stat of keys) {
    const diff = (a[stat] || 0) - (b[stat] || 0);
    if (Math.abs(diff) < 0.0001) continue;
    const meta = AFFIX_POOL.find(p => p.id === stat);
    const label = meta ? meta.label : stat;
    let text;
    if (stat === "critChance" || stat === "lifesteal") text = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
    else if (["damagePct", "attackSpeedPct", "critDamage", "moveSpeedPct", "luck", "xpGain", "dashCdPct", "novaDmgPct", "goldGain", "areaPct"].includes(stat)) {
      text = `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`;
    } else if (stat === "regen") text = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`;
    else text = `${diff > 0 ? "+" : ""}${Math.round(diff)}`;
    lines.push({ stat, label, diff, text, good: diff > 0 });
  }
  if (item.weapon && current.weapon) {
    const itemAvg = (item.weapon.min + item.weapon.max) / 2;
    const curAvg = (current.weapon.min + current.weapon.max) / 2;
    const diff = Math.round(itemAvg - curAvg);
    if (Math.abs(diff) > 0) {
      lines.unshift({ stat: "damage", label: "Base Damage", diff, text: `${diff > 0 ? "+" : ""}${diff}`, good: diff > 0 });
    }
  }
  return lines.slice(0, 5);
}

export function displayDiff(stat, value) {
  switch (stat) {
    case "critChance":
    case "lifesteal": return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "damagePct":
    case "attackSpeedPct":
    case "critDamage":
    case "moveSpeedPct":
    case "luck":
    case "xpGain":
    case "dashCdPct":
    case "novaDmgPct":
    case "goldGain":
    case "areaPct": return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
    case "regen": return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    default: return `${value > 0 ? "+" : ""}${Math.round(value)}`;
  }
}

export function statLabel(stat) {
  const meta = AFFIX_POOL.find(a => a.id === stat);
  const labels = { maxHp: "Health", pickup: "Pickup", projBonus: "Projectile", armor: "Armor" };
  return meta?.label || labels[stat] || stat;
}

export function formatAffix(affix) {
  if (affix.flat) return `+${affix.value} ${affix.label}`;
  if (affix.decimals > 0) return `+${affix.value.toFixed(1)}${affix.suffix}`;
  return `+${Math.round(affix.value)}${affix.suffix}`;
}

export function formatImplicit(item) {
  if (item.weapon) return weaponDisplay(item);
  return item.implicit?.display || "";
}

export function rarityRank(rarity) {
  return RARITY_ORDER.indexOf(rarity);
}

export function bestItem(items) {
  if (!items.length) return null;
  return items.reduce((best, item) => {
    const rank = rarityRank(item.rarity) * 1000 + item.power;
    const bestRank = best ? rarityRank(best.rarity) * 1000 + best.power : -1;
    return rank > bestRank ? item : best;
  }, null);
}

export { ENEMY_TYPES };
