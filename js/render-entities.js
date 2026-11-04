import { TAU } from "./state.js";

const TAU_ = Math.PI * 2;

export function drawShadow(ctx, x, y, rx, ry, alpha = 0.35) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
  grad.addColorStop(0.6, `rgba(0,0,0,${alpha * 0.55})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU_);
  ctx.fill();
  ctx.restore();
}

function glow(ctx, x, y, r, color, alpha = 0.5) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color.replace("ALPHA", String(alpha)));
  grad.addColorStop(0.35, color.replace("ALPHA", String(alpha * 0.42)));
  grad.addColorStop(1, color.replace("ALPHA", "0"));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU_);
  ctx.fill();
}

export function drawPlayer(ctx, p, t) {
  const bob = p.moving ? Math.sin(p.walkPhase * 2.1) * 1.8 : Math.sin(t * 2.1) * 0.6;
  const flicker = p.invuln > 0 && Math.floor(t * 26) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  drawShadow(ctx, 0, 14, 20, 7, 0.48);

  if (p.windrunnerTime > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, 0, -3, 32, "rgba(103,218,188,ALPHA)", 0.18);
    ctx.restore();
  }

  if (p.dashTime > 0) {
    ctx.globalAlpha = 0.5;
  } else if (flicker) {
    ctx.globalAlpha = 0.55;
  }

  // Swaying cloak behind the body.
  ctx.save();
  const sway = Math.sin(t * 4.1) * 2.2 + (p.moving ? Math.sin(p.walkPhase * 2.3) * 1.8 : 0);
  ctx.fillStyle = "#35151c";
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.quadraticCurveTo(-17 + sway, 6, -10 + sway * 0.5, 20);
  ctx.lineTo(-2, 13);
  ctx.lineTo(0, 25);
  ctx.lineTo(6, 12);
  ctx.quadraticCurveTo(15 - sway, 2, 12, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(91,35,42,.5)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Legs and boots.
  ctx.strokeStyle = "#1b1419";
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  const leg = p.moving ? Math.sin(p.walkPhase * 2.3) * 3.5 : 0;
  ctx.beginPath();
  ctx.moveTo(-5, 7); ctx.lineTo(-6 - leg, 17);
  ctx.moveTo(5, 7); ctx.lineTo(6 + leg, 17);
  ctx.stroke();
  ctx.strokeStyle = "#4b3b32";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8 - leg, 16); ctx.lineTo(-4 - leg, 17);
  ctx.moveTo(4 + leg, 16); ctx.lineTo(8 + leg, 17);
  ctx.stroke();

  // Torso leather and mail.
  const torso = ctx.createLinearGradient(-9, -12, 10, 12);
  torso.addColorStop(0, "#463128");
  torso.addColorStop(0.45, "#2a1d1e");
  torso.addColorStop(1, "#151116");
  ctx.fillStyle = torso;
  ctx.beginPath();
  ctx.moveTo(-10, -11 + bob * 0.2);
  ctx.quadraticCurveTo(0, -16, 10, -11 + bob * 0.2);
  ctx.lineTo(8, 8);
  ctx.quadraticCurveTo(0, 12, -8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(137,105,70,.38)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Chest harness and sigil.
  ctx.strokeStyle = "#765435";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-8, -8); ctx.lineTo(6, 5);
  ctx.stroke();
  ctx.strokeStyle = "#a98551";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, -1, 3.4, 0, TAU_);
  ctx.moveTo(0, -5); ctx.lineTo(0, 3);
  ctx.stroke();

  // Shoulders.
  ctx.fillStyle = "#4d3d35";
  ctx.beginPath();
  ctx.ellipse(-9, -9, 5.2, 4.2, -0.4, 0, TAU_);
  ctx.ellipse(9, -9, 5.2, 4.2, 0.4, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#806647";
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Hood.
  ctx.fillStyle = "#25181c";
  ctx.beginPath();
  ctx.moveTo(-8, -13);
  ctx.quadraticCurveTo(-9, -26, 0, -28);
  ctx.quadraticCurveTo(9, -26, 8, -13);
  ctx.quadraticCurveTo(0, -9, -8, -13);
  ctx.fill();
  ctx.strokeStyle = "#5c3939";
  ctx.stroke();

  // Pale face inside hood.
  const face = ctx.createLinearGradient(0, -24, 0, -15);
  face.addColorStop(0, "#cbb6a4");
  face.addColorStop(1, "#8a6b60");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(0, -19.5, 4.7, 5.4, 0, 0, TAU_);
  ctx.fill();
  ctx.fillStyle = "#281417";
  ctx.beginPath();
  ctx.ellipse(-2, -20.4, 1, 0.55, 0, 0, TAU_);
  ctx.ellipse(2, -20.4, 1, 0.55, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "rgba(83,43,42,.8)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-1.3, -16.7); ctx.lineTo(1.3, -16.7);
  ctx.stroke();

  // Hood rim.
  ctx.strokeStyle = "#3a2427";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -18.5, 8, Math.PI * 0.98, Math.PI * 2.02);
  ctx.stroke();

  drawPlayerWeapon(ctx, p, t);

  ctx.restore();

  // Dash afterglow.
  if (p.dashTime > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, p.x, p.y - 4, 34, "rgba(166,57,66,ALPHA)", 0.18);
    ctx.restore();
  }
}

function drawPlayerWeapon(ctx, p, t) {
  const style = p.weaponStyle || "scythe";
  const swing = p.attackAnim > 0 ? Math.sin((1 - p.attackAnim / 0.22) * Math.PI) : 0;
  ctx.save();
  ctx.translate(3, -5);
  ctx.rotate(p.facing + swing * 0.26);
  if (style === "scythe") {
    ctx.strokeStyle = "#725438";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.lineTo(35, -10);
    ctx.stroke();
    ctx.strokeStyle = "#c09a65";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-8, 5); ctx.lineTo(34, -11);
    ctx.stroke();
    // Blade.
    ctx.fillStyle = "rgba(158,35,44,.33)";
    ctx.beginPath();
    ctx.arc(35, -11, 16, -2.5, -0.35);
    ctx.arc(35, -11, 11, -0.48, -2.38, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f06b71";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "#d83744";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(35, -11, 15, -2.48, -0.42);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f5d8b1";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(35, -11, 14, -2.44, -0.48);
    ctx.stroke();
    ctx.fillStyle = "#c8a16b";
    ctx.beginPath();
    ctx.arc(35, -11, 2.2, 0, TAU_);
    ctx.fill();
  } else if (style === "crossbow") {
    ctx.rotate(-0.07);
    ctx.strokeStyle = "#6b5036";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-6, 2); ctx.lineTo(24, -2);
    ctx.stroke();
    ctx.strokeStyle = "#b79563";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(9, 0, 10, -1.8, 1.8);
    ctx.stroke();
    ctx.strokeStyle = "#d9c6a1";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(12, -9); ctx.lineTo(8, 1); ctx.lineTo(12, 10);
    ctx.stroke();
    ctx.fillStyle = "#f2d5a0";
    ctx.beginPath();
    ctx.moveTo(26, -2); ctx.lineTo(32, -3.5); ctx.lineTo(31, 0.2);
    ctx.closePath();
    ctx.fill();
  } else if (style === "wand") {
    ctx.strokeStyle = "#6e5137";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, 7); ctx.lineTo(19, -10);
    ctx.stroke();
    ctx.strokeStyle = "#b1905d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 6); ctx.lineTo(18, -9);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, 22, -12, 13, "rgba(151,107,255,ALPHA)", 0.5);
    ctx.restore();
    ctx.fillStyle = "#c8a8ff";
    ctx.beginPath();
    ctx.arc(22, -12, 3.2, 0, TAU_);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(21, -13, 0.9, 0, TAU_);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#c3b39a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, -5); ctx.lineTo(16, 6);
    ctx.moveTo(25, -5); ctx.lineTo(10, 6);
    ctx.stroke();
    ctx.fillStyle = "#e7d8b9";
    ctx.beginPath();
    ctx.moveTo(16, 6); ctx.lineTo(21, 11); ctx.lineTo(16, 9); ctx.lineTo(11, 11); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#aa8f60";
    ctx.beginPath();
    ctx.arc(2, -5, 2, 0, TAU_); ctx.arc(25, -5, 2, 0, TAU_);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemyHealth(ctx, e) {
  if (!e.elite && !e.boss) return;
  const w = e.boss ? 62 : 38;
  const y = e.y - e.radius - (e.boss ? 34 : 17);
  ctx.save();
  ctx.translate(e.x - w / 2, y);
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillRect(0, 0, w, 3);
  ctx.fillStyle = e.boss ? "#e04d50" : "#d1a052";
  ctx.fillRect(0, 0, w * Math.max(0, e.hp / e.maxHp), 3);
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.strokeRect(-0.5, -0.5, w + 1, 4);
  ctx.restore();
}

export function drawEnemy(ctx, e, t) {
  const angle = e.facing ?? 0;
  const bob = Math.sin(t * (e.type === "bat" ? 12 : 3.2) + e.phase) * (e.type === "bat" ? 3 : 1.1);
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.elite) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, 0, 0, e.radius + 19, "rgba(214,164,75,ALPHA)", 0.18 + Math.sin(t * 3 + e.phase) * 0.04);
    ctx.restore();
  }
  if (e.boss) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, 0, 0, e.radius + 58, "rgba(207,49,55,ALPHA)", 0.22 + Math.sin(t * 2) * 0.04);
    ctx.restore();
  }

  drawShadow(ctx, 0, e.radius * 0.78, e.radius * (e.type === "bat" ? 1.25 : 1.05), e.radius * 0.38, 0.47);

  ctx.translate(0, bob);
  // Most enemies are drawn facing +X and turn with their movement. The
  // Hollow King is a full front-view figure, so rotating him makes the
  // crown read sideways; keep him upright instead.
  if (e.type !== "king") ctx.rotate(angle);
  // Sprites are drawn facing +X.
  if (e.type === "ghoul") drawGhoul(ctx, e, t);
  else if (e.type === "bat") drawBat(ctx, e, t);
  else if (e.type === "skeleton") drawSkeleton(ctx, e, t);
  else if (e.type === "wraith") drawWraith(ctx, e, t);
  else if (e.type === "brute") drawBrute(ctx, e, t);
  else if (e.type === "king") drawKing(ctx, e, t);

  if (e.hitFlash > 0) {
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, 0, 0, e.radius + 8, "rgba(255,228,210,ALPHA)", Math.min(0.45, e.hitFlash * 4));
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
  drawEnemyHealth(ctx, e);
}

function drawGhoul(ctx, e, t) {
  const stepped = Math.sin(t * 6.4 + e.phase);
  // Hind legs.
  ctx.strokeStyle = "#5d423d";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, 5); ctx.lineTo(-10, 9 + stepped);
  ctx.moveTo(4, 5); ctx.lineTo(7 + stepped, 10);
  ctx.stroke();
  // Hunched body.
  const grad = ctx.createLinearGradient(-e.radius, -e.radius, e.radius, e.radius);
  grad.addColorStop(0, e.elite ? "#9b8266" : "#8b665c");
  grad.addColorStop(1, e.elite ? "#4e382c" : "#4b3434");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, e.radius * 1.08, e.radius * 0.76, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "rgba(25,17,18,.4)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Ribs.
  ctx.strokeStyle = "rgba(196,154,125,.34)";
  ctx.lineWidth = 0.9;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(-1 + i * 3.5, 0.5, 5.5, -1.05, 1.05);
    ctx.stroke();
  }
  // Reaching arms.
  const reach = 1 + Math.sin(t * 5 + e.phase) * 0.12;
  ctx.strokeStyle = "#725149";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(5, -7); ctx.lineTo(14 * reach, -8); ctx.lineTo(18 * reach, -4);
  ctx.moveTo(5, 7); ctx.lineTo(13 * reach, 8); ctx.lineTo(17 * reach, 4);
  ctx.stroke();
  ctx.strokeStyle = "#c8aa8e";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(18 * reach, -4); ctx.lineTo(21, -5.5);
  ctx.moveTo(17 * reach, 4); ctx.lineTo(20, 5);
  ctx.stroke();
  // Head.
  ctx.fillStyle = "#a38374";
  ctx.beginPath();
  ctx.ellipse(9, 0, 7.2, 6.2, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#4b302f";
  ctx.stroke();
  // Jaw.
  ctx.fillStyle = "#241414";
  ctx.beginPath();
  ctx.ellipse(13.5, 1.2, 3, 2.1, 0.1, 0, TAU_);
  ctx.fill();
  // Eyes.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 11, -2.6, 5, "rgba(240,63,66,ALPHA)", 0.8);
  glow(ctx, 11, 2.6, 5, "rgba(240,63,66,ALPHA)", 0.8);
  ctx.restore();
  ctx.fillStyle = "#ffb08d";
  ctx.beginPath();
  ctx.arc(11.5, -2.6, 1.1, 0, TAU_);
  ctx.arc(11.5, 2.6, 1.1, 0, TAU_);
  ctx.fill();
  if (e.elite) {
    ctx.strokeStyle = "#e1b86b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, -8); ctx.lineTo(7, -13); ctx.lineTo(10, -8);
    ctx.stroke();
  }
}

function drawBat(ctx, e, t) {
  const flap = Math.sin(t * 15 + e.phase);
  ctx.fillStyle = "#3d2737";
  ctx.strokeStyle = "#89536a";
  ctx.lineWidth = 0.8;
  // Wings.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-10, -13 * flap, -22, -2);
  ctx.quadraticCurveTo(-14, 0, -10, 8);
  ctx.quadraticCurveTo(-5, 3, 0, 0);
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -13 * flap, 22, -2);
  ctx.quadraticCurveTo(14, 0, 10, 8);
  ctx.quadraticCurveTo(5, 3, 0, 0);
  ctx.fill();
  ctx.stroke();
  // Body.
  ctx.fillStyle = "#76445b";
  ctx.beginPath();
  ctx.ellipse(2, 0, 7, 4.5, 0, 0, TAU_);
  ctx.fill();
  // Ears and eyes.
  ctx.fillStyle = "#a05b74";
  ctx.beginPath();
  ctx.moveTo(5, -4); ctx.lineTo(8, -8); ctx.lineTo(8, -2);
  ctx.moveTo(5, 4); ctx.lineTo(8, 8); ctx.lineTo(8, 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 7, 0, 5, "rgba(255,81,107,ALPHA)", 0.7);
  ctx.restore();
  ctx.fillStyle = "#ffd2c0";
  ctx.beginPath();
  ctx.arc(7, -1, 0.9, 0, TAU_);
  ctx.arc(7, 1, 0.9, 0, TAU_);
  ctx.fill();
}

function drawSkeleton(ctx, e, t) {
  const step = Math.sin(t * 5 + e.phase);
  // Legs.
  ctx.strokeStyle = "#bdb094";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-3, 4); ctx.lineTo(-7, 11 + step);
  ctx.moveTo(3, 4); ctx.lineTo(7 + step, 11);
  ctx.stroke();
  // Ribcage.
  ctx.strokeStyle = "#cfc2a4";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(0, 6);
  for (let i = 0; i < 3; i++) {
    ctx.moveTo(-6 + i, -4 + i * 3);
    ctx.quadraticCurveTo(0, -1 + i * 3, 6 - i, -4 + i * 3);
  }
  ctx.stroke();
  // Arms and bow.
  ctx.strokeStyle = "#b7a98e";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -5); ctx.lineTo(11, -9);
  ctx.moveTo(0, -4); ctx.lineTo(12, 3);
  ctx.stroke();
  ctx.strokeStyle = "#6a5035";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(16, 0, 10, -1.3, 1.3);
  ctx.stroke();
  ctx.strokeStyle = "#ded1b2";
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(18.5, -9.4); ctx.lineTo(13, 0); ctx.lineTo(18.5, 9.4);
  ctx.stroke();
  if (e.shootFlash > 0) {
    ctx.strokeStyle = "rgba(255,210,133,.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(30, 0);
    ctx.stroke();
  }
  // Skull.
  ctx.fillStyle = "#d9cdb1";
  ctx.beginPath();
  ctx.ellipse(5, 0, 6.4, 6, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#685d4d";
  ctx.stroke();
  ctx.fillStyle = "#211b19";
  ctx.beginPath();
  ctx.ellipse(7, -2.5, 1.7, 1.4, 0, 0, TAU_);
  ctx.ellipse(7, 2.5, 1.7, 1.4, 0, 0, TAU_);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 8, -2.5, 4, "rgba(245,193,99,ALPHA)", 0.85);
  glow(ctx, 8, 2.5, 4, "rgba(245,193,99,ALPHA)", 0.85);
  ctx.restore();
  if (e.elite) {
    ctx.strokeStyle = "#e1b86b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1, -6); ctx.lineTo(4, -12); ctx.lineTo(7, -6);
    ctx.stroke();
  }
}

function drawWraith(ctx, e, t) {
  const drift = Math.sin(t * 2.3 + e.phase) * 2;
  ctx.translate(0, drift);
  ctx.globalAlpha = 0.86;
  // Tattered lower body.
  ctx.fillStyle = "rgba(48,62,88,.72)";
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-13, 10, -7, 19);
  ctx.lineTo(-3, 12);
  ctx.lineTo(1, 23);
  ctx.lineTo(5, 12);
  ctx.lineTo(9, 18);
  ctx.quadraticCurveTo(13, 6, 10, -4);
  ctx.closePath();
  ctx.fill();
  // Body cloak.
  const grad = ctx.createLinearGradient(-10, -13, 10, 11);
  grad.addColorStop(0, "#8898c5");
  grad.addColorStop(0.3, "#4b5879");
  grad.addColorStop(1, "#242c43");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-11, 2);
  ctx.quadraticCurveTo(-13, -13, 0, -18);
  ctx.quadraticCurveTo(13, -13, 10, 3);
  ctx.quadraticCurveTo(0, 10, -11, 2);
  ctx.fill();
  // Hood.
  ctx.fillStyle = "#283148";
  ctx.beginPath();
  ctx.arc(0, -10, 8, Math.PI, TAU_);
  ctx.lineTo(7, 0);
  ctx.quadraticCurveTo(0, 4, -7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#10131f";
  ctx.beginPath();
  ctx.ellipse(0, -8, 5.4, 5.8, 0, 0, TAU_);
  ctx.fill();
  // Eyes.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 0, -8, 12, "rgba(100,235,213,ALPHA)", 0.56);
  ctx.restore();
  ctx.fillStyle = "#a9fff0";
  ctx.beginPath();
  ctx.ellipse(-2.2, -8.5, 1.15, 1.65, 0, 0, TAU_);
  ctx.ellipse(2.2, -8.5, 1.15, 1.65, 0, 0, TAU_);
  ctx.fill();
  // Arms trailing.
  ctx.strokeStyle = "rgba(146,164,205,.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -4); ctx.quadraticCurveTo(-16, 3, -12, 9);
  ctx.moveTo(7, -4); ctx.quadraticCurveTo(16, 3, 12, 9);
  ctx.stroke();
  if (e.elite) {
    ctx.strokeStyle = "#e1b86b";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -17); ctx.lineTo(0, -23); ctx.lineTo(4, -17);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawBrute(ctx, e, t) {
  const step = Math.sin(t * 3.8 + e.phase);
  // Legs.
  ctx.strokeStyle = "#4f3430";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 9); ctx.lineTo(-12, 22 + step);
  ctx.moveTo(8, 9); ctx.lineTo(13 + step, 22);
  ctx.stroke();
  // Massive torso.
  const grad = ctx.createRadialGradient(-5, -8, 3, 0, 0, e.radius);
  grad.addColorStop(0, e.elite ? "#a78a64" : "#8d6353");
  grad.addColorStop(0.6, "#5d3e38");
  grad.addColorStop(1, "#2b1c1d");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, e.radius * 1.08, e.radius * 0.86, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "rgba(24,13,14,.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Belly plates.
  ctx.strokeStyle = "rgba(189,143,104,.22)";
  ctx.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(-2, i * 6, 8, -0.8, 0.8);
    ctx.stroke();
  }
  // Arms.
  ctx.strokeStyle = "#6d4a3e";
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(4, -12); ctx.lineTo(18, -18 + step);
  ctx.moveTo(4, 12); ctx.lineTo(18, 18 - step);
  ctx.stroke();
  // Fists.
  ctx.fillStyle = "#9b705d";
  ctx.beginPath();
  ctx.arc(19, -18 + step, 5, 0, TAU_);
  ctx.arc(19, 18 - step, 5, 0, TAU_);
  ctx.fill();
  // Head and horns.
  ctx.fillStyle = "#9b705d";
  ctx.beginPath();
  ctx.ellipse(12, 0, 9, 8, 0, 0, TAU_);
  ctx.fill();
  ctx.fillStyle = "#c3a076";
  ctx.beginPath();
  ctx.moveTo(10, -7); ctx.lineTo(16, -17); ctx.lineTo(20, -5);
  ctx.moveTo(10, 7); ctx.lineTo(16, 17); ctx.lineTo(20, 5);
  ctx.fill();
  ctx.fillStyle = "#2b1616";
  ctx.beginPath();
  ctx.ellipse(17, 0, 4, 3.6, 0, 0, TAU_);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 16, -3, 5, "rgba(255,89,77,ALPHA)", 0.7);
  glow(ctx, 16, 3, 5, "rgba(255,89,77,ALPHA)", 0.7);
  ctx.restore();
  ctx.fillStyle = "#ffd0a4";
  ctx.beginPath();
  ctx.arc(17, -3, 1.2, 0, TAU_); ctx.arc(17, 3, 1.2, 0, TAU_);
  ctx.fill();
  if (e.elite) {
    ctx.strokeStyle = "#e1b86b";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(5, -9); ctx.lineTo(9, -17); ctx.lineTo(13, -9);
    ctx.stroke();
  }
}

function drawKing(ctx, e, t) {
  const step = Math.sin(t * 2.5 + e.phase);
  // Aura spikes.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 10; i++) {
    const a = t * 0.48 + i * TAU_ / 10;
    const r = e.radius + 18 + Math.sin(t * 2 + i) * 5;
    ctx.strokeStyle = `rgba(228,74,79,${0.12 + Math.sin(t * 2.3 + i) * 0.05})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (e.radius * 0.6), Math.sin(a) * (e.radius * 0.6));
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();

  // Robe.
  const robe = ctx.createLinearGradient(-30, -20, 30, 40);
  robe.addColorStop(0, "#40232a");
  robe.addColorStop(0.5, "#24151c");
  robe.addColorStop(1, "#0e0a0e");
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-25, -13);
  ctx.quadraticCurveTo(-34, 20, -20, 39);
  ctx.lineTo(-10, 32); ctx.lineTo(0, 43); ctx.lineTo(11, 31); ctx.lineTo(22, 40);
  ctx.quadraticCurveTo(34, 18, 24, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(172,99,75,.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ribcage armor.
  ctx.fillStyle = "#3b2d2c";
  ctx.beginPath();
  ctx.ellipse(0, -5, 25, 22, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#a98e6d";
  ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(-2, i * 6, 13, -0.9, 0.9);
    ctx.stroke();
  }
  // Pauldrons.
  ctx.fillStyle = "#55423a";
  ctx.beginPath();
  ctx.ellipse(-21, -12, 11, 8, -0.3, 0, TAU_);
  ctx.ellipse(21, -12, 11, 8, 0.3, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#c3a268";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Arms and great blade.
  ctx.strokeStyle = "#6e4c40";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(16, -16); ctx.lineTo(31, -4 + step);
  ctx.moveTo(-16, -15); ctx.lineTo(-27, 3 - step);
  ctx.stroke();
  ctx.save();
  ctx.translate(34, -2);
  ctx.rotate(-0.34);
  ctx.strokeStyle = "#65503c";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-4, 17); ctx.lineTo(28, -13);
  ctx.stroke();
  ctx.fillStyle = "#d1c0a3";
  ctx.beginPath();
  ctx.moveTo(28, -13); ctx.lineTo(45, -31); ctx.lineTo(34, -7); ctx.lineTo(18, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ff6a64";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(28, -13); ctx.lineTo(42, -28);
  ctx.stroke();
  ctx.restore();

  // Skull.
  ctx.fillStyle = "#cbbb9d";
  ctx.beginPath();
  ctx.ellipse(0, -22, 12, 13, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#5c4b3e";
  ctx.stroke();
  // Jaw.
  ctx.fillStyle = "#ad9d83";
  ctx.beginPath();
  ctx.ellipse(0, -10, 8, 4.5, 0, 0, TAU_);
  ctx.fill();
  ctx.strokeStyle = "#3c2e2a";
  ctx.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 2.5, -12); ctx.lineTo(i * 2.5, -8);
    ctx.stroke();
  }
  // Eyes.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, -4.2, -24, 9, "rgba(255,71,68,ALPHA)", 0.9);
  glow(ctx, 4.2, -24, 9, "rgba(255,71,68,ALPHA)", 0.9);
  ctx.restore();
  ctx.fillStyle = "#ffb48f";
  ctx.beginPath();
  ctx.ellipse(-4.2, -24, 2, 2.8, 0, 0, TAU_);
  ctx.ellipse(4.2, -24, 2, 2.8, 0, 0, TAU_);
  ctx.fill();
  // Crown.
  ctx.fillStyle = "#c9a355";
  ctx.strokeStyle = "#f0d38b";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-12, -31);
  ctx.lineTo(-14, -46); ctx.lineTo(-6, -38); ctx.lineTo(0, -50); ctx.lineTo(6, -38);
  ctx.lineTo(14, -46); ctx.lineTo(12, -31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#8b1c25";
  ctx.beginPath();
  ctx.arc(0, -35, 2, 0, TAU_);
  ctx.fill();
}

export function drawProjectile(ctx, p, t) {
  const ang = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.type === "crossbow") {
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(245,220,176,.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 0); ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.strokeStyle = "#a77e50";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#f7e4b8";
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(2, -3); ctx.lineTo(5, 0); ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();
  } else if (p.type === "daggers") {
    ctx.rotate(ang);
    ctx.fillStyle = "#baf5e1";
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-5, -2.2); ctx.lineTo(-8, 0); ctx.lineTo(-5, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(98,233,194,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(-5, 0);
    ctx.stroke();
  } else if (p.type === "wand") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, 0, 0, 16, "rgba(159,116,255,ALPHA)", 0.55);
    ctx.restore();
    ctx.fillStyle = "#dbc6ff";
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU_);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-1, -1, 1.1, 0, TAU_);
    ctx.fill();
    ctx.strokeStyle = "rgba(150,105,255,.3)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(ang) * 16, -Math.sin(ang) * 16);
    ctx.lineTo(0, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFoeShot(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, 0, 0, p.r * 3.2, p.color === "bone" ? "rgba(246,220,170,ALPHA)" : "rgba(213,68,78,ALPHA)", 0.5);
  ctx.globalCompositeOperation = "source-over";
  if (p.color === "bone") {
    const ang = Math.atan2(p.vy, p.vx);
    ctx.rotate(ang);
    ctx.strokeStyle = "#e5d7b7";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.fillStyle = "#f2e5c8";
    ctx.beginPath();
    ctx.moveTo(9, 0); ctx.lineTo(4, -2.5); ctx.lineTo(4, 2.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#ffb2ad";
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, TAU_);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-1, -1, p.r * 0.4, 0, TAU_);
    ctx.fill();
  }
  ctx.restore();
}

export function drawItemGlyph(ctx, type, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#d6c7af";
  ctx.fillStyle = "#c7b89f";
  ctx.lineWidth = Math.max(1, size * 0.055);
  ctx.lineCap = "round";
  const s = size / 2;
  if (type === "scythe") {
    ctx.strokeStyle = "#9f8464";
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.75);
    ctx.lineTo(s * 0.5, -s * 0.55);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.arc(s * 0.3, -s * 0.45, s * 0.44, -2.3, 0.3);
    ctx.stroke();
  } else if (type === "crossbow") {
    ctx.strokeStyle = "#9f8464";
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, s * 0.7);
    ctx.moveTo(-s * 0.72, -s * 0.3); ctx.quadraticCurveTo(0, -s * 0.72, s * 0.72, -s * 0.3);
    ctx.stroke();
    ctx.strokeStyle = "#d8c8ab";
    ctx.lineWidth = size * 0.025;
    ctx.beginPath();
    ctx.moveTo(-s * 0.72, -s * 0.3); ctx.lineTo(0, s * 0.12); ctx.lineTo(s * 0.72, -s * 0.3);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.95); ctx.lineTo(s * 0.17, -s * 0.55); ctx.lineTo(-s * 0.17, -s * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (type === "wand") {
    ctx.strokeStyle = "#9f8464";
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, s * 0.8); ctx.lineTo(s * 0.25, -s * 0.35);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s * 0.38, -s * 0.53, s * 0.27, 0, TAU_);
    ctx.fill();
    ctx.strokeStyle = "#e4d1ff";
    ctx.lineWidth = size * 0.02;
    ctx.stroke();
  } else if (type === "daggers") {
    ctx.strokeStyle = "#b9a98e";
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.7); ctx.lineTo(s * 0.25, -s * 0.55);
    ctx.moveTo(s * 0.7, s * 0.7); ctx.lineTo(-s * 0.25, -s * 0.55);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.035;
    ctx.stroke();
  } else if (type === "helm") {
    ctx.fillStyle = "#726257";
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, s * 0.2);
    ctx.arc(0, 0, s * 0.7, Math.PI, 0);
    ctx.lineTo(s * 0.55, s * 0.45);
    ctx.lineTo(-s * 0.55, s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-s * 0.42, s * 0.03, s * 0.84, s * 0.11);
  } else if (type === "chest") {
    ctx.fillStyle = "#6e5a4b";
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.55);
    ctx.lineTo(-s * 0.82, -s * 0.2);
    ctx.lineTo(-s * 0.6, s * 0.1);
    ctx.lineTo(-s * 0.5, s * 0.75);
    ctx.lineTo(s * 0.5, s * 0.75);
    ctx.lineTo(s * 0.6, s * 0.1);
    ctx.lineTo(s * 0.82, -s * 0.2);
    ctx.lineTo(s * 0.55, -s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.035;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.48); ctx.lineTo(0, s * 0.7);
    ctx.stroke();
  } else if (type === "boots") {
    ctx.fillStyle = "#6e5a4b";
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.6);
    ctx.lineTo(-s * 0.12, -s * 0.6);
    ctx.lineTo(-s * 0.12, s * 0.2);
    ctx.quadraticCurveTo(s * 0.7, s * 0.25, s * 0.72, s * 0.7);
    ctx.lineTo(-s * 0.55, s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
  } else if (type === "amulet") {
    ctx.strokeStyle = "#b29462";
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.55, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.25, 0, s * 0.75);
    ctx.quadraticCurveTo(s * 0.5, s * 0.25, 0, -s * 0.05);
    ctx.fill();
  } else if (type === "ring") {
    ctx.strokeStyle = "#c0a063";
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.arc(0, s * 0.22, s * 0.46, 0, TAU_);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.72); ctx.lineTo(s * 0.28, -s * 0.3); ctx.lineTo(0, -s * 0.05); ctx.lineTo(-s * 0.28, -s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
