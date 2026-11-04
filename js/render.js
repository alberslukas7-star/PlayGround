import { G, WORLD, TAU, clamp, lerp, BOSS_AT } from "./state.js";
import {
  drawPlayer, drawEnemy, drawProjectile, drawFoeShot, drawItemGlyph, drawShadow
} from "./render-entities.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
let viewW = window.innerWidth;
let viewH = window.innerHeight;
let dpr = 1;
let groundPattern = null;
let grainPattern = null;

function buildGround() {
  const tile = document.createElement("canvas");
  tile.width = 512;
  tile.height = 512;
  const g = tile.getContext("2d");
  g.fillStyle = "#131016";
  g.fillRect(0, 0, 512, 512);

  let seed = 991;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Soft tonal patches.
  for (let i = 0; i < 34; i++) {
    const x = random() * 512;
    const y = random() * 512;
    const r = 20 + random() * 80;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${random() < 0.5 ? "27,22,29" : "18,16,21"},${0.11 + random() * 0.09})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // Half-buried flagstones. Kept sparse and low-contrast so the
  // standing gravestones stay legible against the ground.
  for (let i = 0; i < 46; i++) {
    const x = random() * 512;
    const y = random() * 512;
    const w = 16 + random() * 38;
    const h = 8 + random() * 16;
    g.save();
    g.translate(x, y);
    g.rotate(random() * TAU);
    g.fillStyle = `rgba(${24 + Math.floor(random() * 7)},${21 + Math.floor(random() * 6)},${26 + Math.floor(random() * 7)},${0.3 + random() * 0.28})`;
    g.strokeStyle = "rgba(3,2,5,.34)";
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, 2);
    g.fill();
    g.stroke();
    g.strokeStyle = "rgba(120,105,94,.045)";
    g.beginPath();
    g.moveTo(-w / 2 + 2, -h / 2 + 2);
    g.lineTo(w / 2 - 2, -h / 2 + 2);
    g.stroke();
    g.restore();
  }
  // Cracks and roots.
  for (let i = 0; i < 30; i++) {
    let x = random() * 512;
    let y = random() * 512;
    g.strokeStyle = `rgba(4,3,6,${0.35 + random() * 0.3})`;
    g.lineWidth = 0.6 + random() * 0.7;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 3 + Math.floor(random() * 4); j++) {
      x += (random() - 0.5) * 30;
      y += (random() - 0.5) * 30;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // Gravel and bone flecks.
  for (let i = 0; i < 1500; i++) {
    const a = 0.018 + random() * 0.06;
    g.fillStyle = random() < 0.08 ? `rgba(168,150,127,${a})` : `rgba(0,0,0,${a})`;
    g.fillRect(random() * 512, random() * 512, 1 + random() * 1.4, 1 + random() * 1.4);
  }
  // Moss.
  for (let i = 0; i < 24; i++) {
    const x = random() * 512;
    const y = random() * 512;
    g.fillStyle = `rgba(35,48,39,${0.05 + random() * 0.07})`;
    g.beginPath();
    g.ellipse(x, y, 5 + random() * 20, 2 + random() * 8, random() * TAU, 0, TAU);
    g.fill();
  }
  return tile;
}

function buildGrain() {
  const tile = document.createElement("canvas");
  tile.width = 160;
  tile.height = 160;
  const g = tile.getContext("2d");
  const image = g.createImageData(160, 160);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = Math.random() * 28;
  }
  g.putImageData(image, 0, 0);
  return tile;
}

export function resizeCanvas() {
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!groundPattern) groundPattern = ctx.createPattern(buildGround(), "repeat");
  if (!grainPattern) grainPattern = ctx.createPattern(buildGrain(), "repeat");
}

export function renderFrame(t) {
  if (G.mode === "title") {
    drawTitle(t);
  } else {
    drawGame(t);
  }
}

function drawGame(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#08070b";
  ctx.fillRect(0, 0, viewW, viewH);

  if (!G.player) {
    drawTitle(t);
    return;
  }

  const shake = G.mode === "playing" ? G.shake : 0;
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;
  const camX = G.camera.x;
  const camY = G.camera.y;
  const left = camX - viewW / 2 - 100;
  const top = camY - viewH / 2 - 100;

  ctx.save();
  ctx.translate(viewW / 2 - camX + sx, viewH / 2 - camY + sy);

  // World floor.
  ctx.fillStyle = groundPattern;
  ctx.fillRect(left, top, viewW + 200, viewH + 200);

  drawSplotches(camX, camY, t);
  drawRunes(t);
  drawDecals();
  drawCandleLights(t);
  drawProps(t);
  drawGroundLootBeams(t);
  drawPickups(t);

  // Entities depth-sorted.
  const drawables = [];
  for (const enemy of G.enemies) {
    if (isVisible(enemy.x, enemy.y, 100)) drawables.push(enemy);
  }
  drawables.push(G.player);
  drawables.sort((a, b) => a.y - b.y);
  for (const entity of drawables) {
    if (entity === G.player) drawPlayer(ctx, G.player, t);
    else drawEnemy(ctx, entity, t);
  }

  drawProjectiles(t);
  drawEffects(t);
  drawLootLabels();
  drawParticles();
  drawTexts();
  ctx.restore();

  drawAtmosphere(t);

  // A soft, warm pool of light around the Gravebound keeps the player
  // readable against the dark moor without breaking the mood.
  const psx = G.player.x - camX + viewW / 2;
  const psy = G.player.y - camY + viewH / 2;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const hearth = ctx.createRadialGradient(psx, psy, 8, psx, psy, Math.min(viewW, viewH) * 0.28);
  hearth.addColorStop(0, "rgba(226,183,135,.075)");
  hearth.addColorStop(0.45, "rgba(164,112,83,.03)");
  hearth.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hearth;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.restore();

  drawLootFeedGlow();
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(141,20,29,${G.flash * 0.35})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  renderGrain();
  if (G.player.hp / G.stats.maxHp < 0.3 && G.mode === "playing") {
    const pulse = 0.05 + Math.sin(t * 4) * 0.025;
    const grad = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.32, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.7);
    grad.addColorStop(0, "rgba(100,5,13,0)");
    grad.addColorStop(1, `rgba(100,5,13,${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

function isVisible(x, y, pad = 60) {
  return x > G.camera.x - viewW / 2 - pad &&
    x < G.camera.x + viewW / 2 + pad &&
    y > G.camera.y - viewH / 2 - pad &&
    y < G.camera.y + viewH / 2 + pad;
}

function drawSplotches(camX, camY, t) {
  const { splotches } = G.decor;
  for (const s of splotches) {
    if (!isVisible(s.x, s.y, 160)) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.fillStyle = `rgba(${s.color},${s.alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // Thin drifting ground haze.
  if (G.mode === "playing") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 4; i++) {
      const x = camX + Math.sin(t * 0.035 + i * 2.4) * 300 - 150 + i * 180;
      const y = camY + Math.cos(t * 0.027 + i) * 170;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 260);
      grad.addColorStop(0, "rgba(86,97,112,.016)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 260, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawRunes(t) {
  for (const rune of G.decor.runes) {
    if (!isVisible(rune.x, rune.y, rune.r + 40)) continue;
    const pulse = 0.7 + Math.sin(t * 0.9 + rune.seed) * 0.3;
    ctx.save();
    ctx.translate(rune.x, rune.y);
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(0, 0, rune.r * 0.14, 0, 0, rune.r);
    grad.addColorStop(0, `rgba(127,25,37,${0.03 * pulse})`);
    grad.addColorStop(0.7, `rgba(99,21,32,${0.018 * pulse})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rune.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(129,37,43,${0.18 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, rune.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(139,57,54,${0.1 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, rune.r * 0.76, 0, TAU);
    ctx.stroke();
    // Glyphs.
    const r = mulberry32Local(rune.seed);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + t * 0.006;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(rune.r * 0.87, 0);
      ctx.rotate((r() - 0.5) * 0.7);
      ctx.strokeStyle = `rgba(141,47,49,${0.1 + r() * 0.1})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(2, -2);
      ctx.lineTo(-1, 3);
      ctx.lineTo(3, 3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

function mulberry32Local(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function drawDecals() {
  for (const d of G.decals) {
    if (!isVisible(d.x, d.y, 30)) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = `rgba(${d.color},${d.alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, d.rx, d.ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawCandleLights(t) {
  if (!G.decor) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const prop of G.decor.props) {
    if (prop.kind !== "candle" || !isVisible(prop.x, prop.y, 180)) continue;
    const flicker = 0.8 + Math.sin(t * 8 + prop.seed) * 0.1 + Math.sin(t * 17 + prop.seed * 2) * 0.06;
    const x = prop.x;
    const y = prop.y - 12 * prop.scale;
    const r = (42 + prop.scale * 18) * flicker;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(220,126,61,.16)");
    grad.addColorStop(0.4, "rgba(174,75,44,.055)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawProps(t) {
  for (const prop of G.decor.props) {
    if (!isVisible(prop.x, prop.y, 120)) continue;
    drawProp(prop, t);
  }
}

function drawProp(p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.scale, p.scale);
  if (p.kind === "grave") {
    drawShadow(ctx, 0, 2, 15, 5, 0.4);
    const grad = ctx.createLinearGradient(0, -34, 0, 3);
    grad.addColorStop(0, "#39333b");
    grad.addColorStop(0.55, "#252128");
    grad.addColorStop(1, "#17151a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(-10, -22);
    ctx.quadraticCurveTo(-10, -35, 0, -37);
    ctx.quadraticCurveTo(10, -35, 10, -22);
    ctx.lineTo(10, 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(119,104,100,.25)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = "#111014";
    ctx.fillRect(-13, 0, 26, 4);
    const runeGlow = 0.35 + Math.sin(t * 1.1 + p.seed) * 0.15;
    ctx.strokeStyle = `rgba(142,63,57,${runeGlow})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    if (p.variant % 2 === 0) {
      ctx.moveTo(-4, -23); ctx.lineTo(0, -28); ctx.lineTo(4, -23); ctx.moveTo(0, -28); ctx.lineTo(0, -16);
      ctx.moveTo(-4, -18); ctx.lineTo(4, -20);
    } else {
      ctx.arc(0, -23, 5, 0, TAU);
      ctx.moveTo(0, -18); ctx.lineTo(0, -10);
      ctx.moveTo(-5, -22); ctx.lineTo(5, -22);
    }
    ctx.stroke();
    // Moss.
    ctx.fillStyle = "rgba(44,66,48,.22)";
    ctx.beginPath();
    ctx.ellipse(-6, -2, 5, 2, 0, 0, TAU);
    ctx.fill();
  } else if (p.kind === "cross") {
    drawShadow(ctx, 0, 2, 12, 4, 0.34);
    ctx.strokeStyle = "#2f292e";
    ctx.lineWidth = 4.3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -36);
    ctx.moveTo(-10, -27); ctx.lineTo(10, -27);
    ctx.stroke();
    ctx.strokeStyle = "rgba(125,110,100,.24)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.2, -2); ctx.lineTo(-1.2, -34);
    ctx.moveTo(-10, -28); ctx.lineTo(10, -28);
    ctx.stroke();
  } else if (p.kind === "tree") {
    drawShadow(ctx, 0, 2, 30, 8, 0.35);
    ctx.strokeStyle = "#191419";
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(-2, -35, 3, -72);
    ctx.stroke();
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(0, -24); ctx.quadraticCurveTo(-18, -43, -27, -64);
    ctx.moveTo(2, -38); ctx.quadraticCurveTo(19, -50, 26, -70);
    ctx.moveTo(-1, -52); ctx.quadraticCurveTo(-11, -65, -14, -84);
    ctx.stroke();
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(-27, -64); ctx.lineTo(-38, -67);
    ctx.moveTo(-27, -64); ctx.lineTo(-33, -74);
    ctx.moveTo(26, -70); ctx.lineTo(36, -76);
    ctx.moveTo(26, -70); ctx.lineTo(33, -64);
    ctx.moveTo(-14, -84); ctx.lineTo(-23, -92);
    ctx.moveTo(-14, -84); ctx.lineTo(-6, -94);
    ctx.stroke();
    ctx.strokeStyle = "rgba(91,70,61,.18)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1, -5); ctx.quadraticCurveTo(-1, -38, 3, -71);
    ctx.stroke();
    // Roots.
    ctx.strokeStyle = "#191419";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-13, 5);
    ctx.moveTo(0, 0); ctx.lineTo(11, 6);
    ctx.stroke();
  } else if (p.kind === "candle") {
    drawShadow(ctx, 0, 2, 7, 3, 0.3);
    ctx.fillStyle = "#c0aa86";
    ctx.beginPath();
    ctx.roundRect(-2.3, -10, 4.6, 11, 1.2);
    ctx.fill();
    ctx.fillStyle = "#8d755d";
    ctx.beginPath();
    ctx.ellipse(0, 1, 5.5, 2, 0, 0, TAU);
    ctx.fill();
    const flick = Math.sin(t * 11 + p.seed) * 1.2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(flick, -13, 0, flick, -13, 9);
    grad.addColorStop(0, "rgba(255,232,176,.9)");
    grad.addColorStop(0.35, "rgba(246,142,63,.4)");
    grad.addColorStop(1, "rgba(246,120,50,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(flick, -13, 9, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#f5c87b";
    ctx.beginPath();
    ctx.ellipse(flick, -13.4, 1.6, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.ellipse(flick, -14.4, 0.7, 1.4, 0, 0, TAU);
    ctx.fill();
  } else if (p.kind === "rubble") {
    drawShadow(ctx, 0, 1, 12, 4, 0.25);
    ctx.fillStyle = "#252129";
    ctx.strokeStyle = "#40383c";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const x = -9 + (i * 7) % 18;
      const y = -2 - (i % 3) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 4, 1);
      ctx.lineTo(x - 2, y - 3);
      ctx.lineTo(x + 4, y - 2);
      ctx.lineTo(x + 5, 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (p.kind === "statue") {
    drawShadow(ctx, 0, 2, 17, 6, 0.42);
    ctx.fillStyle = "#211d23";
    ctx.fillRect(-12, -4, 24, 6);
    const grad = ctx.createLinearGradient(0, -44, 0, 0);
    grad.addColorStop(0, "#4b4347");
    grad.addColorStop(1, "#252126");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(-10, -20, -6, -35);
    ctx.quadraticCurveTo(0, -42, 6, -35);
    ctx.quadraticCurveTo(10, -20, 8, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5b5051";
    ctx.beginPath();
    ctx.arc(0, -38, 5.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(139,111,92,.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4, -34); ctx.quadraticCurveTo(0, -28, 4, -34);
    ctx.stroke();
  } else if (p.kind === "fence") {
    ctx.strokeStyle = "#2a252a";
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const h = i === 0 ? 34 : 28;
      ctx.beginPath();
      ctx.moveTo(i * 8, 0); ctx.lineTo(i * 8, -h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * 8 - 2, -h); ctx.lineTo(i * 8, -h - 5); ctx.lineTo(i * 8 + 2, -h);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-24, -13); ctx.lineTo(24, -13);
    ctx.moveTo(-24, -23); ctx.lineTo(24, -23);
    ctx.stroke();
  } else if (p.kind === "mushroom") {
    drawShadow(ctx, 0, 1, 7, 2.5, 0.2);
    ctx.fillStyle = "#5d5260";
    ctx.fillRect(-1, -6, 2, 6);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createRadialGradient(0, -7, 0, 0, -7, 10);
    grad.addColorStop(0, "rgba(104,214,190,.24)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -7, 10, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#4e9a8c";
    ctx.beginPath();
    ctx.ellipse(0, -7, 5.3, 2.8, 0, Math.PI, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawGroundLootBeams(t) {
  for (const loot of G.groundLoot) {
    if (!isVisible(loot.x, loot.y, 100)) continue;
    const item = loot.item;
    const bob = Math.sin(t * 2.2 + loot.phase) * 2.5;
    const color = item.color;
    const rgb = hexToRgb(color);
    const h = item.rarity === "legendary" ? 104 : item.rarity === "rare" ? 76 : item.rarity === "magic" ? 52 : 32;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const grad = ctx.createLinearGradient(loot.x, loot.y + 8, loot.x, loot.y - h);
    grad.addColorStop(0, `rgba(${rgb},0.26)`);
    grad.addColorStop(0.35, `rgba(${rgb},0.08)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(loot.x - 8, loot.y + 7);
    ctx.lineTo(loot.x + 8, loot.y + 7);
    ctx.lineTo(loot.x + 2, loot.y - h);
    ctx.lineTo(loot.x - 2, loot.y - h);
    ctx.closePath();
    ctx.fill();
    const groundGlow = ctx.createRadialGradient(loot.x, loot.y, 0, loot.x, loot.y, 34);
    groundGlow.addColorStop(0, `rgba(${rgb},.16)`);
    groundGlow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(loot.x, loot.y + 3, 32, 13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Small floating plate.
    const y = loot.y - 13 + bob;
    ctx.save();
    ctx.translate(loot.x, y);
    ctx.fillStyle = "rgba(7,6,9,.88)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, -8);
    ctx.lineTo(13, 1);
    ctx.lineTo(6, 12);
    ctx.lineTo(-7, 12);
    ctx.lineTo(-13, 1);
    ctx.lineTo(-11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},.18)`;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, -6);
    ctx.lineTo(10, 1);
    ctx.lineTo(4, 9);
    ctx.lineTo(-5, 9);
    ctx.lineTo(-10, 1);
    ctx.lineTo(-9, -6);
    ctx.closePath();
    ctx.stroke();
    drawItemGlyph(ctx, item.icon, 0, -1, 17, color);
    ctx.restore();

    if (item.rarity === "legendary") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * 2.1;
        const x = loot.x + Math.cos(a) * (18 + i * 4);
        const yy = loot.y - 12 + Math.sin(a * 1.3) * 12;
        ctx.fillStyle = `rgba(255,174,99,${0.25 + Math.sin(a * 2) * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, yy, 1.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function drawLootLabels() {
  for (const loot of G.groundLoot) {
    if (!isVisible(loot.x, loot.y, 90)) continue;
    if (!G.player) continue;
    const d = Math.hypot(loot.x - G.player.x, loot.y - G.player.y);
    if (d > 190) continue;
    const item = loot.item;
    const full = G.bag.length >= 36;
    const label = item.name;
    ctx.save();
    ctx.font = "600 9px Cinzel, Georgia, serif";
    const width = ctx.measureText(label).width + 16;
    const y = loot.y - 48;
    ctx.globalAlpha = clamp(1 - (d - 120) / 90, 0, 1);
    ctx.fillStyle = "rgba(6,5,8,.88)";
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.roundRect(loot.x - width / 2, y - 12, width, 22, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = item.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, loot.x, y - 2);
    ctx.font = "8px Spectral, Georgia, serif";
    ctx.fillStyle = full ? "#c26f6f" : "#807568";
    ctx.fillText(full ? "Satchel full" : `${item.rarityLabel} ${item.typeLabel}`, loot.x, y + 15);
    ctx.restore();
  }
}

function drawPickups(t) {
  for (const p of G.pickups) {
    if (!isVisible(p.x, p.y, 30)) continue;
    const bob = Math.sin(t * 4 + p.phase) * 1.4;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.kind === "xp") {
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
      grad.addColorStop(0, "rgba(79,214,189,.45)");
      grad.addColorStop(1, "rgba(79,214,189,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#8df4df";
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-3.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e4fffa";
      ctx.beginPath();
      ctx.arc(-1, -1, 1.1, 0, TAU);
      ctx.fill();
    } else if (p.kind === "gold") {
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
      grad.addColorStop(0, "rgba(220,174,86,.35)");
      grad.addColorStop(1, "rgba(220,174,86,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#d8b467";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 5.2, 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#f3d99a";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = "#755b2e";
      ctx.font = "5px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText("◆", 0, 1.8);
    } else {
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      grad.addColorStop(0, "rgba(221,61,76,.42)");
      grad.addColorStop(1, "rgba(221,61,76,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#d94858";
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.bezierCurveTo(-8, -1, -4, -7, 0, -4);
      ctx.bezierCurveTo(4, -7, 8, -1, 0, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,226,210,.75)";
      ctx.beginPath();
      ctx.ellipse(-1.5, -1.5, 1.3, 2, -0.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawProjectiles(t) {
  for (const p of G.projectiles) {
    if (isVisible(p.x, p.y, 30)) drawProjectile(ctx, p, t);
  }
  for (const p of G.foeShots) {
    if (isVisible(p.x, p.y, 30)) drawFoeShot(ctx, p, t);
  }
}

function drawEffects(t) {
  for (const e of G.effects) {
    const progress = clamp(e.age / e.life, 0, 1);
    if (e.kind === "slash") {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.globalCompositeOperation = "lighter";
      const alpha = (1 - progress) * 0.85;
      ctx.strokeStyle = `rgba(255,75,83,${alpha})`;
      ctx.lineWidth = 7 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(0, 0, e.range * (0.72 + progress * 0.16), -e.arc / 2, e.arc / 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,217,177,${alpha * 0.9})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, e.range * (0.75 + progress * 0.18), -e.arc / 2, e.arc / 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(110,19,33,${alpha * 0.3})`;
      ctx.lineWidth = 15 * (1 - progress);
      ctx.beginPath();
      ctx.arc(0, 0, e.range * (0.66 + progress * 0.15), -e.arc / 2, e.arc / 2);
      ctx.stroke();
      ctx.restore();
    } else if (e.kind === "nova") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const r = 25 + e.radius * progress;
      ctx.strokeStyle = `rgba(225,62,72,${(1 - progress) * 0.7})`;
      ctx.lineWidth = 18 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,207,165,${(1 - progress) * 0.8})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.stroke();
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, Math.max(10, r));
      grad.addColorStop(0, `rgba(181,28,43,${(1 - progress) * 0.09})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (e.kind === "ring") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(${e.rgb || "188,155,105"},${(1 - progress) * (e.alpha || 0.5)})`;
      ctx.lineWidth = (e.width || 2) * (1 - progress) + 0.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * (0.3 + progress * 0.7), 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else if (e.kind === "explosion") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const r = e.radius * (0.3 + progress * 0.8);
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      grad.addColorStop(0, `rgba(255,176,99,${(1 - progress) * 0.28})`);
      grad.addColorStop(0.5, `rgba(177,44,48,${(1 - progress) * 0.16})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (e.kind === "afterimage") {
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.22;
      ctx.translate(e.x, e.y);
      ctx.fillStyle = "#b52f3c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 23, e.rot || 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (e.kind === "pillar") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const alpha = (1 - progress) * 0.45;
      const grad = ctx.createLinearGradient(e.x, e.y + 10, e.x, e.y - e.height);
      grad.addColorStop(0, `rgba(255,80,85,${alpha})`);
      grad.addColorStop(1, "rgba(255,80,85,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(e.x - 5, e.y - e.height, 10, e.height + 10);
      ctx.restore();
    }
  }
}

function drawParticles() {
  const ctx2 = ctx;
  for (const p of G.particles) {
    if (!isVisible(p.x, p.y, 20)) continue;
    const alpha = clamp(p.life / p.maxLife, 0, 1) * (p.alpha ?? 1);
    if (p.kind === "ash") {
      ctx2.fillStyle = `rgba(157,134,119,${alpha * 0.34})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.size, 0, TAU);
      ctx2.fill();
    } else if (p.kind === "soul") {
      ctx2.save();
      ctx2.globalCompositeOperation = "lighter";
      ctx2.fillStyle = `rgba(82,225,196,${alpha * 0.55})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.size * 2.2, 0, TAU);
      ctx2.fill();
      ctx2.fillStyle = `rgba(200,255,244,${alpha * 0.8})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.size * 0.7, 0, TAU);
      ctx2.fill();
      ctx2.restore();
    } else if (p.kind === "smoke") {
      ctx2.fillStyle = `rgba(92,76,93,${alpha * 0.13})`;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.size * (1 + (1 - alpha) * 2.4), 0, TAU);
      ctx2.fill();
    } else if (p.kind === "shard") {
      ctx2.save();
      ctx2.translate(p.x, p.y);
      ctx2.rotate(p.rot + performance.now() * 0.002 * p.spin);
      ctx2.fillStyle = p.color;
      ctx2.globalAlpha = alpha;
      ctx2.beginPath();
      ctx2.moveTo(0, -p.size);
      ctx2.lineTo(p.size * 0.55, 0);
      ctx2.lineTo(0, p.size);
      ctx2.lineTo(-p.size * 0.55, 0);
      ctx2.closePath();
      ctx2.fill();
      ctx2.restore();
    } else {
      if (p.glow) {
        ctx2.save();
        ctx2.globalCompositeOperation = "lighter";
        ctx2.globalAlpha = alpha * 0.5;
        ctx2.fillStyle = p.color;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, p.size * 2.4, 0, TAU);
        ctx2.fill();
        ctx2.restore();
      }
      ctx2.globalAlpha = alpha;
      ctx2.fillStyle = p.color;
      ctx2.beginPath();
      if (p.streak) {
        ctx2.lineWidth = p.size;
        ctx2.strokeStyle = p.color;
        ctx2.beginPath();
        ctx2.moveTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
        ctx2.lineTo(p.x, p.y);
        ctx2.stroke();
      } else {
        ctx2.arc(p.x, p.y, p.size, 0, TAU);
        ctx2.fill();
      }
      ctx2.globalAlpha = 1;
    }
  }
}

function drawTexts() {
  for (const text of G.texts) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    const rise = (1 - alpha) * 22;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * 1.8);
    ctx.font = `${text.crit ? "600 18px" : "400 13px"} Spectral, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = text.crit ? 4 : 3;
    ctx.strokeStyle = "rgba(5,4,7,.9)";
    ctx.strokeText(text.value, text.x, text.y - rise);
    ctx.fillStyle = text.color;
    ctx.fillText(text.value, text.x, text.y - rise);
    if (text.crit) {
      ctx.font = "600 7px Cinzel, serif";
      ctx.fillStyle = "rgba(240,184,101,.8)";
      ctx.fillText("CRITICAL", text.x, text.y - rise - 15);
    }
    ctx.restore();
  }
}

function drawAtmosphere(t) {
  // Low drifting mist.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 5; i++) {
    const x = (viewW * (0.15 + i * 0.21) + Math.sin(t * 0.03 + i * 1.7) * 150) % (viewW + 400) - 200;
    const y = viewH * (0.5 + Math.sin(i * 2 + t * 0.02) * 0.24);
    const r = Math.min(viewW, viewH) * (0.25 + (i % 2) * 0.1);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(105,119,135,.022)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Vignette.
  const vignette = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.24, viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,.2)");
  vignette.addColorStop(1, "rgba(0,0,0,.7)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewW, viewH);

  // Cold top light and bloody bottom tint.
  const top = ctx.createLinearGradient(0, 0, 0, viewH * 0.5);
  top.addColorStop(0, "rgba(30,29,49,.14)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, viewW, viewH * 0.5);
  const bottom = ctx.createLinearGradient(0, viewH * 0.6, 0, viewH);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(1, "rgba(35,6,11,.13)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, viewH * 0.6, viewW, viewH * 0.4);
}

function drawLootFeedGlow() {
  // A faint red bloom in the upper corner where loot cards appear.
  const grad = ctx.createRadialGradient(viewW - 60, 130, 0, viewW - 60, 130, 280);
  grad.addColorStop(0, "rgba(142,45,45,.018)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(viewW - 360, 0, 360, 420);
}

function renderGrain() {
  if (!grainPattern) return;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.restore();
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value.length === 3 ? value.split("").map(c => c + c).join("") : value, 16);
  return `${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255}`;
}

/* ── Title scene ─────────────────────────────────────────────────────────── */

function drawTitle(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = viewW;
  const h = viewH;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#09060e");
  sky.addColorStop(0.38, "#140b13");
  sky.addColorStop(0.68, "#1b0d13");
  sky.addColorStop(1, "#08070a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const mx = w * 0.74;
  const my = h * 0.27;
  const mr = Math.min(w, h) * 0.115;
  // Moon halo.
  const halo = ctx.createRadialGradient(mx, my, mr * 0.25, mx, my, mr * 4.1);
  halo.addColorStop(0, "rgba(192,78,69,.23)");
  halo.addColorStop(0.28, "rgba(137,45,49,.09)");
  halo.addColorStop(0.64, "rgba(92,27,40,.025)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Moon disc.
  const moon = ctx.createRadialGradient(mx - mr * 0.28, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, "#d8896f");
  moon.addColorStop(0.42, "#b34d49");
  moon.addColorStop(0.82, "#7f2a37");
  moon.addColorStop(1, "#5a1b2a");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.fill();
  // Cloud bands across the moon.
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    const cy = my - mr * 0.5 + i * mr * 0.23 + Math.sin(t * 0.06 + i) * 2;
    const grad = ctx.createLinearGradient(mx - mr, 0, mx + mr, 0);
    grad.addColorStop(0, "rgba(35,13,20,.12)");
    grad.addColorStop(0.5, `rgba(35,13,20,${0.12 + (i % 2) * 0.12})`);
    grad.addColorStop(1, "rgba(35,13,20,.03)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(mx, cy, mr * (0.95 + i * 0.03), mr * 0.055, 0, 0, TAU);
    ctx.fill();
  }
  // Craters.
  ctx.fillStyle = "rgba(76,25,33,.24)";
  for (let i = 0; i < 7; i++) {
    const a = i * 2.1;
    const rr = mr * (0.18 + (i % 3) * 0.16);
    ctx.beginPath();
    ctx.arc(mx + Math.cos(a) * rr, my + Math.sin(a * 1.4) * rr, mr * (0.04 + (i % 2) * 0.035), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Distant mountains and castle.
  drawTitleCastle(w, h, t);

  // Fog at horizon.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 3; i++) {
    const y = h * 0.58 + i * 24;
    const grad = ctx.createLinearGradient(0, y - 60, 0, y + 50);
    grad.addColorStop(0, "rgba(105,115,135,0)");
    grad.addColorStop(0.5, "rgba(104,116,137,.05)");
    grad.addColorStop(1, "rgba(105,115,135,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 60, w, 110);
  }
  ctx.restore();

  // Foreground silhouettes: dead trees and graves.
  drawTitleTree(-20, h * 0.84, 1.25, t, 0.8);
  drawTitleTree(w + 24, h * 0.82, -1.08, t, 2.2);
  drawTitleGraves(w, h, t);

  // Ground.
  const ground = ctx.createLinearGradient(0, h * 0.72, 0, h);
  ground.addColorStop(0, "rgba(7,6,9,0)");
  ground.addColorStop(0.34, "rgba(7,6,9,.75)");
  ground.addColorStop(1, "#07060a");
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  // Ravens.
  drawRavens(w, h, t);

  // Motes.
  for (const mote of G.titleMotes) {
    const x = ((mote.x + mote.vx * t) % 1 + 1) % 1 * w;
    const y = ((mote.y + mote.vy * t) % 1 + 1) % 1 * h;
    const a = 0.15 + (Math.sin(t * 0.7 + mote.phase) * 0.5 + 0.5) * 0.45;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = mote.warm ? `rgba(246,144,82,${a * 0.55})` : `rgba(176,194,187,${a * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, mote.size, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Vignette.
  const vignette = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.22, w / 2, h * 0.5, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,.14)");
  vignette.addColorStop(1, "rgba(0,0,0,.63)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  renderGrain();
}

function drawTitleCastle(w, h, t) {
  ctx.save();
  const baseY = h * 0.64;
  ctx.fillStyle = "#09070b";
  ctx.beginPath();
  ctx.moveTo(0, baseY + 30);
  ctx.lineTo(0, baseY - 8);
  for (let x = 0; x <= w; x += 26) {
    const hill = Math.sin(x * 0.007 + 1.5) * 18 + Math.sin(x * 0.021) * 8;
    ctx.lineTo(x, baseY - hill);
  }
  ctx.lineTo(w, baseY + 30);
  ctx.closePath();
  ctx.fill();

  // Castle silhouette on the right side.
  const cx = w * 0.77;
  const cy = baseY - 6;
  ctx.fillStyle = "#08060b";
  ctx.beginPath();
  ctx.moveTo(cx - 95, cy);
  ctx.lineTo(cx - 95, cy - 24);
  ctx.lineTo(cx - 76, cy - 24);
  ctx.lineTo(cx - 76, cy - 42);
  ctx.lineTo(cx - 58, cy - 42);
  ctx.lineTo(cx - 58, cy - 28);
  ctx.lineTo(cx - 28, cy - 28);
  ctx.lineTo(cx - 28, cy - 62);
  ctx.lineTo(cx - 9, cy - 78);
  ctx.lineTo(cx + 9, cy - 62);
  ctx.lineTo(cx + 25, cy - 63);
  ctx.lineTo(cx + 25, cy - 30);
  ctx.lineTo(cx + 53, cy - 30);
  ctx.lineTo(cx + 53, cy - 48);
  ctx.lineTo(cx + 72, cy - 48);
  ctx.lineTo(cx + 72, cy - 26);
  ctx.lineTo(cx + 96, cy - 26);
  ctx.lineTo(cx + 96, cy);
  ctx.closePath();
  ctx.fill();

  // Faint windows.
  const flicker = 0.3 + Math.sin(t * 0.9) * 0.08;
  ctx.fillStyle = `rgba(191,110,66,${flicker * 0.4})`;
  ctx.fillRect(cx - 44, cy - 21, 2, 4);
  ctx.fillRect(cx + 18, cy - 44, 2, 5);
  ctx.fillRect(cx + 61, cy - 18, 2, 3);
  ctx.restore();
}

function drawTitleTree(x, baseY, dir, t, phase) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(dir, 1);
  ctx.strokeStyle = "#070509";
  ctx.lineCap = "round";
  const sway = Math.sin(t * 0.23 + phase) * 0.018;
  ctx.rotate(sway);
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(18, -80, -18, -170, 18, -290);
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(9, -115);
  ctx.bezierCurveTo(65, -145, 92, -190, 128, -218);
  ctx.moveTo(1, -175);
  ctx.bezierCurveTo(-58, -198, -82, -240, -116, -272);
  ctx.moveTo(16, -245);
  ctx.bezierCurveTo(54, -272, 70, -304, 85, -335);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(120, -212); ctx.lineTo(152, -196);
  ctx.moveTo(125, -217); ctx.lineTo(137, -252);
  ctx.moveTo(-108, -265); ctx.lineTo(-146, -281);
  ctx.moveTo(-110, -268); ctx.lineTo(-108, -306);
  ctx.moveTo(82, -330); ctx.lineTo(61, -359);
  ctx.moveTo(84, -333); ctx.lineTo(112, -354);
  ctx.stroke();
  ctx.restore();
}

function drawTitleGraves(w, h, t) {
  const graves = [
    { x: w * 0.12, y: h * 0.88, s: 1.1, tilt: -0.08 },
    { x: w * 0.22, y: h * 0.92, s: 0.7, tilt: 0.08 },
    { x: w * 0.88, y: h * 0.9, s: 0.9, tilt: 0.1 },
    { x: w * 0.78, y: h * 0.95, s: 0.55, tilt: -0.05 },
    { x: w * 0.42, y: h * 0.97, s: 0.64, tilt: 0.03 },
    { x: w * 0.6, y: h * 0.98, s: 0.45, tilt: -0.12 }
  ];
  for (const g of graves) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.tilt);
    ctx.scale(g.s, g.s);
    ctx.fillStyle = "#08060b";
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.lineTo(-16, -36);
    ctx.quadraticCurveTo(-16, -54, 0, -56);
    ctx.quadraticCurveTo(16, -54, 16, -36);
    ctx.lineTo(16, 4);
    ctx.closePath();
    ctx.fill();
    if (g.s > 0.8) {
      ctx.strokeStyle = `rgba(142,44,49,${0.18 + Math.sin(t * 1.3 + g.x) * 0.06})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -45); ctx.lineTo(0, -17);
      ctx.moveTo(-6, -37); ctx.lineTo(6, -37);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRavens(w, h, t) {
  const ravens = [
    { x: w * 0.56, y: h * 0.18, s: 1, phase: 1 },
    { x: w * 0.84, y: h * 0.13, s: 0.65, phase: 3.4 },
    { x: w * 0.4, y: h * 0.27, s: 0.55, phase: 5.1 }
  ];
  for (const r of ravens) {
    const flap = Math.sin(t * 2.2 + r.phase);
    const x = r.x + Math.sin(t * 0.08 + r.phase) * 28;
    const y = r.y + Math.cos(t * 0.1 + r.phase) * 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r.s, r.s);
    ctx.strokeStyle = "rgba(6,5,8,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, flap * 4);
    ctx.quadraticCurveTo(-5, -5, 0, 0);
    ctx.quadraticCurveTo(5, -5, 12, flap * 4);
    ctx.stroke();
    ctx.restore();
  }
}
