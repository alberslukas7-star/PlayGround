import { G, BAG_SIZE, clamp, formatTime, formatDawn, roman, RUN_LENGTH, BOSS_AT } from "./state.js";
import { BOONS, RARITIES, SLOT_META, SLOT_ORDER, WEAPON_STYLES } from "./data.js";
import {
  comparisonFor, estimateDps, attackRateOf, armorReduction, formatAffix, formatImplicit,
  itemStatMap, reforgeCost, MEND_COST
} from "./loot.js";
import { itemIcon, boonIcon } from "./icons.js";

const $ = (id) => document.getElementById(id);

const ui = {
  title: $("title-screen"),
  hud: $("hud"),
  levelup: $("levelup-screen"),
  inventory: $("inventory-screen"),
  pause: $("pause-screen"),
  how: $("how-screen"),
  end: $("end-screen"),
  announcement: $("announcement"),
  announceKicker: $("announce-kicker"),
  announceTitle: $("announce-title"),
  announceSub: $("announce-sub"),
  hpFill: $("hp-fill"),
  hpText: $("hp-text"),
  xpFill: $("xp-fill"),
  xpText: $("xp-text"),
  playerLevel: $("player-level"),
  runTimer: $("run-timer"),
  waveLabel: $("wave-label"),
  dawnLabel: $("dawn-label"),
  killCount: $("kill-count"),
  goldCount: $("gold-count"),
  relicCount: $("relic-count"),
  bagCount: $("bag-count"),
  objectiveTitle: $("objective-title"),
  objectiveSub: $("objective-sub"),
  objectiveFill: $("objective-fill"),
  bossBar: $("boss-bar"),
  bossFill: $("boss-hp-fill"),
  lootFeed: $("loot-feed"),
  dashBtn: $("dash-btn"),
  novaBtn: $("nova-btn"),
  mobileDash: $("mobile-dash"),
  mobileNova: $("mobile-nova"),
  boonCards: $("boon-cards"),
  levelupLevel: $("levelup-level"),
  equipmentGrid: $("equipment-grid"),
  bagGrid: $("bag-grid"),
  statsGrid: $("stats-grid"),
  detailPane: $("detail-pane"),
  bagCapacity: $("bag-capacity"),
  sheetGold: $("sheet-gold"),
  gearPower: $("gear-power"),
  pauseTime: $("pause-time"),
  pauseRelics: $("pause-relics"),
  pauseKills: $("pause-kills"),
  endKicker: $("end-kicker"),
  endTitle: $("end-title"),
  endCopy: $("end-copy"),
  endTime: $("end-time"),
  endKills: $("end-kills"),
  endRelics: $("end-relics"),
  endGold: $("end-gold"),
  endBest: $("end-best"),
  toastLayer: $("toast-layer"),
  soundBtn: $("sound-btn"),
  mendBtn: $("mend-btn")
};

let actions = {};
let lastHpPulse = 0;

export function initUI(gameActions) {
  actions = gameActions;

  $("start-btn").addEventListener("click", () => actions.start());
  $("how-btn").addEventListener("click", showHow);
  $("how-close").addEventListener("click", hideHow);
  $("inventory-btn").addEventListener("click", () => actions.openInventory());
  $("pause-btn").addEventListener("click", () => actions.pause());
  $("close-inventory").addEventListener("click", () => actions.closeInventory());
  $("resume-btn").addEventListener("click", () => actions.resume());
  $("pause-inventory-btn").addEventListener("click", () => actions.openInventory());
  $("abandon-btn").addEventListener("click", () => actions.abandon());
  $("restart-btn").addEventListener("click", () => actions.restart());
  $("end-menu-btn").addEventListener("click", () => actions.returnToTitle());
  $("sound-btn").addEventListener("click", () => actions.toggleMute());
  $("dash-btn").addEventListener("click", () => actions.dash());
  $("nova-btn").addEventListener("click", () => actions.nova());
  $("mobile-dash").addEventListener("click", () => actions.dash());
  $("mobile-nova").addEventListener("click", () => actions.nova());

  ui.mendBtn.addEventListener("click", () => {
    actions.mendWounds();
    renderInventory();
  });

  $("salvage-commons").addEventListener("click", () => {
    const result = actions.salvageCommons();
    G.invSelection = null;
    renderInventory();
    showToast(result ? `Salvaged ${result.count} relics for ${result.gold} gold.` : "No common relics to salvage.");
  });
  $("sort-bag").addEventListener("click", () => {
    G.bag.sort((a, b) => {
      const rarity = ["common", "magic", "rare", "legendary"];
      return rarity.indexOf(b.rarity) - rarity.indexOf(a.rarity) || b.power - a.power;
    });
    G.invSelection = null;
    renderInventory();
  });

  ui.boonCards.addEventListener("click", (event) => {
    const card = event.target.closest("[data-boon]");
    if (card) actions.chooseBoon(card.dataset.boon);
  });

  ui.bagGrid.addEventListener("click", (event) => {
    const cell = event.target.closest(".bag-cell.filled");
    if (!cell) return;
    G.invSelection = { source: "bag", index: Number(cell.dataset.index) };
    renderInventory();
  });
  ui.bagGrid.addEventListener("dblclick", (event) => {
    const cell = event.target.closest(".bag-cell.filled");
    if (!cell) return;
    const item = G.bag[Number(cell.dataset.index)];
    if (item) {
      actions.equip(item);
      G.invSelection = { source: "equip", slot: item.slot };
      renderInventory();
    }
  });
  ui.bagGrid.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest(".bag-cell.filled");
    if (!cell) return;
    event.preventDefault();
    const item = G.bag[Number(cell.dataset.index)];
    if (!item) return;
    if (actions.salvage(item)) {
      G.invSelection = null;
      renderInventory();
    }
  });

  ui.equipmentGrid.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    G.invSelection = { source: "equip", slot: slot.dataset.slot };
    renderInventory();
  });

  ui.detailPane.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const item = selectedItem();
    if (!item) return;
    if (btn.dataset.action === "equip") {
      actions.equip(item);
      G.invSelection = { source: "equip", slot: item.slot };
      renderInventory();
    } else if (btn.dataset.action === "salvage") {
      if (actions.salvage(item)) {
        G.invSelection = null;
        renderInventory();
      }
    } else if (btn.dataset.action === "unequip") {
      if (actions.unequip(item)) {
        G.invSelection = { source: "bag", index: G.bag.length - 1 };
        renderInventory();
      }
    } else if (btn.dataset.action === "reforge") {
      actions.reforge(item);
      renderInventory();
    }
  });
}

export function showHUD() { ui.hud.classList.remove("is-hidden"); }
export function hideHUD() { ui.hud.classList.add("is-hidden"); }
export function showTitle() {
  ui.title.classList.remove("is-hidden");
  hideHUD();
  hideEnd();
  hidePause();
  hideInventory();
  hideHow();
  hideLevelUp();
}
export function hideTitle() { ui.title.classList.add("is-hidden"); }

export function updateHUD() {
  const p = G.player;
  if (!p || !G.stats) return;
  const stats = G.stats;
  const hpPct = clamp(p.hp / stats.maxHp, 0, 1);
  ui.hpFill.style.width = `${hpPct * 100}%`;
  ui.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${stats.maxHp}`;
  const xpPct = clamp(p.xp / p.xpNext, 0, 1);
  ui.xpFill.style.width = `${xpPct * 100}%`;
  ui.xpText.textContent = `${Math.floor(p.xp)} / ${p.xpNext}`;
  ui.playerLevel.textContent = p.level;
  ui.runTimer.textContent = formatTime(G.time);
  ui.waveLabel.textContent = `WAVE ${roman(Math.min(5, Math.floor(G.time / 60) + 1))}`;
  ui.dawnLabel.textContent = G.time >= BOSS_AT ? `DAWN IN ${formatDawn(RUN_LENGTH - G.time)}` : `DAWN IN ${formatDawn(RUN_LENGTH - G.time)}`;
  ui.killCount.textContent = G.kills;
  ui.goldCount.textContent = G.gold;
  ui.relicCount.textContent = G.relics;
  ui.bagCount.textContent = G.bag.length;
  ui.objectiveFill.style.width = `${clamp(G.time / RUN_LENGTH, 0, 1) * 100}%`;

  if (G.time < BOSS_AT) {
    ui.objectiveTitle.textContent = "Survive until dawn";
    ui.objectiveSub.textContent = "The Hollow King stirs at 4:00";
  } else if (G.boss && !G.boss.dead) {
    ui.objectiveTitle.textContent = "The Hollow King walks";
    ui.objectiveSub.textContent = "Fell him, or outlast the night";
  } else {
    ui.objectiveTitle.textContent = "Survive until dawn";
    ui.objectiveSub.textContent = "The moor is quiet. For now.";
  }

  const dashMax = 3.2 * (1 - (stats.dashCdPct || 0));
  const novaMax = 14 * (1 - (stats.novaCdPct || 0));
  setCooldown(ui.dashBtn, p.dashCd, dashMax);
  setCooldown(ui.novaBtn, p.novaCd, novaMax);
  ui.mobileDash.classList.toggle("cooling", p.dashCd > 0);
  ui.mobileNova.classList.toggle("cooling", p.novaCd > 0);

  if (G.boss && !G.boss.dead) {
    ui.bossBar.classList.remove("is-hidden");
    const pct = clamp(G.boss.hp / G.boss.maxHp, 0, 1);
    ui.bossFill.style.width = `${pct * 100}%`;
  } else {
    ui.bossBar.classList.add("is-hidden");
  }

  const now = performance.now();
  if (hpPct < 0.28 && now - lastHpPulse > 900) {
    lastHpPulse = now;
    ui.hpFill.classList.add("low");
    setTimeout(() => ui.hpFill.classList.remove("low"), 500);
  }
}

function setCooldown(el, current, max) {
  const pct = max > 0 ? clamp(current / max, 0, 1) : 0;
  el.style.setProperty("--cool", `${pct * 100}%`);
  el.classList.toggle("ready", current <= 0);
}

export function showAnnouncement(kicker, title, sub, boss = false) {
  ui.announceKicker.textContent = kicker;
  ui.announceTitle.textContent = title;
  ui.announceSub.textContent = sub;
  ui.announcement.className = "announcement";
  if (boss) ui.announcement.classList.add("boss");
  // Restart the CSS animation.
  void ui.announcement.offsetWidth;
  ui.announcement.classList.add("show");
}

export function showToast(text) {
  const el = document.createElement("div");
  el.className = "game-toast";
  el.textContent = text;
  ui.toastLayer.append(el);
  setTimeout(() => el.remove(), 2700);
  while (ui.toastLayer.children.length > 4) ui.toastLayer.firstElementChild.remove();
}

export function lootToast(item, comparison) {
  const el = document.createElement("div");
  el.className = "loot-toast";
  el.style.setProperty("--rarity", item.color);
  let metaRight = "NEW";
  let metaClass = "up";
  if (comparison && comparison.current) {
    const pct = comparison.summaryPct;
    if (Math.abs(pct) >= 0.05) {
      metaRight = `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(0)}% ${comparison.summaryLabel}`;
      metaClass = pct >= 0 ? "up" : "down";
    } else {
      metaRight = "SIDEGRADE";
      metaClass = "";
    }
  }
  el.innerHTML = `
    ${itemIcon(item.icon, item, "tiny-icon")}
    <div class="loot-info">
      <span class="loot-name">${item.name}</span>
      <div class="loot-meta"><span>${item.rarityLabel} ${item.typeLabel}</span><span class="${metaClass}">${metaRight}</span></div>
    </div>`;
  ui.lootFeed.prepend(el);
  while (ui.lootFeed.children.length > 5) ui.lootFeed.lastElementChild.remove();
  setTimeout(() => el.remove(), 4100);
}

export function showLevelUp(choices, level) {
  ui.levelupLevel.textContent = `Level ${level}`;
  ui.boonCards.innerHTML = choices.map((boon, index) => {
    const count = G.boons[boon.id] || 0;
    return `<button class="boon-card ${boon.type}" data-boon="${boon.id}">
      <span class="boon-number">${index + 1}</span>
      <span class="boon-icon">${boonIcon(boon.icon)}</span>
      <span class="boon-type">${boon.tags?.[0] || "Boon"}</span>
      <h3>${boon.name}</h3>
      <p>${boon.desc}</p>
      <span class="boon-stack">STACK <b>${count + 1}</b> / ${boon.max}</span>
    </button>`;
  }).join("");
  ui.levelup.classList.remove("is-hidden");
}
export function hideLevelUp() { ui.levelup.classList.add("is-hidden"); }

export function showInventory() {
  ui.inventory.classList.remove("is-hidden");
  renderInventory();
}
export function hideInventory() { ui.inventory.classList.add("is-hidden"); }

function selectedItem() {
  if (!G.invSelection) return null;
  if (G.invSelection.source === "bag") return G.bag[G.invSelection.index] || null;
  if (G.invSelection.source === "equip") return G.equipment[G.invSelection.slot] || null;
  return null;
}

export function renderInventory() {
  if (ui.inventory.classList.contains("is-hidden")) return;
  const totalPower = Object.values(G.equipment).reduce((sum, item) => sum + (item?.power || 0), 0);
  ui.gearPower.textContent = `POWER ${Math.round(totalPower)}`;
  ui.sheetGold.textContent = G.gold;
  ui.bagCapacity.textContent = `${G.bag.length} / ${BAG_SIZE}`;
  const canMend = G.player.hp < G.stats.maxHp && G.gold >= MEND_COST;
  ui.mendBtn.textContent = `Mend 35% · ${MEND_COST}g`;
  ui.mendBtn.disabled = !canMend;
  ui.mendBtn.classList.toggle("is-disabled", !canMend);

  ui.equipmentGrid.innerHTML = SLOT_ORDER.map(slot => {
    const item = G.equipment[slot];
    if (!item) {
      return `<button class="equip-slot" data-slot="${slot}">
        <span class="slot-empty">✦</span>
        <span class="slot-meta"><span class="slot-name" style="--rarity:#655c50">${SLOT_META[slot].label}</span><span class="slot-type">Empty</span></span>
      </button>`;
    }
    return `<button class="equip-slot" data-slot="${slot}" style="--rarity:${item.color}">
      ${itemIcon(item.icon, item)}
      <span class="slot-meta"><span class="slot-name" style="--rarity:${item.color}">${item.name}</span><span class="slot-type">${item.typeLabel} · ${item.power}</span></span>
    </button>`;
  }).join("");

  ui.bagGrid.innerHTML = Array.from({ length: BAG_SIZE }, (_, index) => {
    const item = G.bag[index];
    if (!item) return `<div class="bag-cell"><span class="empty-plus">·</span></div>`;
    const selected = G.invSelection?.source === "bag" && G.invSelection.index === index;
    const comp = comparisonFor(item, G.equipment, G.boons);
    const upgrade = !comp.current || comp.summaryPct > 0.25;
    return `<div class="bag-cell filled ${selected ? "selected" : ""}" data-index="${index}" style="--rarity:${item.color}" title="${item.name}">
      ${itemIcon(item.icon, item)}
      <span class="cell-level">${item.itemLevel}</span>
      ${upgrade ? `<span class="upgrade-mark">▲</span>` : ""}
    </div>`;
  }).join("");

  renderStats();
  renderDetail();
}

function renderStats() {
  const stats = G.stats;
  if (!stats) return;
  const dps = Math.round(estimateDps(stats, G.equipment));
  const rate = attackRateOf(stats, G.equipment.weapon);
  const rows = [
    ["Damage", dps],
    ["Attack Speed", `${rate.toFixed(2)}/s`],
    ["Health", `${Math.ceil(G.player.hp)} / ${stats.maxHp}`],
    ["Armor", `${Math.round(stats.armor)} · ${Math.round(armorReduction(stats.armor) * 100)}%`],
    ["Critical", `${(stats.critChance * 100).toFixed(1)}%`],
    ["Crit Damage", `+${Math.round((stats.critDamage - 1) * 100)}%`],
    ["Move Speed", `+${Math.round(stats.moveSpeedPct * 100)}%`],
    ["Life Steal", `${(stats.lifesteal * 100).toFixed(1)}%`],
    ["Pickup", Math.round(stats.pickup)],
    ["Luck", `+${Math.round(stats.luck)}%`],
    ["Regen", `${stats.regen.toFixed(1)}/s`],
    ["Dash CD", `-${Math.round(stats.dashCdPct * 100)}%`]
  ];
  ui.statsGrid.innerHTML = rows.map(([label, value]) =>
    `<div class="stat-row"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");
}

function renderDetail() {
  const item = selectedItem();
  if (!item) {
    ui.detailPane.innerHTML = `<div class="empty-detail">
      <div class="empty-sigil">✦</div>
      <p>Select a relic to inspect it.</p>
      <small>Double-click to equip. Right-click to salvage.</small>
    </div>`;
    return;
  }
  const source = G.invSelection.source;
  const comp = comparisonFor(item, G.equipment, G.boons);
  const rarity = RARITIES[item.rarity];
  let compareHtml = "";
  if (source === "bag") {
    if (comp.current) {
      const pct = comp.summaryPct;
      compareHtml = `<div class="compare-block">
        <h4>COMPARED TO EQUIPPED</h4>
        <div class="compare-equipped" style="--rarity:${comp.current.color}">${comp.current.name}</div>
        <div class="compare-stats">
          ${comp.lines.map(line => `<div class="compare-line"><span>${line.label}</span><span class="${line.good ? "buff" : "nerf"}">${line.text}</span></div>`).join("")}
        </div>
        <div class="compare-summary"><span>${comp.summaryLabel}</span><strong class="${comp.summaryGood ? "up" : "down"}">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%</strong></div>
      </div>`;
    } else {
      const stats = Object.entries(itemStatMap(item));
      compareHtml = `<div class="compare-block">
        <h4>EMPTY SLOT</h4>
        <div class="compare-stats">
          ${stats.map(([stat, value]) => {
            const meta = { damagePct: "Damage", attackSpeedPct: "Attack Speed", critChance: "Critical Chance", critDamage: "Critical Damage", maxHp: "Maximum Health", armor: "Armor", moveSpeedPct: "Movement Speed", pickup: "Pickup Radius", luck: "Luck", xpGain: "Experience", lifesteal: "Life Steal", thorns: "Thorns", dashCdPct: "Dash Cooldown", novaDmgPct: "Blood Nova", goldGain: "Gold Find", regen: "Regeneration", areaPct: "Area", projBonus: "Projectile" }[stat] || stat;
            let text = stat === "critChance" || stat === "lifesteal" ? `+${value.toFixed(1)}%` : ["damagePct", "attackSpeedPct", "critDamage", "moveSpeedPct", "luck", "xpGain", "dashCdPct", "novaDmgPct", "goldGain", "areaPct"].includes(stat) ? `+${Math.round(value)}%` : `+${Math.round(value)}`;
            return `<div class="compare-line"><span>${meta}</span><span class="buff">${text}</span></div>`;
          }).join("")}
        </div>
        <div class="compare-summary"><span>POWER</span><strong class="up">NEW</strong></div>
      </div>`;
    }
  } else {
    compareHtml = `<div class="compare-block"><h4>EQUIPPED</h4><div class="compare-equipped" style="--rarity:${item.color}">${item.name}</div></div>`;
  }

  const reforge = `<button class="btn btn-ghost btn-small btn-reforge" data-action="reforge" title="Reroll affixes and power">Reforge · ${reforgeCost(item)}g</button>`;
  const actionsHtml = source === "bag"
    ? `<div class="item-actions"><button class="btn btn-primary btn-small" data-action="equip">Equip</button><button class="btn btn-salvage btn-small" data-action="salvage">Salvage +${item.salvageValue}g</button></div><div class="item-actions item-actions-secondary">${reforge}</div>`
    : `<div class="item-actions">${item.slot !== "weapon" ? `<button class="btn btn-ghost btn-small" data-action="unequip">Unequip</button>` : `<span class="equipped-label">BOUND TO YOUR HAND</span>`}${reforge}</div>`;

  ui.detailPane.innerHTML = `<div class="item-card" style="--rarity:${item.color}">
    <div class="item-card-head">
      <div class="item-hero" style="--rarity:${item.color}">${itemIcon(item.icon, item)}</div>
      <div class="item-title-wrap">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-sub">${rarity.label} ${item.typeLabel}</p>
        <div class="item-power">ITEM POWER <b>${item.power}</b> · LEVEL ${item.itemLevel}</div>
      </div>
    </div>
    <div class="item-divider"></div>
    <div class="item-implicit"><strong>${formatImplicit(item)}</strong>${item.weapon ? `<span class="implicit-sub">${WEAPON_STYLES[item.weapon.style].describe}</span>` : ""}</div>
    <div class="affix-list">${item.affixes.map(a => `<span class="affix"><b>${formatAffix(a)}</b></span>`).join("")}</div>
    ${item.legendaryPower ? `<div class="legendary-power"><em>LEGENDARY POWER</em><strong>${item.legendaryPower.name}</strong><p>${item.legendaryPower.text}</p></div>` : ""}
    <p class="item-flavor">“${item.flavor}”</p>
    ${compareHtml}
    ${actionsHtml}
  </div>`;
}

export function showPause() {
  ui.pauseTime.textContent = formatTime(G.time);
  ui.pauseRelics.textContent = G.relics;
  ui.pauseKills.textContent = G.kills;
  ui.pause.classList.remove("is-hidden");
}
export function hidePause() { ui.pause.classList.add("is-hidden"); }

export function showHow() { ui.how.classList.remove("is-hidden"); }
export function hideHow() { ui.how.classList.add("is-hidden"); }

export function showEnd(data) {
  ui.toastLayer.innerHTML = "";
  ui.endKicker.textContent = data.kicker;
  ui.endTitle.textContent = data.title;
  ui.endCopy.textContent = data.copy;
  ui.endTime.textContent = formatTime(data.time);
  ui.endKills.textContent = data.kills;
  ui.endRelics.textContent = data.relics;
  ui.endGold.textContent = data.gold;
  if (data.best) {
    ui.endBest.innerHTML = `<div class="best-item" style="--rarity:${data.best.color}">
      ${itemIcon(data.best.icon, data.best)}
      <div><small>FINEST RELIC CLAIMED</small><strong style="--rarity:${data.best.color}">${data.best.name}</strong></div>
    </div>`;
  } else {
    ui.endBest.innerHTML = `<div class="best-item"><div><small>FINEST RELIC CLAIMED</small><strong style="color:#756b5e">None</strong></div></div>`;
  }
  ui.end.classList.remove("is-hidden");
  ui.hud.classList.add("is-hidden");
}
export function hideEnd() { ui.end.classList.add("is-hidden"); }

export function setMuted(muted) {
  ui.soundBtn.classList.toggle("muted", muted);
  ui.soundBtn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
}

export function resetTransientUI() {
  ui.lootFeed.innerHTML = "";
  ui.toastLayer.innerHTML = "";
  hideLevelUp();
  hidePause();
  hideInventory();
  hideEnd();
  ui.bossBar.classList.add("is-hidden");
}
