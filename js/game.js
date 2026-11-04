import { G, clamp } from "./state.js";
import { initWorld } from "./state.js";
import { resizeCanvas, renderFrame } from "./render.js";
import {
  startRun, updateGame, chooseBoon, equipItem, salvageItem, salvageCommons,
  unequipItem, reforgeItem, mendWounds, pauseGame, resumeGame, openInventory,
  closeInventory, toggleMute, abandonRun, restartRun, returnToTitle
} from "./engine.js";
import { initUI, showTitle } from "./ui.js";
import { playerDash, playerNova } from "./combat.js";
import { sound } from "./audio-instance.js";

/* ── input state ──────────────────────────────────────────────────────────── */

const keys = new Set();
const joystick = {
  active: false,
  pointerId: null,
  x: 0,
  y: 0
};

const el = {
  joystick: document.getElementById("joystick"),
  knob: document.getElementById("joystick-knob")
};

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0]
};

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function syncMovementInput() {
  if (G.mode !== "playing") {
    G.input = { x: 0, y: 0 };
    return;
  }
  let x = 0;
  let y = 0;
  for (const code of keys) {
    const dir = MOVE_KEYS[code];
    if (dir) {
      x += dir[0];
      y += dir[1];
    }
  }
  if (joystick.active) {
    x += joystick.x;
    y += joystick.y;
  }
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  G.input = { x, y };
}

function actionDash() {
  sound.ensure();
  playerDash();
}

function actionNova() {
  sound.ensure();
  playerNova();
}

/* ── keyboard ─────────────────────────────────────────────────────────────── */

window.addEventListener("keydown", (event) => {
  if (isTypingTarget(event.target)) return;
  const code = event.code;

  if (code === "Enter" && G.mode === "title") {
    event.preventDefault();
    startRun();
    return;
  }

  if (G.mode === "levelup" && (code === "Digit1" || code === "Digit2" || code === "Digit3")) {
    event.preventDefault();
    const index = Number(code.slice(-1)) - 1;
    const choice = G.levelupChoices?.[index];
    if (choice) chooseBoon(choice.id);
    return;
  }

  if (code === "M" || code === "KeyM") {
    event.preventDefault();
    toggleMute();
    return;
  }

  if (code === "KeyI" || code === "Tab") {
    event.preventDefault();
    if (G.mode === "playing" || G.mode === "paused") openInventory();
    else if (G.mode === "inventory") closeInventory();
    return;
  }

  if (code === "Escape") {
    event.preventDefault();
    if (G.mode === "inventory") closeInventory();
    else if (G.mode === "paused") resumeGame();
    else if (G.mode === "playing") pauseGame();
    return;
  }

  if (code === "Space") {
    event.preventDefault();
    if (!event.repeat) actionDash();
    return;
  }

  if (code === "KeyQ") {
    event.preventDefault();
    if (!event.repeat) actionNova();
    return;
  }

  if (MOVE_KEYS[code]) {
    keys.add(code);
    syncMovementInput();
    if (G.mode === "playing") event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (MOVE_KEYS[event.code]) {
    keys.delete(event.code);
    syncMovementInput();
  }
});

window.addEventListener("blur", () => {
  keys.clear();
  resetJoystick();
  syncMovementInput();
  if (G.mode === "playing") pauseGame();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && G.mode === "playing") {
    keys.clear();
    resetJoystick();
    syncMovementInput();
    pauseGame();
  }
});

/* ── touch joystick ───────────────────────────────────────────────────────── */

const JOYSTICK_RADIUS = 46;

function updateJoystick(clientX, clientY) {
  const rect = el.joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const len = Math.hypot(dx, dy);
  if (len > JOYSTICK_RADIUS) {
    dx = (dx / len) * JOYSTICK_RADIUS;
    dy = (dy / len) * JOYSTICK_RADIUS;
  }
  joystick.x = dx / JOYSTICK_RADIUS;
  joystick.y = dy / JOYSTICK_RADIUS;
  if (Math.hypot(joystick.x, joystick.y) < 0.12) {
    joystick.x = 0;
    joystick.y = 0;
  }
  el.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  syncMovementInput();
}

function resetJoystick() {
  joystick.active = false;
  joystick.pointerId = null;
  joystick.x = 0;
  joystick.y = 0;
  if (el.knob) el.knob.style.transform = "translate(0px, 0px)";
  syncMovementInput();
}

if (el.joystick) {
  el.joystick.addEventListener("pointerdown", (event) => {
    if (G.mode !== "playing") return;
    sound.ensure();
    event.preventDefault();
    joystick.active = true;
    joystick.pointerId = event.pointerId;
    try { el.joystick.setPointerCapture?.(event.pointerId); } catch { /* synthetic pointers */ }
    updateJoystick(event.clientX, event.clientY);
  });

  window.addEventListener("pointermove", (event) => {
    if (!joystick.active || event.pointerId !== joystick.pointerId) return;
    event.preventDefault();
    updateJoystick(event.clientX, event.clientY);
  }, { passive: false });

  const end = (event) => {
    if (event.pointerId !== joystick.pointerId) return;
    resetJoystick();
  };
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  el.joystick.addEventListener("lostpointercapture", end);
  window.addEventListener("blur", () => {
    if (joystick.active) resetJoystick();
  });
}

// Stop touch drag on the world from scrolling or selecting.
document.addEventListener("touchmove", (event) => {
  if (event.target.closest?.("#joystick, .mobile-ability")) return;
  if (G.mode === "playing") event.preventDefault();
}, { passive: false });

/* ── UI ───────────────────────────────────────────────────────────────────── */

initUI({
  start: () => {
    sound.ensure();
    startRun();
  },
  openInventory,
  pause: pauseGame,
  closeInventory,
  resume: resumeGame,
  abandon: abandonRun,
  restart: () => {
    sound.ensure();
    restartRun();
  },
  returnToTitle,
  toggleMute,
  dash: actionDash,
  nova: actionNova,
  salvageCommons,
  chooseBoon,
  equip: equipItem,
  salvage: salvageItem,
  unequip: unequipItem,
  reforge: reforgeItem,
  mendWounds
});

/* ── boot / loop ──────────────────────────────────────────────────────────── */

initWorld();
resizeCanvas();
showTitle();

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => {
  setTimeout(resizeCanvas, 120);
});

let last = performance.now();
let started = false;

function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  syncMovementInput();
  if (G.mode === "playing") updateGame(dt);
  renderFrame(now / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame((now) => {
  if (!started) {
    started = true;
    last = now;
  }
  frame(now);
});

// Expose a small debug surface for bug reports and manual verification.
window.__bloodmoon = { G, startRun, updateGame, renderFrame };
