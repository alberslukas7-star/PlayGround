import * as THREE from '../vendor/three.module.js';

const SKINS = [0xe8bd96, 0xd8a37a, 0xb97b52, 0x8b5a3c, 0xf1cba8, 0x6f4630, 0xc98f68];
const SHIRTS = [0xb33a32, 0x3d68a5, 0x3d8c5a, 0x8f4a8c, 0xd08b32, 0x556b72, 0x8a3f54, 0x405c8a, 0x5b8c4a, 0xc2b280];
const PANTS = [0x2c3238, 0x3e3329, 0x263b5a, 0x4a4036, 0x1f1f22, 0x5a4e3c];
const HAIRS = [0x2b1c14, 0x4a2e1d, 0x8a6034, 0xc8a45c, 0x1b1b1b, 0x7a3b26, 0x8e8e8e];
const NAMES = ['Dave', 'Linda', 'Chad', 'Brenda', 'Gary', 'Tina', 'Kyle', 'Sharon', 'Dennis', 'Pam', 'Craig', 'Debbie', 'Steve', 'Karen', 'Todd', 'Janet', 'Rick', 'Becky', 'Doug', 'Cheryl', 'Brian', 'Gail', 'Kevin', 'Sue', 'Mike', 'Donna', 'Paul', 'Nancy', 'Greg', 'Wendy'];

const lam = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
};
const sphere = (r, material, x = 0, y = 0, z = 0, seg = 8, rings = 6) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, rings), material);
  m.position.set(x, y, z);
  return m;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (a, b) => a + Math.random() * (b - a);

function makeShadow(opacity = 0.5) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
  grad.addColorStop(0.55, `rgba(0,0,0,${opacity * 0.7})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}

function makeFace(headGroup, opts, eyeCount = 2) {
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf7f2e3 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x17110d });
  const eyes = [];
  const positions = [
    [-0.052, 0.018],
    [0.052, 0.018],
    [0.0, 0.085],
    [-0.075, -0.025],
  ];
  for (let i = 0; i < eyeCount; i++) {
    const [x, y] = positions[i % positions.length];
    const eyeG = new THREE.Group();
    eyeG.position.set(x, y, 0.108);
    const white = sphere(0.024, eyeMat, 0, 0, 0, 6, 5);
    white.scale.z = 0.55;
    const pupil = sphere(0.009, pupilMat, 0, 0, 0.014, 5, 4);
    eyeG.add(white, pupil);
    headGroup.add(eyeG);
    eyes.push({ g: eyeG, white, pupil });
  }
  const mouth = box(0.075, 0.016, 0.012, new THREE.MeshBasicMaterial({ color: 0x4b1d18 }), 0, -0.048, 0.112);
  headGroup.add(mouth);
  const nose = box(0.024, 0.036, 0.026, lam(opts.skin), 0, -0.016, 0.115);
  headGroup.add(nose);
  return { eyes, mouth, nose };
}

function makeHumanBase(desc) {
  const g = new THREE.Group();
  const skinMat = lam(desc.skin, { flatShading: true });
  const shirtMat = lam(desc.shirt, { flatShading: true });
  const pantsMat = lam(desc.pants, { flatShading: true });
  const hairMat = lam(desc.hairColor, { flatShading: true });

  const scale = desc.height || 1;
  const body = new THREE.Group();
  body.scale.set(scale, scale, scale);
  g.add(body);

  const legs = new THREE.Group();
  legs.add(box(0.16, 0.62, 0.18, pantsMat, -0.11, 0.34, 0));
  legs.add(box(0.16, 0.62, 0.18, pantsMat, 0.11, 0.34, 0));
  legs.add(box(0.19, 0.11, 0.27, lam(0x1a1512), -0.11, 0.06, 0.03));
  legs.add(box(0.19, 0.11, 0.27, lam(0x1a1512), 0.11, 0.06, 0.03));
  body.add(legs);

  const torso = new THREE.Group();
  const torsoMesh = box(0.48, 0.68, 0.28, shirtMat, 0, 1.04, 0);
  torso.add(torsoMesh);
  // collar
  torso.add(box(0.2, 0.05, 0.03, lam(0xe7ddc5), 0, 1.35, 0.145));
  // pocket square and buttons: important human details
  torso.add(box(0.1, 0.08, 0.012, lam(0xe7ddc5), 0.12, 1.16, 0.146));
  for (let i = 0; i < 3; i++) {
    torso.add(sphere(0.012, lam(0x2c2118), 0, 1.23 - i * 0.11, 0.146, 5, 4));
  }
  torso.add(box(0.5, 0.055, 0.3, lam(0x2c2118), 0, 0.73, 0));
  body.add(torso);

  const armL = new THREE.Group();
  armL.position.set(-0.29, 1.32, 0);
  armL.add(box(0.11, 0.55, 0.12, shirtMat, 0, -0.25, 0));
  armL.add(sphere(0.07, skinMat, 0, -0.54, 0, 6, 5));
  const armR = new THREE.Group();
  armR.position.set(0.29, 1.32, 0);
  armR.add(box(0.11, 0.55, 0.12, shirtMat, 0, -0.25, 0));
  armR.add(sphere(0.07, skinMat, 0, -0.54, 0, 6, 5));
  body.add(armL, armR);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.58, 0);
  const headMesh = sphere(0.135, skinMat, 0, 0, 0, 8, 6);
  headMesh.scale.set(0.95, 1.08, 0.95);
  headGroup.add(headMesh);
  // ears
  headGroup.add(sphere(0.032, skinMat, -0.13, 0, 0, 5, 4));
  headGroup.add(sphere(0.032, skinMat, 0.13, 0, 0, 5, 4));
  // hair cap
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.141, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hair.scale.set(1.01, 1.1, 1.01);
  hair.position.y = 0.012;
  headGroup.add(hair);
  const face = makeFace(headGroup, desc, desc.eyeCount || 2);
  body.add(headGroup);

  if (desc.glasses) {
    const gm = new THREE.MeshBasicMaterial({ color: 0x2a2016 });
    headGroup.add(box(0.075, 0.012, 0.012, gm, -0.052, 0.018, 0.125));
    headGroup.add(box(0.075, 0.012, 0.012, gm, 0.052, 0.018, 0.125));
    headGroup.add(box(0.026, 0.012, 0.012, gm, 0, 0.018, 0.125));
    headGroup.add(box(0.012, 0.07, 0.012, gm, -0.092, 0.005, 0.12));
    headGroup.add(box(0.012, 0.07, 0.012, gm, 0.092, 0.005, 0.12));
  }
  if (desc.mustache) {
    headGroup.add(box(0.09, 0.018, 0.012, hairMat, 0, -0.032, 0.122));
  }
  if (desc.beard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 4, 0, Math.PI * 2, Math.PI * 0.54, Math.PI * 0.35), hairMat);
    beard.scale.set(1, 1.15, 0.93);
    beard.position.set(0, -0.01, 0.02);
    headGroup.add(beard);
  }

  // hats
  if (desc.hat === 'cap') {
    const capMat = lam(desc.hatColor || 0x284d8a);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.42), capMat);
    cap.position.y = 0.045;
    headGroup.add(cap);
    const brim = box(0.2, 0.02, 0.14, capMat, 0, 0.05, 0.13);
    headGroup.add(brim);
  } else if (desc.hat === 'beanie') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.45), lam(desc.hatColor || 0x8f3d3d));
    cap.position.y = 0.04;
    headGroup.add(cap);
    headGroup.add(box(0.29, 0.04, 0.29, lam(desc.hatColor || 0x8f3d3d), 0, 0.03, 0));
  } else if (desc.hat === 'party') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 7), lam(desc.hatColor || 0xffd84d));
    cone.position.y = 0.2;
    cone.rotation.z = 0.15;
    headGroup.add(cone);
  }

  // held prop
  if (desc.prop === 'pizza') {
    const p = box(0.34, 0.055, 0.34, lam(0xc9a35b), 0.27, 1.02, 0.13);
    p.rotation.z = 0.2;
    body.add(p);
    for (let i = 0; i < 5; i++) {
      const pep = sphere(0.025, lam(0xa52c24), 0.27 + rnd(-0.1, 0.1), 1.06, 0.13 + rnd(-0.1, 0.1), 5, 4);
      pep.scale.y = 0.25;
      body.add(pep);
    }
  } else if (desc.prop === 'balloon') {
    const b = new THREE.Group();
    const bal = sphere(0.13, lam(desc.balloonColor || 0xd23b3b), 0, 0, 0, 7, 5);
    bal.scale.y = 1.25;
    b.add(bal);
    b.add(box(0.008, 0.5, 0.008, lam(0xcfc3a3), 0, -0.4, 0));
    b.position.set(0.37, 1.65, 0.13);
    body.add(b);
  } else if (desc.prop === 'chips') {
    const bag = box(0.2, 0.26, 0.09, lam(0xd9b13c), 0.3, 1.0, 0.12);
    bag.rotation.z = 0.25;
    body.add(bag);
  } else if (desc.prop === 'sixpack') {
    const pack = box(0.32, 0.13, 0.22, lam(0x8a3f2a), 0.3, 0.77, 0.1);
    body.add(pack);
    for (let i = 0; i < 3; i++) {
      body.add(sphere(0.04, lam(0x3b67a3), 0.23 + i * 0.08, 0.86, 0.22, 5, 4));
    }
  }

  const shadowMesh = makeShadow(0.55);
  g.add(shadowMesh);
  return { group: g, body, torso, torsoMesh, headGroup, headMesh, armL, armR, legs, face, hair, skinMat, shadowMesh };
}

function humanDescriptor() {
  return {
    anomaly: false,
    name: pick(NAMES),
    skin: pick(SKINS),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    hairColor: pick(HAIRS),
    height: rnd(0.94, 1.08),
    glasses: Math.random() < 0.16,
    mustache: Math.random() < 0.13,
    beard: Math.random() < 0.12,
    hat: Math.random() < 0.26 ? pick(['cap', 'beanie', 'party']) : null,
    hatColor: Math.random() < 0.5 ? 0x284d8a : 0x8f3d3d,
    prop: Math.random() < 0.62 ? pick(['pizza', 'balloon', 'chips', 'sixpack', null]) : null,
    balloonColor: pick([0xd23b3b, 0x3b7bd2, 0xe0c23a, 0x47b85c, 0xc455c9]),
  };
}

function makeHuman(desc, scene) {
  const b = makeHumanBase(desc);
  const g = b.group;
  scene.add(g);
  const phase = Math.random() * 10;
  const blinkSeed = rnd(1.5, 4);
  let nextBlink = blinkSeed;
  let blinkEnd = 0;
  let wave = Math.random() < 0.35;
  let waveEnd = rnd(1.4, 3.8);

  g.userData.animate = (t, elapsed) => {
    // gentle breathing
    b.torsoMesh.scale.y = 1 + Math.sin(t * 1.6 + phase) * 0.012;
    b.torsoMesh.scale.x = 1 + Math.sin(t * 1.6 + phase) * 0.006;
    g.position.x = Math.sin(t * 0.55 + phase) * 0.012;
    g.rotation.z = Math.sin(t * 0.7 + phase) * 0.008;
    b.headGroup.rotation.y = Math.sin(t * 0.42 + phase * 2) * 0.055;
    b.headGroup.rotation.x = Math.sin(t * 0.33 + phase) * 0.025;
    b.armL.rotation.z = 0.03 + Math.sin(t * 1.1 + phase) * 0.025;
    b.armR.rotation.z = -0.03 - Math.sin(t * 1.1 + phase + 1) * 0.025;
    // blink
    if (t > nextBlink && t > blinkEnd) {
      blinkEnd = t + 0.14;
      nextBlink = t + rnd(2.4, 5.6);
    }
    const blinking = t < blinkEnd;
    b.face.eyes.forEach((e) => {
      e.white.scale.y = blinking ? 0.12 : 1;
      e.pupil.visible = !blinking;
    });
    // friendly little wave at the beginning
    if (wave && elapsed < waveEnd) {
      b.armR.rotation.z = -1.9 + Math.sin(t * 8) * 0.28;
    }
    // sometimes checks phone
    if (desc.prop === null && Math.sin(t * 0.17 + phase) > 0.965) {
      b.headGroup.rotation.x = 0.35;
      b.armR.rotation.z = -0.65;
    }
  };
  return g;
}

function makeAnomaly(desc, scene) {
  const base = makeHumanBase({ ...desc, eyeCount: 2, glasses: false, mustache: false, beard: false, hat: null, prop: null });
  const g = base.group;
  scene.add(g);
  const variant = desc.variant;
  const phase = Math.random() * 10;
  let twitch = 0;
  let nextTwitch = rnd(1, 3);

  // common: anomalies do not blink. make them look deader.
  const setEyes = (scaleY = 1) => {
    base.face.eyes.forEach((e) => {
      e.white.scale.y = scaleY;
      e.pupil.visible = true;
    });
  };

  if (variant === 'longneck') {
    base.headGroup.position.y = 1.95;
    const neckMat = lam(0xd8c6ad, { flatShading: true });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.4, 7), neckMat);
    neck.position.set(0, 1.7, 0);
    base.body.add(neck);
    base.headMesh.material = neckMat;
    base.face.eyes.forEach((e) => { e.white.material.color.setHex(0x111111); e.pupil.material.color.setHex(0xffffff); });
    base.face.mouth.scale.x = 1.6;
    base.hair.visible = false;
    base.skinMat.color.setHex(0xd8c6ad);
    g.userData.animate = (t) => {
      base.headGroup.rotation.z = Math.sin(t * 0.75 + phase) * 0.22;
      base.headGroup.rotation.y = Math.sin(t * 0.53 + phase) * 0.28;
      base.headGroup.position.x = Math.sin(t * 0.8 + phase) * 0.06;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 0.8) * 0.008;
      base.armL.rotation.z = 0.08;
      base.armR.rotation.z = -0.08;
      setEyes(1);
    };
  } else if (variant === 'eyes') {
    // three extra eyes, a grin that should not fit
    const extraPositions = [
      [-0.055, 0.088], [0.062, 0.082], [0.0, -0.025],
    ];
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf2e7d0 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0b0908 });
    extraPositions.forEach(([x, y], i) => {
      const e = new THREE.Group();
      e.position.set(x, y, 0.11);
      const w = sphere(0.027, eyeMat, 0, 0, 0, 6, 5); w.scale.z = 0.5;
      const p = sphere(0.01, pupilMat, (i - 1) * 0.006, 0, 0.016, 5, 4);
      e.add(w, p);
      base.headGroup.add(e);
    });
    base.face.mouth.scale.set(4.2, 1.9, 1);
    base.face.mouth.position.y = -0.052;
    base.face.mouth.material.color.setHex(0x210707);
    // teeth
    for (let i = 0; i < 7; i++) {
      const tooth = box(0.018, 0.028, 0.013, new THREE.MeshBasicMaterial({ color: 0xded3b4 }), -0.09 + i * 0.03, -0.052, 0.121);
      base.headGroup.add(tooth);
    }
    base.hair.visible = false;
    g.userData.animate = (t) => {
      base.headGroup.rotation.z = Math.sin(t * 0.6 + phase) * 0.04;
      base.headGroup.rotation.y = Math.sin(t * 0.4 + phase) * 0.06;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 0.9) * 0.008;
      if (t > nextTwitch) {
        twitch = t + 0.18;
        nextTwitch = t + rnd(1.4, 4);
      }
      base.headGroup.position.x = t < twitch ? 0.045 : 0;
      setEyes(1);
    };
  } else if (variant === 'mouth') {
    base.face.eyes.forEach((e) => { e.white.scale.set(0.5, 0.5, 0.5); e.pupil.visible = false; });
    const m = sphere(0.105, new THREE.MeshBasicMaterial({ color: 0x0d0303 }), 0, -0.045, 0.095, 10, 7);
    m.scale.set(1.35, 0.8, 0.45);
    base.headGroup.add(m);
    for (let i = 0; i < 10; i++) {
      const a = -0.9 + i * 0.2;
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), new THREE.MeshBasicMaterial({ color: 0xe7dfc9 }));
      tooth.position.set(Math.sin(a) * 0.13, -0.045 + Math.cos(a) * 0.07, 0.145);
      tooth.rotation.z = -a;
      tooth.rotation.x = Math.PI;
      base.headGroup.add(tooth);
    }
    base.headMesh.scale.set(1.05, 1.1, 0.9);
    base.hair.visible = false;
    g.userData.animate = (t) => {
      base.headGroup.rotation.z = 0.16 + Math.sin(t * 0.9 + phase) * 0.07;
      base.headGroup.rotation.y = Math.sin(t * 0.5 + phase) * 0.1;
      m.scale.y = 0.8 + Math.sin(t * 3.3 + phase) * 0.16;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 1.4) * 0.01;
      setEyes(1);
    };
  } else if (variant === 'arms') {
    // two extra arms, bent up beside the head like they are waving hello
    for (let side = -1; side <= 1; side += 2) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.26, 1.06, 0);
      arm.rotation.z = side * 2.45;
      arm.add(box(0.1, 0.48, 0.11, lam(desc.shirt), 0, -0.22, 0));
      const hand = sphere(0.078, lam(desc.skin), 0, -0.49, 0, 6, 5);
      arm.add(hand);
      for (let i = 0; i < 4; i++) {
        const finger = box(0.012, 0.2, 0.012, lam(desc.skin), (i - 1.5) * 0.03, -0.62, 0.02);
        finger.rotation.z = (i - 1.5) * 0.16;
        arm.add(finger);
      }
      base.body.add(arm);
      if (side < 0) base.extraArmL = arm; else base.extraArmR = arm;
    }
    base.headGroup.rotation.z = 0.06;
    g.userData.animate = (t) => {
      base.headGroup.rotation.y = Math.sin(t * 0.35 + phase) * 0.05;
      base.extraArmL.rotation.z = 2.45 + Math.sin(t * 1.1 + phase) * 0.18;
      base.extraArmR.rotation.z = -2.45 - Math.sin(t * 1.3 + phase) * 0.18;
      base.armL.rotation.z = 0.2 + Math.sin(t * 0.7) * 0.12;
      base.armR.rotation.z = -0.2 - Math.sin(t * 0.9) * 0.12;
      setEyes(1);
    };
  } else if (variant === 'faceless') {
    base.face.eyes.forEach((e) => { e.g.visible = false; });
    base.face.mouth.visible = false;
    base.face.nose.visible = false;
    base.hair.visible = false;
    const seam = box(0.01, 0.2, 0.01, lam(0x9b8a76), 0, -0.01, 0.13);
    base.headGroup.add(seam);
    // party hat makes it worse
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 6), lam(0xffd84d));
    cone.position.y = 0.2;
    cone.rotation.z = 0.15;
    base.headGroup.add(cone);
    base.armR.rotation.z = -0.3;
    g.userData.animate = (t) => {
      base.headGroup.rotation.z = Math.sin(t * 0.24 + phase) * 0.34;
      base.headGroup.rotation.y = Math.sin(t * 0.17 + phase) * 0.3;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 0.8) * 0.007;
      base.armR.rotation.z = -0.3 - Math.sin(t * 0.4) * 0.04;
    };
  } else if (variant === 'tvhead') {
    base.headGroup.visible = false;
    const tv = new THREE.Group();
    tv.position.set(0, 1.72, 0);
    const tvBody = box(0.42, 0.36, 0.35, lam(0x2a2a2b), 0, 0, 0);
    tv.add(tvBody);
    const c = document.createElement('canvas');
    c.width = 64; c.height = 48;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshBasicMaterial({ map: tex }));
    scr.position.set(0, 0, 0.18);
    tv.add(scr);
    // antennae
    const a1 = box(0.015, 0.36, 0.015, lam(0x777777), -0.08, 0.32, 0);
    a1.rotation.z = -0.5;
    const a2 = box(0.015, 0.36, 0.015, lam(0x777777), 0.08, 0.32, 0);
    a2.rotation.z = 0.5;
    tv.add(a1, a2);
    base.body.add(tv);
    g.userData.tvCtx = ctx;
    g.userData.tvTex = tex;
    let lastDraw = 0;
    g.userData.animate = (t) => {
      tv.rotation.y = Math.sin(t * 0.3 + phase) * 0.12;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 1.3) * 0.009;
      base.armL.rotation.z = 0.02;
      base.armR.rotation.z = -0.02;
      if (t - lastDraw > 0.09) {
        lastDraw = t;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, 64, 48);
        for (let i = 0; i < 120; i++) {
          const v = Math.floor(Math.random() * 210);
          ctx.fillStyle = `rgba(${v},${v},${v},${0.5 + Math.random() * 0.5})`;
          ctx.fillRect(Math.random() * 64, Math.random() * 48, 3, 2);
        }
        if (Math.sin(t * 0.7) > 0.4) {
          ctx.fillStyle = 'rgba(220,20,20,0.9)';
          ctx.font = 'bold 15px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('HI', 32, 29);
        }
        tex.needsUpdate = true;
      }
    };
  } else if (variant === 'upside') {
    base.headGroup.rotation.z = Math.PI;
    base.headGroup.position.y = 1.62;
    base.neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.18, 6), lam(desc.skin));
    base.neckMesh.position.set(0, 1.46, 0);
    base.body.add(base.neckMesh);
    base.face.mouth.scale.set(2.0, 1.4, 1);
    g.userData.animate = (t) => {
      base.headGroup.rotation.z = Math.PI + Math.sin(t * 0.55 + phase) * 0.16;
      base.headGroup.rotation.y = Math.sin(t * 0.31 + phase) * 0.18;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 0.7) * 0.006;
      setEyes(1);
    };
  } else if (variant === 'shadow') {
    // a silhouette with a smile and two little lights
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x070505 });
    g.traverse((o) => { if (o.isMesh && o !== base.shadowMesh) o.material = shadowMat; });
    base.shadowMesh.visible = false;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf7f3df });
    const eyes = [
      sphere(0.032, eyeMat, -0.05, 1.6, 0.125, 6, 5),
      sphere(0.032, eyeMat, 0.05, 1.6, 0.125, 6, 5),
    ];
    eyes.forEach((e) => { e.scale.z = 0.5; base.body.add(e); });
    const grin = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 10, Math.PI), eyeMat);
    grin.position.set(0, 1.51, 0.125);
    grin.rotation.z = Math.PI;
    base.body.add(grin);
    g.position.y = 0.08;
    // remove the shadow? black figure gets a faint one
    g.userData.animate = (t) => {
      g.position.y = 0.08 + Math.sin(t * 0.9 + phase) * 0.02;
      base.headGroup.rotation.z = Math.sin(t * 0.4 + phase) * 0.08;
      g.rotation.z = Math.sin(t * 0.23 + phase) * 0.02;
    };
  } else if (variant === 'twin') {
    // second head where a shoulder should be
    const head2 = new THREE.Group();
    head2.position.set(-0.32, 1.62, 0);
    const hm = sphere(0.13, lam(desc.skin), 0, 0, 0, 8, 6);
    head2.add(hm);
    const face2 = makeFace(head2, { ...desc, skin: desc.skin }, 2);
    face2.eyes.forEach((e) => { e.white.scale.y = 1; });
    const hair2 = new THREE.Mesh(new THREE.SphereGeometry(0.136, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.56), lam(desc.hairColor));
    hair2.position.y = 0.012;
    head2.add(hair2);
    base.body.add(head2);
    base.headGroup.rotation.z = -0.1;
    g.userData.animate = (t) => {
      base.headGroup.rotation.y = Math.sin(t * 0.5 + phase) * 0.15;
      head2.rotation.y = Math.sin(t * 0.5 + phase + 1.7) * 0.2;
      head2.rotation.z = Math.sin(t * 0.7 + phase) * 0.07;
      base.torsoMesh.scale.y = 1 + Math.sin(t * 1.1) * 0.008;
      setEyes(1);
      face2.eyes.forEach((e) => { e.white.scale.y = Math.sin(t * 1.7 + phase) > 0.88 ? 0.2 : 1; });
    };
  } else {
    // fallback: very still
    g.userData.animate = () => setEyes(1);
  }
  return g;
}

export function randomHumanDescriptor() {
  return humanDescriptor();
}

export function randomAnomalyDescriptor() {
  const variants = ['longneck', 'eyes', 'mouth', 'arms', 'faceless', 'tvhead', 'upside', 'shadow', 'twin'];
  return {
    anomaly: true,
    name: '???',
    variant: pick(variants),
    skin: pick(SKINS),
    shirt: pick(SHIRTS),
    pants: pick(PANTS),
    hairColor: pick(HAIRS),
    height: rnd(0.98, 1.08),
    glasses: false,
    mustache: false,
    beard: false,
    hat: null,
    prop: null,
  };
}

export function createPeepholeView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(512, 512, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x070504, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070504, 3.0, 7);
  const camera = new THREE.PerspectiveCamera(53, 1, 0.05, 20);
  camera.position.set(0, 1.62, 2.02);
  camera.lookAt(0, 1.46, 0);

  scene.add(new THREE.AmbientLight(0x7a675c, 0.55));

  // hallway shell
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x4a3d34 });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x2e2119 });
  const hall = new THREE.Group();
  scene.add(hall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.2), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -0.2);
  hall.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.0), wallMat);
  back.position.set(0, 1.5, -2.6);
  hall.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.0), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-2.2, 1.5, -0.2);
  hall.add(left);
  const right = left.clone();
  right.rotation.y = -Math.PI / 2;
  right.position.x = 2.2;
  hall.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.2), new THREE.MeshLambertMaterial({ color: 0x1a1512 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.0, -0.2);
  hall.add(ceil);

  // wall sconce / painting
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffdba4 }));
  bulb.position.set(0.8, 2.45, -2.52);
  scene.add(bulb);
  const fixture = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 6), new THREE.MeshLambertMaterial({ color: 0x3d2a1c }));
  fixture.position.set(0.8, 2.56, -2.52);
  scene.add(fixture);
  const light = new THREE.PointLight(0xffd0a0, 12, 7, 2);
  light.position.set(0.8, 2.38, 1.55);
  scene.add(light);
  const fill = new THREE.PointLight(0x8a6e96, 2.2, 6, 2);
  fill.position.set(-1.2, 1.1, 1.2);
  scene.add(fill);
  const rim = new THREE.PointLight(0x9ab4c9, 3.2, 5, 2);
  rim.position.set(1.3, 2.0, -1.4);
  scene.add(rim);

  // a framed picture that is slightly wrong
  const picture = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshLambertMaterial({ color: 0x5f6452 }));
  picture.position.set(-0.85, 1.7, -2.59);
  scene.add(picture);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.5), new THREE.MeshLambertMaterial({ color: 0x2b1c12 }));
  frame.position.set(-0.85, 1.7, -2.595);
  scene.add(frame);

  const visitorRoot = new THREE.Group();
  scene.add(visitorRoot);

  let current = null;
  let currentGroup = null;
  let time = 0;

  const api = {
    renderer,
    scene,
    camera,
    setVisitor(desc) {
      if (currentGroup) {
        visitorRoot.remove(currentGroup);
        currentGroup.traverse((o) => {
          if (o.isMesh) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
              else o.material.dispose();
            }
          }
        });
      }
      current = desc;
      currentGroup = desc.anomaly ? makeAnomaly(desc, visitorRoot) : makeHuman(desc, visitorRoot);
      currentGroup.position.z = 0.62;
      time = 0;
      // anomalies feel colder
      light.color.setHex(desc.anomaly ? 0xffb0a0 : 0xffd0a0);
      light.intensity = desc.anomaly ? 9 : 12;
    },
    clear() {
      if (currentGroup) {
        visitorRoot.remove(currentGroup);
        currentGroup = null;
        current = null;
      }
    },
    get descriptor() { return current; },
    update(dt) {
      time += dt;
      const t = performance.now() / 1000;
      // light flicker, more unstable around anomalies
      const flicker = current && current.anomaly
        ? 8.2 + Math.sin(t * 17) * 1.6 + (Math.sin(t * 43) > 0.75 ? -4 : 0)
        : 11.6 + Math.sin(t * 2.3) * 0.35 + (Math.sin(t * 29) > 0.95 ? -3.5 : 0);
      light.intensity = Math.max(3.5, flicker);
      fill.intensity = 1.8 + Math.sin(t * 1.1) * 0.2;
      if (currentGroup && currentGroup.userData.animate) {
        currentGroup.userData.animate(t, time);
      }
      // subtle camera breathing
      camera.position.x = Math.sin(t * 0.27) * 0.006;
      camera.position.y = 1.62 + Math.sin(t * 1.4) * 0.003;
      camera.lookAt(0, 1.46 + Math.sin(t * 0.4) * 0.003, 0);
      renderer.render(scene, camera);
    },
  };
  return api;
}

export function makePartyPerson({ shirt, pants, skin, hair, hat }) {
  const g = new THREE.Group();
  const bm = lam(shirt);
  const pm = lam(pants);
  const sm = lam(skin);
  const body = box(0.46, 0.62, 0.27, bm, 0, 1.02, 0);
  const head = sphere(0.14, sm, 0, 1.49, 0, 7, 5);
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.54), lam(hair));
  hairMesh.position.y = 1.5;
  const legL = box(0.15, 0.6, 0.17, pm, -0.11, 0.33, 0);
  const legR = box(0.15, 0.6, 0.17, pm, 0.11, 0.33, 0);
  const armL = box(0.1, 0.52, 0.1, bm, -0.3, 1.02, 0);
  const armR = box(0.1, 0.52, 0.1, bm, 0.3, 1.02, 0);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 6), lam(0xc23b2f));
  cup.position.set(0.35, 1.2, 0.1);
  g.add(body, head, hairMesh, legL, legR, armL, armR, cup);
  if (hat) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 6), lam(hat));
    h.position.set(0, 1.7, 0);
    g.add(h);
  }
  g.userData = {
    head, armL, armR, legL, legR, cup,
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 0.7,
  };
  return g;
}
