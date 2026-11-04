/* THE DOOR — a game about standing at a door.
   Built quickly, on purpose. */

import * as THREE from '../vendor/three.module.js';
import { buildWorld } from './world.js';
import {
  createPerson, makeVisitorSpec, makeHumanSpec, makeAnomalySpec,
  animatePerson, addDeath, reactPerson,
} from './visitors.js';
import { AudioEngine } from './audio.js';
import { anomalyFaceSpec, faceCanvas } from './textures.js';

const $ = (id) => document.getElementById(id);
const els = {
  canvas: $('scene'), hud: $('hud'),
  guestCount: $('guest-count'), guestBar: $('guest-bar-fill'), guestSub: $('guest-sub'),
  objective: $('objective-text'), clock: $('clock'), doorStatus: $('door-status'),
  prompt: $('prompt'), subtitle: $('subtitle'), toast: $('toast'),
  title: $('title-screen'), start: $('start-btn'),
  letterScreen: $('letter-screen'), letterOk: $('letter-ok'),
  doorUI: $('door-ui'), doorPrompt: $('door-prompt-text'),
  peepBtn: $('peep-btn'), openBtn: $('open-btn'),
  peepUI: $('peep-ui'), peepGuests: $('peep-guests'), mask: $('peephole-mask'),
  speech: $('speech'), speaker: $('speaker'), line: $('line'),
  flashBtn: $('flash-btn'), knockBtn: $('knock-btn'), zoomBtn: $('zoom-btn'), backBtn: $('back-btn'),
  acceptBtn: $('accept-btn'), rejectBtn: $('reject-btn'),
  partyBanner: $('party-banner'), jumpscare: $('jumpscare'), killingTitle: $('killing-title'),
  ending: $('ending'), endingStamp: $('ending-stamp'), endingTitle: $('ending-title'),
  endingSub: $('ending-sub'), endingStats: $('ending-stats'), endingReview: $('ending-review'),
  restart: $('restart-btn'), mute: $('mute'),
  mobile: $('mobile-controls'), stickZone: $('stick-zone'), stickKnob: $('stick-knob'), touchUse: $('touch-use'),
  lookHint: $('look-hint'),
  flash: $('flash'), static: $('static'),
};

const audio = new AudioEngine();
const world = buildWorld();
const scene = world.scene;
world.lights.porch.intensity = 0;
world.lights.street.intensity = 10;

const renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = false;
renderer.setPixelRatio(1);

const camera = new THREE.PerspectiveCamera(70, 1, 0.04, 90);
camera.rotation.order = 'YXZ';

const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const portrait = () => window.innerWidth < window.innerHeight * 0.86;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = w < 760 ? 0.58 : 0.52;
  const rw = Math.max(260, Math.round(w * scale));
  const rh = Math.max(200, Math.round(h * scale));
  renderer.setSize(rw, rh, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ------------------------------------------------------------------ */
/* state                                                              */
/* ------------------------------------------------------------------ */

const State = {
  TITLE: 'title', INTRO: 'intro', LETTER: 'letter', DOOR: 'door',
  PEEP: 'peep', ANIM: 'anim', PARTY: 'party', DEATH: 'death', WIN: 'win',
};

let state = State.TITLE;
let guests = 0;
let turnedAway = 0;
let anomaliesRejected = 0;
let anomaliesAdmitted = 0;
let rounds = 0;
let current = null;
let crowd = [];
let roundSeq = 0;
let finalRound = false;
let partyTimer = 0;
let doorPhaseStart = 0;
let runStart = 0;
let endingShown = false;
let lastKnockAt = 0;
let flickerUntil = 0;
let noteAnim = null;
let jitter = 0;

const view = {
  pos: new THREE.Vector3(2.85, 1.62, 3.35),
  yaw: 0.34, pitch: -0.02, fov: 70,
};
let tween = null;
let shake = 0;

const peep = {
  active: false, yaw: 0, pitch: 0, zoom: false, flash: false,
  autoLineAt: 0, knockReadyAt: 0, fired: false,
};

const keys = new Set();
const joy = { x: 0, y: 0, active: false, id: null };
let dragging = false;
let dragId = null;
let lastX = 0;
let lastY = 0;

const DOOR_POS = new THREE.Vector3(0, 1.62, -2.55);
const PEEP_POS = new THREE.Vector3(0, 1.55, -4.58);
const PARTY_POS = new THREE.Vector3(0, 1.74, -3.35);
const INTRO_POS = new THREE.Vector3(0.25, 1.62, 2.75);

/* ------------------------------------------------------------------ */
/* tiny helpers                                                       */
/* ------------------------------------------------------------------ */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const $set = (el, on) => el.classList.toggle('hidden', !on);

let toastTimer = 0;
function toast(text, ms = 2200) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

let subTimer = 0;
function subtitle(text, ms = 3200) {
  els.subtitle.textContent = text;
  els.subtitle.classList.add('show');
  clearTimeout(subTimer);
  if (ms > 0) subTimer = setTimeout(() => els.subtitle.classList.remove('show'), ms);
}

function clearSubtitle() {
  els.subtitle.classList.remove('show');
  clearTimeout(subTimer);
}

function prompt(text) {
  if (!text) {
    els.prompt.classList.remove('show');
    els.prompt.textContent = '';
    return;
  }
  els.prompt.innerHTML = text;
  els.prompt.classList.add('show');
}

function setObjective(text) {
  els.objective.textContent = text;
}

function releaseLook() {
  if (document.pointerLockElement === els.canvas) document.exitPointerLock();
}

function flashScreen(red = false) {
  els.flash.classList.toggle('red', red);
  els.flash.classList.remove('on');
  void els.flash.offsetWidth;
  els.flash.classList.add('on');
  setTimeout(() => els.flash.classList.remove('on'), 620);
}

function fmtTime(total) {
  let h = Math.floor(total / 60) % 24;
  const m = Math.floor(total % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

function updateHud() {
  els.guestCount.textContent = String(guests);
  els.guestBar.style.width = `${Math.min(100, (guests / 50) * 100)}%`;
  els.clock.textContent = fmtTime(20 * 60 + 14 + guests * 5 + turnedAway * 2);
  els.peepGuests.textContent = `GUESTS ${guests}/50`;
  if (guests >= 50) els.guestSub.textContent = '50 humans. it is a party.';
  else if (guests >= 36) els.guestSub.textContent = 'almost 50 humans';
  else if (guests >= 20) els.guestSub.textContent = 'the party is growing';
  else if (guests >= 8) els.guestSub.textContent = 'it is becoming a party';
  else els.guestSub.textContent = 'let the humans in';
}

function setState(next) {
  state = next;
  const peeping = next === State.PEEP;
  $set(els.mask, peeping);
  $set(els.peepUI, peeping);
  $set(els.doorUI, next === State.DOOR);
  $set(els.mobile, next === State.INTRO && isTouch);
  $set(els.hud, next !== State.PEEP);
  els.doorStatus.textContent = world.door.target > 0.5 ? 'DOOR: OPEN' : 'DOOR: CLOSED';
  if (next === State.DOOR || next === State.PEEP || next === State.PARTY || next === State.DEATH) releaseLook();
}

function tweenView(toPos, yaw, pitch, fov = 70, dur = 1.0, onDone = null) {
  tween = {
    fromPos: view.pos.clone(), toPos: toPos.clone(),
    fromYaw: view.yaw, toYaw: yaw,
    fromPitch: view.pitch, toPitch: pitch,
    fromFov: view.fov, toFov: fov,
    t: 0, dur: Math.max(0.01, dur), onDone,
  };
}

function updateTween(dt) {
  if (!tween) return;
  tween.t += dt;
  const k = clamp(tween.t / tween.dur, 0, 1);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  view.pos.lerpVectors(tween.fromPos, tween.toPos, e);
  view.yaw = tween.fromYaw + (tween.toYaw - tween.fromYaw) * e;
  view.pitch = tween.fromPitch + (tween.toPitch - tween.fromPitch) * e;
  view.fov = tween.fromFov + (tween.toFov - tween.fromFov) * e;
  if (k >= 1) {
    const done = tween.onDone;
    tween = null;
    if (done) done();
  }
}

/* ------------------------------------------------------------------ */
/* title + letter                                                     */
/* ------------------------------------------------------------------ */

async function startGame() {
  if (state !== State.TITLE) return;
  $set(els.title, false);
  $set(els.hud, true);
  audio.init().catch(() => {});
  runStart = performance.now();
  state = State.INTRO;
  setState(State.INTRO);
  updateHud();
  setObjective('walk to the letter');
  view.pos.set(2.85, 1.62, 3.35);
  view.yaw = 0.34;
  view.pitch = -0.02;
  tweenView(INTRO_POS, 0.0, 0.0, 70, 1.25);
  subtitle('your house. 8:14 PM. nothing is wrong.', 3800);
  toast('the letter is by the door.', 2800);
  setTimeout(() => {
    els.lookHint.classList.remove('hidden');
    els.lookHint.classList.add('show');
    setTimeout(() => els.lookHint.classList.remove('show'), 7000);
  }, 1400);
  updateHud();
}

function openLetter() {
  if (state !== State.INTRO) return;
  releaseLook();
  state = State.LETTER;
  $set(els.letterScreen, true);
  $set(els.hud, false);
  $set(els.mobile, false);
  $set(els.doorUI, false);
  $set(els.peepUI, false);
  $set(els.mask, false);
  audio.click();
  prompt('');
}

function closeLetter() {
  if (state !== State.LETTER) return;
  $set(els.letterScreen, false);
  $set(els.hud, true);
  state = State.DOOR;
  setState(State.DOOR);
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  world.letter.visible = false;
  world.letterGlow.visible = false;
  doorPhaseStart = performance.now();
  setObjective('stand at the door');
  audio.click();
  audio.doorSlam();
  shake = 0.035;
  flickerUntil = performance.now() / 1000 + 0.9;
  setTimeout(() => {
    if (state !== State.DOOR) return;
    world.lights.porch.intensity = 22;
    audio.boom();
    subtitle('...', 1200);
  }, 500);
  setTimeout(() => {
    if (state !== State.DOOR) return;
    beginRound();
  }, 2200);
}

/* ------------------------------------------------------------------ */
/* round building                                                     */
/* ------------------------------------------------------------------ */

function disposePerson(p) {
  p.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      if (m.map && m.map.dispose) m.map.dispose();
      m.dispose();
    }
  });
  if (p.parent) p.parent.remove(p);
}

function clearVisitors() {
  for (const p of [...world.visitorsGroup.children]) disposePerson(p);
  current = null;
  peep.fired = false;
  peep.active = false;
  $set(els.speech, false);
}

function layoutVisitor(i, n) {
  if (portrait()) {
    if (n <= 2) return { x: (i - (n - 1) / 2) * 0.52, z: -6.28 };
    const row = i % 2;
    const col = Math.floor(i / 2);
    const rowCount = Math.ceil(n / 2);
    return { x: (col - (rowCount - 1) / 2) * 0.58, z: -6.05 - row * 0.72 };
  }
  return { x: (i - (n - 1) / 2) * 0.58, z: -6.3 - (i % 2) * 0.1 };
}

function buildVisitors(spec) {
  const n = spec.people.length;
  const people = [];
  spec.people.forEach((ps, i) => {
    const p = createPerson(ps);
    const pos = layoutVisitor(i, n);
    p.position.set(pos.x, 0, pos.z);
    p.rotation.y = 0;
    world.visitorsGroup.add(p);
    people.push(p);
  });
  const first = spec.people[0];
  const name = first.kind === 'anomaly' ? '???' : first.name.toUpperCase();
  const extra = spec.people.length > 1 ? ` + ${spec.people.length - 1}` : '';
  return {
    spec,
    people,
    isAnomaly: spec.people.some((p) => p.kind === 'anomaly'),
    anomalyPerson: people.find((p) => p.userData.isAnomaly) || null,
    speaker: name + extra,
    line: first.line,
    final: false,
  };
}

function beginRound(forceKind = null, forceTell = null, opts = {}) {
  if (state === State.DEATH || state === State.WIN || state === State.PARTY) return;
  clearVisitors();
  $set(els.ending, false);
  rounds += 1;
  const seq = ++roundSeq;

  let anomaly = false;
  if (forceKind === 'anomaly') anomaly = true;
  else if (forceKind === 'human') anomaly = false;
  else if (rounds > 2) anomaly = Math.random() < (0.24 + Math.min(0.16, (guests / 50) * 0.16));

  const spec = makeVisitorSpec({ anomaly, guests, primary: forceTell });
  current = buildVisitors(spec);
  current.final = Boolean(opts.final);
  finalRound = Boolean(opts.final);

  setState(State.DOOR);
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  setObjective(opts.final ? 'one last guest' : 'someone is at the door');
  els.doorPrompt.textContent = opts.final ? 'someone is at the door. (last one.)' : 'someone is at the door.';
  updateHud();
  audio.knock(3);
  shake = 0.02;
  if (seq !== roundSeq) return;
}

/* ------------------------------------------------------------------ */
/* peephole                                                           */
/* ------------------------------------------------------------------ */

function showSpeech(speaker, line) {
  if (!speaker || !line) return;
  els.speaker.textContent = speaker;
  els.line.textContent = line;
  $set(els.speech, true);
}

function showInitialSpeech() {
  if (state !== State.PEEP || !current) return;
  showSpeech(current.speaker, current.line);
  audio.voice(current.isAnomaly ? 'anomaly' : 'human');
}

function enterPeep(silent = false) {
  if (!current || (state !== State.DOOR && state !== State.PEEP)) return;
  state = State.PEEP;
  peep.active = true;
  peep.yaw = 0;
  peep.pitch = 0;
  peep.zoom = false;
  peep.flash = false;
  peep.knockReadyAt = 0;
  view.pos.copy(PEEP_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = portrait() ? 80 : 68;
  setState(State.PEEP);
  els.flashBtn.classList.remove('on');
  els.zoomBtn.classList.remove('on');
  els.knockBtn.classList.remove('on');
  $set(els.speech, false);
  setObjective('count the eyes. count the arms.');
  audio.click();
  if (!silent) {
    setTimeout(() => {
      if (state === State.PEEP) showInitialSpeech();
    }, 520);
  } else {
    setTimeout(() => {
      if (state === State.PEEP) showInitialSpeech();
    }, 220);
  }
}

function exitPeep() {
  if (state !== State.PEEP) return;
  state = State.DOOR;
  peep.active = false;
  peep.zoom = false;
  peep.flash = false;
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  setState(State.DOOR);
  world.lights.porch.intensity = 22;
  $set(els.speech, false);
  setObjective('someone is at the door');
  audio.click();
}

function toggleFlash() {
  if (state !== State.PEEP) return;
  peep.flash = !peep.flash;
  els.flashBtn.classList.toggle('on', peep.flash);
  audio.click();
}

function toggleZoom() {
  if (state !== State.PEEP) return;
  peep.zoom = !peep.zoom;
  els.zoomBtn.classList.toggle('on', peep.zoom);
  audio.click();
}

function doKnock() {
  if (state !== State.PEEP || !current) return;
  const now = performance.now();
  if (now < peep.knockReadyAt) return;
  peep.knockReadyAt = now + 1250;
  audio.knock(2);
  shake = 0.012;
  for (const p of current.people) {
    reactPerson(p, now / 1000);
    if (p.userData.duplicate) reactPerson(p.userData.duplicate, now / 1000);
  }
  const person = current.people[0];
  if (person) {
    showSpeech(current.speaker, person.userData.reaction || person.userData.line);
    setTimeout(() => {
      if (state === State.PEEP) audio.voice(current && current.isAnomaly ? 'anomaly' : 'human');
    }, 120);
  }
  if (current.isAnomaly) {
    setTimeout(() => audio.whisper(0.35), 280);
  }
}

/* ------------------------------------------------------------------ */
/* decisions                                                          */
/* ------------------------------------------------------------------ */

function decide(accept) {
  if (!current) return;
  if (state !== State.PEEP && state !== State.DOOR) return;
  if (!accept && state === State.DOOR) return;
  const anomaly = current.isAnomaly;
  const final = current.final;
  state = State.ANIM;
  roundSeq++;
  peep.active = false;
  peep.zoom = false;
  peep.flash = false;
  $set(els.mask, false);
  $set(els.peepUI, false);
  $set(els.doorUI, false);
  $set(els.speech, false);
  $set(els.hud, true);
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  world.lights.porch.intensity = 22;
  audio.click();

  if (accept) {
    if (anomaly) startKilling();
    else acceptHumans();
  } else {
    if (final) finalReject();
    else rejectVisitors(anomaly);
  }
}

function crowdSpot(i = 0) {
  for (let k = 0; k < 30; k++) {
    const x = rnd(-3.8, 3.9);
    const z = rnd(-1.35, 3.45);
    if (x < -3.3 && z > -0.2 && z < 3.1) continue;
    if (x > 3.3 && z > -0.2 && z < 3.3) continue;
    if (Math.hypot(x - 0.35, z - 1.1) < 1.18) continue;
    return { x, z };
  }
  const a = (i / 50) * Math.PI * 2;
  return { x: Math.cos(a) * 2.2, z: 1.1 + Math.sin(a) * 1.8 };
}

function acceptHumans() {
  const c = current;
  if (!c) return;
  const people = [...c.people];
  const n = people.length;
  guests = Math.min(50, guests + n);
  anomaliesAdmitted += 0;
  updateHud();
  world.setDoorOpen(1);
  els.doorStatus.textContent = 'DOOR: OPEN';
  audio.doorCreak(true);
  audio.cheer();
  shake = 0.025;

  const lvl = Math.min(5, Math.floor(guests / 10));
  world.setPartyLevel(lvl);
  audio.setPartyLevel(guests / 50);
  setObjective(guests >= 50 ? 'it is time' : 'the party grows');
  if (guests >= 50) toast('50 HUMANS. IT IS TIME.', 3200);
  else toast(`+${n} human${n > 1 ? 's' : ''}. the party grows.`, 2300);

  setTimeout(() => {
    scene.updateMatrixWorld(true);
    people.forEach((p, i) => {
      const spot = crowdSpot(i);
      const side = i % 2 === 0 ? 0.9 : -0.9;
      world.crowdGroup.attach(p);
      p.userData.walk = {
        points: [
          p.position.clone(),
          new THREE.Vector3(0, 0, -4.15),
          new THREE.Vector3(side, 0, -3.35),
          new THREE.Vector3(spot.x, 0, spot.z),
        ],
        t: 0,
        dur: 1.65 + Math.random() * 0.55,
      };
      p.userData.phase = Math.random() * Math.PI * 2;
      p.userData.dance = Math.random() < 0.45;
      crowd.push({ person: p, spot, arrived: false, dance: Math.random() < 0.5 });
    });
    current = null;
  }, 420);

  setTimeout(() => {
    world.setDoorOpen(0);
    audio.doorSlam();
    els.doorStatus.textContent = 'DOOR: CLOSED';
    shake = 0.02;
  }, 1450);

  setTimeout(() => {
    if (state !== State.ANIM) return;
    if (guests >= 50) startHouseParty();
    else beginRound();
  }, 2050);
}

function rejectVisitors(anomaly) {
  const c = current;
  if (!c) return;
  if (anomaly) anomaliesRejected += 1;
  else turnedAway += 1;
  updateHud();
  audio.click();

  if (anomaly) {
    setObjective('do not open it');
    subtitle('it did not like that.', 1800);
    setTimeout(() => {
      if (state !== State.ANIM) return;
      audio.knock(3);
      shake = 0.05;
      flashScreen(true);
      audio.voice('anomaly');
      setTimeout(() => audio.whisper(0.5), 350);
    }, 380);
    setTimeout(() => {
      if (state !== State.ANIM) return;
      clearVisitors();
      beginRound();
    }, 2100);
  } else {
    setObjective('wait for the next knock');
    subtitle(`${c.speaker}: ok...`, 2100);
    audio.voice('human');
    setTimeout(() => {
      if (state !== State.ANIM) return;
      c.people.forEach((p) => {
        p.userData.leaveAt = 0;
        p.userData.leaveDir = Math.random() < 0.5 ? -1 : 1;
      });
    }, 500);
    setTimeout(() => {
      if (state !== State.ANIM) return;
      clearVisitors();
      beginRound();
    }, 2200);
  }
}

/* ------------------------------------------------------------------ */
/* crowd                                                              */
/* ------------------------------------------------------------------ */

function updateCrowd(dt, t) {
  for (const c of crowd) {
    const p = c.person;
    const ud = p.userData;
    if (ud.walk) {
      ud.walk.t += dt;
      const k = clamp(ud.walk.t / ud.walk.dur, 0, 1);
      const pts = ud.walk.points;
      const seg = k * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(seg));
      const f = seg - i;
      const ease = f * f * (3 - 2 * f);
      p.position.lerpVectors(pts[i], pts[i + 1], ease);
      const dirX = pts[i + 1].x - pts[i].x;
      const dirZ = pts[i + 1].z - pts[i].z;
      if (Math.abs(dirX) + Math.abs(dirZ) > 0.001) p.rotation.y = Math.atan2(dirX, dirZ);
      if (k >= 1) {
        ud.walk = null;
        c.arrived = true;
        p.position.set(c.spot.x, 0, c.spot.z);
      }
    }
    if (!ud.walk) {
      const dance = state === State.PARTY || guests >= 50 || c.dance;
      animatePerson(p, t, ud.dead ? 'idle' : (dance ? 'dance' : 'idle'));
    } else {
      animatePerson(p, t, 'idle');
    }
  }
}

function updateVisitors(dt, t) {
  for (const p of world.visitorsGroup.children) {
    const ud = p.userData;
    if (ud.leaveAt !== undefined) {
      ud.leaveAt += dt;
      p.position.x += ud.leaveDir * dt * 1.4;
      p.position.z -= dt * 0.9;
    }
    if (ud.isAnomaly && ud.tells.includes('float')) {
      p.position.y = 0;
    }
    animatePerson(p, t, 'idle');
    if (ud.duplicate) animatePerson(ud.duplicate, t + 0.4, 'idle');
  }
}

function updateMovement(dt) {
  if (tween) return;
  let f = 0;
  let s = 0;
  if (keys.has('w')) f += 1;
  if (keys.has('s')) f -= 1;
  if (keys.has('d')) s += 1;
  if (keys.has('a')) s -= 1;
  f += joy.y;
  s += joy.x;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const speed = 2.8;
  if (len > 0.02) {
    const fx = -Math.sin(view.yaw);
    const fz = -Math.cos(view.yaw);
    const rx = Math.cos(view.yaw);
    const rz = -Math.sin(view.yaw);
    view.pos.x += (fx * f + rx * s) * speed * dt;
    view.pos.z += (fz * f + rz * s) * speed * dt;
    view.pos.x = clamp(view.pos.x, -4.25, 4.25);
    view.pos.z = clamp(view.pos.z, -3.95, 4.25);
    player.bob += dt * 9;
    player.stepAcc = (player.stepAcc || 0) + speed * dt;
    if (player.stepAcc > 1.1) {
      player.stepAcc = 0;
      audio.step();
    }
  }
  if (keys.has('arrowleft')) view.yaw += dt * 1.8;
  if (keys.has('arrowright')) view.yaw -= dt * 1.8;
  if (keys.has('arrowup')) view.pitch = clamp(view.pitch + dt * 1.2, -1.1, 1.1);
  if (keys.has('arrowdown')) view.pitch = clamp(view.pitch - dt * 1.2, -1.1, 1.1);
}

let nearLetter = false;
let lastPrompt = null;
function updateNearLetter() {
  const dx = view.pos.x - world.letter.position.x;
  const dz = view.pos.z - world.letter.position.z;
  nearLetter = Math.hypot(dx, dz) < 1.45;
  const p = nearLetter ? (isTouch
    ? 'TAP <span class="key">E</span> TO READ THE LETTER'
    : 'PRESS <span class="key">E</span> TO READ THE LETTER') : '';
  if (p !== lastPrompt) {
    lastPrompt = p;
    prompt(p);
    els.touchUse.textContent = nearLetter ? 'READ' : 'USE';
  }
}

/* ------------------------------------------------------------------ */
/* house party                                                        */
/* ------------------------------------------------------------------ */

function startHouseParty() {
  if (state === State.DEATH || state === State.WIN) return;
  state = State.PARTY;
  guests = 50;
  updateHud();
  clearVisitors();
  $set(els.doorUI, false);
  $set(els.peepUI, false);
  $set(els.mask, false);
  $set(els.partyBanner, true);
  setState(State.PARTY);
  setObjective('have a house party');
  releaseLook();
  world.setPartyLevel(5);
  world.setDoorOpen(0);
  world.lights.porch.intensity = 14;
  world.horror = false;
  audio.setMode('party');
  audio.setPartyLevel(1);
  audio.cheer();
  crowd.forEach((c) => { c.dance = true; });
  tweenView(PARTY_POS, Math.PI, 0.04, 74, 1.35);
  subtitle('you did it. 50 humans. nothing can go wrong.', 4000);
  setTimeout(() => $set(els.partyBanner, false), 4800);
  setTimeout(() => {
    if (state === State.PARTY) partyInterrupted();
  }, 9200);
}

function showFinalNote() {
  world.letter.visible = true;
  world.letter.position.set(0.32, 0.02, -4.28);
  world.letter.rotation.z = 0.16;
  world.letterGlow.visible = false;
  noteAnim = { t: 0, from: -4.28, to: -3.32 };
  subtitle("a note slides under the door: 'one more. let me in. i am the tall one.'", 5200);
  audio.whisper(0.5);
}

function partyInterrupted() {
  state = State.ANIM;
  $set(els.partyBanner, false);
  $set(els.doorUI, false);
  $set(els.peepUI, false);
  audio.knock(3);
  shake = 0.025;
  subtitle('...', 1400);
  tweenView(DOOR_POS, 0, 0, 70, 1.0, () => {
    if (state !== State.ANIM) return;
    showFinalNote();
    setTimeout(() => {
      if (state === State.ANIM) beginFinalRound();
    }, 1900);
  });
}

function beginFinalRound() {
  clearVisitors();
  const spec = makeAnomalySpec('tall');
  spec.tells = ['tall', 'eyes', 'shadow'];
  spec.height = 1.34;
  spec.noShadow = true;
  spec.faceSpec = anomalyFaceSpec('eyes', { skin: spec.skin });
  spec.line = 'hello. i am the tall one.';
  spec.reaction = 'you know who i am.';
  current = buildVisitors({ people: [spec] });
  current.final = true;
  finalRound = true;
  world.letter.visible = false;
  noteAnim = null;
  setState(State.DOOR);
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  setObjective('do not open the door');
  els.doorPrompt.textContent = 'someone is at the door. (last one.)';
  audio.knock(3);
  shake = 0.03;
}

/* ------------------------------------------------------------------ */
/* killing party                                                      */
/* ------------------------------------------------------------------ */

function jumpscare(url, quick = false) {
  if (!url) return;
  els.jumpscare.style.backgroundImage = `url("${url}")`;
  els.jumpscare.classList.remove('on', 'quick');
  void els.jumpscare.offsetWidth;
  els.jumpscare.classList.add(quick ? 'quick' : 'on');
  flashScreen(true);
  shake = quick ? 0.13 : 0.28;
  setTimeout(() => els.jumpscare.classList.remove('on', 'quick'), quick ? 520 : 1200);
}

function startKilling() {
  if (state === State.DEATH) return;
  anomaliesAdmitted += 1;
  const c = current;
  const anomalyPerson = c && (c.anomalyPerson || c.people[0]);
  const anomalyURL = anomalyPerson && anomalyPerson.userData.face ? anomalyPerson.userData.face.dataURL : null;
  const scareFace = faceCanvas({
    ...anomalyFaceSpec('scream', { skin: '#c9b7a0' }),
    eyeCount: 4, eyeSize: 9, mouth: 'scream', mouthY: 62,
  }, 144).toDataURL();

  state = State.DEATH;
  roundSeq++;
  peep.active = false;
  $set(els.mask, false);
  $set(els.peepUI, false);
  $set(els.doorUI, false);
  $set(els.speech, false);
  $set(els.hud, false);
  $set(els.partyBanner, false);
  releaseLook();
  document.body.classList.add('killing', 'glitch');
  els.static.classList.add('on');
  setObjective('killing party');
  world.horror = true;
  world.setDoorOpen(1);
  world.lights.porch.intensity = 4;
  world.lights.street.intensity = 0;
  audio.setMode('horror');
  audio.scare();
  audio.boom();
  flashScreen(true);
  shake = 0.22;

  if (world.cat) world.cat.visible = false;

  // the thing comes inside
  if (anomalyPerson) {
    anomalyPerson.position.set(0, 0, -6.1);
    anomalyPerson.rotation.y = 0;
    setTimeout(() => {
      if (anomalyPerson) {
        anomalyPerson.position.set(0, 0, -3.05);
        anomalyPerson.scale.set(1.02, anomalyPerson.userData.spec.height || 1.1, 1.02);
      }
      audio.doorSlam();
      world.setDoorOpen(0);
      shake = 0.12;
    }, 420);
  }

  crowd.forEach((entry, i) => {
    entry.person.userData.walk = null;
    entry.dance = false;
    setTimeout(() => {
      addDeath(entry.person, Math.random() < 0.5 ? -1 : 1);
    }, 480 + Math.random() * 1250);
  });

  setTimeout(() => { jumpscare(anomalyURL, false); audio.scare(); }, 760);
  setTimeout(() => { jumpscare(scareFace, true); audio.scare(); flashScreen(true); }, 2050);
  setTimeout(() => {
    $set(els.killingTitle, true);
    audio.badJingle();
  }, 2350);
  setTimeout(() => $set(els.killingTitle, false), 5400);
  setTimeout(() => {
    showEnding(false);
    els.static.classList.remove('on');
  }, 6000);
}

function finalReject() {
  const c = current;
  const faceURL = c && c.anomalyPerson ? c.anomalyPerson.userData.face.dataURL : null;
  setObjective('do not open it');
  subtitle('you kept the door closed.', 2100);
  audio.knock(3);
  shake = 0.04;
  setTimeout(() => {
    if (state !== State.ANIM) return;
    jumpscare(faceURL, true);
    audio.scare();
    shake = 0.12;
  }, 900);
  setTimeout(() => {
    if (state !== State.ANIM) return;
    subtitle('...fine.', 1700);
    audio.whisper(0.7);
    setTimeout(() => audio.knock(1), 500);
  }, 1550);
  setTimeout(() => {
    if (state === State.ANIM) winGame();
  }, 3100);
}

function winGame() {
  if (state === State.WIN) return;
  state = State.WIN;
  finalRound = false;
  clearVisitors();
  $set(els.doorUI, false);
  $set(els.peepUI, false);
  $set(els.mask, false);
  $set(els.speech, false);
  $set(els.killingTitle, false);
  $set(els.partyBanner, false);
  document.body.classList.remove('killing', 'glitch');
  els.static.classList.remove('on');
  world.horror = false;
  world.setPartyLevel(5);
  world.setDoorOpen(0);
  world.lights.room.color.setHex(0xffc883);
  world.lights.fill.color.setHex(0xffb070);
  world.lights.room.intensity = 26;
  world.lights.fill.intensity = 12;
  world.lights.porch.intensity = 14;
  world.lights.street.intensity = 10;
  if (world.cat) world.cat.visible = true;
  crowd.forEach((c) => { c.dance = true; });
  audio.stopMusic();
  setTimeout(() => audio.jingle(), 250);
  setObjective('survived');
  tweenView(PARTY_POS, Math.PI, 0.04, 74, 1.2);
  setTimeout(() => showEnding(true), 1900);
}

function timeAtDoor() {
  if (!doorPhaseStart) return '0m 0s';
  const s = Math.floor((performance.now() - doorPhaseStart) / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

function showEnding(win) {
  if (endingShown) return;
  endingShown = true;
  state = win ? State.WIN : State.DEATH;
  releaseLook();
  $set(els.hud, false);
  $set(els.doorUI, false);
  $set(els.peepUI, false);
  $set(els.mask, false);
  $set(els.speech, false);
  $set(els.killingTitle, false);
  $set(els.ending, true);
  els.ending.classList.toggle('win', win);
  els.endingStamp.textContent = win ? 'ALIVE' : 'DEAD';
  els.endingTitle.textContent = win ? 'YOU KEPT THE DOOR CLOSED.' : 'YOU LET IT IN.';
  els.endingSub.textContent = win
    ? 'The party continued until 4am. Nothing bad happened. Probably.'
    : 'The killing party was a huge success. Everyone died. The chips were untouched.';
  const seconds = doorPhaseStart ? Math.floor((performance.now() - doorPhaseStart) / 1000) : 0;
  const minutes = Math.floor(seconds / 60);
  els.endingStats.innerHTML = win
    ? `<div class="stat"><div class="stat-num">50</div><div class="stat-label">GUESTS</div></div>
       <div class="stat"><div class="stat-num">${anomaliesRejected}</div><div class="stat-label">KEPT OUT</div></div>
       <div class="stat"><div class="stat-num">${minutes}m</div><div class="stat-label">STOOD AT DOOR</div></div>`
    : `<div class="stat"><div class="stat-num">${guests}</div><div class="stat-label">HUMANS TRUSTED</div></div>
       <div class="stat"><div class="stat-num">${turnedAway}</div><div class="stat-label">TURNED AWAY</div></div>
       <div class="stat"><div class="stat-num">1</div><div class="stat-label">BAD ONE LET IN</div></div>`;
  const reviews = win
    ? [
      `“I stood at a door for ${minutes} minutes and all I got was this lousy party. 9/10.” — The Door Review`,
      `“The tall one never got in. My hero. The chips were okay.” — A Guest`,
      `“Kept ${anomaliesRejected} freaks out and ${turnedAway} friends out. Balanced.” — The Door Review`,
    ]
    : [
      '“I let one tall guy in and now the party is a pile of people. 2/10. Chips were fine.” — The Door Review',
      '“The music was good for a while. Then everyone died. 4/10.” — A Guest (deceased)',
      '“Should have counted the eyes. Should have counted the arms. Should have stayed home.” — The Door Review',
    ];
  els.endingReview.textContent = reviews[(Math.random() * reviews.length) | 0];
  els.restart.textContent = win ? 'PLAY AGAIN' : 'TRY AGAIN';
  if (!win) {
    setTimeout(() => audio.badJingle(), 500);
  }
}

/* ------------------------------------------------------------------ */
/* update loop                                                        */
/* ------------------------------------------------------------------ */

function updatePeepState(dt, t) {
  if (!peep.active) return;
  const targetFov = peep.zoom ? (portrait() ? 48 : 34) : (portrait() ? 80 : 68);
  view.fov += (targetFov - view.fov) * Math.min(1, dt * 8);
  view.yaw = peep.yaw;
  view.pitch = peep.pitch;
  const targetLight = peep.flash ? 72 : 22;
  world.lights.porch.intensity += (targetLight - world.lights.porch.intensity) * Math.min(1, dt * 10);
}

function updateNote(dt) {
  if (!noteAnim) return;
  noteAnim.t += dt;
  const k = clamp(noteAnim.t / 1.0, 0, 1);
  const e = 1 - Math.pow(1 - k, 3);
  world.letter.position.z = noteAnim.from + (noteAnim.to - noteAnim.from) * e;
  world.letter.rotation.z = 0.16 + Math.sin(k * Math.PI) * 0.12;
  if (k >= 1) noteAnim = null;
}

function updateGame(dt, t) {
  world.update(t, dt);

  if (state === State.TITLE) {
    if (!tween) {
      view.pos.set(2.85 + Math.sin(t * 0.11) * 0.12, 1.62, 3.35);
      view.yaw = 0.34 + Math.sin(t * 0.07) * 0.03;
      view.pitch = -0.02;
      view.fov = 70;
    }
  } else if (state === State.INTRO) {
    if (!tween) updateMovement(dt);
    updateNearLetter();
  } else if (state === State.PEEP) {
    updatePeepState(dt, t);
  } else if (state === State.DEATH) {
    world.lights.room.color.setHex(0xff2a1a);
    world.lights.fill.color.setHex(0xff0808);
    world.lights.room.intensity = Math.random() < 0.12 ? 4 : 14 + Math.random() * 22;
    world.lights.fill.intensity = 3 + Math.random() * 10;
    world.lights.porch.intensity = Math.random() < 0.15 ? 2 : 0;
    world.lights.party.forEach((l) => {
      l.color.setHex(0xd81408);
      l.intensity = 4 + Math.random() * 10;
    });
  } else if (state === State.WIN) {
    world.lights.room.intensity = 26;
    world.lights.fill.intensity = 12;
  }

  if ((state === State.DOOR || state === State.PEEP || state === State.ANIM) && !world.horror) {
    const now = performance.now() / 1000;
    if (now < flickerUntil) {
      world.lights.room.intensity = rnd(4, 30);
      world.lights.fill.intensity = rnd(2, 9);
    } else {
      world.lights.room.intensity = 17;
      world.lights.fill.intensity = 6;
    }
  }

  updateNote(dt);
  updateVisitors(dt, t);
  updateCrowd(dt, t);

  if (state === State.TITLE && !isTouch) {
    // title viewer sees the room; no UI prompt
  }
}

function updateCamera(dt, t) {
  updateTween(dt);
  if (state === State.INTRO && !tween) {
    camera.position.copy(view.pos);
    camera.position.y += Math.sin(player.bob) * 0.018;
  } else if (state === State.PEEP) {
    camera.position.copy(PEEP_POS);
    camera.position.x += Math.sin(t * 0.8) * 0.003;
    camera.position.y += Math.sin(t * 1.3) * 0.004;
  } else {
    camera.position.copy(view.pos);
  }
  camera.rotation.set(view.pitch, view.yaw, 0);
  if (shake > 0.0005) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake * 0.5;
    camera.rotation.z += (Math.random() - 0.5) * shake * 0.7;
    shake *= Math.pow(0.0009, dt);
  } else {
    shake = 0;
  }
  if (Math.abs(camera.fov - view.fov) > 0.01) {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  } else if (camera.fov !== view.fov) {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
}

let lastTime = performance.now() / 1000;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now() / 1000;
  const dt = Math.min(0.1, Math.max(0.0001, now - lastTime));
  lastTime = now;
  updateGame(dt, now);
  updateCamera(dt, now);
  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/* input                                                              */
/* ------------------------------------------------------------------ */

function applyLook(dx, dy) {
  if (state === State.PEEP) {
    const scale = peep.zoom ? 0.00095 : 0.0018;
    peep.yaw = clamp(peep.yaw - dx * scale, -0.82, 0.82);
    peep.pitch = clamp(peep.pitch - dy * scale, -0.45, 0.45);
  } else if (state === State.INTRO || state === State.DOOR || state === State.PARTY) {
    view.yaw -= dx * 0.0021;
    view.pitch = clamp(view.pitch - dy * 0.0021, -1.1, 1.1);
  }
}

function interact() {
  if (state === State.INTRO) {
    if (nearLetter) openLetter();
    else toast('the letter is by the door.', 1500);
  } else if (state === State.LETTER) {
    closeLetter();
  }
}

function toggleMute() {
  audio.setMuted(!audio.muted);
  els.mute.textContent = `SOUND: ${audio.muted ? 'OFF' : 'ON'}`;
}

els.start.addEventListener('click', startGame);
els.letterOk.addEventListener('click', closeLetter);
els.peepBtn.addEventListener('click', () => enterPeep());
els.openBtn.addEventListener('click', () => decide(true));
els.flashBtn.addEventListener('click', toggleFlash);
els.knockBtn.addEventListener('click', doKnock);
els.zoomBtn.addEventListener('click', toggleZoom);
els.backBtn.addEventListener('click', exitPeep);
els.acceptBtn.addEventListener('click', () => decide(true));
els.rejectBtn.addEventListener('click', () => decide(false));
els.mute.addEventListener('click', toggleMute);
els.restart.addEventListener('click', () => location.reload());
els.touchUse.addEventListener('click', interact);

els.canvas.addEventListener('click', () => {
  if (state === State.INTRO && !isTouch && document.pointerLockElement !== els.canvas) {
    els.canvas.requestPointerLock?.();
  }
});

els.canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (document.pointerLockElement === els.canvas) return;
  dragging = true;
  dragId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
  if (document.pointerLockElement === els.canvas) return;
  if (joy.active && e.pointerId === joy.id) {
    updateStick(e);
    return;
  }
  if (!dragging || e.pointerId !== dragId) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  applyLook(dx, dy);
});

function endDrag(e) {
  if (dragging && e.pointerId === dragId) {
    dragging = false;
    dragId = null;
  }
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === els.canvas) {
    applyLook(e.movementX || 0, e.movementY || 0);
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === els.canvas) {
    els.lookHint.classList.remove('show');
  }
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) keys.add(k);

  if (k === 'escape') {
    if (state === State.PEEP) exitPeep();
    return;
  }
  if (k === 'm') { toggleMute(); return; }

  if (state === State.TITLE) {
    if (k === 'enter' || k === ' ') startGame();
    return;
  }
  if (state === State.LETTER) {
    if (k === 'enter' || k === 'e' || k === ' ') closeLetter();
    return;
  }
  if (state === State.INTRO) {
    if (k === 'e' || k === 'enter') interact();
    return;
  }
  if (state === State.DOOR) {
    if (k === ' ' || k === 'enter') enterPeep();
    else if (k === 'e') decide(true);
    return;
  }
  if (state === State.PEEP) {
    if (k === 'e' || k === 'enter') decide(true);
    else if (k === 'q') decide(false);
    else if (k === 'f') toggleFlash();
    else if (k === 'z') toggleZoom();
    else if (k === 'k') doKnock();
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});
window.addEventListener('blur', () => keys.clear());

/* mobile joystick */
function updateStick(e) {
  const rect = els.stickZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const max = 44;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
  els.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx / max;
  joy.y = -dy / max;
}

function resetStick() {
  joy.active = false;
  joy.id = null;
  joy.x = 0;
  joy.y = 0;
  els.stickKnob.style.transform = 'translate(0px, 0px)';
}

els.stickZone.addEventListener('pointerdown', (e) => {
  if (state !== State.INTRO) return;
  joy.active = true;
  joy.id = e.pointerId;
  els.stickZone.setPointerCapture?.(e.pointerId);
  updateStick(e);
  e.preventDefault();
});
window.addEventListener('pointerup', (e) => {
  if (joy.active && e.pointerId === joy.id) resetStick();
});
window.addEventListener('pointercancel', (e) => {
  if (joy.active && e.pointerId === joy.id) resetStick();
});

window.addEventListener('resize', () => {
  if (state === State.PEEP) view.fov = portrait() ? 80 : 68;
});

/* ------------------------------------------------------------------ */
/* demo / debug hooks                                                 */
/* ------------------------------------------------------------------ */

const player = { bob: 0, stepAcc: 0 };

function ensureDemo() {
  $set(els.title, false);
  $set(els.letterScreen, false);
  $set(els.ending, false);
  $set(els.hud, true);
  $set(els.killingTitle, false);
  document.body.classList.remove('killing', 'glitch');
  els.static.classList.remove('on');
  els.jumpscare.classList.remove('on', 'quick');
  world.horror = false;
  world.letter.visible = false;
  world.letterGlow.visible = false;
  if (!doorPhaseStart) doorPhaseStart = performance.now();
  endingShown = false;
  finalRound = false;
  state = State.DOOR;
  setState(State.DOOR);
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  updateHud();
}

function spawnCrowdDebug(n) {
  for (let i = 0; i < n; i++) {
    const p = createPerson(makeHumanSpec());
    const spot = crowdSpot(i);
    p.position.set(spot.x, 0, spot.z);
    p.rotation.y = Math.random() * Math.PI * 2;
    p.userData.phase = Math.random() * Math.PI * 2;
    world.crowdGroup.add(p);
    crowd.push({ person: p, spot, arrived: true, dance: true });
  }
}

function demoIntro() {
  ensureDemo();
  world.letter.visible = true;
  world.letterGlow.visible = true;
  state = State.INTRO;
  setState(State.INTRO);
  view.pos.copy(INTRO_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  setObjective('walk to the letter');
  updateNearLetter();
  return info();
}

function demoLetter() {
  ensureDemo();
  world.letter.visible = true;
  state = State.INTRO;
  openLetter();
  return info();
}

function demoPeep(kind = 'human', tell = null) {
  ensureDemo();
  clearVisitors();
  rounds += 1;
  guests = Math.max(guests, 12);
  updateHud();
  const anomaly = kind === 'anomaly';
  const spec = makeVisitorSpec({ anomaly, guests, primary: tell });
  if (!anomaly) spec.people = spec.people.slice(0, 3);
  current = buildVisitors(spec);
  state = State.DOOR;
  setState(State.DOOR);
  view.pos.copy(DOOR_POS);
  view.yaw = 0;
  view.pitch = 0;
  view.fov = 70;
  enterPeep(true);
  return info();
}

function demoFinal() {
  ensureDemo();
  beginFinalRound();
  enterPeep(true);
  return info();
}

function demoParty() {
  ensureDemo();
  spawnCrowdDebug(32);
  guests = 50;
  updateHud();
  startHouseParty();
  return info();
}

function demoDeath() {
  ensureDemo();
  spawnCrowdDebug(18);
  guests = 18;
  updateHud();
  clearVisitors();
  const spec = makeVisitorSpec({ anomaly: true, guests, primary: 'eyes' });
  current = buildVisitors(spec);
  startKilling();
  return info();
}

function demoWin() {
  ensureDemo();
  spawnCrowdDebug(30);
  guests = 50;
  updateHud();
  state = State.ANIM;
  winGame();
  return info();
}

function setGuests(n) {
  guests = clamp(Math.round(n), 0, 50);
  updateHud();
  world.setPartyLevel(Math.min(5, Math.floor(guests / 10)));
  return guests;
}

function info() {
  return {
    state,
    guests,
    crowd: crowd.length,
    current: current ? {
      speaker: current.speaker,
      anomaly: current.isAnomaly,
      final: Boolean(current.final),
      tells: current.people.map((p) => p.userData.tells),
      line: current.line,
    } : null,
  };
}

window.__GAME = {
  get state() { return state; },
  get guests() { return guests; },
  start: startGame,
  intro: demoIntro,
  letter: demoLetter,
  peep: (kind, tell) => demoPeep(kind, tell),
  final: demoFinal,
  party: demoParty,
  death: demoDeath,
  win: demoWin,
  accept: () => decide(true),
  reject: () => decide(false),
  openPeep: () => enterPeep(),
  knock: doKnock,
  setGuests,
  info,
  world,
  view,
};

/* ------------------------------------------------------------------ */
/* boot                                                               */
/* ------------------------------------------------------------------ */

$set(els.hud, false);
$set(els.mobile, false);
$set(els.letterScreen, false);
$set(els.ending, false);
$set(els.doorUI, false);
$set(els.peepUI, false);
$set(els.mask, false);
$set(els.speech, false);
$set(els.partyBanner, false);
$set(els.killingTitle, false);
updateHud();
els.lookHint.textContent = isTouch ? 'drag to look · use the stick to walk' : 'drag to look · wasd to walk';
world.setPartyLevel(0);
lastTime = performance.now() / 1000;
requestAnimationFrame(loop);


