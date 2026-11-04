import * as THREE from '../vendor/three.module.js';
import {
  wallpaperTexture,
  floorTexture,
  ceilingTexture,
  rugTexture,
  doorTexture,
  doormatTexture,
  letterTexture,
  posterTexture,
  photoTexture,
  nightWindowTexture,
  tvTexture,
  drawTVFrame,
  spriteLabel,
  partyBannerTexture,
} from './textures.js';

const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
};

function plane(w, h, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

function makeClockTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#e9dfc5';
  g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.strokeStyle = '#3a2c1f'; g.lineWidth = i % 3 === 0 ? 3 : 1.5;
    g.beginPath();
    g.moveTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24);
    g.lineTo(32 + Math.cos(a) * 27, 32 + Math.sin(a) * 27);
    g.stroke();
  }
  // 8:47
  const hour = (8 + 47 / 60) / 12 * Math.PI * 2 - Math.PI / 2;
  const min = 47 / 60 * Math.PI * 2 - Math.PI / 2;
  g.strokeStyle = '#17100b'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(hour) * 13, 32 + Math.sin(hour) * 13); g.stroke();
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(min) * 21, 32 + Math.sin(min) * 21); g.stroke();
  g.fillStyle = '#8e1616'; g.beginPath(); g.arc(32, 32, 2.5, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function makePlaqueTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#b58f3f';
  g.fillRect(0, 0, 64, 32);
  g.strokeStyle = '#3e2a0d';
  g.lineWidth = 2;
  g.strokeRect(2, 2, 60, 28);
  g.fillStyle = '#2b1d08';
  g.font = 'bold 19px Georgia';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('50', 32, 17);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function makeGuest(scene, colors, skin) {
  const g = new THREE.Group();
  const bodyMat = mat(colors[0]);
  const headMat = mat(skin);
  const legMat = mat(colors[1]);
  const body = box(0.5, 0.72, 0.3, bodyMat, 0, 1.05, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), headMat);
  head.position.y = 1.57;
  const legL = box(0.16, 0.62, 0.18, legMat, -0.12, 0.36, 0);
  const legR = box(0.16, 0.62, 0.18, legMat, 0.12, 0.36, 0);
  const armL = box(0.1, 0.55, 0.1, bodyMat, -0.32, 1.08, 0);
  const armR = box(0.1, 0.55, 0.1, bodyMat, 0.32, 1.08, 0);
  g.add(body, head, legL, legR, armL, armR);
  // cup
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 6), mat(0xc23b2f));
  cup.position.set(0.38, 1.26, 0.11);
  g.add(cup);
  g.userData = { head, body, armL, armR, cup, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.5 };
  scene.add(g);
  return g;
}

function makeBalloon(color) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 7), mat(color));
  b.scale.y = 1.25;
  g.add(b);
  const string = box(0.012, 0.7, 0.012, mat(0xcfc3a3), 0, -0.55, 0);
  g.add(string);
  return g;
}

export function createHouse(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // ------------------------------------------------------------
  // LIGHTS
  // ------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xffd9ac, 0x241922, 0.55);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffd2a2, 0.62);
  scene.add(ambient);
  const ceiling = new THREE.PointLight(0xffc88f, 18, 15, 1.7);
  ceiling.position.set(0, 2.86, 0.2);
  scene.add(ceiling);
  const tvLight = new THREE.PointLight(0x6f9dff, 4.5, 6, 2);
  tvLight.position.set(-4.9, 1.5, 0.2);
  scene.add(tvLight);
  const lampLight = new THREE.PointLight(0xff9b4a, 8, 7, 2);
  lampLight.position.set(-5.15, 1.65, -2.6);
  scene.add(lampLight);
  const hallwayLight = new THREE.PointLight(0xffd08a, 9, 5, 2);
  hallwayLight.position.set(0, 2.3, -5.4);
  scene.add(hallwayLight);
  const windowLight = new THREE.PointLight(0x7f9ec9, 3.2, 5, 2);
  windowLight.position.set(2.5, 1.8, 3.8);
  scene.add(windowLight);

  // ------------------------------------------------------------
  // ROOM SHELL
  // ------------------------------------------------------------
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture() });
  root.add(plane(12, 9, floorMat, 0, 0, 0, -Math.PI / 2));

  const ceilMat = new THREE.MeshLambertMaterial({ map: ceilingTexture() });
  root.add(plane(12, 9, ceilMat, 0, 3.16, 0, Math.PI / 2));

  const wallMat = new THREE.MeshLambertMaterial({ map: wallpaperTexture() });
  // south wall (behind TV)
  root.add(plane(12, 3.2, wallMat, 0, 1.6, 4.5, 0, Math.PI));
  // west wall
  root.add(plane(9, 3.2, wallMat, -6, 1.6, 0, 0, Math.PI / 2));
  // east wall
  root.add(plane(9, 3.2, wallMat, 6, 1.6, 0, 0, -Math.PI / 2));

  // north wall with a door-shaped hole
  root.add(box(5.05, 3.2, 0.16, wallMat, -3.475, 1.6, -4.5));
  root.add(box(5.05, 3.2, 0.16, wallMat, 3.475, 1.6, -4.5));
  root.add(box(1.9, 0.7, 0.16, wallMat, 0, 2.85, -4.5));

  // baseboards
  const trimMat = mat(0x4a2f22);
  root.add(box(11.9, 0.16, 0.06, trimMat, 0, 0.08, 4.43));
  root.add(box(0.06, 0.16, 8.9, trimMat, -5.93, 0.08, 0));
  root.add(box(0.06, 0.16, 8.9, trimMat, 5.93, 0.08, 0));
  root.add(box(5.0, 0.16, 0.06, trimMat, -3.47, 0.08, -4.43));
  root.add(box(5.0, 0.16, 0.06, trimMat, 3.47, 0.08, -4.43));

  // door frame
  const frameMat = mat(0x3d2418);
  root.add(box(0.14, 2.68, 0.24, frameMat, -1.0, 1.34, -4.42));
  root.add(box(0.14, 2.68, 0.24, frameMat, 1.0, 1.34, -4.42));
  root.add(box(2.14, 0.16, 0.24, frameMat, 0, 2.58, -4.42));

  // hallway beyond the door
  const hallMat = new THREE.MeshLambertMaterial({ map: wallpaperTexture() });
  const hallFloor = new THREE.MeshLambertMaterial({ color: 0x2c1e16 });
  root.add(plane(2.6, 2.0, hallFloor, 0, 0.005, -5.5, -Math.PI / 2));
  root.add(plane(2.6, 3.2, hallMat, 0, 1.6, -6.55, 0, 0));
  root.add(plane(2.0, 3.2, hallMat, -1.3, 1.6, -5.5, 0, Math.PI / 2));
  root.add(plane(2.0, 3.2, hallMat, 1.3, 1.6, -5.5, 0, -Math.PI / 2));
  root.add(plane(2.6, 2.0, hallMat, 0, 3.15, -5.5, Math.PI / 2));
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd58e });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbMat);
  bulb.position.set(0, 2.5, -5.4);
  root.add(bulb);
  root.add(box(0.02, 0.28, 0.02, mat(0x2a2018), 0, 2.65, -5.4));

  // ------------------------------------------------------------
  // DOOR
  // ------------------------------------------------------------
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.95, 0, -4.4);
  root.add(doorPivot);
  const doorMat = new THREE.MeshLambertMaterial({ map: doorTexture() });
  const door = box(1.9, 2.5, 0.1, doorMat, 0.95, 1.25, 0);
  doorPivot.add(door);
  // peephole
  const peepRim = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 10), mat(0x1b1512));
  peepRim.rotation.x = Math.PI / 2;
  peepRim.position.set(0.95, 1.62, 0.065);
  doorPivot.add(peepRim);
  const peepGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), new THREE.MeshBasicMaterial({ color: 0x25221f }));
  peepGlass.rotation.x = Math.PI / 2;
  peepGlass.position.set(0.95, 1.62, 0.072);
  doorPivot.add(peepGlass);
  // handle
  const brass = new THREE.MeshPhongMaterial({ color: 0xb18a3a, shininess: 35 });
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), brass);
  handle.scale.z = 0.55;
  handle.position.set(1.69, 1.06, 0.1);
  doorPivot.add(handle);
  const handleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 10), brass);
  handleBase.rotation.x = Math.PI / 2;
  handleBase.position.set(1.69, 1.06, 0.06);
  doorPivot.add(handleBase);
  // number plaque
  const plaque = plane(0.48, 0.24, new THREE.MeshBasicMaterial({ map: makePlaqueTexture() }), 0.95, 2.12, 0.061);
  doorPivot.add(plaque);

  // doormat + letter
  const matMat = new THREE.MeshLambertMaterial({ map: doormatTexture() });
  root.add(plane(1.65, 0.82, matMat, 0, 0.012, -3.83, -Math.PI / 2));
  const letter = new THREE.Group();
  letter.position.set(0, 0.015, -3.55);
  const letterMesh = plane(0.58, 0.38, new THREE.MeshLambertMaterial({ map: letterTexture() }), 0, 0, 0, -Math.PI / 2, 0, 0.16);
  letter.add(letterMesh);
  letter.visible = false;
  root.add(letter);
  const letterMarker = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteLabel('READ', '#ffd86b'),
    transparent: true,
    depthTest: false,
  }));
  letterMarker.position.set(0, 0.7, -3.55);
  letterMarker.scale.set(0.58, 0.29, 1);
  letterMarker.visible = false;
  root.add(letterMarker);

  const doorMarker = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteLabel('!', '#ff5548'),
    transparent: true,
    depthTest: false,
  }));
  doorMarker.position.set(0, 2.68, -4.2);
  doorMarker.scale.set(0.46, 0.23, 1);
  doorMarker.visible = false;
  root.add(doorMarker);

  // ------------------------------------------------------------
  // FURNITURE
  // ------------------------------------------------------------
  const fabric = mat(0x35504d);
  const fabricDark = mat(0x263b39);
  const wood = mat(0x5b3823);
  const darkWood = mat(0x3d2418);
  const metal = new THREE.MeshPhongMaterial({ color: 0x77706a, shininess: 20 });

  // sofa (faces the TV on the west wall)
  const sofa = new THREE.Group();
  sofa.position.set(-4.16, 0, 0.2);
  sofa.add(box(1.3, 0.35, 2.75, fabricDark, 0, 0.3, 0));
  for (let i = -1; i <= 1; i++) {
    sofa.add(box(1.12, 0.18, 0.82, fabric, -0.03, 0.53, i * 0.86));
  }
  sofa.add(box(0.26, 0.98, 2.75, fabric, 0.6, 0.83, 0));
  sofa.add(box(1.18, 0.34, 0.24, fabricDark, 0, 0.66, -1.32));
  sofa.add(box(1.18, 0.34, 0.24, fabricDark, 0, 0.66, 1.32));
  // legs
  for (const z of [-1.2, 1.2]) for (const x of [-0.55, 0.55]) {
    sofa.add(box(0.1, 0.16, 0.1, darkWood, x, 0.08, z));
  }
  // pillows
  const pillowA = box(0.48, 0.32, 0.5, mat(0xc07a35), -0.2, 0.73, -0.86);
  pillowA.rotation.z = 0.15;
  const pillowB = box(0.44, 0.3, 0.44, mat(0x8f4a38), -0.14, 0.73, 0.9);
  pillowB.rotation.z = -0.12;
  sofa.add(pillowA, pillowB);
  root.add(sofa);

  // cat on the sofa
  const cat = new THREE.Group();
  cat.position.set(-3.95, 0.7, 0.87);
  const catBody = box(0.22, 0.16, 0.42, mat(0x121012), 0, 0.05, 0);
  const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), mat(0x151214));
  catHead.position.set(0, 0.11, 0.2);
  const catEar1 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 4), mat(0x151214));
  catEar1.position.set(-0.075, 0.22, 0.18);
  const catEar2 = catEar1.clone(); catEar2.position.x = 0.075;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9fe35d });
  const catEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), eyeMat);
  catEye1.position.set(-0.05, 0.12, 0.31);
  const catEye2 = catEye1.clone(); catEye2.position.x = 0.05;
  cat.add(catBody, catHead, catEar1, catEar2, catEye1, catEye2);
  root.add(cat);

  // coffee table
  const table = new THREE.Group();
  table.position.set(-2.55, 0, 0.2);
  table.add(box(1.45, 0.08, 0.95, wood, 0, 0.44, 0));
  for (const z of [-0.38, 0.38]) for (const x of [-0.6, 0.6]) {
    table.add(box(0.08, 0.44, 0.08, darkWood, x, 0.22, z));
  }
  table.add(box(1.0, 0.05, 0.55, mat(0x6b452b), 0, 0.14, 0));
  // pizza box
  const pizza = box(0.52, 0.07, 0.52, mat(0xc9a35b), 0.22, 0.51, 0.08);
  pizza.rotation.y = 0.18;
  table.add(pizza);
  // cups
  const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 7), mat(0xa3322c));
  cup1.position.set(-0.42, 0.55, -0.23);
  table.add(cup1);
  const cup2 = cup1.clone(); cup2.position.set(-0.31, 0.55, -0.17); cup2.material = mat(0x3b67a3);
  table.add(cup2);
  // remote
  const remote = box(0.08, 0.04, 0.25, mat(0x222222), -0.3, 0.51, 0.27);
  remote.rotation.y = 0.4;
  table.add(remote);
  root.add(table);

  // rug
  const rug = plane(4.7, 4.0, new THREE.MeshLambertMaterial({ map: rugTexture() }), -3.05, 0.013, 0.2, -Math.PI / 2);
  root.add(rug);

  // TV stand + television on the west wall
  const stand = new THREE.Group();
  stand.position.set(-5.62, 0, 0.2);
  stand.add(box(0.5, 0.52, 1.85, darkWood, 0, 0.26, 0));
  stand.add(box(0.42, 0.06, 1.7, wood, 0, 0.03, 0));
  const tvBody = box(0.34, 0.82, 1.14, mat(0x1b1a1b), 0.02, 1.18, 0);
  stand.add(tvBody);
  const tvTex = tvTexture();
  const screen = plane(1.0, 0.62, new THREE.MeshBasicMaterial({ map: tvTex }), 0.2, 1.18, 0, 0, Math.PI / 2);
  stand.add(screen);
  // TV feet
  stand.add(box(0.5, 0.08, 0.16, mat(0x101010), 0, 0.76, -0.4));
  stand.add(box(0.5, 0.08, 0.16, mat(0x101010), 0, 0.76, 0.4));
  // antenna
  const ant1 = box(0.02, 0.45, 0.02, metal, 0, 1.74, 0.18);
  ant1.rotation.z = 0.45;
  const ant2 = box(0.02, 0.45, 0.02, metal, 0, 1.74, -0.18);
  ant2.rotation.z = -0.45;
  stand.add(ant1, ant2);
  root.add(stand);

  // floor lamp
  const lamp = new THREE.Group();
  lamp.position.set(-5.2, 0, -2.6);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.7, 6), metal);
  lampPole.position.y = 0.85;
  lamp.add(lampPole);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 8), metal);
  lampBase.position.y = 0.03;
  lamp.add(lampBase);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0xe2b06b, side: THREE.DoubleSide, emissive: 0x6a3a13 }));
  shade.position.y = 1.7;
  lamp.add(shade);
  const bulbLamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffe0a3 }));
  bulbLamp.position.y = 1.56;
  lamp.add(bulbLamp);
  root.add(lamp);

  // ceiling fan
  const fan = new THREE.Group();
  fan.position.set(1.4, 3.02, 0.55);
  const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6), metal);
  fan.add(fanStem);
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8), metal);
  fanHub.position.y = -0.1;
  fan.add(fanHub);
  const blades = [];
  for (let i = 0; i < 4; i++) {
    const b = box(0.72, 0.02, 0.17, mat(0x5d4634), 0.42, -0.11, 0);
    const holder = new THREE.Group();
    holder.rotation.y = i / 4 * Math.PI * 2;
    holder.add(b);
    fan.add(holder);
    blades.push(holder);
  }
  root.add(fan);

  // kitchen on the east wall
  const kitchen = new THREE.Group();
  kitchen.position.set(5.48, 0, 0.4);
  const cabinetMat = mat(0x6b4b32);
  const counterMat = mat(0x9c8a6b);
  kitchen.add(box(0.9, 0.9, 3.0, cabinetMat, 0, 0.45, 0));
  kitchen.add(box(0.98, 0.09, 3.08, counterMat, 0, 0.94, 0));
  kitchen.add(box(0.3, 1.0, 2.5, cabinetMat, 0.31, 2.2, 0));
  // cabinet doors / handles
  for (let z = -1.1; z <= 1.1; z += 0.55) {
    kitchen.add(box(0.03, 0.74, 0.44, mat(0x5a3d29), 0.46, 0.47, z));
    kitchen.add(box(0.03, 0.04, 0.15, mat(0xb18a3a), 0.48, 0.52, z + 0.1));
  }
  // fridge
  kitchen.add(box(0.85, 1.9, 0.9, mat(0xcdc5ad), 0.05, 0.95, 2.15));
  kitchen.add(box(0.04, 0.7, 0.04, metal, 0.5, 1.3, 2.15));
  kitchen.add(box(0.86, 0.04, 0.9, mat(0x4a3a2b), 0.05, 1.0, 2.15));
  // sink
  const sink = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.06, 10), metal);
  sink.scale.z = 0.72;
  sink.position.set(0, 0.99, -0.72);
  kitchen.add(sink);
  const tap = box(0.03, 0.2, 0.03, metal, 0.05, 1.1, -0.72);
  kitchen.add(tap);
  // party bowl + cups on counter
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd19c4a));
  bowl.rotation.x = Math.PI;
  bowl.position.set(0, 1.0, 0.55);
  kitchen.add(bowl);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 6), mat([0xb33a32, 0x3d68a5, 0x3d8c5a][i % 3]));
    c.position.set((i % 3 - 1) * 0.13, 1.04, 0.95 + Math.floor(i / 3) * 0.13);
    kitchen.add(c);
  }
  root.add(kitchen);

  // party snack table
  const snackTable = new THREE.Group();
  snackTable.position.set(2.8, 0, 2.7);
  snackTable.add(box(1.5, 0.08, 0.9, wood, 0, 0.62, 0));
  for (const x of [-0.62, 0.62]) for (const z of [-0.34, 0.34]) {
    snackTable.add(box(0.08, 0.62, 0.08, darkWood, x, 0.31, z));
  }
  const chipBowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xa82929));
  chipBowl.rotation.x = Math.PI;
  chipBowl.position.set(-0.2, 0.69, 0.05);
  snackTable.add(chipBowl);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.3, 7), mat(0x33743e));
  bottle.position.set(0.35, 0.81, 0.1);
  snackTable.add(bottle);
  const bottle2 = bottle.clone(); bottle2.position.set(0.48, 0.81, -0.1);
  snackTable.add(bottle2);
  root.add(snackTable);

  // plant
  const plant = new THREE.Group();
  plant.position.set(4.9, 0, 3.7);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.42, 8), mat(0x7d442d));
  pot.position.y = 0.21;
  plant.add(pot);
  const leafMat = mat(0x2c6b3a);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.75 + Math.random() * 0.3, 4), leafMat);
    leaf.position.set((Math.random() - 0.5) * 0.3, 0.75, (Math.random() - 0.5) * 0.3);
    leaf.rotation.set((Math.random() - 0.5) * 0.7, Math.random() * Math.PI, (Math.random() - 0.5) * 0.7);
    plant.add(leaf);
  }
  root.add(plant);

  // boxes / clutter
  const box1 = box(0.55, 0.4, 0.45, mat(0xa07c4f), 4.6, 0.2, -3.6); box1.rotation.y = 0.3;
  const box2 = box(0.45, 0.34, 0.4, mat(0x8b6b45), 4.8, 0.17, -3.1); box2.rotation.y = -0.2;
  root.add(box1, box2);

  // ------------------------------------------------------------
  // WALL DECOR
  // ------------------------------------------------------------
  const posterMat1 = new THREE.MeshLambertMaterial({ map: posterTexture('LIVE LAUGH LOCK THE DOOR', 'the neighborhood watch', { bg: '#233b3c', doodle: 'sun', accent: '#d8a844' }) });
  root.add(plane(0.9, 1.15, posterMat1, 5.94, 1.9, -2.1, 0, -Math.PI / 2));
  const posterMat2 = new THREE.MeshLambertMaterial({ map: posterTexture('HOME SWEET HOME', 'until the party', { bg: '#4b2c33', doodle: 'dog', accent: '#e6b25e' }) });
  root.add(plane(0.82, 1.04, posterMat2, 3.9, 1.85, 4.42, 0, Math.PI));
  const posterMat3 = new THREE.MeshLambertMaterial({ map: posterTexture('NO ANOMALIES', 'please', { bg: '#2b3d2d', doodle: 'smile', accent: '#d84b3e' }) });
  root.add(plane(0.7, 0.9, posterMat3, -2.7, 1.95, -4.39, 0, 0));

  // photo wall
  const photoKinds = [0, 1, 2, 3];
  photoKinds.forEach((k, i) => {
    const frame = new THREE.Group();
    frame.position.set(-3.9 + i * 0.62, 2.05, 4.41);
    frame.add(box(0.5, 0.4, 0.04, darkWood, 0, 0, 0));
    const ph = plane(0.42, 0.32, new THREE.MeshLambertMaterial({ map: photoTexture(k) }), 0, 0, -0.025, 0, Math.PI);
    frame.add(ph);
    root.add(frame);
  });

  // clock
  const clock = new THREE.Group();
  clock.position.set(2.75, 2.2, -4.39);
  const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 14), mat(0x3a2c20));
  clockBody.rotation.x = Math.PI / 2;
  clock.add(clockBody);
  const clockFace = plane(0.48, 0.48, new THREE.MeshBasicMaterial({ map: makeClockTexture() }), 0, 0, 0.031);
  clock.add(clockFace);
  root.add(clock);

  // window on the south wall
  const win = new THREE.Group();
  win.position.set(1.85, 1.7, 4.4);
  const winFrame = mat(0x4d3222);
  win.add(box(1.8, 1.45, 0.08, winFrame, 0, 0, 0));
  const winGlass = plane(1.6, 1.25, new THREE.MeshBasicMaterial({ map: nightWindowTexture() }), 0, 0, -0.05, 0, Math.PI);
  win.add(winGlass);
  win.add(box(0.05, 1.25, 0.05, winFrame, 0, 0, -0.03));
  win.add(box(1.6, 0.05, 0.05, winFrame, 0, 0, -0.03));
  // curtains
  const curtainMat = mat(0x5a2d33);
  const curL = box(0.3, 1.7, 0.08, curtainMat, -1.0, 0.1, -0.06);
  const curR = box(0.3, 1.7, 0.08, curtainMat, 1.0, 0.1, -0.06);
  win.add(curL, curR);
  root.add(win);

  // ------------------------------------------------------------
  // PARTY DECOR (hidden until the party)
  // ------------------------------------------------------------
  const partyGroup = new THREE.Group();
  partyGroup.visible = false;
  root.add(partyGroup);

  const banner = plane(3.1, 0.78, new THREE.MeshBasicMaterial({ map: partyBannerTexture() }), 0, 2.96, -4.37);
  partyGroup.add(banner);

  const balloonColors = [0xd23b3b, 0x3b7bd2, 0xe0c23a, 0x47b85c, 0xc455c9, 0xe07c35];
  const balloonSpots = [
    [-5.4, 2.65, -3.9], [-4.9, 2.9, -3.7], [5.3, 2.65, -3.8], [4.8, 2.95, -3.5],
    [-5.5, 2.6, 3.9], [5.5, 2.7, 3.75], [-5.3, 2.9, 3.4], [4.7, 2.55, 3.95],
  ];
  balloonSpots.forEach((p, i) => {
    const b = makeBalloon(balloonColors[i % balloonColors.length]);
    b.position.set(...p);
    b.rotation.z = (Math.random() - 0.5) * 0.3;
    partyGroup.add(b);
  });
  // streamers
  const streamerColors = [0xff4a4a, 0xffd84d, 0x56e07a, 0x51b7ff, 0xe665ff];
  for (let i = 0; i < 10; i++) {
    const s = box(0.05, 1.0, 0.02, new THREE.MeshBasicMaterial({ color: streamerColors[i % streamerColors.length] }), -5.4 + (i % 5) * 2.7, 2.7, -3.9 + Math.floor(i / 5) * 7.8);
    s.rotation.z = (Math.random() - 0.5) * 0.5;
    partyGroup.add(s);
  }

  // disco ball
  const disco = new THREE.Group();
  disco.position.set(0.8, 2.75, 0.4);
  const discoBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshPhongMaterial({ color: 0xd8d8ff, emissive: 0x222244, shininess: 120 }));
  disco.add(discoBall);
  disco.add(box(0.02, 0.35, 0.02, metal, 0, 0.45, 0));
  partyGroup.add(disco);

  const partyLights = [
    new THREE.PointLight(0xff3d7f, 0, 8, 2),
    new THREE.PointLight(0x3d8cff, 0, 8, 2),
    new THREE.PointLight(0x66ff88, 0, 8, 2),
  ];
  partyLights[0].position.set(-2.5, 2.7, -2.5);
  partyLights[1].position.set(2.8, 2.7, 2.5);
  partyLights[2].position.set(3.0, 2.6, -2.8);
  partyLights.forEach((l) => scene.add(l));

  // ------------------------------------------------------------
  // STATE / UPDATE
  // ------------------------------------------------------------
  let tvMode = 'home';
  let tvTimer = 0;
  let lastTv = -1;
  let doorVis = 0;
  let partyTime = 0;
  let horror = false;
  let clockTime = 0;

  const api = {
    root,
    doorPivot,
    door,
    letter,
    letterMarker,
    doorMarker,
    tvScreen: screen,
    tvTexture: tvTex,
    tvLight,
    ceiling,
    lampLight,
    hallwayLight,
    windowLight,
    hemi,
    ambient,
    partyLights,
    partyGroup,
    disco,
    fan,
    cat,
    club: { partyTime: 0 },
    setTVMode(mode) {
      if (tvMode === mode) return;
      tvMode = mode;
      lastTv = -1;
    },
    setDoor(open01) {
      doorVis = Math.max(0, Math.min(1, open01));
    },
    setParty(on) {
      partyGroup.visible = on;
      partyTime = 0;
      partyLights.forEach((l) => { l.intensity = on ? 12 : 0; });
      if (on) {
        ceiling.color.setHex(0xffb7d9);
        ceiling.intensity = 7;
        tvLight.intensity = 2;
        tvMode = 'party';
        lastTv = -1;
      }
    },
    setHorror(on) {
      horror = on;
      if (on) {
        ceiling.color.setHex(0xff2018);
        ceiling.intensity = 28;
        lampLight.color.setHex(0xff2e1c);
        lampLight.intensity = 14;
        tvLight.color.setHex(0xff2200);
        tvLight.intensity = 6;
        tvMode = 'scary';
        lastTv = -1;
      }
    },
    showKnockMarker(on) { doorMarker.visible = on; },
    showLetterMarker(on) { letterMarker.visible = on; },
    setLetterVisible(on) { letter.visible = on; },
    update(dt, t, state) {
      clockTime += dt;
      // door swing
      const target = state && state.doorOpen ? 1 : 0;
      doorVis += (target - doorVis) * Math.min(1, dt * 7);
      doorPivot.rotation.y = -1.38 * doorVis;
      // fan
      fan.children.forEach((c, i) => {
        if (i > 1) c.rotation.y += dt * 1.8;
      });
      // cat looks at you
      const p = state && state.player;
      if (p) {
        const dx = p.x - cat.position.x;
        const dz = p.z - cat.position.z;
        cat.rotation.y = Math.atan2(dx, dz);
      }
      // TV
      tvTimer += dt;
      if (tvTimer > (tvMode === 'party' ? 0.08 : 0.13)) {
        tvTimer = 0;
        drawTVFrame(tvTex, tvMode, clockTime);
        lastTv = clockTime;
      }
      // markers bob
      if (letterMarker.visible) {
        letterMarker.position.y = 0.68 + Math.sin(t * 4) * 0.045;
      }
      if (doorMarker.visible) {
        doorMarker.position.y = 2.68 + Math.sin(t * 5) * 0.055;
        doorMarker.material.rotation = Math.sin(t * 3) * 0.08;
      }
      // party lights / disco
      if (partyGroup.visible) {
        partyTime += dt;
        disco.rotation.y += dt * 1.4;
        const cycle = t * 1.4;
        partyLights[0].color.setHSL((cycle) % 1, 0.75, 0.55);
        partyLights[1].color.setHSL((cycle + 0.33) % 1, 0.75, 0.55);
        partyLights[2].color.setHSL((cycle + 0.66) % 1, 0.75, 0.55);
        partyLights[0].intensity = 11 + Math.sin(t * 7) * 4;
        partyLights[1].intensity = 11 + Math.sin(t * 6.2 + 2) * 4;
        partyLights[2].intensity = 11 + Math.sin(t * 8.1 + 4) * 4;
        ceiling.intensity = 6 + Math.sin(t * 4) * 2;
        tvLight.intensity = 2 + Math.sin(t * 4) * 1;
      } else if (horror) {
        // sickly red flicker
        const f = Math.sin(t * 23) > 0.1 ? 1 : 0.35;
        ceiling.intensity = 20 * f + 8;
        lampLight.intensity = 13 * f;
        tvLight.intensity = 4 + Math.sin(t * 18) * 3;
      } else {
        // gentle domestic flicker
        const f = 1 + Math.sin(t * 1.7) * 0.025 + (Math.sin(t * 31) > 0.94 ? -0.14 : 0);
        ceiling.intensity = 18 * f;
        lampLight.intensity = 8 * (1 + Math.sin(t * 2.3) * 0.04);
      }
    },
  };

  return api;
}
