import * as THREE from '../vendor/three.module.js';
import { createHouse } from './house.js';
import {
  createPeepholeView,
  randomHumanDescriptor,
  randomAnomalyDescriptor,
  makePartyPerson,
} from './visitors.js';
import { AudioEngine } from './audio.js';

const TARGET_HUMANS = 50;
const $ = (sel) => document.querySelector(sel);

const el = {
  canvas: $('#game'),
  hud: $('#hud'),
  objective: $('#objective'),
  humans: $('#humans'),
  counter: $('#counter'),
  prompt: $('#prompt'),
  caption: $('#caption'),
  toast: $('#toast'),
  crosshair: $('#crosshair'),
  compass: $('#compass'),
  compassLabel: $('#compassLabel'),
  hintbar: $('#hintbar'),
  title: $('#title'),
  startBtn: $('#startBtn'),
  titleHelpBtn: $('#titleHelpBtn'),
  helpBtn: $('#helpBtn'),
  help: $('#help'),
  helpClose: $('#helpClose'),
  mute: $('#mute'),
  letterModal: $('#letterModal'),
  closeLetter: $('#closeLetter'),
  peephole: $('#peephole'),
  peepCanvas: $('#peepCanvas'),
  peepHint: $('#peepHint'),
  letInBtn: $('#letInBtn'),
  closeDoorBtn: $('#closeDoorBtn'),
  stepBackBtn: $('#stepBackBtn'),
  partyBanner: $('#partyBanner'),
  confetti: $('#confetti'),
  death: $('#death'),
  jumpface: $('#jumpface'),
  jumpwords: $('#jumpwords'),
  killCard: $('#killCard'),
  deathLine: $('#deathLine'),
  deathStats: $('#deathStats'),
  retryBtn: $('#retryBtn'),
  ending: $('#ending'),
  endStats: $('#endStats'),
  keepPartyBtn: $('#keepPartyBtn'),
  againBtn: $('#againBtn'),
  flash: $('#flash'),
  stick: $('#stick'),
  knob: $('#knob'),
  touch: $('#touch'),
};

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (isTouchDevice) document.body.classList.add('touch');

// ------------------------------------------------------------------
// three.js setup
// ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas: el.canvas,
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x090707, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090707);
scene.fog = new THREE.Fog(0x090707, 9, 17);

const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60);
camera.rotation.order = 'YXZ';

function resize() {
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  const portrait = ih > iw;
  const maxW = portrait ? 360 : 640;
  const maxH = portrait ? 440 : 360;
  const scale = Math.min(maxW / iw, maxH / ih, 0.8);
  const w = Math.max(180, Math.round(iw * scale));
  const h = Math.max(120, Math.round(ih * scale));
  renderer.setSize(w, h, false);
  camera.aspect = iw / ih;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const house = createHouse(scene);
const peep = createPeepholeView(el.peepCanvas);
const audio = new AudioEngine();

// ------------------------------------------------------------------
// game state
// ------------------------------------------------------------------
const state = {
  mode: 'title', // title | explore | letter | knock | peephole | transition | party | death
  paused: false,
  ending: false,
  lunched: false,
  pos: new THREE.Vector3(-1.25, 0, 0.38),
  yaw: Math.PI / 2,
  pitch: -0.03,
  camTargetYaw: null,
  camTargetPitch: null,
  moveTime: 0,
  walking: false,
  doorOpen: false,
  letterPresent: false,
  letterRead: false,
  humansInside: 0,
  humansAdmitted: 0,
  groupsAdmitted: 0,
  humansTurnedAway: 0,
  visits: 0,
  anomaliesSeen: 0,
  anomaliesClosed: 0,
  current: null,
  deathStarted: false,
  partyStarted: false,
  shake: 0,
  partyBurst: 0,
  titleTime: 0,
};

const keys = Object.create(null);
const touchInput = { x: 0, y: 0 };
let drag = null;
let stickPointer = null;
let promptKey = '';
let captionTimer = null;
let toastTimer = null;
let repeatKnockTimer = null;
let letterTimer = null;
let nextVisitTimer = null;
let tvScaryTimer = null;
let partyEndingTimer = null;
let faceTimer = null;
let deathCardTimer = null;
let deathStartTimer = null;

const guestList = [];
const guestSpots = [];

// ------------------------------------------------------------------
// tiny UI helpers
// ------------------------------------------------------------------
function setObjective(text) {
  el.objective.textContent = text;
}

function setCaption(text, ms = 4600) {
  el.caption.textContent = text;
  el.caption.classList.remove('hidden');
  el.caption.style.animation = 'none';
  void el.caption.offsetWidth;
  el.caption.style.animation = '';
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => el.caption.classList.add('hidden'), ms);
}

function hideCaption() {
  clearTimeout(captionTimer);
  el.caption.classList.add('hidden');
}

function showToast(text, ms = 1500) {
  el.toast.textContent = text;
  el.toast.classList.remove('hidden');
  el.toast.style.animation = 'none';
  void el.toast.offsetWidth;
  el.toast.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), ms);
}

function hideToast() {
  clearTimeout(toastTimer);
  el.toast.classList.add('hidden');
}

function setHumans(n, pop = false) {
  state.humansInside = n;
  el.humans.textContent = String(n);
  if (pop) {
    el.counter.classList.remove('pop');
    void el.counter.offsetWidth;
    el.counter.classList.add('pop');
  }
}

function flashScreen(kind = 'on') {
  el.flash.classList.remove('on', 'on-red');
  void el.flash.offsetWidth;
  if (kind === 'red') el.flash.classList.add('on-red');
  else el.flash.classList.add('on');
}

function shake(amount) {
  state.shake = Math.max(state.shake, amount);
}

function toastAnimation() {}

// ------------------------------------------------------------------
// prompt system
// ------------------------------------------------------------------
function setPrompt(items) {
  const key = items.map((i) => i.action + i.label).join('|');
  if (key === promptKey) return;
  promptKey = key;
  if (!items.length) {
    el.prompt.classList.add('hidden');
    el.prompt.innerHTML = '';
    el.crosshair.classList.remove('hot');
    return;
  }
  el.prompt.innerHTML = items.map((item) => (
    `<button type="button" class="prompt-btn ${item.cls || ''}" data-action="${item.action}">${item.label}${item.key ? `<span class="key">${item.key}</span>` : ''}</button>`
  )).join('');
  el.prompt.classList.remove('hidden');
  el.crosshair.classList.add('hot');
}

el.prompt.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  audio.click();
  handleAction(btn.dataset.action);
});

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const nearDoor = () => dist2(state.pos.x, state.pos.z, 0, -3.95) < 2.55;
const nearLetter = () => dist2(state.pos.x, state.pos.z, 0, -3.55) < 1.55;

function lookAtDoor() {
  const dx = 0 - state.pos.x;
  const dz = -4.2 - state.pos.z;
  state.camTargetYaw = Math.atan2(-dx, -dz);
  let diff = state.camTargetYaw - state.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > Math.PI * 0.85) {
    state.yaw += Math.PI * 2;
  }
  state.camTargetPitch = 0;
}

function showHelp() {
  if (state.mode === 'death') return;
  state.paused = true;
  el.help.classList.remove('hidden');
}
function closeHelp() {
  state.paused = false;
  el.help.classList.add('hidden');
}

function toggleMute() {
  audio.init();
  audio.setMuted(!audio.muted);
  el.mute.textContent = audio.muted ? 'SOUND: OFF' : 'SOUND: ON';
}

// ------------------------------------------------------------------
// title / start
// ------------------------------------------------------------------
el.hud.classList.add('hud-off');

el.startBtn.addEventListener('click', startGame);
el.titleHelpBtn.addEventListener('click', showHelp);
el.helpBtn.addEventListener('click', showHelp);
el.helpClose.addEventListener('click', closeHelp);
el.mute.addEventListener('click', toggleMute);

function startGame() {
  if (state.lunched) return;
  state.lunched = true;
  audio.init();
  audio.startAmbient();
  el.title.classList.add('hidden');
  el.help.classList.add('hidden');
  el.hud.classList.remove('hud-off');
  el.touch.classList.remove('hidden');
  state.mode = 'explore';
  state.pos.set(-1.25, 0, 0.38);
  state.yaw = Math.PI / 2;
  state.pitch = -0.03;
  setHumans(0);
  setObjective('Enjoy your quiet night.');
  setCaption('8:47 PM. Your house. Nothing bad has ever happened here.', 5000);
  setTimeout(prepareFaces, 1600);
  setTimeout(() => {
    if (state.mode === 'explore') setCaption('The TV is on. The silence is fine. Everything is fine.', 4200);
  }, 5200);
  letterTimer = setTimeout(() => {
    if (state.mode !== 'explore' || state.paused) {
      // try again in a moment if a menu is open
      letterTimer = setTimeout(letterAppears, 2200);
      return;
    }
    letterAppears();
  }, 9000);
}

function letterAppears() {
  if (state.letterPresent || state.letterRead) return;
  state.letterPresent = true;
  house.setLetterVisible(true);
  house.showLetterMarker(true);
  audio.noise({ dur: 0.38, gain: 0.07, filterType: 'bandpass', freq: 2400, q: 1.5, slide: 700 });
  setCaption('A letter slides under the door. It smells like a committee meeting.', 4400);
  setObjective('Read the letter.');
  showToast('★ A LETTER ★', 1700);
}

// ------------------------------------------------------------------
// letter
// ------------------------------------------------------------------
function openLetter() {
  if (!state.letterPresent || state.letterRead) return;
  audio.click();
  state.mode = 'letter';
  hideCaption();
  el.letterModal.classList.remove('hidden');
  setPrompt([]);
}

function closeLetter() {
  if (state.mode !== 'letter') return;
  audio.click();
  el.letterModal.classList.add('hidden');
  state.mode = 'explore';
  state.letterRead = true;
  house.showLetterMarker(false);
  setObjective('Answer the door. Let in 50 humans.');
  setCaption('Stand at the door. Look before you open. That is the whole job.', 4700);
  nextVisitTimer = setTimeout(() => {
    if (state.mode === 'explore' && !state.paused) nextVisit();
  }, 2100);
}
el.closeLetter.addEventListener('click', closeLetter);

// ------------------------------------------------------------------
// visits
// ------------------------------------------------------------------
function pickGroupSize(remaining) {
  if (remaining <= 1) return remaining;
  const options = [
    [1, 0.18], [2, 0.36], [3, 0.31], [4, 0.15],
  ];
  let n = 1;
  const r = Math.random();
  let acc = 0;
  for (const [size, weight] of options) {
    acc += weight;
    if (r <= acc) { n = size; break; }
  }
  if (state.visits <= 2) n = 1;
  return Math.min(n, remaining);
}

function nextVisit() {
  if (state.mode === 'party' || state.mode === 'death' || state.ending) return;
  if (state.humansInside >= TARGET_HUMANS) return startParty();
  clearTimeout(repeatKnockTimer);
  state.visits += 1;
  const remaining = TARGET_HUMANS - state.humansInside;
  const forceFirstAnomaly = state.visits >= 5 && state.anomaliesSeen === 0;
  const anomalyChance = state.visits <= 3 ? 0 : 0.28 + Math.min(0.1, state.humansInside * 0.0022);
  const isAnomaly = forceFirstAnomaly || Math.random() < anomalyChance;

  if (isAnomaly) {
    const d = randomAnomalyDescriptor();
    d.groupSize = 1;
    state.current = d;
    state.anomaliesSeen += 1;
  } else {
    const d = randomHumanDescriptor();
    d.groupSize = pickGroupSize(remaining);
    state.current = d;
  }

  state.mode = 'knock';
  state.doorOpen = false;
  house.setDoor(false);
  house.showKnockMarker(true);
  house.showLetterMarker(false);
  audio.knock();
  shake(0.28);
  setObjective('Someone is at the door. Stand at the door.');
  setCaption('KNOCK. KNOCK. KNOCK.', 2800);
  showToast('KNOCK KNOCK', 1100);
  repeatKnockTimer = setTimeout(repeatKnock, 16000);
}

function repeatKnock() {
  if (state.mode !== 'knock') return;
  audio.knockFar();
  shake(0.1);
  setCaption('They are still there. The door has a peephole for a reason.', 3200);
  repeatKnockTimer = setTimeout(repeatKnock, 16000);
}

// ------------------------------------------------------------------
// peephole
// ------------------------------------------------------------------
const peepHints = [
  'Humans have 2 eyes, 2 arms, 1 head, and a reason to knock. Usually.',
  'Look for blinking. Look for breathing. Look for a face that fits.',
  'If it looks wrong, it is probably wrong. That is the rule.',
  'You can step back. The knocking will continue. It is very patient.',
  'One of these things is not like the others. That is the entire game.',
  'Anomalies rarely bring snacks. Count the eyes.',
];
let peepHintIndex = 0;

function openPeephole() {
  if (state.mode !== 'knock' || !state.current) return;
  if (!nearDoor()) return;
  clearTimeout(repeatKnockTimer);
  state.mode = 'peephole';
  peep.setVisitor(state.current);
  el.peephole.classList.remove('hidden');
  el.hud.classList.add('hud-off');
  el.peepHint.textContent = peepHints[peepHintIndex % peepHints.length];
  peepHintIndex += 1;
  setPrompt([]);
  hideCaption();
  audio.click();
  if (Math.random() < 0.22) {
    // not a tell: humans get the creepy hallway treatment too
    audio.whisper();
  }
}

function hidePeephole() {
  el.peephole.classList.add('hidden');
  el.hud.classList.remove('hud-off');
  peep.clear();
}

function stepBack() {
  if (state.mode !== 'peephole') return;
  hidePeephole();
  state.mode = 'knock';
  audio.click();
  setObjective('Someone is at the door. Stand at the door.');
  repeatKnockTimer = setTimeout(repeatKnock, 16000);
}

// ------------------------------------------------------------------
// decisions
// ------------------------------------------------------------------
function decideOpen() {
  if (state.mode !== 'peephole' && state.mode !== 'knock') return;
  if (!state.current) return;
  if (state.mode === 'knock' && !nearDoor()) return;
  hidePeephole();
  hideCaption();
  hideToast();
  setPrompt([]);
  state.mode = 'transition';
  state.doorOpen = true;
  house.showKnockMarker(false);
  lookAtDoor();
  audio.creak();
  addShakeHard(0.3);

  const visitor = state.current;
  if (visitor.anomaly) {
    setObjective('They are inside.');
    // Fake-out: no red lights, no scream, no warning. Let them relax for a beat.
    setTimeout(() => {
      if (state.mode !== 'transition') return;
      audio.horn();
      setCaption('They step inside. They are smiling. That is probably fine.', 3000);
      showToast('WELCOME!', 900);
    }, 450);
    deathStartTimer = setTimeout(startDeath, 2450 + Math.random() * 900);
  } else {
    const n = Math.max(1, visitor.groupSize || 1);
    audio.horn();
    setTimeout(() => {
      if (state.mode !== 'transition') return;
      addHumans(n, visitor.name);
    }, 420);
    setTimeout(() => {
      if (state.mode === 'death' || state.mode === 'party') return;
      state.doorOpen = false;
      house.setDoor(false);
      audio.doorClose();
    }, 1350);
    setTimeout(() => {
      if (state.mode === 'death' || state.mode === 'party') return;
      state.mode = 'explore';
      state.current = null;
      if (state.humansInside >= TARGET_HUMANS) startParty();
      else {
        setObjective('Answer the door. Let in 50 humans.');
        nextVisitTimer = setTimeout(() => {
          if (state.mode === 'explore' && !state.paused) nextVisit();
        }, 1250);
      }
    }, 2050);
  }
}

function decideClose() {
  if (state.mode !== 'peephole' && state.mode !== 'knock') return;
  if (!state.current) return;
  if (state.mode === 'knock' && !nearDoor()) return;
  const visitor = state.current;
  hidePeephole();
  hideCaption();
  hideToast();
  setPrompt([]);
  state.mode = 'transition';
  state.doorOpen = false;
  house.setDoor(false);
  house.showKnockMarker(false);
  audio.doorClose();
  shake(0.35);

  if (visitor.anomaly) {
    state.anomaliesClosed += 1;
    audio.stinger();
    house.setTVMode('scary');
    clearTimeout(tvScaryTimer);
    tvScaryTimer = setTimeout(() => {
      if (state.mode !== 'death' && state.mode !== 'party') house.setTVMode('home');
    }, 5200);
    setTimeout(() => audio.whisper(), 480);
    showToast('ANOMALY SHUT OUT', 1900);
    setCaption('It scratches the door. Then it is quiet. Too quiet.', 4300);
    setObjective('It is still out there. Do not open the door.');
  } else {
    const n = Math.max(1, visitor.groupSize || 1);
    state.humansTurnedAway += n;
    audio.sad();
    showToast('TURNED AWAY A HUMAN', 1900);
    setCaption('They were human. They came with chips. They leave. That is on you.', 4200);
    setObjective('That was a human. Do better.');
  }

  setTimeout(() => {
    if (state.mode !== 'transition') return;
    state.mode = 'explore';
    state.current = null;
    if (!state.paused) {
      nextVisitTimer = setTimeout(() => {
        if (state.mode === 'explore') nextVisit();
      }, visitor.anomaly ? 1900 : 1500);
    }
  }, 1450);
}

function addHumans(n, name) {
  const before = state.humansInside;
  const next = Math.min(TARGET_HUMANS, before + n);
  const actual = next - before;
  if (actual <= 0) return;
  state.humansAdmitted += actual;
  state.groupsAdmitted += 1;
  setHumans(next, true);
  spawnGuests(actual);
  const friendText = actual > 1 ? ` + ${actual - 1} friend${actual > 2 ? 's' : ''}` : '';
  showToast(`+${actual} HUMAN${actual > 1 ? 'S' : ''}`, 1300);
  setCaption(`${name || 'They'}${friendText} came in. ${next} of ${TARGET_HUMANS} humans are inside.`, 3600);
  audio.success();
  addShakeHard(0.12);
  if (next >= TARGET_HUMANS) {
    setObjective('50 humans. Time to party.');
  }
}

function addShakeHard(n) {
  state.shake = Math.max(state.shake, n);
}

// ------------------------------------------------------------------
// guests
// ------------------------------------------------------------------
const blockedRects = [
  { x1: -5.1, x2: -3.3, z1: -1.55, z2: 1.95 }, // sofa
  { x1: -3.45, x2: -1.65, z1: -0.55, z2: 0.95 }, // coffee table
  { x1: 4.45, x2: 5.95, z1: -1.35, z2: 2.85 }, // kitchen
  { x1: 1.95, x2: 3.7, z1: 2.08, z2: 3.4 }, // snack table
  { x1: 4.3, x2: 5.5, z1: 3.2, z2: 4.3 }, // plant
];

function inBlocked(x, z) {
  return blockedRects.some((r) => x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2);
}

function pickSpot() {
  for (let i = 0; i < 90; i++) {
    const x = -5.1 + Math.random() * 10.2;
    const z = -3.75 + Math.random() * 7.65;
    if (Math.abs(x) < 1.15 && z < -2.2) continue; // keep the door walkway clear
    if (inBlocked(x, z)) continue;
    if (dist2(x, z, -1.25, 0.38) < 1.05 && state.mode !== 'party') continue;
    if (guestList.some((g) => dist2(x, z, g.userData.target.x, g.userData.target.z) < 0.7)) continue;
    return { x, z };
  }
  // fallback: ring around the room
  for (let i = 0; i < 32; i++) {
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * (3.5 + Math.random() * 1.4);
    const z = Math.sin(a) * (2.8 + Math.random() * 0.8);
    if (!inBlocked(x, z) && !(Math.abs(x) < 1.1 && z < -2.2)) return { x, z };
  }
  return { x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 6 };
}

function spawnGuests(count) {
  for (let i = 0; i < count; i++) {
    const d = randomHumanDescriptor();
    const p = makePartyPerson({
      shirt: d.shirt,
      pants: d.pants,
      skin: d.skin,
      hair: d.hairColor,
      hat: d.hat ? d.hatColor : null,
    });
    const target = pickSpot();
    p.position.set((Math.random() - 0.5) * 1.1, 0, -3.85);
    p.rotation.y = Math.PI;
    p.userData.target = target;
    p.userData.walking = true;
    p.userData.idleYaw = Math.atan2(-target.x, -target.z);
    p.userData.walkPhase = Math.random() * 10;
    p.userData.baseY = 0;
    p.userData.targetVec = new THREE.Vector2(target.x, target.z);
    scene.add(p);
    guestList.push(p);
    guestSpots.push(target);
  }
}

function updateGuests(dt, t) {
  for (let i = 0; i < guestList.length; i++) {
    const g = guestList[i];
    const ud = g.userData;
    if (ud.walking) {
      const dx = ud.target.x - g.position.x;
      const dz = ud.target.z - g.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        g.position.x = ud.target.x;
        g.position.z = ud.target.z;
        g.position.y = 0;
        g.rotation.y = ud.idleYaw;
        ud.walking = false;
      } else {
        const speed = 1.65;
        g.position.x += (dx / d) * speed * dt;
        g.position.z += (dz / d) * speed * dt;
        g.position.y = Math.abs(Math.sin(t * 9 + ud.walkPhase)) * 0.045;
        g.rotation.y = Math.atan2(dx, dz);
      }
      continue;
    }
    if (state.mode === 'death') {
      // everyone gets a jumpscare
      const dx = state.pos.x - g.position.x;
      const dz = state.pos.z - g.position.z;
      g.rotation.y = Math.atan2(dx, dz);
      g.position.y = Math.abs(Math.sin(t * 17 + ud.phase)) * 0.22;
      ud.armL.rotation.z = -2.4 + Math.sin(t * 23) * 0.3;
      ud.armR.rotation.z = 2.4 + Math.sin(t * 21) * 0.3;
      ud.head.rotation.z = Math.sin(t * 19) * 0.35;
      continue;
    }
    if (state.mode === 'party') {
      const jump = Math.abs(Math.sin(t * 4.1 + ud.phase)) * 0.13;
      g.position.y = jump + (state.partyBurst > 0 ? Math.abs(Math.sin(t * 12 + ud.phase)) * 0.12 : 0);
      g.rotation.y = ud.idleYaw + Math.sin(t * 2.6 + ud.phase) * 0.35;
      ud.armL.rotation.z = -0.8 + Math.sin(t * 5 + ud.phase) * 0.7;
      ud.armR.rotation.z = 0.8 + Math.sin(t * 4.5 + ud.phase + 1.2) * 0.7;
      ud.head.rotation.z = Math.sin(t * 3 + ud.phase) * 0.16;
      ud.cup.position.y = 1.2 + Math.abs(Math.sin(t * 4 + ud.phase)) * 0.2;
      continue;
    }
    // idle
    g.position.y = 0;
    g.rotation.y = ud.idleYaw + Math.sin(t * 0.55 + ud.phase) * 0.12;
    ud.armL.rotation.z = 0.02;
    ud.armR.rotation.z = -0.02;
    ud.head.rotation.z = Math.sin(t * 0.8 + ud.phase) * 0.04;
    g.position.x += Math.sin(t * 0.5 + ud.phase) * 0.0005;
  }
  if (state.partyBurst > 0) state.partyBurst = Math.max(0, state.partyBurst - dt * 2.4);
}

// ------------------------------------------------------------------
// party
// ------------------------------------------------------------------
function startParty() {
  if (state.partyStarted) return;
  state.partyStarted = true;
  state.mode = 'party';
  state.paused = false;
  setHumans(TARGET_HUMANS, true);
  house.setDoor(false);
  state.doorOpen = false;
  house.showKnockMarker(false);
  house.showLetterMarker(false);
  house.setParty(true);
  house.setTVMode('party');
  audio.stopMusic();
  audio.startParty();
  setObjective('HOUSE PARTY. Press SPACE to dance.');
  setCaption('Fifty humans. One house. Zero anomalies. Probably.', 6000);
  showToast('HOUSE PARTY!!!', 2500);
  el.partyBanner.classList.remove('hidden');
  el.partyBanner.style.animation = 'none';
  void el.partyBanner.offsetWidth;
  el.partyBanner.style.animation = '';
  startConfetti(90);
  shake(0.35);
  setTimeout(() => el.partyBanner.classList.add('hidden'), 5200);
  clearTimeout(partyEndingTimer);
  partyEndingTimer = setTimeout(() => {
    if (state.mode === 'party') showEnding();
  }, 12500);
}

function startConfetti(count = 50) {
  const colors = ['#ff4a4a', '#ffd84d', '#56e07a', '#51b7ff', '#e665ff', '#ff9a3d', '#f4f0d0'];
  const current = el.confetti.children.length;
  const allowed = Math.max(0, 160 - current);
  for (let i = 0; i < Math.min(count, allowed); i++) {
    const bit = document.createElement('div');
    bit.className = 'confetti-bit';
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[Math.floor(Math.random() * colors.length)];
    bit.style.animationDuration = `${2.2 + Math.random() * 3.2}s`;
    bit.style.animationDelay = `${Math.random() * 2.4}s`;
    bit.style.width = `${4 + Math.random() * 7}px`;
    bit.style.height = `${8 + Math.random() * 11}px`;
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 180}px`);
    bit.style.setProperty('--spin', `${Math.random() * 1200 - 600}deg`);
    el.confetti.appendChild(bit);
  }
}

function dance() {
  if (state.mode !== 'party') return;
  state.partyBurst = 1;
  audio.horn();
  addShakeHard(0.22);
  startConfetti(24);
  const lines = ['PARTY!', 'WOOHOO!', 'THE HUMANS ARE DANCING', 'NO ANOMALIES DETECTED', 'MORE SNACKS'];
  if (Math.random() < 0.4) showToast(lines[Math.floor(Math.random() * lines.length)], 900);
}

function showEnding() {
  if (state.mode !== 'party') return;
  state.ending = true;
  setPrompt([]);
  el.endStats.innerHTML = `
    <div><b>50</b><span>humans inside</span></div>
    <div><b>${state.anomaliesClosed}</b><span>anomalies shut out</span></div>
    <div><b>${state.humansTurnedAway}</b><span>humans rejected</span></div>
    <div><b>${state.visits}</b><span>knocks answered</span></div>
  `;
  el.ending.classList.remove('hidden');
  audio.success();
}

el.keepPartyBtn.addEventListener('click', () => {
  state.ending = false;
  el.ending.classList.add('hidden');
  showToast('THE PARTY CONTINUES', 1400);
  setCaption('The music is loud. The door is closed. Nobody has knocked in a while.', 4400);
});

el.againBtn.addEventListener('click', () => location.reload());
el.retryBtn.addEventListener('click', () => location.reload());

// ------------------------------------------------------------------
// death
// ------------------------------------------------------------------
let scaryFaces = [];
function makeScaryFace(variant) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 900;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 900, 900);
  g.save();
  g.translate(450, 445);
  g.rotate((variant - 1) * 0.05);

  const headPath = new Path2D();
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 5 + variant * 2.1) * 0.06 + Math.sin(a * 11 + variant) * 0.035;
    const r = 280 * wobble;
    const x = Math.cos(a) * r * 0.78;
    const y = Math.sin(a) * r;
    if (i === 0) headPath.moveTo(x, y);
    else headPath.lineTo(x, y);
  }
  headPath.closePath();
  g.fillStyle = variant === 2 ? '#a9998e' : '#c0ae9f';
  g.fill(headPath);
  g.strokeStyle = '#1c0b08';
  g.lineWidth = 10;
  g.stroke(headPath);

  g.save();
  g.clip(headPath);
  // gross shading
  const shade = g.createRadialGradient(-80, -120, 20, 0, 0, 380);
  shade.addColorStop(0, 'rgba(255,245,225,0.35)');
  shade.addColorStop(0.6, 'rgba(90,65,55,0.15)');
  shade.addColorStop(1, 'rgba(16,5,5,0.8)');
  g.fillStyle = shade;
  g.fillRect(-400, -400, 800, 800);
  // vein / cracks
  g.strokeStyle = 'rgba(92,20,20,0.42)';
  g.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    const sx = (Math.random() - 0.5) * 380;
    const sy = (Math.random() - 0.5) * 380;
    g.moveTo(sx, sy);
    let x = sx, y = sy;
    for (let j = 0; j < 4; j++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.5) * 80;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // pores
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(40,15,10,${Math.random() * 0.2})`;
    g.fillRect((Math.random() - 0.5) * 430, (Math.random() - 0.5) * 540, 2, 2);
  }
  g.restore();

  // eyes
  const eyeY = variant === 2 ? -95 : -85;
  const eyeX = variant === 2 ? 95 : 98;
  const drawSocket = (x, y, rx, ry, tilt) => {
    g.save();
    g.translate(x, y);
    g.rotate(tilt);
    g.fillStyle = '#070303';
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(130, 10, 10, 0.55)';
    g.beginPath();
    g.ellipse(0, 0, rx * 0.6, ry * 0.62, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f7ecd0';
    g.beginPath();
    g.arc(0, 0, variant === 2 ? 6 : 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#170303';
    g.beginPath();
    g.arc(0, 0, 3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  drawSocket(-eyeX, eyeY, 62, 78, 0.1);
  drawSocket(eyeX, eyeY, 66, 84, -0.12);
  if (variant === 1) drawSocket(0, -178, 32, 44, 0);

  // nose holes
  g.fillStyle = '#210807';
  g.beginPath(); g.ellipse(-24, 35, 14, 26, -0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(26, 35, 15, 28, 0.3, 0, Math.PI * 2); g.fill();

  // mouth
  g.save();
  if (variant === 2) {
    g.translate(0, 105);
    g.rotate(0.08);
    g.fillStyle = '#100202';
    g.beginPath();
    g.ellipse(0, 75, 195, 155, 0, 0, Math.PI * 2);
    g.fill();
    // giant teeth
    for (let i = 0; i < 12; i++) {
      const ang = Math.PI + (i / 11) * Math.PI;
      const x = Math.cos(ang) * 168;
      const y = 75 + Math.sin(ang) * 128;
      g.save();
      g.translate(x, y);
      g.rotate(ang + Math.PI / 2);
      g.fillStyle = '#e8dcc4';
      g.beginPath();
      g.moveTo(-16, 0);
      g.lineTo(0, -58 - Math.random() * 30);
      g.lineTo(16, 0);
      g.closePath();
      g.fill();
      g.restore();
    }
    for (let i = 0; i < 8; i++) {
      const x = -140 + i * 40;
      g.fillStyle = '#d9ccb3';
      g.beginPath();
      g.moveTo(x - 14, 90);
      g.lineTo(x, 150 + Math.random() * 24);
      g.lineTo(x + 14, 90);
      g.closePath();
      g.fill();
    }
  } else {
    g.fillStyle = '#0c0202';
    g.beginPath();
    g.moveTo(-235, 100);
    g.bezierCurveTo(-160, 235, 150, 245, 240, 95);
    g.bezierCurveTo(120, 175, -90, 175, -235, 100);
    g.closePath();
    g.fill();
    // upper teeth
    for (let i = 0; i < 13; i++) {
      const x = -208 + i * 34;
      const yy = 105 + Math.sin((i / 12) * Math.PI) * 30;
      g.fillStyle = '#e9ddc5';
      g.beginPath();
      g.moveTo(x - 13, yy);
      g.lineTo(x, yy + 40 + Math.random() * 24);
      g.lineTo(x + 13, yy);
      g.closePath();
      g.fill();
    }
    // lower teeth
    for (let i = 0; i < 11; i++) {
      const x = -180 + i * 36;
      const yy = 186 + Math.sin((i / 10) * Math.PI) * 16;
      g.fillStyle = '#d7caae';
      g.beginPath();
      g.moveTo(x - 12, yy);
      g.lineTo(x, yy - 34 - Math.random() * 20);
      g.lineTo(x + 12, yy);
      g.closePath();
      g.fill();
    }
  }
  g.restore();

  // blood
  g.strokeStyle = 'rgba(120, 8, 8, 0.82)';
  g.lineWidth = 8;
  for (let i = 0; i < 9; i++) {
    const x = -220 + Math.random() * 440;
    const y = -80 + Math.random() * 250;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + 8, y + 40, x - 9, y + 80, x + 4, y + 130 + Math.random() * 90);
    g.stroke();
    g.fillStyle = 'rgba(120, 8, 8, 0.82)';
    g.beginPath(); g.arc(x + 4, y + 130 + Math.random() * 90, 5, 0, Math.PI * 2); g.fill();
  }
  // huge lopsided red grin line
  g.strokeStyle = 'rgba(80, 0, 0, 0.75)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(-215, 126);
  g.quadraticCurveTo(0, 250, 230, 118);
  g.stroke();

  // jpeg-ish glitch bands
  for (let i = 0; i < 6; i++) {
    const y = -250 + Math.random() * 520;
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,0,0' : '0,255,255'},0.04)`;
    g.fillRect(-320, y, 640, 3 + Math.random() * 12);
  }
  g.restore();

  // static specks across the image
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(Math.random() * 255);
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.14})`;
    g.fillRect(Math.random() * 900, Math.random() * 900, 2, 2);
  }
  return c.toDataURL('image/png');
}

function prepareFaces() {
  if (!scaryFaces.length) {
    scaryFaces = [makeScaryFace(0), makeScaryFace(1), makeScaryFace(2)];
  }
}

function startDeath() {
  if (state.mode === 'death' || state.deathStarted) return;
  state.deathStarted = true;
  state.mode = 'death';
  state.paused = false;
  state.ending = false;
  clearTimeout(repeatKnockTimer);
  clearTimeout(nextVisitTimer);
  clearTimeout(partyEndingTimer);
  // The room goes silent for exactly half a second, then the face is already there.
  audio.stopMusic();
  audio.stopAmbient();
  house.setHorror(true);
  house.setDoor(true);
  state.doorOpen = true;
  house.showKnockMarker(false);
  el.help.classList.add('hidden');
  el.letterModal.classList.add('hidden');
  el.peephole.classList.add('hidden');
  el.ending.classList.add('hidden');
  el.partyBanner.classList.add('hidden');
  el.hud.classList.add('hud-off');
  setPrompt([]);
  hideCaption();
  hideToast();
  lookAtDoor();

  prepareFaces();
  el.death.classList.remove('hidden');
  el.killCard.classList.add('hidden');
  el.jumpface.style.display = 'block';
  el.jumpwords.style.display = 'block';
  el.jumpface.src = scaryFaces[0];
  el.jumpwords.textContent = "IT'S IN.";
  // no pre-scare noise: the scream and the face arrive together
  flashScreen('red');
  audio.scream();
  shake(2.2);

  let i = 1;
  clearInterval(faceTimer);
  faceTimer = setInterval(() => {
    el.jumpface.src = scaryFaces[i % scaryFaces.length];
    el.jumpwords.textContent = ["IT'S IN.", 'KILLING PARTY', 'EVERYONE DIES'][i % 3];
    i += 1;
    shake(1.5);
    if (i % 2 === 0) {
      audio.stinger();
      flashScreen(i % 4 === 0 ? 'red' : 'on');
    }
  }, 390);

  deathCardTimer = setTimeout(() => {
    clearInterval(faceTimer);
    el.jumpface.style.display = 'none';
    el.jumpwords.style.display = 'none';
    el.killCard.classList.remove('hidden');
    el.deathStats.innerHTML = `
      <div><b>${state.humansInside}</b><span>humans at the party</span></div>
      <div><b>${state.anomaliesClosed}</b><span>anomalies shut out</span></div>
      <div><b>${state.humansTurnedAway}</b><span>humans rejected</span></div>
      <div><b>${state.visits}</b><span>knocks answered</span></div>
    `;
    el.deathLine.textContent = `You let the anomaly in. It waited until you felt safe, then it brought friends. ${state.humansInside} human${state.humansInside === 1 ? '' : 's'} got a jumpscare. Everyone died. The snacks are fine.`;
    audio.stinger();
  }, 2900);
}

// ------------------------------------------------------------------
// input
// ------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();

  if (state.paused) {
    if (k === 'escape') closeHelp();
    return;
  }

  if (k === 'escape') {
    if (state.mode === 'peephole') stepBack();
    else if (state.mode === 'letter') closeLetter();
    return;
  }

  if (state.mode === 'letter' || state.mode === 'death' || state.mode === 'title') return;

  if (k === 'e') {
    if (state.mode === 'explore' && state.letterPresent && !state.letterRead && nearLetter()) {
      openLetter();
    } else if (state.mode === 'knock' && nearDoor()) {
      openPeephole();
    }
    return;
  }

  if (k === 'f') {
    if (state.mode === 'peephole') decideOpen();
    else if (state.mode === 'knock' && nearDoor()) decideOpen();
    return;
  }

  if (k === 'c') {
    if (state.mode === 'peephole') decideClose();
    return;
  }

  if (k === ' ' && state.mode === 'party') {
    dance();
    return;
  }

  keys[k] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// mouse / touch look
el.canvas.addEventListener('pointerdown', (e) => {
  if (state.paused || state.mode === 'title' || state.mode === 'letter' || state.mode === 'peephole' || state.mode === 'death') return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType };
  document.body.classList.add('dragging');
  try { el.canvas.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
});
window.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  drag.x = e.clientX;
  drag.y = e.clientY;
  const sens = drag.type === 'touch' ? 0.0052 : 0.0032;
  state.yaw -= dx * sens;
  state.pitch -= dy * sens;
  state.pitch = Math.max(-1.15, Math.min(1.15, state.pitch));
  state.camTargetYaw = null;
  state.camTargetPitch = null;
  e.preventDefault();
});
function endDrag(e) {
  if (drag && drag.id === e.pointerId) {
    drag = null;
    document.body.classList.remove('dragging');
  }
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// on-screen joystick
function updateStick(e) {
  if (!stickPointer || e.pointerId !== stickPointer.id) return;
  const rect = el.stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const max = rect.width * 0.36;
  const d = Math.hypot(dx, dy);
  if (d > max) {
    dx = (dx / d) * max;
    dy = (dy / d) * max;
  }
  el.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  touchInput.x = dx / max;
  touchInput.y = -dy / max;
}
el.stick.addEventListener('pointerdown', (e) => {
  stickPointer = { id: e.pointerId };
  el.stick.setPointerCapture(e.pointerId);
  updateStick(e);
  e.preventDefault();
  e.stopPropagation();
});
window.addEventListener('pointermove', (e) => {
  if (stickPointer && e.pointerId === stickPointer.id) updateStick(e);
});
window.addEventListener('pointerup', (e) => {
  if (stickPointer && e.pointerId === stickPointer.id) {
    stickPointer = null;
    touchInput.x = 0;
    touchInput.y = 0;
    el.knob.style.transform = '';
  }
});
window.addEventListener('pointercancel', (e) => {
  if (stickPointer && e.pointerId === stickPointer.id) {
    stickPointer = null;
    touchInput.x = 0;
    touchInput.y = 0;
    el.knob.style.transform = '';
  }
});

// generic actions from prompt / buttons
function handleAction(action) {
  switch (action) {
    case 'read': openLetter(); break;
    case 'peep': openPeephole(); break;
    case 'open': decideOpen(); break;
    case 'letIn': decideOpen(); break;
    case 'keepClosed': decideClose(); break;
    case 'stepBack': stepBack(); break;
    case 'dance': dance(); break;
    default: break;
  }
}

el.letInBtn.addEventListener('click', () => { audio.click(); decideOpen(); });
el.closeDoorBtn.addEventListener('click', () => { audio.click(); decideClose(); });
el.stepBackBtn.addEventListener('click', () => { audio.click(); stepBack(); });

// ------------------------------------------------------------------
// per-frame game logic
// ------------------------------------------------------------------
function updatePrompt() {
  if (state.paused || state.ending) { setPrompt([]); return; }
  if (state.mode === 'explore') {
    if (state.letterPresent && !state.letterRead && nearLetter()) {
      setPrompt([{ action: 'read', label: 'READ THE LETTER', key: 'E' }]);
    } else {
      setPrompt([]);
    }
  } else if (state.mode === 'knock') {
    if (nearDoor()) {
      setPrompt([
        { action: 'peep', label: 'LOOK THROUGH PEEPHOLE', key: 'E' },
        { action: 'open', label: 'OPEN DOOR', key: 'F', cls: 'ghost' },
      ]);
    } else {
      setPrompt([]);
    }
  } else if (state.mode === 'party') {
    setPrompt([{ action: 'dance', label: 'DANCE', key: 'SPACE' }]);
  } else {
    setPrompt([]);
  }
}

function updateCompass() {
  let target = null;
  let label = '';
  if (state.paused || state.ending || state.mode === 'title' || state.mode === 'letter' || state.mode === 'peephole' || state.mode === 'transition' || state.mode === 'death') {
    el.compass.classList.add('hidden');
    return;
  }
  if (state.mode === 'explore' && state.letterPresent && !state.letterRead) {
    target = { x: 0, z: -3.55 };
    label = 'LETTER';
  } else if (state.mode === 'knock') {
    target = { x: 0, z: -4.1 };
    label = 'DOOR';
  } else {
    el.compass.classList.add('hidden');
    return;
  }
  const dx = target.x - state.pos.x;
  const dz = target.z - state.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  const nx = dx / d;
  const nz = dz / d;
  const fx = -Math.sin(state.yaw);
  const fz = -Math.cos(state.yaw);
  const rx = Math.cos(state.yaw);
  const rz = -Math.sin(state.yaw);
  const dot = nx * fx + nz * fz;
  if (dot > 0.62) {
    el.compass.classList.add('hidden');
    return;
  }
  const angle = Math.atan2(nx * rx + nz * rz, dot);
  el.compass.classList.remove('hidden');
  el.compassLabel.textContent = label;
  el.compass.querySelector('.arrow').style.transform = `rotate(${angle}rad)`;
}

function updateMovement(dt) {
  const active = (state.mode === 'explore' || state.mode === 'knock' || state.mode === 'party') && !state.paused && !state.ending;
  if (!active) {
    state.walking = false;
    return;
  }
  let f = 0;
  let r = 0;
  if (keys['w'] || keys['arrowup']) f += 1;
  if (keys['s'] || keys['arrowdown']) f -= 1;
  if (keys['d'] || keys['arrowright']) r += 1;
  if (keys['a'] || keys['arrowleft']) r -= 1;
  f += touchInput.y;
  r += touchInput.x;
  const len = Math.hypot(f, r);
  if (len > 1) { f /= len; r /= len; }
  const moving = Math.abs(f) > 0.02 || Math.abs(r) > 0.02;
  state.walking = moving;
  if (moving) {
    const speed = keys['shift'] ? 3.8 : 2.35;
    const forwardX = -Math.sin(state.yaw);
    const forwardZ = -Math.cos(state.yaw);
    const rightX = Math.cos(state.yaw);
    const rightZ = -Math.sin(state.yaw);
    const dx = (forwardX * f + rightX * r) * speed * dt;
    const dz = (forwardZ * f + rightZ * r) * speed * dt;
    state.pos.x += dx;
    state.pos.z += dz;
    state.moveTime += dt * (keys['shift'] ? 1.5 : 1);
  }
  state.pos.x = Math.max(-5.45, Math.min(5.45, state.pos.x));
  state.pos.z = Math.max(-4.0, Math.min(3.95, state.pos.z));
  // never leave the party through the front door
  if (state.mode === 'party' && state.pos.z < -3.4 && Math.abs(state.pos.x) < 1.2) {
    state.pos.z = -3.4;
  }
}

function updateCamera(dt, t) {
  // smooth forced look at the door during transitions / death
  if (state.camTargetYaw !== null) {
    let diff = state.camTargetYaw - state.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.yaw += diff * Math.min(1, dt * 5.5);
  }
  if (state.camTargetPitch !== null) {
    state.pitch += (state.camTargetPitch - state.pitch) * Math.min(1, dt * 5.5);
  }

  if (state.mode === 'title') {
    state.titleTime += dt;
    const tt = state.titleTime;
    camera.position.set(-2.4 + Math.sin(tt * 0.19) * 0.35, 1.62, 0.5 + Math.cos(tt * 0.24) * 0.2);
    camera.rotation.y = Math.PI / 2 + Math.sin(tt * 0.13) * 0.12;
    camera.rotation.x = -0.04;
    camera.rotation.z = 0;
    return;
  }

  const bob = state.walking ? Math.sin(state.moveTime * 9.2) * 0.028 : Math.sin(t * 1.2) * 0.005;
  const roll = state.walking ? Math.sin(state.moveTime * 4.6) * 0.007 : 0;
  state.shake = Math.max(0, state.shake - dt * (state.mode === 'death' ? 1.6 : 3.5));
  const s = state.shake;
  const sx = (Math.random() - 0.5) * s * 0.09;
  const sy = (Math.random() - 0.5) * s * 0.09;
  const sr = (Math.random() - 0.5) * s * 0.03;
  camera.position.set(state.pos.x + sx, 1.62 + bob + sy, state.pos.z);
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
  camera.rotation.z = roll + sr;
}

function update(dt, t) {
  if (!state.paused) {
    updateMovement(dt);
    updatePrompt();
  } else {
    setPrompt([]);
  }
  updateCamera(dt, t);
  updateCompass();
  if (state.mode === 'knock') house.showKnockMarker(!nearDoor());
  house.update(dt, t, { doorOpen: state.doorOpen, player: state.pos });
  updateGuests(dt, t);
  if (state.mode === 'peephole') peep.update(dt);
}

// ------------------------------------------------------------------
// main loop
// ------------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  update(dt, t);
  renderer.render(scene, camera);
}
frame();

// initial helper text
setTimeout(() => {
  if (state.mode === 'title') {
    el.title.style.opacity = '1';
  }
}, 100);

// clean up audio if the page goes away
window.addEventListener('pagehide', () => {
  try { audio.stopMusic(); } catch {}
});

// Development / QA hooks. Harmless in production, useful for testing the bad game.
window.__game = {
  state,
  nextVisit,
  startParty,
  startDeath,
  addHumans,
  spawnGuests,
  openPeephole,
  stepBack,
  randomAnomalyDescriptor,
  randomHumanDescriptor,
  decideOpen,
  decideClose,
  openLetter,
  closeLetter,
  prepareFaces,
  getFaces: () => scaryFaces,
};
