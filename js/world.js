/* The house, the porch, and all the cheap decorations. */

import * as THREE from '../vendor/three.module.js';
import {
  wallpaperTexture, floorTexture, rugTexture, doorTexture, porchTexture,
  ceilingTexture, doormatTexture, tvTexture, paintingTexture, bannerTexture,
  signTexture, starTexture,
} from './textures.js';

function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  m.position.set(x, y, z);
  return m;
}

function plane(w, h, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  return m;
}

function letterPaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(0, 0, 128, 160);
  ctx.strokeStyle = 'rgba(90,70,50,.3)';
  ctx.lineWidth = 1;
  for (let y = 30; y < 155; y += 12) {
    ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(118, y); ctx.stroke();
  }
  ctx.fillStyle = '#3a2d20';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STAND AT', 64, 46);
  ctx.fillText('THE DOOR', 64, 60);
  ctx.font = '8px monospace';
  ctx.fillText('(please)', 64, 74);
  ctx.fillStyle = '#9d1c1a';
  ctx.beginPath(); ctx.arc(92, 128, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e100e';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('D', 92, 131);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function buildWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08070c);
  scene.fog = new THREE.Fog(0x08070c, 13, 38);

  const room = new THREE.Group();
  scene.add(room);

  const wallMat = new THREE.MeshLambertMaterial({ map: wallpaperTexture() });
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture() });
  const ceilMat = new THREE.MeshLambertMaterial({ map: ceilingTexture() });
  const trimMat = lambert(0x5b4630);

  // floor & ceiling
  const floor = plane(10, 9, floorMat, 0, 0, 0, -Math.PI / 2);
  room.add(floor);
  const ceiling = plane(10, 9, ceilMat, 0, 3.16, 0, Math.PI / 2);
  room.add(ceiling);

  // back / side walls
  room.add(box(10, 3.2, 0.12, 0xcdbfa3, 0, 1.6, 4.5)).children.at(-1);
  const backWall = room.children.at(-1);
  backWall.material = wallMat;
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 9), wallMat);
  leftWall.position.set(-5, 1.6, 0);
  room.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 9), wallMat);
  rightWall.position.set(5, 1.6, 0);
  room.add(rightWall);

  // front wall with a door-shaped hole
  const frontL = new THREE.Mesh(new THREE.BoxGeometry(4.45, 3.2, 0.14), wallMat);
  frontL.position.set(-2.775, 1.6, -4.5);
  room.add(frontL);
  const frontR = new THREE.Mesh(new THREE.BoxGeometry(4.45, 3.2, 0.14), wallMat);
  frontR.position.set(2.775, 1.6, -4.5);
  room.add(frontR);
  const frontTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 0.14), wallMat);
  frontTop.position.set(0, 2.725, -4.5);
  room.add(frontTop);

  // baseboards
  for (const [w, x, z, ry] of [[10, 0, 4.43, 0], [9, -4.93, 0, Math.PI / 2], [9, 4.93, 0, Math.PI / 2]]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.06), trimMat);
    trim.position.set(x, 0.06, z);
    trim.rotation.y = ry;
    room.add(trim);
  }
  for (const [x, w] of [[-2.775, 4.45], [2.775, 4.45]]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.06), trimMat);
    trim.position.set(x, 0.06, -4.42);
    room.add(trim);
  }

  /* ---------------- door ---------------- */

  const doorFrameMat = lambert(0x3f2a18);
  const jambL = box(0.12, 2.36, 0.2, 0x3f2a18, -0.61, 1.18, -4.5);
  const jambR = box(0.12, 2.36, 0.2, 0x3f2a18, 0.61, 1.18, -4.5);
  const head = box(1.34, 0.13, 0.2, 0x3f2a18, 0, 2.36, -4.5);
  room.add(jambL, jambR, head);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.55, 0, -4.5);
  room.add(doorPivot);

  const doorMat = new THREE.MeshLambertMaterial({ map: doorTexture() });
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.25, 0.085), doorMat);
  doorMesh.position.set(0.55, 1.125, 0);
  doorPivot.add(doorMesh);

  // peephole + knob on the inside face
  const brass = lambert(0xb2924e);
  const peephole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.024, 10), brass);
  peephole.rotation.x = Math.PI / 2;
  peephole.position.set(0.55, 1.55, 0.055);
  doorPivot.add(peephole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), brass);
  knob.position.set(1.0, 1.06, 0.09);
  doorPivot.add(knob);
  const knobBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.04, 8), brass);
  knobBase.rotation.x = Math.PI / 2;
  knobBase.position.set(1.0, 1.06, 0.05);
  doorPivot.add(knobBase);
  // mail slot
  const slot = box(0.3, 0.05, 0.02, 0x2e2014, 0.55, 0.72, 0.05);
  doorPivot.add(slot);
  // number plaque
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: signTexture(), transparent: true }));
  plaque.position.set(0.55, 1.92, 0.046);
  doorPivot.add(plaque);

  const mat = plane(1.85, 0.95, new THREE.MeshLambertMaterial({ map: doormatTexture() }), 0, 0.014, -3.55, -Math.PI / 2);
  room.add(mat);

  // the letter
  const letterTex = letterPaperTexture();
  const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.4), new THREE.MeshBasicMaterial({ map: letterTex }));
  letter.rotation.x = -Math.PI / 2;
  letter.rotation.z = -0.22;
  letter.position.set(0.42, 0.025, -3.38);
  room.add(letter);
  const letterGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 20),
    new THREE.MeshBasicMaterial({ color: 0xf3df9c, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  letterGlow.rotation.x = -Math.PI / 2;
  letterGlow.position.set(0.42, 0.02, -3.38);
  room.add(letterGlow);

  /* ---------------- furniture ---------------- */

  const couchMat = lambert(0x596d55);
  const couchDark = lambert(0x43533f);
  const couch = new THREE.Group();
  couch.position.set(-4.06, 0, 1.3);
  couch.rotation.y = Math.PI / 2;
  const couchBase = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.34, 0.95), couchMat);
  couchBase.position.y = 0.33;
  couch.add(couchBase);
  const couchBack = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 0.28), couchDark);
  couchBack.position.set(0, 0.68, -0.36);
  couch.add(couchBack);
  for (const x of [-1.02, 1.02]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.9), couchDark);
    arm.position.set(x, 0.52, 0);
    couch.add(arm);
  }
  for (const x of [-0.52, 0.52]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 0.75), lambert(0x6b8064));
    cushion.position.set(x, 0.57, 0.06);
    couch.add(cushion);
  }
  // throw pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.14), lambert(0xb4533a));
  pillow.position.set(-0.7, 0.8, 0.18);
  pillow.rotation.z = 0.25;
  couch.add(pillow);
  room.add(couch);

  // rug
  const rug = plane(4.0, 2.8, new THREE.MeshLambertMaterial({ map: rugTexture() }), 0.15, 0.012, 1.15, -Math.PI / 2);
  room.add(rug);

  // coffee table
  const table = new THREE.Group();
  table.position.set(0.35, 0, 1.1);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.1, 1.0), lambert(0x6f4b2e));
  tableTop.position.y = 0.44;
  table.add(tableTop);
  for (const x of [-0.85, 0.85]) {
    for (const z of [-0.4, 0.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.42, 0.09), lambert(0x4d321d));
      leg.position.set(x, 0.21, z);
      table.add(leg);
    }
  }
  room.add(table);

  // little bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.08, 10), lambert(0xa8b6c0));
  bowl.position.set(0.55, 0.52, 1.05);
  room.add(bowl);

  // TV stand + TV
  const stand = new THREE.Group();
  stand.position.set(4.52, 0, 1.2);
  const standTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 1.9), lambert(0x4b3a2a));
  standTop.position.y = 0.31;
  stand.add(standTop);
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.86, 1.35), lambert(0x1d1e22));
  tvBody.position.set(-0.12, 0.9, 0);
  stand.add(tvBody);
  const tv = tvTexture();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.64), new THREE.MeshBasicMaterial({ map: tv.texture }));
  screen.position.set(-0.3, 0.92, 0);
  screen.rotation.y = -Math.PI / 2;
  stand.add(screen);
  room.add(stand);

  // bookshelf
  const shelf = new THREE.Group();
  shelf.position.set(-3.35, 0, 4.22);
  shelf.rotation.y = Math.PI;
  const shelfFrameMat = lambert(0x4c341f);
  const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.1, 0.1), shelfFrameMat);
  shelfBack.position.y = 1.4;
  shelf.add(shelfBack);
  for (const y of [0.42, 0.95, 1.48, 2.01]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.42), shelfFrameMat);
    board.position.set(0, y, 0.2);
    shelf.add(board);
  }
  for (const x of [-1.02, 1.02]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 0.42), shelfFrameMat);
    side.position.set(x, 1.4, 0.2);
    shelf.add(side);
  }
  const bookColors = [0x8c3b31, 0x3c5d82, 0x657d4c, 0x9a7a3c, 0x6d4d78, 0x2e3b4a];
  for (let r = 0; r < 3; r++) {
    let bx = -0.9;
    for (let i = 0; i < 9; i++) {
      const bw = 0.1 + Math.random() * 0.08;
      const bh = 0.3 + Math.random() * 0.13;
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.26), lambert(bookColors[(r * 3 + i) % bookColors.length]));
      b.position.set(bx + bw / 2, 0.52 + r * 0.53 + bh / 2, 0.16);
      shelf.add(b);
      bx += bw + 0.02;
      if (bx > 0.9) break;
    }
  }
  room.add(shelf);

  // console table near door
  const consoleTable = new THREE.Group();
  consoleTable.position.set(2.9, 0, -4.06);
  const ct = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.34), lambert(0x5b3d25));
  ct.position.y = 0.78;
  consoleTable.add(ct);
  for (const x of [-0.52, 0.52]) {
    for (const z of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.07), lambert(0x3b2716));
      leg.position.set(x, 0.38, z);
      consoleTable.add(leg);
    }
  }
  const keyBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.06, 10), lambert(0x809a9f));
  keyBowl.position.set(-0.3, 0.85, 0);
  consoleTable.add(keyBowl);
  room.add(consoleTable);

  // plants
  function makePlant(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 8), lambert(0x9a583b));
    pot.position.y = 0.16;
    g.add(pot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.8, 6), lambert(0x3e5d31));
    stem.position.y = 0.7;
    g.add(stem);
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 5), lambert(i % 2 ? 0x4f7a3b : 0x3f6631));
      const a = (i / 8) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.22, 1.0 + Math.random() * 0.25, Math.sin(a) * 0.22);
      leaf.rotation.z = Math.cos(a) * 0.9;
      leaf.rotation.x = Math.sin(a) * 0.9;
      g.add(leaf);
    }
    room.add(g);
    return g;
  }
  makePlant(4.35, -3.7, 1.1);
  makePlant(-4.5, 3.6, 1.25);
  makePlant(4.4, 4.0, 0.9);

  // coat rack
  const rack = new THREE.Group();
  rack.position.set(-2.2, 0, -4.1);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.9, 6), lambert(0x3f2a18));
  pole.position.y = 0.95;
  rack.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.05, 8), lambert(0x2f1f12));
  base.position.y = 0.025;
  rack.add(base);
  for (let i = 0; i < 4; i++) {
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), lambert(0x2f1f12));
    hook.position.set(Math.cos(i * 1.7) * 0.12, 1.7, Math.sin(i * 1.7) * 0.12);
    hook.rotation.z = Math.cos(i * 1.7) * 0.7;
    rack.add(hook);
  }
  const coatMat = lambert(0x394a5c);
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.7, 0.2), coatMat);
  coat.position.set(0.06, 1.34, 0.13);
  coat.rotation.z = 0.04;
  rack.add(coat);
  room.add(rack);

  // wall art
  function addPainting(kind, x, y, z, ry) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.06), lambert(0x3b2818));
    frame.position.set(x, y, z);
    frame.rotation.y = ry;
    room.add(frame);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshBasicMaterial({ map: paintingTexture(kind) }));
    art.position.set(x, y, z);
    art.rotation.y = ry;
    // lift off the wall a hair
    const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, ry, 0));
    art.position.addScaledVector(n, 0.04);
    room.add(art);
  }
  addPainting(0, -1.8, 1.9, 4.42, Math.PI);
  addPainting(1, 0.2, 1.9, 4.42, Math.PI);
  addPainting(2, 2.1, 1.9, 4.42, Math.PI);
  addPainting(0, -4.92, 1.8, -1.2, Math.PI / 2);

  // ceiling lamp
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 4), lambert(0x211a14));
  cord.position.set(0, 2.98, 0.55);
  room.add(cord);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.4, 0.32, 10, 1, true), lambert(0xf0d9a4));
  shade.position.set(0, 2.77, 0.55);
  room.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe6ab }));
  bulb.position.set(0, 2.66, 0.55);
  room.add(bulb);

  // cat
  const cat = new THREE.Group();
  cat.position.set(-3.95, 0.62, 0.72);
  cat.rotation.y = 0.5;
  const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.26), lambert(0x2b2521));
  catBody.position.y = 0.12;
  cat.add(catBody);
  const catHead = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.22, 0.22), lambert(0x2b2521));
  catHead.position.set(-0.26, 0.27, 0);
  cat.add(catHead);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 4), lambert(0x2b2521));
    ear.position.set(-0.26, 0.42, side * 0.07);
    cat.add(ear);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0xa9d45c }));
    eye.position.set(-0.375, 0.29, side * 0.055);
    cat.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.45), lambert(0x2b2521));
  tail.position.set(0.24, 0.22, 0.14);
  tail.rotation.x = 0.8;
  cat.add(tail);
  cat.userData.tail = tail;
  room.add(cat);

  /* ---------------- lights ---------------- */

  const hemi = new THREE.HemisphereLight(0xffe2bd, 0x241d2b, 0.75);
  scene.add(hemi);

  const roomLight = new THREE.PointLight(0xffc883, 34, 15, 2);
  roomLight.position.set(0, 2.6, 0.55);
  scene.add(roomLight);

  const fillLight = new THREE.PointLight(0xffb070, 12, 11, 2);
  fillLight.position.set(3.4, 2.1, 2.4);
  scene.add(fillLight);

  const tvLight = new THREE.PointLight(0x7aa8d8, 5, 6, 2);
  tvLight.position.set(4.1, 1.1, 1.2);
  scene.add(tvLight);

  const porchLight = new THREE.PointLight(0xffc27a, 22, 12, 2);
  porchLight.position.set(0.6, 2.55, -5.15);
  scene.add(porchLight);

  const moon = new THREE.DirectionalLight(0x9db6d8, 0.55);
  moon.position.set(-8, 12, -12);
  scene.add(moon);

  const partyLights = [];
  for (const [color, x, z] of [[0xff4d4d, -2.2, 2.6], [0x55d36a, 2.4, 0.4], [0x5c7cff, 0.2, -2.6]]) {
    const l = new THREE.PointLight(color, 0, 10, 2);
    l.position.set(x, 2.5, z);
    scene.add(l);
    partyLights.push(l);
  }

  // porch visible exterior
  const porch = new THREE.Group();
  scene.add(porch);

  const porchFloor = plane(11, 6.4, new THREE.MeshLambertMaterial({ map: porchTexture() }), 0, -0.02, -7.6, -Math.PI / 2);
  porch.add(porchFloor);

  // porch roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.18, 3.2), lambert(0x3a3029));
  roof.position.set(0, 2.95, -6.1);
  porch.add(roof);
  for (const x of [-3.4, 3.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.95, 0.16), lambert(0x44372b));
    post.position.set(x, 1.47, -6.7);
    porch.add(post);
  }

  // porch light fixture
  const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), lambert(0x2b2118));
  lightBox.position.set(0.6, 2.7, -4.78);
  porch.add(lightBox);
  const bulbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd39a }));
  bulbGlow.position.set(0.6, 2.57, -4.72);
  porch.add(bulbGlow);

  // railing
  const railMat = lambert(0x3f342a);
  const railZ = -7.8;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 0.12), railMat);
  rail.position.set(0, 1.0, railZ);
  porch.add(rail);
  for (let x = -5; x <= 5; x += 1.25) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), railMat);
    post.position.set(x, 0.55, railZ);
    porch.add(post);
  }
  for (const y of [0.34, 0.68]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.055, 0.055), railMat);
    bar.position.set(0, y, railZ);
    porch.add(bar);
  }

  // steps
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(11 - i * 0.4, 0.16, 0.42), lambert(0x3d332b));
    step.position.set(0, -0.08 - i * 0.16, -8.1 - i * 0.36);
    porch.add(step);
  }

  // yard
  const yard = plane(40, 30, lambert(0x141b16), 0, -0.36, -18, -Math.PI / 2);
  porch.add(yard);
  const fenceMat = lambert(0x2a2a2c);
  for (let x = -12; x <= 12; x += 1.5) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), fenceMat);
    post.position.set(x, 0.25, -12.5);
    porch.add(post);
  }
  for (const y of [0.45, 0.9]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(25, 0.07, 0.07), fenceMat);
    bar.position.set(0, y, -12.5);
    porch.add(bar);
  }

  // trees
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.6, 5), lambert(0x2c231b));
    trunk.position.y = 1.8;
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2 - i * 0.22, 1.4, 6), lambert(0x182619));
      leaves.position.y = 2.6 + i * 0.8;
      g.add(leaves);
    }
    porch.add(g);
  }
  tree(-7.5, -11.5, 1.15);
  tree(7.8, -12.5, 1.35);
  tree(10.5, -9, 0.9);

  // streetlamp
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), lambert(0x232326));
  lampPost.position.set(-5.4, 2.1, -10.3);
  porch.add(lampPost);
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
  lampHead.position.set(-5.4, 4.22, -10.3);
  porch.add(lampHead);
  const streetGlow = new THREE.PointLight(0xffcf86, 10, 14, 2);
  streetGlow.position.set(-5.4, 4.1, -10.3);
  porch.add(streetGlow);

  // moon + stars
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xf4eccf }));
  moonMesh.position.set(-8, 8.5, -24);
  scene.add(moonMesh);
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 160; i++) {
    starPos.push((Math.random() - 0.5) * 60, 4 + Math.random() * 18, -18 - Math.random() * 22);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd8e0ea, size: 0.07, map: starTexture(), transparent: true, depthWrite: false, sizeAttenuation: true }));
  scene.add(stars);

  /* ---------------- party decor ---------------- */

  const decor = new THREE.Group();
  scene.add(decor);

  const balloons = new THREE.Group();
  const balloonColors = [0xd4433c, 0x417fc2, 0x4f9e59, 0xe0b43a, 0xb05bb7, 0xe17333];
  const balloonSpots = [
    [-3.9, 2.5, 3.5], [-3.2, 2.75, 4.0], [3.9, 2.45, 3.4], [3.1, 2.8, 4.0],
    [-4.3, 2.3, -2.8], [4.3, 2.35, -2.9], [-1.4, 2.85, -3.5], [1.5, 2.9, -3.6],
    [-2.5, 2.55, 0.2], [2.7, 2.6, -0.2], [-0.8, 2.95, 2.6], [0.9, 2.9, 3.0],
  ];
  balloonSpots.forEach(([x, y, z], i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 8), lambert(balloonColors[i % balloonColors.length]));
    b.position.set(x, y, z);
    b.scale.y = 1.2;
    balloons.add(b);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.5, 3), lambert(0x8f806a));
    string.position.set(x + 0.02, y - 0.85, z);
    balloons.add(string);
  });
  balloons.visible = false;
  decor.add(balloons);

  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.18), new THREE.MeshBasicMaterial({ map: bannerTexture() }));
  banner.position.set(0, 2.5, 4.43);
  banner.rotation.y = Math.PI;
  banner.visible = false;
  decor.add(banner);

  const streamers = new THREE.Group();
  const streamerColors = [0xd4433c, 0x417fc2, 0x4f9e59, 0xe0b43a, 0xb05bb7];
  for (let i = 0; i < 14; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.7 + Math.random() * 0.5), new THREE.MeshBasicMaterial({ color: streamerColors[i % 5], side: THREE.DoubleSide }));
    strip.position.set(-4 + Math.random() * 8, 2.85, -4 + Math.random() * 8);
    strip.rotation.z = (Math.random() - 0.5) * 0.5;
    strip.rotation.y = Math.random() * Math.PI;
    streamers.add(strip);
  }
  streamers.visible = false;
  decor.add(streamers);

  const snacks = new THREE.Group();
  const snackColors = [0xe0b43a, 0xd46a35, 0x9c4a37, 0xdfd0a0];
  for (let i = 0; i < 5; i++) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.1, 9), lambert(i % 2 ? 0xacb6bd : 0xc8a35a));
    bowl.position.set(-0.72 + i * 0.34, 0.53, 1.1 + (i % 2 ? 0.12 : -0.08));
    snacks.add(bowl);
    for (let k = 0; k < 7; k++) {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.05), lambert(snackColors[(i + k) % 4]));
      chip.position.set(bowl.position.x + (Math.random() - 0.5) * 0.16, 0.59, bowl.position.z + (Math.random() - 0.5) * 0.16);
      chip.rotation.y = Math.random();
      snacks.add(chip);
    }
  }
  // cups
  for (let i = 0; i < 8; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.13, 7), lambert(i % 2 ? 0xd4433c : 0xded6c4));
    cup.position.set(-0.9 + Math.random() * 1.9, 0.545, 0.6 + Math.random() * 0.9);
    snacks.add(cup);
  }
  snacks.visible = false;
  decor.add(snacks);

  const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: 0xd8d8e2, wireframe: true }));
  disco.position.set(0, 2.55, 0.55);
  disco.visible = false;
  decor.add(disco);
  const discoCord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 3), lambert(0x1a1a1a));
  discoCord.position.set(0, 2.9, 0.55);
  discoCord.visible = false;
  decor.add(discoCord);

  // confetti
  const confettiCount = 420;
  const confettiGeo = new THREE.BufferGeometry();
  const cpos = new Float32Array(confettiCount * 3);
  const ccol = new Float32Array(confettiCount * 3);
  const cvel = [];
  for (let i = 0; i < confettiCount; i++) {
    cpos[i * 3] = (Math.random() - 0.5) * 9;
    cpos[i * 3 + 1] = Math.random() * 3.1;
    cpos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    const col = new THREE.Color(streamerColors[i % streamerColors.length]);
    ccol[i * 3] = col.r; ccol[i * 3 + 1] = col.g; ccol[i * 3 + 2] = col.b;
    cvel.push(0.3 + Math.random() * 0.7);
  }
  confettiGeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  confettiGeo.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
  const confetti = new THREE.Points(confettiGeo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  confetti.visible = false;
  decor.add(confetti);

  // visitors waiting outside, and the crowd inside
  const visitorsGroup = new THREE.Group();
  scene.add(visitorsGroup);
  const crowdGroup = new THREE.Group();
  scene.add(crowdGroup);

  const world = {
    scene,
    room,
    camera: null,
    door: { pivot: doorPivot, mesh: doorMesh, open: 0, target: 0 },
    letter,
    letterGlow,
    visitorsGroup,
    crowdGroup,
    decor,
    balloons,
    banner,
    streamers,
    snacks,
    disco,
    discoCord,
    confetti,
    confettiVel: cvel,
    lights: { hemi, room: roomLight, fill: fillLight, tv: tvLight, porch: porchLight, moon, party: partyLights, street: streetGlow },
    tv,
    cat,
    porch,
    partyLevel: 0,
    horror: false,
    t: 0,
  };

  world.setPartyLevel = (level) => {
    world.partyLevel = level;
    balloons.visible = level >= 1;
    snacks.visible = level >= 2;
    banner.visible = level >= 3;
    streamers.visible = level >= 4;
    disco.visible = level >= 5;
    discoCord.visible = level >= 5;
    confetti.visible = level >= 5;
    // reveal balloons progressively
    if (balloons.visible) {
      const show = Math.min(balloonSpots.length, level * 3);
      balloons.children.forEach((child, i) => {
        const idx = Math.floor(i / 2);
        child.visible = idx < show;
      });
    }
  };

  world.setDoorOpen = (v) => { world.door.target = v; };

  world.update = (t, dt) => {
    world.t = t;
    // door spring
    const d = world.door;
    d.open += (d.target - d.open) * Math.min(1, dt * 6.5);
    d.pivot.rotation.y = d.open * 1.9;

    // TV static flicker
    if (world.tvTimer === undefined) world.tvTimer = 0;
    world.tvTimer += dt;
    if (world.tvTimer > 0.11) {
      world.tvTimer = 0;
      const mode = world.horror ? 'dead' : (world.partyLevel >= 5 ? 'party' : 'static');
      world.tv.draw(t, mode);
      world.tv.texture.needsUpdate = true;
    }
    tvLight.intensity = 3 + Math.random() * (world.horror ? 1 : 4);

    // letter ring
    if (world.letterGlow.visible) {
      const s = 1 + Math.sin(t * 3.2) * 0.08;
      world.letterGlow.scale.setScalar(s);
      world.letterGlow.material.opacity = 0.3 + (Math.sin(t * 3.2) + 1) * 0.13;
    }

    // cat tail
    if (world.cat.userData.tail) {
      world.cat.userData.tail.rotation.x = 0.8 + Math.sin(t * 1.6) * 0.2;
    }

    // disco spin
    if (disco.visible) {
      disco.rotation.y += dt * 0.8;
      disco.rotation.x += dt * 0.3;
    }

    // confetti
    if (confetti.visible) {
      const pos = confetti.geometry.attributes.position;
      for (let i = 0; i < confettiCount; i++) {
        let y = pos.array[i * 3 + 1] - cvel[i] * dt;
        if (y < 0.02) y = 3.1;
        pos.array[i * 3 + 1] = y;
        pos.array[i * 3] += Math.sin(t * 1.4 + i) * dt * 0.12;
      }
      pos.needsUpdate = true;
    }

    // party light cycle
    if (world.partyLevel >= 5 && !world.horror) {
      const colors = [0xff4d4d, 0x55d36a, 0x5c7cff, 0xffd24d, 0xff5bd0];
      partyLights.forEach((l, i) => {
        l.intensity = 13 + Math.sin(t * 2.4 + i * 2) * 8;
        l.color.setHex(colors[(Math.floor(t * 1.3) + i) % colors.length]);
      });
      roomLight.color.setHSL((t * 0.07) % 1, 0.55, 0.62);
      roomLight.intensity = 20 + Math.sin(t * 3) * 8;
    }
  };

  return world;
}
