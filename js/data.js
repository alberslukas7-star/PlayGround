export const RARITIES = {
  common:    { key: "common",    label: "Common",    color: "#aaa7a1", weight: 44, affixes: 0, power: 0 },
  magic:     { key: "magic",     label: "Magic",     color: "#6f9dff", weight: 38, affixes: 2, power: 16 },
  rare:      { key: "rare",      label: "Rare",      color: "#e8c260", weight: 15, affixes: 4, power: 42 },
  legendary: { key: "legendary", label: "Legendary", color: "#ff8b42", weight: 3,  affixes: 5, power: 82 }
};
export const RARITY_ORDER = ["common", "magic", "rare", "legendary"];

export const SLOT_META = {
  weapon: { label: "Weapon", icon: "scythe" },
  helm:   { label: "Helm", icon: "helm" },
  chest:  { label: "Armor", icon: "chest" },
  boots:  { label: "Boots", icon: "boots" },
  amulet: { label: "Amulet", icon: "amulet" },
  ring:   { label: "Ring", icon: "ring" }
};
export const SLOT_ORDER = ["weapon", "helm", "chest", "boots", "amulet", "ring"];

export const WEAPON_STYLES = {
  scythe: {
    id: "scythe", label: "Scythe", cooldown: 1.18, coefficient: 1.62, range: 168, arc: 2.05,
    color: "#ff5964", describe: "Sweeping melee arcs that cleave every foe in reach.",
    names: ["Grave Scythe", "Reaper's Edge", "Mourning Blade", "Bone Reaper"]
  },
  crossbow: {
    id: "crossbow", label: "Crossbow", cooldown: 0.92, coefficient: 1.13, range: 760, speed: 680,
    color: "#d8b980", describe: "Piercing bolts that punch through the horde.",
    names: ["Bone Crossbow", "Crow's Bane", "Ossuary Bow", "Widow's Needle"]
  },
  wand: {
    id: "wand", label: "Wand", cooldown: 0.76, coefficient: 0.8, range: 610, speed: 390, homing: 3.1,
    color: "#b48cff", describe: "Homing soulfire that hunts the nearest dead.",
    names: ["Soul Wand", "Widow's Focus", "Grave Lantern", "Whisper Rod"]
  },
  daggers: {
    id: "daggers", label: "Daggers", cooldown: 0.58, coefficient: 0.46, range: 530, speed: 650,
    count: 2, spread: 0.14, pierce: 1,
    color: "#7ee0c4", describe: "A blur of thrown blades. Fast, vicious, precise.",
    names: ["Carrion Fangs", "Twin Lament", "Gallows Pair", "Sister Knives"]
  }
};

const MAGIC_PREFIX = ["Bleak", "Sanguine", "Grave", "Cursed", "Pale", "Dusk", "Grim", "Hollow", "Ashen", "Bloodied", "Mournful", "Raven"];
const MAGIC_SUFFIX = ["of the Wolf", "of Ruin", "of Thorns", "of the Leech", "of Echoes", "of the Drowned", "of Night", "of Hunger", "of the Pyre", "of Whispering"];
const RARE_NAMES = ["Widow's Lament", "Gravehowl", "Ashen Oath", "Bonewright", "Crimson Dirge", "Night's Tithe", "The Quiet Vow", "Sepulchre", "Duskbiter", "Marrow Song", "Pale Communion", "The Last Rite", "Gallows Bloom", "Sorrow's Wake", "Black Benediction", "Thornfall"];
const FLAVOR = [
  "The leather still smells of grave soil.",
  "Its former owner did not let go easily.",
  "A prayer is scratched into the lining.",
  "Cold to the touch, even under a red moon.",
  "The metal hums when the dead draw near.",
  "Every notch is a name someone stopped saying.",
  "It was buried once. It did not stay buried.",
  "The Hollowmoor makes relics of us all."
];

export const LEGENDARY_POWERS = [
  {
    id: "soulsplit", name: "Soulsplit",
    text: "Attacks have a 24% chance to release an echoing strike.",
    flags: { soulsplit: 0.24 }
  },
  {
    id: "gravebloom", name: "Gravebloom",
    text: "Slain enemies erupt in a burst of grave-shards for 45% weapon damage.",
    flags: { gravebloom: 0.45 }
  },
  {
    id: "nightfeast", name: "Nightfeast",
    text: "Each kill restores 1.5% of your maximum health.",
    flags: { nightfeast: 0.015 }
  },
  {
    id: "reapersdue", name: "Reaper's Due",
    text: "Deal 35% more damage to enemies below 35% health.",
    flags: { reapersdue: 0.35 }
  },
  {
    id: "windrunner", name: "Windrunner",
    text: "Dashing leaves a tailwind: +28% movement speed for 2.5 seconds.",
    flags: { windrunner: 0.28 }
  },
  {
    id: "bloodpact", name: "Blood Pact",
    text: "Gain 20% damage. Lose 12% maximum health.",
    flags: { bloodpact: 0.2 }
  },
  {
    id: "gilded", name: "Gilded Touch",
    text: "Gold drops are 40% more plentiful.",
    flags: { gilded: 0.4 }
  },
  {
    id: "ravensgaze", name: "Raven's Gaze",
    text: "Gain 9% critical strike chance. Critical hits strike with +30% critical damage.",
    flags: { ravensgaze: 0.09, ravencrit: 0.3 }
  },
  {
    id: "thornmail", name: "Thornmail",
    text: "Gain 18 armor. Attackers take 22% of their damage in return.",
    flags: { thornmail: 18, thornreflect: 0.22 }
  },
  {
    id: "eternal", name: "Eternal Vigil",
    text: "Regenerate 1.6 health per second and gain 12% maximum health.",
    flags: { eternal: 1.6, eternalhp: 0.12 }
  },
  {
    id: "voidstep", name: "Voidstep",
    text: "Dash cooldown is reduced by 30%, and the dash briefly tears through enemies.",
    flags: { voidstep: 0.3, voiddash: true }
  }
];

export const LEGENDARY_NAMES = {
  scythe: ["Mourn, the Last Rite", "The Reaper's Answer", "Harvest of Ash", "Sorrow's Crescent"],
  crossbow: ["Ossuary, Bone of Kings", "The Widow's Verdict", "Crowfeast", "Griefstring"],
  wand: ["Heart of the Gloam", "The Whispering Dark", "Sable Communion", "Lantern of Lost Names"],
  daggers: ["Sister Silence", "The Twin Vows", "Carrion Psalm", "Two Graves"],
  helm: ["Crown of the Hollow King", "The Pale Diadem", "Widow's Veil", "Visage of the Drowned"],
  chest: ["Oathbreaker Cuirass", "The Grave's Embrace", "Mantle of Black Prayer", "Sanguine Shroud"],
  boots: ["Wraithstep", "Tread of the Damned", "The Long Walk", "Gravewind Greaves"],
  amulet: ["Heart of the Gloam", "The Last Reliquary", "Tear of the Moor", "Night's Betrothal"],
  ring: ["The Crimson Loop", "Oath of Embers", "Widow's Band", "The Hollow Signet"]
};

export const AFFIX_POOL = [
  { id: "damagePct", label: "Damage", suffix: "% Damage", min: 4, max: 9, perLevel: 0.62, pct: true, decimals: 0, slots: ["weapon", "ring", "amulet"], weight: 9 },
  { id: "attackSpeedPct", label: "Attack Speed", suffix: "% Attack Speed", min: 4, max: 9, perLevel: 0.48, pct: true, decimals: 0, slots: ["weapon", "ring", "helm"], weight: 8 },
  { id: "critChance", label: "Critical Chance", suffix: "% Critical Chance", min: 2, max: 4, perLevel: 0.22, pct: true, decimals: 1, slots: ["weapon", "ring", "amulet", "helm"], weight: 7 },
  { id: "critDamage", label: "Critical Damage", suffix: "% Critical Damage", min: 8, max: 17, perLevel: 0.9, pct: true, decimals: 0, slots: ["weapon", "ring", "amulet"], weight: 7 },
  { id: "maxHp", label: "Maximum Health", suffix: " Maximum Health", min: 8, max: 18, perLevel: 2.2, pct: false, decimals: 0, slots: ["helm", "chest", "boots", "amulet"], weight: 8 },
  { id: "armor", label: "Armor", suffix: " Armor", min: 5, max: 11, perLevel: 1.35, pct: false, decimals: 0, slots: ["helm", "chest", "boots", "ring"], weight: 8 },
  { id: "moveSpeedPct", label: "Movement Speed", suffix: "% Movement Speed", min: 3, max: 6, perLevel: 0.2, pct: true, decimals: 0, slots: ["boots", "chest", "ring"], weight: 7 },
  { id: "pickup", label: "Pickup Radius", suffix: " Pickup Radius", min: 7, max: 15, perLevel: 0.6, pct: false, decimals: 0, slots: ["helm", "boots", "amulet", "ring"], weight: 6 },
  { id: "luck", label: "Luck", suffix: "% Luck", min: 3, max: 7, perLevel: 0.32, pct: true, decimals: 0, slots: ["helm", "amulet", "ring", "boots"], weight: 5 },
  { id: "xpGain", label: "Experience", suffix: "% Experience", min: 4, max: 8, perLevel: 0.35, pct: true, decimals: 0, slots: ["helm", "amulet", "ring"], weight: 5 },
  { id: "lifesteal", label: "Life Steal", suffix: "% Life Steal", min: 0.8, max: 1.6, perLevel: 0.08, pct: true, decimals: 1, slots: ["weapon", "ring", "amulet"], weight: 4 },
  { id: "thorns", label: "Thorns", suffix: " Thorns", min: 3, max: 8, perLevel: 0.7, pct: false, decimals: 0, slots: ["chest", "helm", "ring"], weight: 4 },
  { id: "dashCdPct", label: "Dash Cooldown", suffix: "% Dash Cooldown", min: 4, max: 8, perLevel: 0.3, pct: true, decimals: 0, slots: ["boots", "ring"], weight: 4 },
  { id: "novaDmgPct", label: "Blood Nova", suffix: "% Blood Nova Damage", min: 8, max: 16, perLevel: 0.7, pct: true, decimals: 0, slots: ["amulet", "ring", "weapon"], weight: 4 },
  { id: "goldGain", label: "Gold Find", suffix: "% Gold Find", min: 5, max: 12, perLevel: 0.55, pct: true, decimals: 0, slots: ["helm", "amulet", "ring"], weight: 3 },
  { id: "regen", label: "Regeneration", suffix: " Health per Second", min: 0.4, max: 0.9, perLevel: 0.11, pct: false, decimals: 1, slots: ["chest", "amulet", "ring"], weight: 3 },
  { id: "areaPct", label: "Area", suffix: "% Area", min: 4, max: 8, perLevel: 0.3, pct: true, decimals: 0, slots: ["weapon", "amulet"], weight: 3 },
  { id: "projBonus", label: "Projectile", suffix: " Projectile", min: 1, max: 1, perLevel: 0, pct: false, decimals: 0, slots: ["weapon", "amulet"], weight: 1.2, flat: true }
];

export const IMPLICITS = {
  helm: { stat: "armor", min: 4, max: 8, perLevel: 1.1, label: "Armor", pct: false },
  chest: { stat: "armor", min: 11, max: 18, perLevel: 2.1, label: "Armor", pct: false },
  boots: { stat: "armor", min: 3, max: 6, perLevel: 0.7, label: "Armor", pct: false },
  amulet: { stat: "critDamage", min: 5, max: 10, perLevel: 0.5, label: "Critical Damage", pct: true },
  ring: { stat: "damagePct", min: 2, max: 5, perLevel: 0.3, label: "Damage", pct: true }
};

export const BOONS = [
  { id: "might", name: "Wrath Unbound", type: "offense", icon: "sword", desc: "Your blows strike with 12% more force.", max: 8, tags: ["Damage"] },
  { id: "haste", name: "Frenzied Strikes", type: "offense", icon: "haste", desc: "Attack 10% faster. The dead will not keep pace.", max: 8, tags: ["Attack Speed"] },
  { id: "keen", name: "Keen Edge", type: "offense", icon: "eye", desc: "Gain 5% critical strike chance.", max: 8, tags: ["Critical"] },
  { id: "brutal", name: "Brutal Lesson", type: "offense", icon: "skull", desc: "Critical strikes deal 20% more damage.", max: 6, tags: ["Critical"] },
  { id: "bloodthirst", name: "Bloodthirst", type: "offense", icon: "drop", desc: "Gain 1.2% life steal from all damage dealt.", max: 6, tags: ["Sustain"] },
  { id: "multishot", name: "Split the Dark", type: "offense", icon: "arrows", desc: "Gain 1 additional projectile. Scythes instead gain 10% area.", max: 3, tags: ["Projectiles"] },
  { id: "nova", name: "Crimson Rite", type: "offense", icon: "nova", desc: "Blood Nova deals 22% more damage and costs less cooldown.", max: 6, tags: ["Blood Nova"] },
  { id: "vitality", name: "Grave Vitality", type: "defense", icon: "heart", desc: "Gain 18 maximum health and heal for the same amount.", max: 8, tags: ["Health"] },
  { id: "aegis", name: "Ossuary Plate", type: "defense", icon: "shield", desc: "Gain 8 armor, reducing all incoming damage.", max: 8, tags: ["Armor"] },
  { id: "regen", name: "Slow Mending", type: "defense", icon: "leaf", desc: "Regenerate 0.6 health per second.", max: 6, tags: ["Regen"] },
  { id: "thorns", name: "Retribution", type: "defense", icon: "thorn", desc: "Attackers take 6 additional damage.", max: 5, tags: ["Thorns"] },
  { id: "fleet", name: "Fleet Footed", type: "utility", icon: "boot", desc: "Move 8% faster through the horde.", max: 6, tags: ["Movement"] },
  { id: "harvest", name: "Soul Harvest", type: "utility", icon: "soul", desc: "Gain 15% more experience from fallen souls.", max: 6, tags: ["Experience"] },
  { id: "magnet", name: "Grave Magnet", type: "utility", icon: "magnet", desc: "Increase pickup radius by 35.", max: 5, tags: ["Pickup"] },
  { id: "fortune", name: "Dark Fortune", type: "utility", icon: "coin", desc: "Gain 8% luck. Better relics will fall.", max: 6, tags: ["Luck"] },
  { id: "shadowstep", name: "Shadowstep", type: "utility", icon: "wing", desc: "Dash cooldown reduced by 8%.", max: 6, tags: ["Dash"] },
  { id: "area", name: "Wide Wound", type: "offense", icon: "circle", desc: "Increase the area of all attacks by 10%.", max: 6, tags: ["Area"] },
  { id: "greed", name: "Grave Robber", type: "utility", icon: "coin", desc: "Gain 10% more gold. Salvage is worth more.", max: 5, tags: ["Gold"] }
];

export const BOON_LOOKUP = Object.fromEntries(BOONS.map(b => [b.id, b]));

export const ENEMY_TYPES = {
  ghoul: { name: "Ghoul", hp: 22, speed: 57, damage: 8, xp: 3, radius: 13, color: "#8b665c", accent: "#e24f52" },
  bat: { name: "Blood Bat", hp: 10, speed: 102, damage: 5, xp: 2, radius: 9, color: "#6d4b5f", accent: "#d14a66" },
  skeleton: { name: "Bone Archer", hp: 28, speed: 43, damage: 7, xp: 4, radius: 12, color: "#b6aa8c", accent: "#f1c36d", ranged: true },
  wraith: { name: "Wraith", hp: 62, speed: 39, damage: 12, xp: 8, radius: 15, color: "#6e7aa5", accent: "#82e9dc", ranged: true },
  brute: { name: "Grave Brute", hp: 120, speed: 37, damage: 18, xp: 15, radius: 24, color: "#785047", accent: "#ff735f" },
  king: { name: "The Hollow King", hp: 3200, speed: 35, damage: 23, xp: 200, radius: 38, color: "#8c6870", accent: "#ff4f55" }
};
