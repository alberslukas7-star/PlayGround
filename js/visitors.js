/* Low-poly people with hand-drawn faces. The "bad" ones are only a little wrong. */

import * as THREE from '../vendor/three.module.js';
import { makeFace, humanFaceSpec, anomalyFaceSpec, mulberry, pick } from './textures.js';

const SHIRTS = ['#b84b44', '#4576b8', '#4f915d', '#d8a63a', '#8b62ab', '#cf713b', '#ded6c4', '#3c3b45', '#8bbf4e', '#d45f92', '#4e9b9a', '#b0a16a', '#6e4d8e', '#c94f63'];
const PANTS = ['#2f3a52', '#3c3c3c', '#57452f', '#2c4a43', '#4a2e2e', '#202a42', '#6b5d48', '#31394a'];
const SHOES = ['#201a16', '#3a2a1c', '#141414', '#5c3a22', '#2b2f33'];
const HAIRS = ['#2b1d15', '#4a2f1c', '#7a4a26', '#c7a15e', '#d8b26a', '#a33c2c', '#8a8a8a', '#1a1a1a', '#5b3a56', '#b56a3c'];
const SKINS = ['#f2c9a5', '#e5b58f', '#d3a077', '#bd835b', '#9a613f', '#7b4a2e', '#5f3822', '#f6d8bd'];
const HATS = ['#b33a34', '#2f5e9b', '#3e6b43', '#d0a22d', '#5d3b6e', '#2b2b30'];

const NAMES = ['gary', 'linda', 'brad', 'susan', 'kevin', 'denise', 'tyrone', 'margaret', 'chad', 'britney', 'steve', 'diane', 'mike', 'karen', 'josh', 'becky', 'ron', 'debra', 'xavier', 'peggy', 'doug', 'jan', 'craig', 'barb', 'trevor', 'nina', 'phil', 'gloria', 'dale', 'wanda', 'andre', 'tina', 'wes', 'holly', 'dave', 'priya', 'marcus', 'lena'];

const HUMAN_LINES = [
  'hi! i brought ice.',
  'is this the party?',
  'we brought chips.',
  'hello! nice door.',
  'sorry we are late.',
  'i parked on the lawn.',
  'is gary here?',
  'i brought a lamp.',
  'the vibes are immaculate.',
  'we heard there was a party.',
  'we came for the chips.',
  'hi, i am normal.',
  'your mailbox is on fire.',
  'i brought my own chair.',
  'we walked here. long way.',
  'can i use your bathroom?',
  'i have a plus one. wait. no i do not.',
  'i love what you have done with the door.',
  'it is cold. let us in.',
  'we are the pizza guys. we forgot the pizza.',
  'i am here for the party and the chips.',
  'do you have a plunger?',
  'i brought dip. it is mostly mayo.',
  'someone said free food?',
  'we are friends of gary.',
  'i am not with them. i am alone. wait.',
  'nice lamps. very lampy.',
  'we can hear the music from the street.',
  'i have been standing here for eleven minutes.',
  'hello. i am here to have a normal time.',
];

const ANOMALY_LINES = [
  'hi. i am human.',
  'i brought fifty friends.',
  'you have nice skin.',
  'let me in. it is cold.',
  'i am your neighbor. probably.',
  'i have exactly two arms.',
  'the door is nice. i will eat it.',
  'do not look at my shadow.',
  'i am here for the party. i am here for the party.',
  'knock knock. i am a human person.',
  'i can smell your chips.',
  'there is no one behind me.',
  'i have been standing here for one thousand years.',
  'your door smells like a door.',
  'i am normal. i am normal. i am normal.',
  'do you like my face. i made it.',
  'one of us is real. guess.',
  'let me in and i will not do a murder.',
];

const ANOMALY_REACTIONS = [
  'why did you knock. now i have to knock.',
  'i am standing very still.',
  'do not look at my extra arm.',
  'my shadow is on vacation.',
  'i am a human. this is a human arm.',
  'stop that.',
  'you are making this weird.',
  'i can wait. i am very patient. i am not human.',
  'my head does that sometimes. it is fine.',
];

const HUMAN_REACTIONS = [
  'hello?',
  'yeah? we are still here.',
  'did you knock back?',
  'is it open?',
  'we are ready to party.',
  'this is a nice peephole.',
  'hello?? it is cold.',
  'we brought snacks!',
  'can you open up?',
  'i think the door is stuck.',
];

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return c;
}

export function makeHumanSpec(seed = Math.random()) {
  const r = mulberry((seed * 0xffffff) >>> 0);
  const name = pick(NAMES);
  const height = 0.92 + r() * 0.16;
  const build = 0.86 + r() * 0.3;
  const skin = pick(SKINS);
  const hair = pick(HAIRS);
  const hairStyle = pick(['short', 'short', 'short', 'long', 'bun', 'cap', 'beanie', 'bald', 'long', 'short']);
  return {
    kind: 'human',
    name,
    line: HUMAN_LINES[(r() * HUMAN_LINES.length) | 0],
    reaction: HUMAN_REACTIONS[(r() * HUMAN_REACTIONS.length) | 0],
    height,
    build,
    skin,
    hair,
    hairStyle,
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    shoes: pick(SHOES),
    hat: pick(HATS),
    faceSpec: humanFaceSpec(r()),
    tie: r() < 0.16,
    badge: r() < 0.1,
    eyeColor: pick(['#3b2a1a', '#2b1c12', '#3d5a80', '#4c6b3f']),
  };
}

const STRONG_TELLS = ['eyes', 'noFace', 'extraArms', 'wideMouth', 'tall', 'backwards', 'float', 'duplicate'];
const SUBTLE_TELLS = ['neck', 'skin', 'fingers', 'twitch', 'shadow', 'mismatch'];

export function makeAnomalySpec(primary = 'eyes', guests = 0) {
  const r = mulberry(Math.random() * 0xffffff);
  const tells = [primary];
  if (r() < 0.28) {
    const extra = pick(SUBTLE_TELLS.filter((t) => t !== primary));
    if (!tells.includes(extra)) tells.push(extra);
  }

  const skinBase = pick(SKINS);
  const faceKind = {
    eyes: 'eyes',
    noFace: 'noFace',
    wideMouth: 'wideMouth',
    backwards: 'smile',
    float: 'smile',
    duplicate: 'smile',
    tall: 'smile',
    extraArms: 'smile',
    neck: 'smile',
    skin: 'skin',
    fingers: 'smile',
    twitch: 'scream',
    shadow: 'smile',
    mismatch: 'mismatch',
  }[primary] || 'eyes';

  const pale = r() < 0.5;
  const skin = tells.includes('skin') ? pick(['#93a184', '#a8a79a', '#7f8d82', '#b1a392']) : (pale ? pick(['#e6cbb3', '#d8c4b1', '#cbb8a5']) : skinBase);
  let faceSpec = anomalyFaceSpec(faceKind, { skin });
  if (tells.includes('mismatch') && faceKind !== 'mismatch') {
    faceSpec = anomalyFaceSpec('mismatch', { skin });
  }
  if (tells.includes('skin')) {
    faceSpec.skin = skin;
    faceSpec.eyeColor = '#a51717';
  }

  const height = tells.includes('tall') ? 1.28 : 0.96 + r() * 0.09;
  return {
    kind: 'anomaly',
    name: '???',
    line: ANOMALY_LINES[(r() * ANOMALY_LINES.length) | 0],
    reaction: ANOMALY_REACTIONS[(r() * ANOMALY_REACTIONS.length) | 0],
    height,
    build: 0.88 + r() * 0.24,
    skin,
    hair: pick(HAIRS),
    hairStyle: tells.includes('noFace') ? pick(['short', 'bald']) : pick(['short', 'long', 'bald', 'beanie']),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    shoes: pick(SHOES),
    hat: pick(HATS),
    faceSpec,
    tells,
    tie: false,
    badge: false,
    eyeColor: '#8f1111',
    noShadow: tells.includes('shadow') || tells.includes('float'),
  };
}

export function makeGroupSpec(count, guests = 0) {
  const people = [];
  for (let i = 0; i < count; i++) people.push(makeHumanSpec(Math.random()));
  return { kind: 'human', count, people };
}

export function makeVisitorSpec({ anomaly = false, guests = 0, primary = null } = {}) {
  if (!anomaly) {
    const count = 1 + ((Math.random() * 3) | 0) + (Math.random() < 0.18 ? 1 : 0);
    return { kind: 'group', people: Array.from({ length: count }, () => makeHumanSpec(Math.random())) };
  }
  const r = Math.random();
  const strong = STRONG_TELLS[(Math.random() * STRONG_TELLS.length) | 0];
  const subtle = SUBTLE_TELLS[(Math.random() * SUBTLE_TELLS.length) | 0];
  let tell = primary;
  if (!tell) {
    if (guests < 12) tell = strong;
    else if (guests < 30) tell = r < 0.7 ? strong : subtle;
    else tell = r < 0.55 ? strong : subtle;
  }
  return { kind: 'group', people: [makeAnomalySpec(tell, guests)] };
}

/* ------------------------------------------------------------------ */

const geoCache = new Map();
function boxGeo(w, h, d) {
  const key = `${w}|${h}|${d}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(key);
}

export function createPerson(spec, opts = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const scale = spec.height || 1;
  const build = spec.build || 1;
  const skinColor = spec.skin || '#e5b58f';
  const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
  const shirtMat = new THREE.MeshLambertMaterial({ color: spec.shirt || '#b84b44' });
  const pantsMat = new THREE.MeshLambertMaterial({ color: spec.pants || '#2f3a52' });
  const shoeMat = new THREE.MeshLambertMaterial({ color: spec.shoes || '#201a16' });
  const hairMat = new THREE.MeshLambertMaterial({ color: spec.hair || '#2b1d15' });

  // legs
  const legW = 0.135 * build;
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(boxGeo(legW, 0.72, 0.19), pantsMat);
    leg.position.set(side * 0.14 * build, 0.38, 0);
    body.add(leg);
    const foot = new THREE.Mesh(boxGeo(legW + 0.035, 0.1, 0.3), shoeMat);
    foot.position.set(side * 0.14 * build, 0.05, 0.045);
    body.add(foot);
  }

  // torso
  const torso = new THREE.Mesh(boxGeo(0.42 * build, 0.6, 0.24), shirtMat);
  torso.position.y = 1.05;
  body.add(torso);

  // shirt collar / tie
  if (spec.tie) {
    const tie = new THREE.Mesh(boxGeo(0.07, 0.3, 0.02), new THREE.MeshLambertMaterial({ color: '#2d2d38' }));
    tie.position.set(0, 1.11, 0.13);
    body.add(tie);
  }
  if (spec.badge) {
    const badge = new THREE.Mesh(boxGeo(0.09, 0.11, 0.02), new THREE.MeshLambertMaterial({ color: '#f2e4c4' }));
    badge.position.set(-0.12 * build, 1.15, 0.13);
    body.add(badge);
  }

  // neck
  const neck = new THREE.Mesh(boxGeo(0.12, 0.14, 0.12), skinMat);
  neck.position.y = 1.4;
  body.add(neck);

  // head group
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.56;
  body.add(headGroup);

  const face = makeFace(spec.faceSpec || {});
  const faceMat = new THREE.MeshLambertMaterial({ map: face.openTex });
  const backMat = new THREE.MeshLambertMaterial({ color: spec.hair || '#2b1d15' });
  const headMats = [skinMat, skinMat, skinMat, skinMat, faceMat, backMat];
  const head = new THREE.Mesh(boxGeo(0.4, 0.44, 0.38), headMats);
  headGroup.add(head);

  // ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(boxGeo(0.045, 0.11, 0.09), skinMat);
    ear.position.set(side * 0.215, 0.01, 0);
    headGroup.add(ear);
  }

  // hair
  if (spec.hairStyle !== 'bald' && spec.hairStyle !== 'beanie' && spec.hairStyle !== 'cap') {
    const cap = new THREE.Mesh(boxGeo(0.43, 0.1, 0.41), hairMat);
    cap.position.y = 0.25;
    headGroup.add(cap);
  }
  if (spec.hairStyle === 'long') {
    const backHair = new THREE.Mesh(boxGeo(0.44, 0.38, 0.1), hairMat);
    backHair.position.set(0, 0.02, -0.2);
    headGroup.add(backHair);
    for (const side of [-1, 1]) {
      const sideHair = new THREE.Mesh(boxGeo(0.08, 0.32, 0.34), hairMat);
      sideHair.position.set(side * 0.22, 0.02, -0.01);
      headGroup.add(sideHair);
    }
  } else if (spec.hairStyle === 'bun') {
    const bun = new THREE.Mesh(boxGeo(0.18, 0.18, 0.18), hairMat);
    bun.position.set(0, 0.32, -0.14);
    headGroup.add(bun);
  } else if (spec.hairStyle === 'cap') {
    const capMat = new THREE.MeshLambertMaterial({ color: spec.hat || '#b33a34' });
    const top = new THREE.Mesh(boxGeo(0.44, 0.12, 0.42), capMat);
    top.position.y = 0.27;
    headGroup.add(top);
    const brim = new THREE.Mesh(boxGeo(0.4, 0.035, 0.2), capMat);
    brim.position.set(0, 0.24, 0.24);
    headGroup.add(brim);
  } else if (spec.hairStyle === 'beanie') {
    const capMat = new THREE.MeshLambertMaterial({ color: spec.hat || '#b33a34' });
    const top = new THREE.Mesh(boxGeo(0.46, 0.18, 0.44), capMat);
    top.position.y = 0.28;
    headGroup.add(top);
    const fold = new THREE.Mesh(boxGeo(0.47, 0.06, 0.45), new THREE.MeshLambertMaterial({ color: shade(spec.hat || '#b33a34', -0.08) }));
    fold.position.y = 0.19;
    headGroup.add(fold);
  }

  // arms
  const arms = [];
  const addArm = (side, level = 0, extra = false, rotation = 0) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (0.235 * build + 0.055), 1.32 + level, 0);
    pivot.rotation.z = side * 0.06 + rotation;
    body.add(pivot);
    const upper = new THREE.Mesh(boxGeo(0.115, 0.56, 0.13), extra ? skinMat : shirtMat);
    upper.position.y = -0.28;
    pivot.add(upper);
    const hand = new THREE.Mesh(boxGeo(0.13, 0.14, 0.15), skinMat);
    hand.position.y = -0.6;
    pivot.add(hand);
    arms.push(pivot);
    return pivot;
  };

  addArm(-1, 0, false);
  addArm(1, 0, false);

  if (spec.tells && spec.tells.includes('extraArms')) {
    addArm(-1, -0.16, true, -0.42);
    addArm(1, -0.16, true, 0.42);
    if (Math.random() < 0.4) addArm(0, 0.2, true, 0.2);
  }

  if (spec.tells && spec.tells.includes('fingers')) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const finger = new THREE.Mesh(boxGeo(0.022, 0.22, 0.022), skinMat);
        finger.position.set(side * (0.235 * build + 0.03 + i * 0.035), 0.76, 0.06);
        body.add(finger);
      }
    }
  }

  let longNeck = false;
  if (spec.tells && spec.tells.includes('neck')) {
    longNeck = true;
    headGroup.position.y += 0.3;
    const neckLong = new THREE.Mesh(boxGeo(0.1, 0.4, 0.1), skinMat);
    neckLong.position.y = 1.53;
    body.add(neckLong);
  }

  if (spec.tells && spec.tells.includes('backwards')) {
    headGroup.rotation.y = Math.PI;
    // a little extra hair on the "front" so the back of the head reads correctly
    const backCap = new THREE.Mesh(boxGeo(0.43, 0.1, 0.41), hairMat);
    backCap.position.y = 0.25;
    headGroup.add(backCap);
  }

  if (spec.tells && spec.tells.includes('twitch')) {
    // nothing static; animation adds the twitch
  }

  const baseY = spec.tells && spec.tells.includes('float') ? 0.2 : 0;
  body.position.y = baseY;

  // shadow blob (or no shadow, if you are not a human)
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.44 * build, 12), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.scale.set(1, 1.3, 1);
  g.add(shadow);
  if (spec.noShadow) shadow.visible = false;

  g.scale.set(1, scale, 1);
  g.position.y = 0;

  // duplicate tell: an identical friend standing just behind
  let duplicate = null;
  if (spec.tells && spec.tells.includes('duplicate') && !opts.noDuplicate) {
    const subSpec = { ...spec, tells: spec.tells.filter((t) => t !== 'duplicate'), noShadow: false, faceSpec: spec.faceSpec };
    duplicate = createPerson(subSpec, { noDuplicate: true });
    duplicate.position.set(0.28, 0, -0.72);
    duplicate.rotation.y = 0.12;
    duplicate.scale.set(1, scale, 1);
    g.add(duplicate);
  }

  const ud = {
    spec,
    isAnomaly: spec.kind === 'anomaly',
    name: spec.name,
    line: spec.line,
    reaction: spec.reaction,
    tells: spec.tells || [],
    face,
    faceMat,
    headGroup,
    head,
    body,
    arms,
    shadow,
    baseY,
    longNeck,
    phase: Math.random() * Math.PI * 2,
    blinkAt: 2 + Math.random() * 5,
    blinkEnd: 0,
    blinking: false,
    reactUntil: 0,
    duplicate,
    dead: false,
    deadT: 0,
    spawnedAt: performance.now() / 1000,
    sway: 0.4 + Math.random() * 0.5,
  };
  g.userData = ud;

  if (duplicate) duplicate.userData.noShadow = true;
  return g;
}

export function setBlink(person, on) {
  const ud = person.userData;
  if (!ud || !ud.face) return;
  ud.faceMat.map = on ? ud.face.blinkTex : ud.face.openTex;
  ud.faceMat.needsUpdate = true;
}

export function reactPerson(person, t) {
  if (!person || !person.userData) return;
  person.userData.reactUntil = t + 0.9;
}

export function animatePerson(person, t, mode = 'idle') {
  const ud = person.userData;
  if (!ud) return;
  const { body, headGroup, arms, phase } = ud;
  if (!body) return;

  if (ud.dead) {
    ud.deadT += 1 / 60;
    const p = Math.min(1, ud.deadT / 0.55);
    body.rotation.z = (ud.deathDir || 1) * p * (Math.PI / 2);
    body.position.y = ud.baseY - p * 0.1;
    return;
  }

  // blinking humans only
  if (!ud.isAnomaly) {
    const now = t;
    if (!ud.blinking && now > ud.blinkAt) {
      ud.blinking = true;
      ud.blinkEnd = now + 0.13;
      setBlink(person, true);
    } else if (ud.blinking && now > ud.blinkEnd) {
      ud.blinking = false;
      ud.blinkAt = now + 2.5 + Math.random() * 5.5;
      setBlink(person, false);
    }
  }

  const react = t < ud.reactUntil;
  const jump = react ? Math.sin(((ud.reactUntil - t) / 0.9) * Math.PI) : 0;

  if (mode === 'dance') {
    const b = Math.sin(t * 6 + phase);
    body.position.y = ud.baseY + Math.abs(b) * 0.08;
    body.rotation.z = Math.sin(t * 3 + phase) * 0.11;
    body.rotation.y = ud.isAnomaly ? 0 : Math.sin(t * 1.7 + phase) * 0.3;
    arms.forEach((a, i) => {
      a.rotation.z = (i % 2 === 0 ? -1 : 1) * (1.1 + b * 0.5);
      a.rotation.x = Math.sin(t * 6 + phase + i) * 0.3;
    });
    headGroup.rotation.z = Math.sin(t * 6 + phase) * 0.12;
    headGroup.rotation.x = Math.sin(t * 3 + phase) * 0.06;
  } else {
    body.position.y = ud.baseY + Math.sin(t * 1.4 + phase) * 0.012;
    body.rotation.z = Math.sin(t * 0.6 + phase) * 0.012;
    body.rotation.y = 0;
    arms.forEach((a, i) => {
      const base = (i % 2 === 0 ? -1 : 1) * 0.06;
      a.rotation.z = base + Math.sin(t * 0.9 + phase + i) * 0.03;
      a.rotation.x = Math.sin(t * 0.8 + phase + i) * 0.025;
    });
    headGroup.rotation.z = Math.sin(t * 0.5 + phase) * 0.02;
    headGroup.rotation.x = ud.longNeck ? Math.sin(t * 0.9 + phase) * 0.09 : 0;
  }

  if (react && ud.isAnomaly) {
    headGroup.rotation.z += Math.sin(t * 28) * 0.32 * jump;
    headGroup.rotation.y = Math.sin(t * 21) * 0.8 * jump;
    arms.forEach((a, i) => {
      a.rotation.z += Math.sin(t * 18 + i * 2) * 0.9 * jump;
    });
    body.rotation.z += Math.sin(t * 30) * 0.06 * jump;
  } else if (react) {
    headGroup.rotation.z += Math.sin(t * 7) * 0.1 * jump;
    arms[0].rotation.z += -1.9 * jump;
    arms[0].rotation.x = Math.sin(t * 11) * 0.3 * jump;
  }

  if (ud.isAnomaly && ud.tells.includes('twitch')) {
    const burst = Math.max(0, Math.sin(t * 0.9 + phase));
    headGroup.rotation.z += Math.sin(t * 17 + phase) * 0.18 * burst * burst;
    headGroup.rotation.y += Math.sin(t * 9.3 + phase) * 0.24 * burst * burst;
    arms.forEach((a, i) => {
      a.rotation.z += Math.sin(t * 13 + i) * 0.22 * burst * burst;
    });
  }

  if (ud.isAnomaly && ud.tells.includes('backwards')) {
    headGroup.rotation.y = Math.PI + Math.sin(t * 0.5 + phase) * 0.06;
  }

  if (ud.isAnomaly && ud.tells.includes('float')) {
    body.position.y = 0.2 + Math.sin(t * 2 + phase) * 0.06;
  }
}

export function addDeath(person, dir = 1) {
  const ud = person.userData;
  if (!ud || ud.dead) return;
  ud.dead = true;
  ud.deadT = 0;
  ud.deathDir = dir;
}

export { HUMAN_LINES, ANOMALY_LINES, NAMES, STRONG_TELLS, SUBTLE_TELLS };
