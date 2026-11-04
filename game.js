(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // The Ironwood Hunt — a dual-blades hunt built with procedural canvas art.
  // ---------------------------------------------------------------------------

  const TAU = Math.PI * 2;
  const Y_SCALE = 0.62;
  const GROUND_SCALE = 1.1;
  const WORLD = { rx: 1450, rz: 950, minX: -1800, maxX: 1800, minZ: -1200, maxZ: 1200 };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
  const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  const dist2 = (ax, az, bx, bz) => {
    const dx = ax - bx;
    const dz = az - bz;
    return dx * dx + dz * dz;
  };
  const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
  const angleTo = (ax, az, bx, bz) => Math.atan2(bz - az, bx - ax);
  const angleDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  function mulberry32(seed) {
    return function random() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = mulberry32(0x1a2b3c4d);
  const rand = (min, max) => min + random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(random() * arr.length)];

  function ellipsePoint(angle, rx, rz) {
    return { x: Math.cos(angle) * rx, z: Math.sin(angle) * rz };
  }

  function insideArena(x, z, margin = 0) {
    const rx = WORLD.rx - margin;
    const rz = WORLD.rz - margin;
    return (x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1;
  }

  function clampToArena(entity, margin = 34) {
    const rx = WORLD.rx - margin;
    const rz = WORLD.rz - margin;
    const ratio = Math.sqrt((entity.x * entity.x) / (rx * rx) + (entity.z * entity.z) / (rz * rz));
    if (ratio > 1) {
      entity.x /= ratio;
      entity.z /= ratio;
    }
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);

  const dom = {
    canvas: $('game'),
    timer: $('timer'),
    monsterBar: $('monsterBar'),
    monsterBarFill: $('monsterBarFill'),
    monsterBarLag: $('monsterBarLag'),
    monsterState: $('monsterState'),
    rageTag: $('rageTag'),
    woundTag: $('woundTag'),
    healthFill: $('healthFill'),
    healthLag: $('healthLag'),
    healthValue: $('healthValue'),
    healthTrack: document.querySelector('.health-track'),
    staminaFill: $('staminaFill'),
    sharpness: $('sharpness'),
    sharpnessLabel: $('sharpnessLabel'),
    demonGauge: $('demonGauge'),
    demonValue: $('demonValue'),
    comboDisplay: $('comboDisplay'),
    comboCount: $('comboCount'),
    comboRank: $('comboRank'),
    potionCount: $('potionCount'),
    potionSlot: $('potionSlot'),
    whetstoneSlot: $('whetstoneSlot'),
    demonSlot: $('demonSlot'),
    demonState: $('demonState'),
    controlRibbon: $('controlRibbon'),
    hintChip: $('hintChip'),
    soundToggle: $('soundToggle'),
    toasts: $('toasts'),
    minimap: $('minimap'),
    questBanner: $('questBanner'),
    fieldGuide: $('fieldGuide'),
    pauseScreen: $('pauseScreen'),
    endScreen: $('endScreen'),
    endEyebrow: $('endEyebrow'),
    endTitle: $('endTitle'),
    endLine: $('endLine'),
    resultTime: $('resultTime'),
    resultDamage: $('resultDamage'),
    resultCombo: $('resultCombo'),
    resultPotions: $('resultPotions'),
    damageFlash: $('damageFlash'),
    lowHealth: $('lowHealth'),
    mobileControls: $('mobileControls'),
    joystick: $('joystick'),
    joystickKnob: $('joystickKnob'),
    touchAttack: $('touchAttack'),
    touchDance: $('touchDance'),
    touchDodge: $('touchDodge'),
    touchDemon: $('touchDemon'),
    touchPotion: $('touchPotion'),
    touchSharpen: $('touchSharpen'),
    pauseButton: $('pauseButton'),
    retryButton: $('retryButton'),
    resumeButton: $('resumeButton'),
    guideButton: $('guideButton'),
    closeGuide: $('closeGuide'),
    resumeHunt: $('resumeHunt')
  };

  const ctx = dom.canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  const minimapCtx = dom.minimap.getContext('2d');
  let W = window.innerWidth;
  let H = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let baseZoom = 1;
  let isTouch = window.matchMedia('(pointer: coarse)').matches;

  const cam = {
    x: 0,
    z: 0,
    zoom: 1,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    targetZoom: 1
  };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    dom.canvas.width = Math.round(W * dpr);
    dom.canvas.height = Math.round(H * dpr);
    dom.canvas.style.width = `${W}px`;
    dom.canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    baseZoom = clamp(Math.min(W / 1180, H / 700), 0.92, 1.34);
    cam.targetZoom = baseZoom;
    isTouch = window.matchMedia('(pointer: coarse)').matches;
  }

  window.addEventListener('resize', resize);
  resize();

  function worldX(x) {
    return (x - cam.x) * cam.zoom + W / 2 + cam.shakeX;
  }

  function worldY(z) {
    return (z - cam.z) * cam.zoom * Y_SCALE + H / 2 + cam.shakeY;
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - W / 2 - cam.shakeX) / cam.zoom + cam.x,
      z: (sy - H / 2 - cam.shakeY) / (cam.zoom * Y_SCALE) + cam.z
    };
  }

  // ---------------------------------------------------------------------------
  // Audio — small procedural soundscape, no external assets.
  // ---------------------------------------------------------------------------

  class AudioSystem {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      this.noise = null;
      this.ambientStarted = false;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.36;
        this.master.connect(this.ctx.destination);
        this.noise = this.makeNoise(2.5);
        this.startAmbience();
      } catch (error) {
        this.ctx = null;
      }
    }

    makeNoise(seconds) {
      const count = Math.floor(this.ctx.sampleRate * seconds);
      const buffer = this.ctx.createBuffer(1, count, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < count; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.94 + white * 0.06;
        data[i] = last * 3.5;
      }
      return buffer;
    }

    startAmbience() {
      if (!this.ctx || this.ambientStarted) return;
      this.ambientStarted = true;
      const drone = this.ctx.createGain();
      drone.gain.value = 0.032;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      drone.connect(lp).connect(this.master);
      [55, 82.5, 110].forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        osc.type = index === 2 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.value = index === 2 ? 0.22 : 0.6;
        osc.connect(g).connect(drone);
        osc.start();
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.04 + index * 0.017;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.003;
        lfo.connect(lfoGain).connect(drone.gain);
        lfo.start();
      });

      const wind = this.ctx.createBufferSource();
      wind.buffer = this.noise;
      wind.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 460;
      windFilter.Q.value = 0.45;
      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.035;
      wind.connect(windFilter).connect(windGain).connect(this.master);
      wind.start();

      const bird = () => {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1700 + Math.random() * 500, now);
        osc.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 600, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.19);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.012, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
        osc.connect(gain).connect(this.master);
        osc.start(now);
        osc.stop(now + 0.26);
        setTimeout(bird, 6000 + Math.random() * 11000);
      };
      setTimeout(bird, 3500);
    }

    toggle() {
      this.init();
      this.muted = !this.muted;
      if (this.master) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.36, this.ctx.currentTime, 0.06);
      }
      dom.soundToggle.classList.toggle('muted', this.muted);
    }

    noiseBurst(duration, frequency, gain, type = 'bandpass', q = 0.9) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      source.buffer = this.noise;
      source.playbackRate.value = 0.8 + Math.random() * 0.55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(frequency, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.3), now + duration);
      filter.Q.value = q;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(gain, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter).connect(env).connect(this.master);
      source.start(now);
      source.stop(now + duration + 0.03);
    }

    tone(freq, duration, gain, type = 'sine', endFreq = null, delay = 0) {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(env).connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    slash() {
      this.noiseBurst(0.16, 2700, 0.17, 'highpass', 0.6);
      this.tone(720, 0.11, 0.022, 'triangle', 330);
    }

    hit(crit = false) {
      this.noiseBurst(crit ? 0.18 : 0.12, crit ? 1700 : 1100, crit ? 0.23 : 0.16, 'bandpass', 1.4);
      this.tone(crit ? 180 : 125, 0.15, crit ? 0.13 : 0.08, 'square', 52);
      if (crit) this.tone(880, 0.2, 0.04, 'triangle', 440);
    }

    hurt() {
      this.noiseBurst(0.24, 500, 0.2, 'lowpass', 0.7);
      this.tone(94, 0.3, 0.15, 'sawtooth', 40);
    }

    roar() {
      if (!this.ctx || this.muted) return;
      const now = this.ctx.currentTime;
      [54, 81, 107].forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = index === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq * 1.3, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.62, now + 1.25);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06 / (index + 1), now + 0.11);
        gain.gain.hold = true;
        gain.gain.setValueAtTime(0.06 / (index + 1), now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
        osc.connect(gain).connect(this.master);
        osc.start(now);
        osc.stop(now + 1.4);
      });
      this.noiseBurst(1.1, 380, 0.09, 'bandpass', 0.4);
    }

    heal() {
      this.tone(420, 0.7, 0.04, 'sine', 880);
      this.tone(630, 0.9, 0.025, 'sine', 1120, 0.1);
    }

    sharpen() {
      [0, 0.16, 0.32].forEach((delay) => {
        this.noiseBurst(0.11, 3600, 0.13, 'highpass', 0.5);
        this.tone(1300, 0.1, 0.018, 'triangle', 2100, delay);
      });
    }

    dash() {
      this.noiseBurst(0.2, 2200, 0.1, 'highpass', 0.7);
    }

    victory() {
      [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 1.1, 0.045, 'triangle', null, i * 0.13));
    }

    defeat() {
      [196, 146.8, 110].forEach((f, i) => this.tone(f, 1.5, 0.05, 'sine', null, i * 0.18));
    }

    stagger() {
      this.tone(160, 0.4, 0.06, 'square', 55);
      this.noiseBurst(0.32, 600, 0.12, 'lowpass', 0.5);
    }
  }

  const audio = new AudioSystem();

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  const input = {
    keys: new Set(),
    mouse: { x: W / 2, y: H / 2, active: false, lastMove: 0 },
    touchMove: { x: 0, z: 0, active: false },
    joystickPointer: null,
    aimWorld: { x: 0, z: 0 },
    onAction: null
  };

  const actionListeners = [];
  function bindAction(fn) {
    actionListeners.push(fn);
  }
  function emitAction(name, value = true) {
    for (const listener of actionListeners) listener(name, value);
  }

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) event.preventDefault();
    if (input.keys.has(code)) return;
    input.keys.add(code);
    audio.init();
    if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
      emitAction('move');
    }
    if (code === 'KeyJ' || code === 'KeyF') emitAction('attack');
    if (code === 'KeyK') emitAction('dance');
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') emitAction('dash');
    if (code === 'KeyQ') emitAction('demon');
    if (code === 'KeyE') emitAction('potion');
    if (code === 'KeyR') emitAction('sharpen');
    if (code === 'KeyH') emitAction('guide');
    if (code === 'Escape' || code === 'KeyP') emitAction('pause');
    if (code === 'Enter' && game.phase === 'victory') emitAction('retry');
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
    input.touchMove.x = 0;
    input.touchMove.z = 0;
    input.touchMove.active = false;
  });

  dom.canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    input.mouse.x = event.clientX;
    input.mouse.y = event.clientY;
    input.mouse.active = true;
    input.mouse.lastMove = performance.now();
    const wp = screenToWorld(event.clientX, event.clientY);
    input.aimWorld.x = wp.x;
    input.aimWorld.z = wp.z;
  });

  dom.canvas.addEventListener('pointerdown', (event) => {
    audio.init();
    if (event.pointerType === 'touch') {
      emitAction('attack');
      return;
    }
    if (event.button === 0) emitAction('attack');
    if (event.button === 2) emitAction('dance');
  });

  dom.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  dom.canvas.addEventListener('pointerenter', () => {
    if (!isTouch) dom.canvas.style.cursor = 'none';
  });

  // Buttons in the HUD intentionally mirror the keyboard controls.
  dom.potionSlot.addEventListener('click', () => emitAction('potion'));
  dom.whetstoneSlot.addEventListener('click', () => emitAction('sharpen'));
  dom.demonSlot.addEventListener('click', () => emitAction('demon'));
  dom.soundToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    audio.toggle();
  });

  dom.potionSlot.classList.add('potion-slot');

  // Touch joystick
  function updateJoystick(event) {
    const rect = dom.joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const radius = rect.width * 0.34;
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    dom.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.touchMove.x = dx / radius;
    input.touchMove.z = dy / radius;
    input.touchMove.active = Math.hypot(dx, dy) > 3;
  }

  function endJoystick() {
    input.joystickPointer = null;
    input.touchMove.x = 0;
    input.touchMove.z = 0;
    input.touchMove.active = false;
    dom.joystickKnob.style.transform = '';
  }

  dom.joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    audio.init();
    input.joystickPointer = event.pointerId;
    dom.joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });
  dom.joystick.addEventListener('pointermove', (event) => {
    if (input.joystickPointer !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(event);
  });
  dom.joystick.addEventListener('pointerup', endJoystick);
  dom.joystick.addEventListener('pointercancel', endJoystick);

  const touchBindings = [
    [dom.touchAttack, 'attack'],
    [dom.touchDance, 'dance'],
    [dom.touchDodge, 'dash'],
    [dom.touchDemon, 'demon'],
    [dom.touchPotion, 'potion'],
    [dom.touchSharpen, 'sharpen']
  ];
  for (const [element, action] of touchBindings) {
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      audio.init();
      emitAction(action);
    });
  }

  // ---------------------------------------------------------------------------
  // Ground painting
  // ---------------------------------------------------------------------------

  const groundCanvas = document.createElement('canvas');
  const groundWidth = WORLD.maxX - WORLD.minX;
  const groundHeight = WORLD.maxZ - WORLD.minZ;

  function buildGround() {
    const gw = Math.ceil(groundWidth * GROUND_SCALE);
    const gh = Math.ceil(groundHeight * GROUND_SCALE * Y_SCALE);
    groundCanvas.width = gw;
    groundCanvas.height = gh;
    const g = groundCanvas.getContext('2d', { willReadFrequently: true });
    g.scale(GROUND_SCALE, GROUND_SCALE * Y_SCALE);

    const lx = (x) => x - WORLD.minX;
    const lz = (z) => z - WORLD.minZ;

    // Base soil and deep roots beyond the arena.
    const base = g.createLinearGradient(0, 0, 0, groundHeight);
    base.addColorStop(0, '#0a160e');
    base.addColorStop(0.5, '#0c1c12');
    base.addColorStop(1, '#07110c');
    g.fillStyle = base;
    g.fillRect(0, 0, groundWidth, groundHeight * Y_SCALE);

    const cx = lx(0);
    const cy = lz(0);
    const arenaGradient = g.createRadialGradient(cx, cy - 70, 40, cx, cy, WORLD.rx);
    arenaGradient.addColorStop(0, '#4a5632');
    arenaGradient.addColorStop(0.3, '#3b492a');
    arenaGradient.addColorStop(0.64, '#2a3922');
    arenaGradient.addColorStop(0.86, '#1b2a19');
    arenaGradient.addColorStop(1, '#101b12');
    g.fillStyle = arenaGradient;
    g.beginPath();
    g.ellipse(cx, cy, WORLD.rx, WORLD.rz * Y_SCALE, 0, 0, TAU);
    g.fill();

    // A warm shaft of late sun catches the clearing.
    const sunPatch = g.createRadialGradient(cx + 170, cy - 120, 10, cx + 170, cy - 120, 590);
    sunPatch.addColorStop(0, 'rgba(206, 179, 111, 0.14)');
    sunPatch.addColorStop(0.45, 'rgba(190, 164, 98, 0.07)');
    sunPatch.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sunPatch;
    g.beginPath();
    g.ellipse(cx + 170, cy - 120, 590, 370, -0.16, 0, TAU);
    g.fill();

    // An irregular, hand-painted arena rim.
    g.save();
    g.beginPath();
    g.ellipse(cx, cy, WORLD.rx + 18, WORLD.rz * Y_SCALE + 14, 0, 0, TAU);
    g.strokeStyle = 'rgba(6, 13, 8, 0.65)';
    g.lineWidth = 62;
    g.stroke();
    g.restore();

    // Earthy patches and moss.
    for (let i = 0; i < 70; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(random()) * 0.91;
      const x = cx + Math.cos(a) * WORLD.rx * r;
      const y = cy + Math.sin(a) * WORLD.rz * Y_SCALE * r;
      const radiusX = rand(45, 180);
      const radiusY = rand(16, 62);
      g.save();
      g.translate(x, y);
      g.rotate(rand(0, TAU));
      g.fillStyle = random() > 0.45 ? 'rgba(66, 86, 40, 0.13)' : 'rgba(21, 30, 18, 0.17)';
      g.beginPath();
      g.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
      g.fill();
      g.restore();
    }

    // Cool shadow pools beneath the old-growth canopy.
    const shadowSpots = [
      [-700, -190, 300, 150], [660, -250, 285, 140], [-600, 390, 280, 125],
      [600, 390, 300, 130], [-590, -460, 240, 110], [570, -500, 235, 110],
      [-980, 190, 320, 145], [930, -290, 265, 120], [40, -930, 350, 150],
      [-260, 720, 330, 150], [430, 610, 280, 125]
    ];
    for (const [sx, sz, rx, ry] of shadowSpots) {
      const shadow = g.createRadialGradient(lx(sx), lz(sz) * Y_SCALE, 10, lx(sx), lz(sz) * Y_SCALE, rx);
      shadow.addColorStop(0, 'rgba(5, 13, 8, 0.3)');
      shadow.addColorStop(0.55, 'rgba(6, 15, 9, 0.16)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = shadow;
      g.beginPath();
      g.ellipse(lx(sx), lz(sz) * Y_SCALE, rx, ry, 0.08, 0, TAU);
      g.fill();
    }

    // Old roots threading through the clearing.
    const roots = [
      [-600, 390, -420, 300, -220, 450, 18],
      [600, 390, 470, 300, 710, 430, 16],
      [-700, -190, -540, -120, -800, -70, 14],
      [660, -250, 530, -170, 780, -210, 13],
      [-260, 720, -330, 610, -190, 680, 11]
    ];
    for (const [x1, z1, cx1, cz1, x2, z2, width] of roots) {
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(17, 24, 14, 0.64)';
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(lx(x1), lz(z1) * Y_SCALE);
      g.quadraticCurveTo(lx(cx1), lz(cz1) * Y_SCALE, lx(x2), lz(z2) * Y_SCALE);
      g.stroke();
      g.strokeStyle = 'rgba(91, 83, 53, 0.3)';
      g.lineWidth = width * 0.3;
      g.stroke();
    }

    // Central clearing packed with old hoofprints.
    const clearing = g.createRadialGradient(cx + 40, cy - 18, 10, cx + 40, cy - 18, 500);
    clearing.addColorStop(0, 'rgba(117, 99, 61, 0.32)');
    clearing.addColorStop(0.4, 'rgba(102, 89, 56, 0.2)');
    clearing.addColorStop(0.72, 'rgba(74, 76, 44, 0.09)');
    clearing.addColorStop(1, 'rgba(50, 52, 31, 0)');
    g.fillStyle = clearing;
    g.beginPath();
    g.ellipse(cx + 40, cy - 18, 560, 270, -0.07, 0, TAU);
    g.fill();

    // Winding stream on the west side.
    g.save();
    g.beginPath();
    g.moveTo(lx(-1710), lz(-270) * Y_SCALE);
    g.bezierCurveTo(lx(-1330), lz(-260) * Y_SCALE, lx(-1190), lz(-30) * Y_SCALE, lx(-940), lz(18) * Y_SCALE);
    g.bezierCurveTo(lx(-680), lz(74) * Y_SCALE, lx(-540), lz(330) * Y_SCALE, lx(-650), lz(540) * Y_SCALE);
    g.bezierCurveTo(lx(-760), lz(760) * Y_SCALE, lx(-520), lz(880) * Y_SCALE, lx(-380), lz(1120) * Y_SCALE);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(6, 13, 12, 0.7)';
    g.lineWidth = 84;
    g.stroke();
    g.strokeStyle = '#193b39';
    g.lineWidth = 65;
    g.stroke();
    const waterGradient = g.createLinearGradient(lx(-1500), 0, lx(-500), 0);
    waterGradient.addColorStop(0, 'rgba(31, 82, 76, 0.82)');
    waterGradient.addColorStop(0.55, 'rgba(43, 110, 101, 0.86)');
    waterGradient.addColorStop(1, 'rgba(28, 75, 67, 0.75)');
    g.strokeStyle = waterGradient;
    g.lineWidth = 46;
    g.stroke();
    g.strokeStyle = 'rgba(150, 217, 185, 0.23)';
    g.lineWidth = 2.2;
    g.stroke();
    g.restore();

    // Moss along the water's edge.
    for (let i = 0; i < 34; i++) {
      const x = rand(-1570, -510);
      const z = rand(-300, 800);
      if (Math.abs(x + 700) > 260) continue;
      g.fillStyle = random() > 0.5 ? 'rgba(83, 111, 59, 0.2)' : 'rgba(110, 132, 72, 0.15)';
      g.beginPath();
      g.ellipse(lx(x), lz(z) * Y_SCALE, rand(16, 38), rand(5, 12), rand(0, TAU), 0, TAU);
      g.fill();
    }

    // The ribs of something that lost an older fight.
    g.save();
    g.translate(lx(-420), lz(-286) * Y_SCALE);
    g.rotate(-0.28);
    g.strokeStyle = 'rgba(168, 157, 122, 0.42)';
    g.lineWidth = 3.2;
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(-32 + i * 12, 8);
      g.quadraticCurveTo(-53 + i * 10, -4, -68 + i * 10, -18);
      g.stroke();
    }
    g.strokeStyle = 'rgba(112, 103, 78, 0.4)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-48, 12);
    g.quadraticCurveTo(-4, 3, 41, 9);
    g.stroke();
    g.restore();

    // Scattered grass tufts.
    const grassColors = ['#496834', '#5e7d40', '#3f5a2e', '#718c4d', '#344c27', '#829b59', '#6c7b43', '#8f995b'];
    for (let i = 0; i < 1900; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(random()) * 0.97;
      const x = cx + Math.cos(a) * WORLD.rx * r;
      const y = cy + Math.sin(a) * WORLD.rz * Y_SCALE * r;
      g.strokeStyle = pick(grassColors);
      g.globalAlpha = rand(0.34, 0.82);
      g.lineWidth = rand(0.7, 1.5);
      const blades = randInt(2, 4);
      const height = rand(5, 18);
      g.beginPath();
      for (let b = 0; b < blades; b++) {
        const off = rand(-4, 4);
        g.moveTo(x + off, y);
        g.quadraticCurveTo(x + off + rand(-3, 3), y - height * 0.6, x + off + rand(-5, 5), y - height);
      }
      g.stroke();
      if (random() > 0.985) {
        g.fillStyle = random() > 0.5 ? '#b4a75b' : '#8f9c58';
        g.beginPath();
        g.arc(x, y - height, 1.3, 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;

    // Wildflowers and mushrooms.
    for (let i = 0; i < 95; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(random()) * 0.92;
      const x = cx + Math.cos(a) * WORLD.rx * r;
      const y = cy + Math.sin(a) * WORLD.rz * Y_SCALE * r;
      if (random() > 0.7) {
        g.fillStyle = 'rgba(188, 167, 94, 0.65)';
        g.beginPath();
        g.arc(x, y, 1.5, 0, TAU);
        g.fill();
      } else {
        g.fillStyle = random() > 0.5 ? 'rgba(172, 77, 62, 0.62)' : 'rgba(155, 132, 187, 0.52)';
        for (let p = 0; p < 4; p++) {
          g.beginPath();
          g.arc(x + Math.cos(p * TAU / 4) * 2, y + Math.sin(p * TAU / 4) * 2, 1.3, 0, TAU);
          g.fill();
        }
      }
    }

    // Fallen leaves, twigs and bones.
    for (let i = 0; i < 430; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(random()) * 0.96;
      const x = cx + Math.cos(a) * WORLD.rx * r;
      const y = cy + Math.sin(a) * WORLD.rz * Y_SCALE * r;
      g.save();
      g.translate(x, y);
      g.rotate(rand(0, TAU));
      g.fillStyle = random() > 0.4 ? 'rgba(123, 83, 42, 0.4)' : 'rgba(70, 87, 42, 0.45)';
      g.fillRect(-2.5, -0.7, rand(3, 5), rand(1, 2));
      g.restore();
    }

    // Dark edge and distant undergrowth.
    const edge = g.createRadialGradient(cx, cy, WORLD.rx * 0.65, cx, cy, WORLD.rx * 1.02);
    edge.addColorStop(0, 'rgba(3, 8, 5, 0)');
    edge.addColorStop(1, 'rgba(3, 8, 5, 0.63)');
    g.fillStyle = edge;
    g.beginPath();
    g.ellipse(cx, cy, WORLD.rx * 1.1, WORLD.rz * Y_SCALE * 1.1, 0, 0, TAU);
    g.fill();

    // Heavy growth clumps at the rim.
    for (let i = 0; i < 140; i++) {
      const a = rand(0, TAU);
      const r = rand(0.92, 1.08);
      const x = cx + Math.cos(a) * WORLD.rx * r;
      const y = cy + Math.sin(a) * WORLD.rz * Y_SCALE * r;
      g.fillStyle = random() > 0.5 ? 'rgba(21, 43, 22, 0.55)' : 'rgba(37, 57, 28, 0.45)';
      g.beginPath();
      g.ellipse(x, y, rand(18, 55), rand(6, 16), rand(0, TAU), 0, TAU);
      g.fill();
    }
  }

  buildGround();

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  const props = [];
  const treePalettes = [
    ['#152819', '#213b23', '#2f4a2a', '#476337'],
    ['#18261b', '#284027', '#3b5630', '#5b713e'],
    ['#142119', '#1e3823', '#31502e', '#536c3e']
  ];

  function addTree(x, z, scale, hue = 0) {
    props.push({
      type: 'tree',
      x,
      z,
      scale,
      hue,
      sway: rand(0, TAU),
      seed: random(),
      draw: drawTree
    });
  }

  function addRock(x, z, scale) {
    props.push({ type: 'rock', x, z, scale, draw: drawRock });
  }

  function addFern(x, z, scale) {
    props.push({ type: 'fern', x, z, scale, sway: rand(0, TAU), draw: drawFern });
  }

  function addLog(x, z, scale, angle) {
    props.push({ type: 'log', x, z, scale, angle, draw: drawLog });
  }

  function addRuin(x, z, scale) {
    props.push({ type: 'ruin', x, z, scale, draw: drawRuin });
  }

  function addMushroom(x, z, scale) {
    props.push({ type: 'mushroom', x, z, scale, sway: rand(0, TAU), draw: drawMushroom });
  }

  // Ring of old trees framing the arena.
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * TAU + rand(-0.04, 0.04);
    const r = rand(1.02, 1.22);
    const x = Math.cos(a) * WORLD.rx * r;
    const z = Math.sin(a) * WORLD.rz * r;
    addTree(x, z, rand(0.82, 1.66), randInt(0, 2));
    if (i % 2 === 0) {
      const r2 = rand(1.25, 1.44);
      addTree(Math.cos(a + 0.04) * WORLD.rx * r2, Math.sin(a + 0.04) * WORLD.rz * r2, rand(0.7, 1.2), randInt(0, 2));
    }
  }

  // Inner old-growth and landmark trees.
  const innerTrees = [
    [-1080, -560, 1.25], [-1110, 430, 1.1], [1040, -590, 1.22], [1180, 390, 1.18],
    [-720, -740, 1.05], [740, -760, 1.0], [-860, 690, 0.94], [890, 640, 1.04],
    [40, -930, 1.14], [930, -290, 0.85], [-980, 190, 0.84],
    [-700, -190, 1.26], [660, -250, 1.18], [-600, 390, 1.34], [600, 390, 1.25],
    [-590, -460, 1.13], [570, -500, 1.08], [-760, 690, 1.62], [700, 710, 1.5],
    [-470, 850, 1.36], [510, 860, 1.42]
  ];
  for (const [x, z, scale] of innerTrees) addTree(x, z, scale, randInt(0, 2));

  // Shrubs and ferns.
  for (let i = 0; i < 105; i++) {
    const a = rand(0, TAU);
    const r = Math.sqrt(random()) * 0.9;
    const x = Math.cos(a) * WORLD.rx * r;
    const z = Math.sin(a) * WORLD.rz * r;
    if (x < -650 && x > -1150 && z > -260 && z < 700) continue;
    addFern(x, z, rand(0.72, 1.85));
  }
  for (let i = 0; i < 20; i++) {
    const a = rand(0, TAU);
    const r = rand(0.62, 0.94);
    addFern(Math.cos(a) * WORLD.rx * r, Math.sin(a) * WORLD.rz * r, rand(1.5, 2.4));
  }

  for (let i = 0; i < 35; i++) {
    const a = rand(0, TAU);
    const r = rand(0.48, 0.98);
    addRock(Math.cos(a) * WORLD.rx * r, Math.sin(a) * WORLD.rz * r, rand(0.55, 1.35));
  }

  for (let i = 0; i < 21; i++) {
    const a = rand(0, TAU);
    const r = Math.sqrt(random()) * 0.9;
    addMushroom(Math.cos(a) * WORLD.rx * r, Math.sin(a) * WORLD.rz * r, rand(0.55, 1.2));
  }

  addLog(-350, -290, 1.08, -0.24);
  addLog(610, 300, 0.94, 0.34);
  addLog(-880, 610, 0.8, 0.08);
  addLog(430, 610, 1.35, 0.08);
  addLog(-260, 720, 1.0, -0.12);
  addRuin(1060, -780, 1.05);

  // A second ruined column group, deliberately off-centre.
  addRuin(-1190, -820, 0.78);

  function drawTree(prop, t) {
    const sx = worldX(prop.x);
    const sy = worldY(prop.z);
    const s = cam.zoom * prop.scale;
    if (sx < -260 * s || sx > W + 260 * s || sy < -40 || sy > H + 60) return;
    const palette = treePalettes[prop.hue];
    const sway = Math.sin(t * 0.55 + prop.sway) * 1.7 * s;
    const h = 150 * s;
    ctx.save();
    ctx.translate(sx, sy);

    // Ground shadow.
    ctx.fillStyle = 'rgba(2, 7, 4, 0.36)';
    ctx.beginPath();
    ctx.ellipse(6 * s, 2 * s, 64 * s, 17 * s, 0.04, 0, TAU);
    ctx.fill();

    // Roots.
    ctx.strokeStyle = '#132016';
    ctx.lineWidth = 9 * s;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(i * 18 * s, 3 * s, i * 39 * s, 8 * s);
      ctx.stroke();
    }

    // Trunk.
    const trunk = ctx.createLinearGradient(-16 * s, 0, 14 * s, 0);
    trunk.addColorStop(0, '#1a2819');
    trunk.addColorStop(0.45, '#3c4a2d');
    trunk.addColorStop(0.78, '#27351f');
    trunk.addColorStop(1, '#101a11');
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(-17 * s, 4 * s);
    ctx.bezierCurveTo(-20 * s, -50 * s, -12 * s, -90 * s, -7 * s, -126 * s);
    ctx.lineTo(8 * s, -126 * s);
    ctx.bezierCurveTo(14 * s, -82 * s, 20 * s, -42 * s, 17 * s, 4 * s);
    ctx.closePath();
    ctx.fill();

    // Bark grooves.
    ctx.strokeStyle = 'rgba(7, 14, 7, 0.45)';
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((-9 + i * 6) * s, -8 * s);
      ctx.quadraticCurveTo((-4 + i * 5) * s, -55 * s, (-2 + i * 4) * s, -111 * s);
      ctx.stroke();
    }

    // Canopy made of overlapping ragged lobes.
    const leaf = (x, y, rx, ry, color, rotation = 0) => {
      ctx.save();
      ctx.translate(x + sway, y);
      ctx.rotate(rotation);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    leaf(-5 * s, -h * 0.72, 64 * s, 38 * s, palette[0], -0.16);
    leaf(30 * s, -h * 0.79, 74 * s, 44 * s, palette[1], 0.15);
    leaf(-48 * s, -h * 0.84, 63 * s, 41 * s, palette[1], -0.28);
    leaf(6 * s, -h * 0.98, 86 * s, 48 * s, palette[2], 0.03);
    leaf(-25 * s, -h * 1.04, 58 * s, 34 * s, palette[2], -0.12);
    leaf(49 * s, -h * 0.96, 49 * s, 31 * s, palette[3], 0.23);
    leaf(-55 * s, -h * 0.98, 38 * s, 26 * s, palette[3], -0.17);

    // Dappled highlights.
    ctx.globalAlpha = 0.22;
    leaf(24 * s, -h * 0.91, 26 * s, 10 * s, '#a5b86a', 0.2);
    leaf(-38 * s, -h * 1.01, 22 * s, 8 * s, '#c3cd7d', -0.2);
    ctx.globalAlpha = 1;

    // Hanging vines.
    ctx.strokeStyle = 'rgba(53, 82, 48, 0.75)';
    ctx.lineWidth = 1.7 * s;
    ctx.beginPath();
    ctx.moveTo(-38 * s, -h * 0.84);
    ctx.bezierCurveTo(-48 * s, -h * 0.7, -30 * s, -h * 0.6, -40 * s, -h * 0.51);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46 * s, -h * 0.82);
    ctx.bezierCurveTo(54 * s, -h * 0.7, 35 * s, -h * 0.64, 49 * s, -h * 0.54);
    ctx.stroke();

    // Warm rim light along the sunward crown.
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(220, 201, 137, 0.16)';
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.arc(7 * s, -h * 0.98, 80 * s, -2.7, -1.7);
    ctx.stroke();

    // Hanging moss.
    ctx.strokeStyle = 'rgba(92, 116, 57, 0.55)';
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 4; i++) {
      const mx = (-44 + i * 25) * s;
      const my = -h * 0.78 + (i % 2) * 9 * s;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx - 4 * s, my + 18 * s, mx + 2 * s, my + 34 * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawRock(prop) {
    const sx = worldX(prop.x);
    const sy = worldY(prop.z);
    const s = cam.zoom * prop.scale;
    if (sx < -120 || sx > W + 120 || sy < -80 || sy > H + 80) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(2, 6, 4, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 2 * s, 27 * s, 8 * s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3d453a';
    ctx.beginPath();
    ctx.moveTo(-24 * s, 2 * s);
    ctx.lineTo(-21 * s, -19 * s);
    ctx.lineTo(-5 * s, -29 * s);
    ctx.lineTo(17 * s, -23 * s);
    ctx.lineTo(25 * s, -8 * s);
    ctx.lineTo(20 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#59604f';
    ctx.beginPath();
    ctx.moveTo(-19 * s, -18 * s);
    ctx.lineTo(-5 * s, -27 * s);
    ctx.lineTo(9 * s, -21 * s);
    ctx.lineTo(-2 * s, -12 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(102, 128, 72, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-2 * s, -22 * s, 12 * s, 4 * s, -0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 25, 17, 0.55)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(4 * s, -19 * s);
    ctx.lineTo(10 * s, -5 * s);
    ctx.moveTo(-12 * s, -13 * s);
    ctx.lineTo(-16 * s, -2 * s);
    ctx.stroke();
    ctx.restore();
  }

  function drawFern(prop, t) {
    const sx = worldX(prop.x);
    const sy = worldY(prop.z);
    const s = cam.zoom * prop.scale;
    if (sx < -110 || sx > W + 110 || sy < -100 || sy > H + 80) return;
    const sway = Math.sin(t * 1.15 + prop.sway) * 2.7;
    ctx.save();
    ctx.translate(sx, sy);
    // Soft root shadow.
    ctx.fillStyle = 'rgba(2, 8, 4, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 24 * s, 6 * s, 0, 0, TAU);
    ctx.fill();
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const spread = (i / (fronds - 1) - 0.5) * 2.2;
      const length = (27 + (i % 3) * 13 + prop.scale * 8) * s;
      const baseAngle = -Math.PI / 2 + spread * 0.72 + sway * 0.004;
      const tipX = Math.cos(baseAngle) * length * 0.72 + sway;
      const tipY = Math.sin(baseAngle) * length;
      const midX = tipX * 0.48 + Math.cos(baseAngle) * 3 * s;
      const midY = tipY * 0.56;
      ctx.strokeStyle = i % 3 === 0 ? '#6f9047' : i % 2 ? '#4f7137' : '#597d3b';
      ctx.lineWidth = Math.max(0.9, 1.5 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();

      // Pinnate leaflets.
      for (let j = 2; j <= 5; j++) {
        const u = j / 6;
        const px = (1 - u) * (1 - u) * 0 + 2 * (1 - u) * u * midX + u * u * tipX;
        const py = 2 * (1 - u) * u * midY + u * u * tipY;
        const leafSize = (5.4 - j * 0.55) * s * (i % 2 ? 0.8 : 1);
        const angle = baseAngle + (i % 2 ? 0.7 : -0.7) + spread * 0.1;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(106, 143, 67, 0.82)' : 'rgba(73, 105, 51, 0.82)';
        ctx.beginPath();
        ctx.ellipse(leafSize * 0.55, 0, leafSize, leafSize * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-leafSize * 0.45, 0, leafSize * 0.85, leafSize * 0.26, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    // A few bright new fiddleheads.
    ctx.strokeStyle = 'rgba(151, 181, 89, 0.72)';
    ctx.lineWidth = Math.max(0.8, 1.1 * s);
    for (let i = 0; i < 3; i++) {
      const lean = (i - 1) * 5 * s + sway * 0.4;
      ctx.beginPath();
      ctx.moveTo(lean * 0.4, 0);
      ctx.quadraticCurveTo(lean * 0.8, -8 * s, lean * 0.35 + 2 * s, -15 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLog(prop) {
    const sx = worldX(prop.x);
    const sy = worldY(prop.z);
    const s = cam.zoom * prop.scale;
    if (sx < -220 || sx > W + 220 || sy < -130 || sy > H + 130) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(prop.angle);
    // Deep shadow.
    ctx.fillStyle = 'rgba(2, 6, 4, 0.38)';
    ctx.beginPath();
    ctx.ellipse(4 * s, 5 * s, 122 * s, 17 * s, 0.02, 0, TAU);
    ctx.fill();
    // Main trunk silhouette.
    ctx.strokeStyle = '#152014';
    ctx.lineWidth = 36 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-106 * s, 0);
    ctx.quadraticCurveTo(-30 * s, -15 * s, 95 * s, -5 * s);
    ctx.stroke();
    // Bark body.
    const bark = ctx.createLinearGradient(0, -18 * s, 0, 15 * s);
    bark.addColorStop(0, '#6d6b42');
    bark.addColorStop(0.38, '#4d5532');
    bark.addColorStop(1, '#272f1f');
    ctx.strokeStyle = bark;
    ctx.lineWidth = 26 * s;
    ctx.stroke();
    // Bark ridges.
    ctx.strokeStyle = 'rgba(26, 35, 20, 0.65)';
    ctx.lineWidth = 1.8 * s;
    for (let i = 0; i < 6; i++) {
      const x = (-82 + i * 31) * s;
      ctx.beginPath();
      ctx.moveTo(x, -10 * s);
      ctx.quadraticCurveTo(x + 7 * s, -2 * s, x + 2 * s, 9 * s);
      ctx.stroke();
    }
    // Moss blanket.
    ctx.strokeStyle = 'rgba(77, 108, 50, 0.82)';
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(-76 * s, -14 * s);
    ctx.quadraticCurveTo(-16 * s, -22 * s, 64 * s, -14 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(128, 146, 73, 0.45)';
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(-70 * s, -18 * s);
    ctx.quadraticCurveTo(-6 * s, -25 * s, 58 * s, -18 * s);
    ctx.stroke();
    // Exposed end with rings.
    ctx.fillStyle = '#514b31';
    ctx.beginPath();
    ctx.ellipse(96 * s, -6 * s, 12 * s, 17 * s, 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7e7248';
    ctx.beginPath();
    ctx.ellipse(96 * s, -6 * s, 8 * s, 13 * s, 0.05, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(46, 42, 25, 0.65)';
    ctx.lineWidth = 1.2 * s;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(96 * s, -6 * s, 2.2 * i * s, 3.4 * i * s, 0.05, 0, TAU);
      ctx.stroke();
    }
    // Broken branch stubs.
    ctx.strokeStyle = '#2a321f';
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(-32 * s, -8 * s);
    ctx.lineTo(-18 * s, -48 * s);
    ctx.stroke();
    ctx.strokeStyle = '#5b5f3a';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(-32 * s, -10 * s);
    ctx.lineTo(-20 * s, -42 * s);
    ctx.stroke();
    // Shelf fungus.
    ctx.fillStyle = '#b18c53';
    ctx.beginPath();
    ctx.ellipse(36 * s, 5 * s, 14 * s, 5 * s, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d1ae6c';
    ctx.beginPath();
    ctx.ellipse(35 * s, 4 * s, 10 * s, 3 * s, 0.1, 0, TAU);
    ctx.fill();
    // Ferns tucked against the log.
    ctx.strokeStyle = 'rgba(79, 112, 53, 0.8)';
    ctx.lineWidth = 1.4 * s;
    for (let i = 0; i < 5; i++) {
      const x = (-58 + i * 24) * s;
      ctx.beginPath();
      ctx.moveTo(x, -12 * s);
      ctx.quadraticCurveTo(x + 4 * s, -22 * s, x + 12 * s, -27 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMushroom(prop, t) {
    const sx = worldX(prop.x);
    const sy = worldY(prop.z);
    const s = cam.zoom * prop.scale;
    if (sx < -50 || sx > W + 50 || sy < -40 || sy > H + 40) return;
    const sway = Math.sin(t * 1.4 + prop.sway) * 1.3;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(3, 8, 5, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 9 * s, 2.5 * s, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c7b28a';
    ctx.lineWidth = 1.7 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sway, -8 * s, -1 * s, -14 * s);
    ctx.stroke();
    ctx.fillStyle = '#9a473a';
    ctx.beginPath();
    ctx.ellipse(-1 * s + sway, -15 * s, 9 * s, 4.5 * s, -0.1, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 210, 166, 0.8)';
    ctx.beginPath();
    ctx.arc(-3 * s + sway, -16 * s, 1.1 * s, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2 * s + sway, -17 * s, 0.9 * s, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawRuin(prop) {
    const sx = worldX(prop.x);
    const sy = worldY(prop.z);
    const s = cam.zoom * prop.scale;
    if (sx < -300 || sx > W + 300 || sy < -260 || sy > H + 80) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(2, 6, 4, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 92 * s, 18 * s, 0, 0, TAU);
    ctx.fill();
    // Broken plinths.
    ctx.fillStyle = '#3b4535';
    ctx.beginPath();
    ctx.moveTo(-86 * s, 0);
    ctx.lineTo(-80 * s, -23 * s);
    ctx.lineTo(-48 * s, -29 * s);
    ctx.lineTo(-39 * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4d5743';
    ctx.beginPath();
    ctx.moveTo(-73 * s, -23 * s);
    ctx.lineTo(-67 * s, -100 * s);
    ctx.lineTo(-45 * s, -105 * s);
    ctx.lineTo(-42 * s, -28 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#303a2c';
    ctx.beginPath();
    ctx.moveTo(-70 * s, -99 * s);
    ctx.lineTo(-66 * s, -155 * s);
    ctx.lineTo(-47 * s, -157 * s);
    ctx.lineTo(-44 * s, -101 * s);
    ctx.closePath();
    ctx.fill();
    // A leaning lintel.
    ctx.save();
    ctx.translate(-39 * s, -165 * s);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#3a4635';
    ctx.fillRect(0, 0, 132 * s, 17 * s);
    ctx.fillStyle = '#515c47';
    ctx.fillRect(0, 0, 132 * s, 4 * s);
    ctx.restore();
    // Right broken column.
    ctx.fillStyle = '#36412f';
    ctx.beginPath();
    ctx.moveTo(67 * s, 0);
    ctx.lineTo(72 * s, -74 * s);
    ctx.lineTo(95 * s, -79 * s);
    ctx.lineTo(102 * s, 0);
    ctx.closePath();
    ctx.fill();
    // Carved spiral.
    ctx.strokeStyle = 'rgba(154, 164, 121, 0.35)';
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    for (let i = 0; i < 22; i++) {
      const a = i * 0.55;
      const r = i * 1.2 * s;
      const x = -57 * s + Math.cos(a) * r;
      const y = -73 * s + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Moss.
    ctx.fillStyle = 'rgba(66, 98, 48, 0.67)';
    ctx.beginPath();
    ctx.ellipse(-66 * s, -156 * s, 18 * s, 5 * s, -0.1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(86 * s, -78 * s, 17 * s, 4 * s, 0.05, 0, TAU);
    ctx.fill();
    // Hanging vine.
    ctx.strokeStyle = 'rgba(58, 91, 47, 0.7)';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(5 * s, -148 * s);
    ctx.bezierCurveTo(3 * s, -100 * s, 24 * s, -88 * s, 16 * s, -38 * s);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  const particles = [];
  const damageNumbers = [];
  const projectiles = [];

  function spawnParticle(options) {
    if (particles.length > 760) particles.shift();
    particles.push({
      x: options.x,
      z: options.z,
      elev: options.elev || 0,
      vx: options.vx || 0,
      vz: options.vz || 0,
      ve: options.ve || 0,
      gravity: options.gravity ?? 0,
      drag: options.drag ?? 2.2,
      size: options.size || 3,
      life: options.life || 0.5,
      maxLife: options.life || 0.5,
      color: options.color || '#fff',
      type: options.type || 'dot',
      rotation: rand(0, TAU),
      spin: options.spin || 0,
      glow: options.glow || false,
      alpha: options.alpha ?? 1
    });
  }

  function burst(x, z, elev, count, options = {}) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const speed = rand(options.minSpeed ?? 20, options.maxSpeed ?? 170);
      spawnParticle({
        x, z, elev: elev + rand(-4, 4),
        vx: Math.cos(a) * speed,
        vz: Math.sin(a) * speed * 0.65,
        ve: rand(options.minUp ?? 10, options.maxUp ?? 190),
        gravity: options.gravity ?? 460,
        drag: options.drag ?? 1.3,
        size: rand(options.minSize ?? 1.2, options.maxSize ?? 4),
        life: rand(options.minLife ?? 0.25, options.maxLife ?? 0.7),
        color: pick(options.colors || ['#f3d592', '#d4a75f', '#ffffff']),
        type: options.type || 'dot',
        glow: options.glow ?? true
      });
    }
  }

  function addDamageNumber(x, z, elev, value, crit = false, color = null) {
    damageNumbers.push({
      x: x + rand(-15, 15),
      z: z + rand(-6, 6),
      elev,
      value: Math.max(1, Math.round(value)),
      life: 1.1,
      maxLife: 1.1,
      crit,
      color,
      vx: rand(-9, 9),
      ve: crit ? 80 : 55
    });
    if (damageNumbers.length > 30) damageNumbers.shift();
  }

  function shockRing(x, z, maxRadius, color = 'rgba(239, 202, 123, 0.6)', life = 0.45) {
    particles.push({
      x, z, elev: 0, vx: 0, vz: 0, ve: 0,
      gravity: 0, drag: 0, size: 1, life, maxLife: life,
      color, type: 'ring', radius: maxRadius, rotation: 0, spin: 0, alpha: 1
    });
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.elev += p.ve * dt;
      p.ve -= p.gravity * dt;
      p.vx *= Math.exp(-p.drag * dt);
      p.vz *= Math.exp(-p.drag * dt);
      if (p.elev < 0) {
        p.elev = 0;
        p.ve *= -0.18;
        p.vx *= 0.72;
        p.vz *= 0.72;
      }
      p.rotation += p.spin * dt;
    }
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const d = damageNumbers[i];
      d.life -= dt;
      d.elev += d.ve * dt;
      d.ve -= 170 * dt;
      d.x += d.vx * dt;
      if (d.life <= 0) damageNumbers.splice(i, 1);
    }
  }

  function drawParticles(front = false) {
    for (const p of particles) {
      if (p.type === 'ring') continue;
      const sx = worldX(p.x);
      const sy = worldY(p.z) - p.elev * cam.zoom;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const lifeT = p.life / p.maxLife;
      const alpha = clamp(lifeT * 1.2, 0, 1) * p.alpha;
      ctx.globalAlpha = alpha;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      if (p.type === 'spark') {
        const speed = Math.hypot(p.vx, p.vz);
        const nx = p.vx / (speed || 1);
        const ny = p.vz / (speed || 1) * Y_SCALE;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * cam.zoom * 0.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - nx * p.size * cam.zoom * 2.5, sy - ny * p.size * cam.zoom * 2.5);
        ctx.stroke();
      } else if (p.type === 'leaf') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * cam.zoom * 1.6, p.size * cam.zoom * 0.6, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'petal') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size * cam.zoom * 1.8);
        ctx.quadraticCurveTo(p.size * cam.zoom, 0, 0, p.size * cam.zoom * 1.1);
        ctx.quadraticCurveTo(-p.size * cam.zoom, 0, 0, -p.size * cam.zoom * 1.8);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'glow') {
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * cam.zoom * 5);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * cam.zoom * 5, 0, TAU);
        ctx.fill();
      } else if (p.type === 'plus') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * cam.zoom * 0.55;
        const r = p.size * cam.zoom * 1.7;
        ctx.beginPath();
        ctx.moveTo(sx - r, sy);
        ctx.lineTo(sx + r, sy);
        ctx.moveTo(sx, sy - r);
        ctx.lineTo(sx, sy + r);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.4, p.size * cam.zoom * lifeT), 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  function drawRings() {
    for (const p of particles) {
      if (p.type !== 'ring') continue;
      const sx = worldX(p.x);
      const sy = worldY(p.z);
      const progress = 1 - p.life / p.maxLife;
      const radius = p.radius * cam.zoom * (0.2 + progress * 0.8);
      ctx.globalAlpha = (1 - progress) * 0.85;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = (1 - progress) * 4 * cam.zoom;
      ctx.beginPath();
      ctx.ellipse(sx, sy, radius, radius * Y_SCALE, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawDamageNumbers() {
    for (const d of damageNumbers) {
      const sx = worldX(d.x);
      const sy = worldY(d.z) - d.elev * cam.zoom;
      const alpha = clamp(d.life / d.maxLife * 2, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${d.crit ? 700 : 600} ${Math.round((d.crit ? 27 : 20) * cam.zoom)}px "Cinzel", Georgia, serif`;
      ctx.lineWidth = 3 * cam.zoom;
      ctx.strokeStyle = 'rgba(4, 9, 6, 0.7)';
      ctx.strokeText(String(d.value), sx, sy);
      ctx.fillStyle = d.color || (d.crit ? '#f6d57e' : '#f1e3c0');
      if (d.crit) {
        ctx.shadowColor = 'rgba(245, 199, 98, 0.7)';
        ctx.shadowBlur = 14;
      }
      ctx.fillText(String(d.value), sx, sy);
      ctx.restore();
    }
  }

  // Ambient forest life.
  const ambientMotes = [];
  const ambientLeaves = [];
  for (let i = 0; i < 85; i++) {
    ambientMotes.push({
      x: rand(-1600, 1600),
      z: rand(-1050, 1050),
      elev: rand(8, 170),
      phase: rand(0, TAU),
      speed: rand(0.18, 0.7),
      size: rand(0.7, 2.2),
      color: random() > 0.6 ? '#d9e9a1' : '#b8df9e'
    });
  }
  for (let i = 0; i < 26; i++) {
    ambientLeaves.push({
      x: rand(-1300, 1300),
      z: rand(-900, 900),
      elev: rand(20, 230),
      phase: rand(0, TAU),
      speed: rand(0.3, 0.8),
      size: rand(2, 4.5),
      rotation: rand(0, TAU),
      spin: rand(-2, 2)
    });
  }

  function drawAmbience(t, foreground = false) {
    if (!foreground) {
      for (const m of ambientMotes) {
        const mx = m.x + Math.sin(t * m.speed + m.phase) * 16;
        const mz = m.z + Math.cos(t * m.speed * 0.8 + m.phase) * 12;
        const sx = worldX(mx);
        const sy = worldY(mz) - m.elev * cam.zoom;
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
        const pulse = 0.35 + Math.sin(t * 2 + m.phase) * 0.25;
        ctx.globalAlpha = clamp(pulse, 0.08, 0.7);
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, m.size * cam.zoom * 5);
        grad.addColorStop(0, m.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, m.size * cam.zoom * 5, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      ctx.globalAlpha = 0.5;
      for (const l of ambientLeaves) {
        const lx = l.x + Math.sin(t * l.speed + l.phase) * 35;
        const lz = l.z + Math.cos(t * l.speed * 0.7 + l.phase) * 22;
        const ly = l.elev + Math.sin(t * l.speed * 1.7 + l.phase) * 12;
        const sx = worldX(lx);
        const sy = worldY(lz) - ly * cam.zoom;
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(l.rotation + t * l.spin);
        ctx.fillStyle = '#9aaf5c';
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size * cam.zoom, l.size * cam.zoom * 0.36, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Hunter
  // ---------------------------------------------------------------------------

  class Player {
    constructor(game) {
      this.game = game;
      this.reset();
    }

    reset() {
      this.x = -220;
      this.z = 130;
      this.vx = 0;
      this.vz = 0;
      this.face = -0.32;
      this.moveAmount = 0;
      this.walkPhase = 0;
      this.hp = 150;
      this.maxHp = 150;
      this.stamina = 100;
      this.maxStamina = 100;
      this.sharpness = 100;
      this.demon = false;
      this.demonCharge = 0;
      this.potions = 3;
      this.potionsUsed = 0;
      this.action = 'idle';
      this.actionTime = 0;
      this.duration = 0;
      this.attackIndex = 0;
      this.attackDir = this.face;
      this.attackHit = false;
      this.queuedAttack = false;
      this.comboTimer = 0;
      this.comboCount = 0;
      this.comboBest = 0;
      this.comboTimerShow = 0;
      this.danceTick = 0;
      this.dashDirX = 0;
      this.dashDirZ = 0;
      this.lastStaminaUse = 0;
      this.iframes = 0;
      this.invuln = 0;
      this.hurtFlash = 0;
      this.hurtTimer = 0;
      this.healAt = 0;
      this.potionPending = false;
      this.sharpenAt = 0;
      this.dead = false;
      this.deadTime = 0;
      this.swings = [];
      this.afterimages = [];
      this.trailTimer = 0;
      this.bloodFootTimer = 0;
      this.stunParticlesTimer = 0;
      this.hintShown = false;
    }

    get speedFactor() {
      return this.demon ? 1.17 : 1;
    }

    get sharpnessMultiplier() {
      if (this.sharpness > 68) return 1.24;
      if (this.sharpness > 32) return 1;
      return 0.68;
    }

    get sharpnessName() {
      if (this.sharpness > 68) return 'White';
      if (this.sharpness > 32) return 'Yellow';
      return 'Orange';
    }

    get reach() {
      return 112;
    }

    spendStamina(amount) {
      this.stamina = clamp(this.stamina - amount, 0, this.maxStamina);
      this.lastStaminaUse = this.game.time;
      if (this.stamina <= 0 && this.demon) {
        this.demon = false;
        toast('Demon Mode exhausted', 'danger');
        game.shake = Math.max(game.shake, 4);
      }
    }

    startAttack(force = false) {
      if (this.dead || this.game.phase !== 'hunt') return;
      if (this.action === 'heal' || this.action === 'sharpen' || this.action === 'stun' || this.action === 'hurt') return;
      if (this.action === 'attack') {
        this.queuedAttack = true;
        return;
      }
      if (this.action === 'dance') return;

      let index = 0;
      if (this.comboTimer > 0 && this.attackIndex < 3) index = this.attackIndex + 1;
      else if (force) index = this.attackIndex;

      const monster = this.game.monster;
      let aim = this.face;
      const now = performance.now();
      if (!isTouch && input.mouse.active && now - input.mouse.lastMove < 8000) {
        aim = angleTo(this.x, this.z, input.aimWorld.x, input.aimWorld.z);
      }
      if (monster && !monster.dead) {
        const md = dist(this.x, this.z, monster.x, monster.z);
        const ma = angleTo(this.x, this.z, monster.x, monster.z);
        if (isTouch || md < 300 || Math.abs(angleDiff(ma, aim)) < 0.72) {
          if (md < 380) aim = ma;
        }
      }
      this.face = aim;
      this.attackDir = aim;
      this.attackIndex = index;
      this.attackHit = false;
      this.queuedAttack = false;
      this.action = 'attack';
      this.actionTime = 0;
      const speed = this.demon ? 1.28 : 1;
      this.duration = (index === 3 ? 0.48 : 0.37) / speed;
      this.hitTime = (index === 3 ? 0.18 : 0.105) / speed;
      this.spendStamina(index === 3 ? 3 : 1.2);
      const data = [
        { start: -2.15, end: 1.12, range: 108, damage: 38, color: '#f7e6b6', second: '#9deee4' },
        { start: 2.0, end: -1.25, range: 112, damage: 34, color: '#f1dcae', second: '#79d7ce' },
        { start: -2.85, end: 2.55, range: 122, damage: 47, color: '#f8e9bc', second: '#9cebe1' },
        { start: -2.5, end: 2.4, range: 136, damage: 76, color: '#ffe9a7', second: '#c4fff4' }
      ][index];
      this.currentSwing = data;
      this.swings.push({
        angle: aim,
        start: data.start,
        end: data.end,
        range: data.range,
        life: 0.26 / speed,
        maxLife: 0.26 / speed,
        color: data.color,
        second: data.second,
        kind: index === 3 ? 'cross' : 'slash'
      });
      this.vx += Math.cos(aim) * (index === 3 ? 70 : 40);
      this.vz += Math.sin(aim) * (index === 3 ? 70 : 40);
      audio.slash();
      game.playerMovedRecently = true;
    }

    startDance() {
      if (this.dead || this.game.phase !== 'hunt') return;
      if (this.action === 'heal' || this.action === 'sharpen' || this.action === 'stun' || this.action === 'hurt') return;
      if (this.action === 'dance' || this.stamina < 28) {
        if (this.stamina < 28) toast('Not enough stamina', 'danger');
        return;
      }
      const monster = this.game.monster;
      if (monster && !monster.dead) {
        const md = dist(this.x, this.z, monster.x, monster.z);
        if (md < 420) this.face = angleTo(this.x, this.z, monster.x, monster.z);
      }
      this.action = 'dance';
      this.actionTime = 0;
      this.duration = this.demon ? 0.82 : 0.98;
      this.danceTick = 0;
      this.spendStamina(29);
      this.spawnDanceRing(0);
      audio.slash();
    }

    startDash() {
      if (this.dead || this.game.phase !== 'hunt') return;
      if (this.action === 'stun' || this.action === 'hurt' || this.action === 'dance') return;
      if (this.stamina < 20) {
        toast('Out of stamina', 'danger');
        return;
      }
      this.spendStamina(this.demon ? 17 : 21);
      let dx;
      let dz;
      const move = this.getMoveVector();
      if (Math.hypot(move.x, move.z) > 0.1) {
        dx = move.x;
        dz = move.z;
      } else {
        dx = Math.cos(this.face);
        dz = Math.sin(this.face);
      }
      const length = Math.hypot(dx, dz) || 1;
      dx /= length;
      dz /= length;
      this.dashDirX = dx;
      this.dashDirZ = dz;
      this.face = Math.atan2(dz, dx);
      this.action = 'dash';
      this.actionTime = 0;
      this.duration = this.demon ? 0.29 : 0.24;
      this.iframes = this.demon ? 0.34 : 0.28;
      this.vx = dx * 620;
      this.vz = dz * 620;
      this.afterimages.push({ x: this.x, z: this.z, face: this.face, life: 0.25, maxLife: 0.25 });
      audio.dash();
      game.playerMovedRecently = true;
    }

    startPotion() {
      if (this.dead || this.game.phase !== 'hunt') return;
      if (this.action === 'heal' || this.action === 'sharpen' || this.action === 'stun' || this.action === 'hurt') return;
      if (this.potions <= 0) {
        toast('No Mega Potions left', 'danger');
        this.game.pulseSlot(dom.potionSlot);
        return;
      }
      this.potions--;
      this.potionsUsed++;
      this.action = 'heal';
      this.actionTime = 0;
      this.duration = 1.18;
      this.healAt = 0.68;
      this.potionPending = true;
      this.vx *= 0.2;
      this.vz *= 0.2;
      toast('Mega Potion', 'gold');
      this.game.pulseSlot(dom.potionSlot);
    }

    startSharpen() {
      if (this.dead || this.game.phase !== 'hunt') return;
      if (this.action === 'heal' || this.action === 'sharpen' || this.action === 'stun' || this.action === 'hurt') return;
      if (this.sharpness > 97) {
        toast('Blades already honed', 'gold');
        return;
      }
      this.action = 'sharpen';
      this.actionTime = 0;
      this.duration = 1.62;
      this.sharpenAt = 1.08;
      this.vx *= 0.15;
      this.vz *= 0.15;
      toast('Sharpening', 'gold');
      this.game.pulseSlot(dom.whetstoneSlot);
    }

    toggleDemon() {
      if (this.dead || this.game.phase !== 'hunt') return;
      if (!this.demon && this.stamina < 12) {
        toast('Not enough stamina', 'danger');
        return;
      }
      this.demon = !this.demon;
      this.lastStaminaUse = this.game.time;
      if (this.demon) {
        toast('Demon Mode', 'cyan');
        burst(this.x, this.z, 18, 26, {
          minSpeed: 30, maxSpeed: 190, minUp: 40, maxUp: 230,
          colors: ['#7ce9de', '#a9fff5', '#e6fff9', '#df4e3e'],
          minSize: 1, maxSize: 3.2, life: 0.7, gravity: 120, glow: true, type: 'spark'
        });
        game.shake = Math.max(game.shake, 3);
        this.game.pulseSlot(dom.demonSlot);
      } else {
        toast('Demon Mode released', 'gold');
      }
    }

    cancelPotion() {
      if (this.action === 'heal') {
        this.potionPending = false;
      }
      if (this.action === 'sharpen') {
        this.sharpenAt = 999;
      }
    }

    hurt(amount, fromX, fromZ) {
      if (this.dead || this.invuln > 0 || this.iframes > 0 || this.game.phase !== 'hunt') return false;
      this.hp = Math.max(0, this.hp - amount);
      this.invuln = 0.82;
      this.hurtFlash = 0.34;
      this.comboCount = 0;
      this.comboTimer = 0;
      this.comboTimerShow = 0;
      this.cancelPotion();
      const away = angleTo(fromX, fromZ, this.x, this.z);
      this.vx = Math.cos(away) * 250;
      this.vz = Math.sin(away) * 250;
      this.action = 'hurt';
      this.actionTime = 0;
      this.duration = 0.44;
      this.face = away;
      game.hitstop = 0.035;
      game.shake = Math.max(game.shake, 13);
      game.flashDamage();
      audio.hurt();
      burst(this.x, this.z, 35, 12, {
        minSpeed: 20, maxSpeed: 90, minUp: 30, maxUp: 130,
        colors: ['#bf4e38', '#8c2f26', '#e7b073'], minSize: 1, maxSize: 2.8,
        life: 0.5, gravity: 320
      });
      if (this.hp <= 0) {
        this.die();
      } else {
        toast(`-${Math.round(amount)} health`, 'danger');
      }
      return true;
    }

    die() {
      this.dead = true;
      this.action = 'dead';
      this.actionTime = 0;
      this.duration = 0;
      this.vx *= 0.25;
      this.vz *= 0.25;
      game.lose('The hunter has fallen');
    }

    getMoveVector() {
      let mx = 0;
      let mz = 0;
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) mz -= 1;
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) mz += 1;
      if (input.touchMove.active) {
        mx += input.touchMove.x;
        mz += input.touchMove.z;
      }
      const length = Math.hypot(mx, mz);
      if (length > 1) {
        mx /= length;
        mz /= length;
      }
      return { x: mx, z: mz };
    }

    update(dt) {
      const game = this.game;
      this.iframes = Math.max(0, this.iframes - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      this.comboTimerShow = Math.max(0, this.comboTimerShow - dt);
      this.demonCharge = Math.max(0, this.demonCharge - dt * 0.55);

      if (this.dead) {
        this.deadTime += dt;
        this.vx *= Math.exp(-3 * dt);
        this.vz *= Math.exp(-3 * dt);
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        return;
      }

      if (this.demon) {
        this.stamina = Math.max(0, this.stamina - dt * 8.2);
        this.lastStaminaUse = game.time;
        if (this.stamina <= 0) {
          this.demon = false;
          toast('Demon Mode exhausted', 'danger');
          game.shake = Math.max(game.shake, 4);
        }
        if (Math.random() < dt * 9) {
          spawnParticle({
            x: this.x + rand(-16, 16), z: this.z + rand(-10, 10), elev: rand(5, 58),
            vx: rand(-8, 8), vz: rand(-8, 8), ve: rand(8, 30),
            gravity: -8, drag: 1.5, size: rand(0.8, 2.2), life: rand(0.2, 0.5),
            color: Math.random() > 0.55 ? '#e5533d' : '#7fe6db', type: 'dot', glow: true
          });
        }
      } else if (game.time - this.lastStaminaUse > 0.72 && this.action !== 'dash') {
        this.stamina = Math.min(this.maxStamina, this.stamina + dt * 24);
      }

      const move = this.getMoveVector();
      let speedMult = 1;
      if (this.action === 'attack') speedMult = 0.34;
      else if (this.action === 'dance') speedMult = 0.22;
      else if (this.action === 'heal') speedMult = 0.14;
      else if (this.action === 'sharpen') speedMult = 0.06;
      else if (this.action === 'hurt') speedMult = 0.25;
      else if (this.action === 'dash') speedMult = 0;

      if (this.action === 'stun') speedMult = 0;
      if (this.action === 'dead') speedMult = 0;

      const baseSpeed = 238 * this.speedFactor;
      const targetVX = move.x * baseSpeed * speedMult;
      const targetVZ = move.z * baseSpeed * speedMult;
      const accel = this.action === 'idle' ? 14 : 9;
      this.vx = damp(this.vx, targetVX, accel, dt);
      this.vz = damp(this.vz, targetVZ, accel, dt);

      if (this.action === 'dash') {
        this.vx = this.dashDirX * 660;
        this.vz = this.dashDirZ * 660;
        if (Math.random() < dt * 55) {
          this.afterimages.push({ x: this.x, z: this.z, face: this.face, life: 0.24, maxLife: 0.24, demon: this.demon });
        }
      }

      this.x += this.vx * dt;
      this.z += this.vz * dt;
      clampToArena(this, 36);

      const moving = Math.hypot(this.vx, this.vz) > 12;
      this.moveAmount = damp(this.moveAmount, moving ? 1 : 0, 12, dt);
      this.walkPhase += dt * (moving ? 9 : 3.4);

      if (!['attack', 'dance', 'heal', 'sharpen', 'hurt', 'dash', 'stun', 'dead'].includes(this.action)) {
        let desiredFace = this.face;
        const now = performance.now();
        if (!isTouch && input.mouse.active && now - input.mouse.lastMove < 8000) {
          desiredFace = angleTo(this.x, this.z, input.aimWorld.x, input.aimWorld.z);
        } else if (moving) {
          desiredFace = Math.atan2(move.z, move.x);
        }
        this.face = this.face + angleDiff(desiredFace, this.face) * Math.min(1, dt * 15);
      }

      if (moving && Math.random() < dt * 8) {
        spawnParticle({
          x: this.x + rand(-8, 8), z: this.z + rand(-2, 3), elev: 2,
          vx: rand(-10, 10), vz: rand(-8, 2), ve: rand(4, 24),
          gravity: 55, drag: 2.5, size: rand(0.8, 2.1), life: rand(0.25, 0.55),
          color: 'rgba(138, 123, 80, 0.7)', type: 'dot', glow: false, alpha: 0.5
        });
      }

      this.updateAction(dt);
      this.updateSwings(dt);
      this.updateTrail(dt);

      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life -= dt;
        if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
      }

      if (this.action === 'stun') {
        this.stunParticlesTimer -= dt;
        if (this.stunParticlesTimer <= 0) {
          this.stunParticlesTimer = 0.18;
          spawnParticle({
            x: this.x + rand(-12, 12), z: this.z + rand(-8, 8), elev: rand(58, 75),
            vx: rand(-8, 8), vz: rand(-4, 4), ve: rand(4, 18),
            gravity: 10, drag: 1.5, size: rand(1, 2), life: 0.45,
            color: '#f0d27f', type: 'plus', glow: true
          });
        }
      }
    }

    updateAction(dt) {
      if (this.action === 'idle') return;
      this.actionTime += dt;

      if (this.action === 'attack') {
        if (!this.attackHit && this.actionTime >= this.hitTime) {
          this.attackHit = true;
          this.performSwing();
        }
        if (this.actionTime >= this.duration) {
          if (this.queuedAttack && this.attackIndex < 3) {
            this.queuedAttack = false;
            this.attackIndex += 1;
            this.actionTime = 0;
            this.attackHit = false;
            const index = this.attackIndex;
            const data = [
              { start: -2.15, end: 1.12, range: 108, damage: 38, color: '#f7e6b6', second: '#9deee4' },
              { start: 2.0, end: -1.25, range: 112, damage: 34, color: '#f1dcae', second: '#79d7ce' },
              { start: -2.85, end: 2.55, range: 122, damage: 47, color: '#f8e9bc', second: '#9cebe1' },
              { start: -2.5, end: 2.4, range: 136, damage: 76, color: '#ffe9a7', second: '#c4fff4' }
            ][index];
            this.currentSwing = data;
            this.duration = (index === 3 ? 0.48 : 0.37) / (this.demon ? 1.28 : 1);
            this.hitTime = (index === 3 ? 0.18 : 0.105) / (this.demon ? 1.28 : 1);
            this.attackDir = this.face;
            this.swings.push({
              angle: this.face, start: data.start, end: data.end, range: data.range,
              life: 0.26, maxLife: 0.26, color: data.color, second: data.second,
              kind: index === 3 ? 'cross' : 'slash'
            });
            this.vx += Math.cos(this.face) * 70;
            this.vz += Math.sin(this.face) * 70;
            audio.slash();
          } else {
            this.comboTimer = 0.48;
            this.queuedAttack = false;
            this.action = 'idle';
            this.actionTime = 0;
          }
        }
      } else if (this.action === 'dance') {
        this.danceTick -= dt;
        if (this.danceTick <= 0) {
          this.danceTick = this.demon ? 0.105 : 0.125;
          this.performDanceTick();
          this.spawnDanceRing(this.actionTime / this.duration);
        }
        if (this.actionTime >= this.duration) {
          this.action = 'idle';
          this.actionTime = 0;
          this.comboTimer = 0.65;
          this.attackIndex = 3;
        }
      } else if (this.action === 'dash') {
        if (this.actionTime >= this.duration) {
          this.action = 'idle';
          this.actionTime = 0;
          this.vx *= 0.32;
          this.vz *= 0.32;
        }
      } else if (this.action === 'heal') {
        if (this.potionPending && this.actionTime >= this.healAt) {
          this.potionPending = false;
          const heal = 62;
          this.hp = Math.min(this.maxHp, this.hp + heal);
          audio.heal();
          for (let i = 0; i < 18; i++) {
            spawnParticle({
              x: this.x + rand(-16, 16), z: this.z + rand(-8, 8), elev: rand(6, 65),
              vx: rand(-9, 9), vz: rand(-7, 7), ve: rand(18, 70),
              gravity: -30, drag: 1.6, size: rand(0.8, 2.2), life: rand(0.4, 0.85),
              color: i % 3 === 0 ? '#bff3a1' : '#7bcf84', type: i % 4 === 0 ? 'plus' : 'dot', glow: true
            });
          }
        }
        if (this.actionTime >= this.duration) {
          this.action = 'idle';
          this.actionTime = 0;
        }
      } else if (this.action === 'sharpen') {
        if (this.actionTime >= this.sharpenAt) {
          this.sharpenAt = 999;
          this.sharpness = 100;
          audio.sharpen();
          toast('Blades honed', 'gold');
          for (let i = 0; i < 13; i++) {
            spawnParticle({
              x: this.x + rand(-12, 12), z: this.z + rand(-8, 8), elev: rand(35, 55),
              vx: rand(-40, 40), vz: rand(-16, 16), ve: rand(10, 60),
              gravity: 250, drag: 1, size: rand(0.7, 1.5), life: rand(0.2, 0.45),
              color: '#f5e6a9', type: 'spark', glow: true
            });
          }
        }
        if (this.actionTime >= this.duration) {
          this.action = 'idle';
          this.actionTime = 0;
        }
      } else if (this.action === 'hurt') {
        if (this.actionTime >= this.duration) {
          this.action = 'idle';
          this.actionTime = 0;
        }
      } else if (this.action === 'stun') {
        if (this.actionTime >= this.duration) {
          this.action = 'idle';
          this.actionTime = 0;
        }
      }
    }

    updateSwings(dt) {
      for (let i = this.swings.length - 1; i >= 0; i--) {
        this.swings[i].life -= dt;
        if (this.swings[i].life <= 0) this.swings.splice(i, 1);
      }
    }

    updateTrail(dt) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.045;
        this.afterimages.push({ x: this.x, z: this.z, face: this.face, life: 0.13, maxLife: 0.13, faint: true });
        if (this.afterimages.length > 16) this.afterimages.shift();
      }
    }

    spawnDanceRing(progress) {
      const base = this.demon ? 96 : 84;
      const color = this.demon ? 'rgba(233, 88, 65, 0.9)' : 'rgba(139, 239, 224, 0.82)';
      this.swings.push({
        angle: this.face + progress * 4.2,
        start: -2.3,
        end: 2.3,
        range: base + 28,
        life: 0.19,
        maxLife: 0.19,
        color,
        second: '#fff4cc',
        kind: 'dance'
      });
    }

    performSwing() {
      const monster = this.game.monster;
      if (!monster || monster.dead) return;
      const md = dist(this.x, this.z, monster.x, monster.z);
      const ma = angleTo(this.x, this.z, monster.x, monster.z);
      const arc = this.attackIndex === 3 ? 1.45 : 1.2;
      if (md > this.reach + 132 || Math.abs(angleDiff(ma, this.attackDir)) > arc) return;
      const critChance = 0.14 + (this.demon ? 0.08 : 0) + (this.attackIndex === 3 ? 0.12 : 0);
      const crit = Math.random() < critChance;
      let damage = this.currentSwing.damage * this.sharpnessMultiplier;
      damage *= 1 + this.demonCharge / 100 * 0.2;
      if (this.demon) damage *= 1.24;
      if (crit) damage *= 1.32;
      damage *= rand(0.94, 1.05);
      this.hitMonster(damage, crit, this.attackIndex === 3 ? 55 : 34);
      this.sharpness = Math.max(0, this.sharpness - (this.attackIndex === 3 ? 1.1 : 0.55));
    }

    performDanceTick() {
      const monster = this.game.monster;
      if (!monster || monster.dead) return;
      const md = dist(this.x, this.z, monster.x, monster.z);
      if (md > 128 + 128) return;
      const crit = Math.random() < 0.12 + (this.demon ? 0.08 : 0);
      let damage = 15 * this.sharpnessMultiplier * (this.demon ? 1.25 : 1) * (crit ? 1.3 : 1);
      damage *= 1 + this.demonCharge / 100 * 0.15;
      this.hitMonster(damage, crit, 27, true);
      this.sharpness = Math.max(0, this.sharpness - 0.18);
    }

    hitMonster(damage, crit, hitstrength, quiet = false) {
      const monster = this.game.monster;
      const ma = angleTo(this.x, this.z, monster.x, monster.z);
      const hx = monster.x - Math.cos(ma) * rand(12, 48);
      const hz = monster.z - Math.sin(ma) * rand(12, 40);
      const dealt = monster.takeDamage(damage, crit);
      addDamageNumber(hx, hz, rand(75, 125), dealt, crit);
      burst(hx, hz, rand(55, 110), crit ? 18 : 10, {
        minSpeed: 25, maxSpeed: crit ? 230 : 150, minUp: 40, maxUp: crit ? 240 : 150,
        colors: crit ? ['#ffe8a8', '#fff7d4', '#e5a84c', '#bdfbf0'] : ['#e9d39a', '#fff0c5', '#8edbd2', '#c0a35e'],
        minSize: 1, maxSize: crit ? 3.6 : 2.6, life: crit ? 0.55 : 0.4,
        type: 'spark', gravity: 320, glow: true
      });
      burst(hx, hz, rand(58, 100), crit ? 9 : 5, {
        minSpeed: 15, maxSpeed: 90, minUp: 10, maxUp: 80,
        colors: ['#6c8d4b', '#d4b06a', '#8b472e'], minSize: 1, maxSize: 3,
        life: 0.5, type: 'dot', gravity: 260, glow: false
      });
      this.comboCount += 1;
      this.comboTimer = 2.7;
      this.comboTimerShow = 3.2;
      this.comboBest = Math.max(this.comboBest, this.comboCount);
      this.demonCharge = Math.min(100, this.demonCharge + (this.demon ? 7 : 4));
      this.game.hitstop = Math.max(this.game.hitstop, hitstrength > 50 ? 0.058 : 0.032);
      this.game.shake = Math.max(this.game.shake, hitstrength > 50 ? 9 : 4);
      this.game.damageDealt += dealt;
      audio.hit(crit);
      this.game.monsterHealthCache = monster.hp;
    }

    draw() {
      if (this.dead) {
        this.drawFallen();
        return;
      }
      const sx = worldX(this.x);
      const sy = worldY(this.z);
      const s = cam.zoom * 1.02;

      // Ground shadow.
      ctx.fillStyle = 'rgba(2, 7, 4, 0.46)';
      ctx.beginPath();
      ctx.ellipse(sx + 2 * s, sy + 1 * s, 21 * s, 6.5 * s, 0.03, 0, TAU);
      ctx.fill();

      // Afterimages / dash echoes.
      for (const ghost of this.afterimages) {
        const gsx = worldX(ghost.x);
        const gsy = worldY(ghost.z);
        const alpha = clamp(ghost.life / ghost.maxLife, 0, 1) * (ghost.faint ? 0.16 : 0.36);
        this.drawBody(gsx, gsy, ghost.face, s, alpha, true, ghost.demon);
      }

      // Demon aura.
      if (this.demon) {
        const t = this.game.time;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const aura = ctx.createRadialGradient(sx, sy - 34 * s, 2, sx, sy - 34 * s, 58 * s);
        aura.addColorStop(0, 'rgba(217, 72, 52, 0.16)');
        aura.addColorStop(0.55, 'rgba(113, 218, 204, 0.09)');
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 34 * s, 50 * s, 62 * s, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(235, 87, 64, 0.45)';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 32 * s, 38 * s + Math.sin(t * 5) * 2 * s, 49 * s, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Swing arcs behind the body.
      this.drawSwings(sx, sy, s);

      // Speed trail scarf.
      this.drawBody(sx, sy, this.face, s, 1, false, false);

      // Dust at the feet while running.
      if (this.moveAmount > 0.3 && Math.random() < 0.15) {
        spawnParticle({
          x: this.x - this.vx * 0.01, z: this.z - this.vz * 0.01, elev: 2,
          vx: rand(-6, 6), vz: rand(-5, 1), ve: rand(5, 18),
          gravity: 35, drag: 2, size: rand(1, 2.4), life: rand(0.2, 0.45),
          color: 'rgba(153, 138, 91, 0.5)', type: 'dot', glow: false, alpha: 0.55
        });
      }

      if (this.hurtFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(sx, sy - 38 * s, 0, sx, sy - 38 * s, 48 * s);
        grad.addColorStop(0, `rgba(242, 79, 53, ${this.hurtFlash * 1.8})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy - 38 * s, 48 * s, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    drawFallen() {
      const sx = worldX(this.x);
      const sy = worldY(this.z);
      const s = cam.zoom * 1.02;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(s * (Math.cos(this.face) >= 0 ? 1 : -1), s);
      ctx.fillStyle = 'rgba(2, 7, 4, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 30, 8, 0, 0, TAU);
      ctx.fill();
      ctx.rotate(-1.28);
      ctx.translate(-16, -3);
      ctx.fillStyle = '#2b3f31';
      ctx.beginPath();
      ctx.ellipse(0, -22, 15, 28, 0.12, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7c5b3e';
      ctx.beginPath();
      ctx.ellipse(4, -55, 10, 10, 0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#b8b0a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -50);
      ctx.lineTo(-32, -59);
      ctx.moveTo(18, -45);
      ctx.lineTo(36, -32);
      ctx.stroke();
      ctx.restore();
    }

    drawBody(sx, sy, face, scale, alpha, ghost = false, forceDemon = false) {
      const s = scale;
      const demon = ghost ? !!forceDemon : this.demon;
      const flip = Math.cos(face) >= 0 ? 1 : -1;
      const moving = this.moveAmount;
      const run = Math.sin(this.walkPhase);
      const run2 = Math.sin(this.walkPhase + Math.PI);
      const bob = moving * Math.abs(Math.sin(this.walkPhase * 2)) * -1.8 + Math.sin(this.game.time * 2.1) * 0.7;
      let crouch = 0;
      let lean = 0;
      let spinAngle = 0;
      const actionT = this.duration ? clamp(this.actionTime / this.duration, 0, 1) : 0;
      if (this.action === 'attack') {
        const p = Math.sin(actionT * Math.PI);
        lean = 0.18 * p;
        crouch = 2 * p;
      }
      if (this.action === 'dance') {
        spinAngle = actionT * TAU * 2.1;
      }
      if (this.action === 'hurt') crouch = 4;
      if (this.action === 'heal') lean = -0.06;
      if (this.action === 'sharpen') lean = 0.08;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, sy + crouch * s);
      ctx.scale(flip * s, s);
      if (spinAngle) {
        ctx.translate(0, -34);
        ctx.rotate(spinAngle * 0.25);
        ctx.translate(0, 34);
      }

      // Scarf, animated behind the shoulders.
      const scarfWave = Math.sin(this.game.time * 5.2 + this.walkPhase) * (3 + moving * 5);
      const scarfLength = 24 + moving * 14;
      ctx.save();
      ctx.translate(-5, -55 + bob);
      ctx.beginPath();
      ctx.moveTo(4, 1);
      ctx.bezierCurveTo(-12, 5 + scarfWave * 0.2, -scarfLength - 9, 10 + scarfWave, -scarfLength - 19, 1 + scarfWave * 1.4);
      ctx.bezierCurveTo(-scarfLength - 10, 13 + scarfWave, -15, 13, -1, 6);
      ctx.closePath();
      const scarfGrad = ctx.createLinearGradient(0, 0, -scarfLength, 0);
      scarfGrad.addColorStop(0, '#9b332c');
      scarfGrad.addColorStop(0.55, '#7f241f');
      scarfGrad.addColorStop(1, '#4b1615');
      ctx.fillStyle = scarfGrad;
      ctx.fill();
      ctx.restore();

      // Legs and boots.
      const step = moving * 5;
      const l1 = run * step;
      const l2 = run2 * step;
      ctx.strokeStyle = '#20271e';
      ctx.lineWidth = 5.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, -19 + bob);
      ctx.lineTo(-7 + l1 * 0.5, -9);
      ctx.lineTo(-9 + l1, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, -18 + bob);
      ctx.lineTo(7 + l2 * 0.5, -9);
      ctx.lineTo(9 + l2, 0);
      ctx.stroke();
      ctx.strokeStyle = '#8f7049';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-9 + l1, -4);
      ctx.lineTo(-7 + l1, 0);
      ctx.moveTo(9 + l2, -4);
      ctx.lineTo(11 + l2, 0);
      ctx.stroke();

      // Armored skirt.
      ctx.fillStyle = '#2c4235';
      ctx.beginPath();
      ctx.moveTo(-11, -34 + bob);
      ctx.lineTo(11, -34 + bob);
      ctx.lineTo(14, -17 + bob);
      ctx.lineTo(3, -13 + bob);
      ctx.lineTo(0, -21 + bob);
      ctx.lineTo(-4, -13 + bob);
      ctx.lineTo(-14, -17 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(181, 150, 90, 0.5)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-10, -18 + bob);
      ctx.lineTo(-2, -15 + bob);
      ctx.moveTo(9, -18 + bob);
      ctx.lineTo(2, -15 + bob);
      ctx.stroke();

      // Torso.
      ctx.save();
      ctx.rotate(lean * 0.3);
      const torsoGrad = ctx.createLinearGradient(-13, -62, 12, -26);
      torsoGrad.addColorStop(0, '#3f5a46');
      torsoGrad.addColorStop(0.55, '#2b3d30');
      torsoGrad.addColorStop(1, '#1b2921');
      ctx.fillStyle = torsoGrad;
      ctx.beginPath();
      ctx.moveTo(-11, -55 + bob);
      ctx.quadraticCurveTo(-15, -45 + bob, -11, -32 + bob);
      ctx.lineTo(10, -32 + bob);
      ctx.quadraticCurveTo(14, -45 + bob, 9, -55 + bob);
      ctx.quadraticCurveTo(0, -59 + bob, -11, -55 + bob);
      ctx.closePath();
      ctx.fill();

      // Leather chest harness.
      ctx.strokeStyle = '#805c38';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-8, -53 + bob);
      ctx.lineTo(7, -37 + bob);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(216, 183, 111, 0.67)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -52 + bob);
      ctx.lineTo(6, -38 + bob);
      ctx.stroke();

      // Shoulder guard.
      ctx.fillStyle = '#4b6350';
      ctx.beginPath();
      ctx.ellipse(10, -52 + bob, 7.5, 6, -0.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(201, 170, 107, 0.62)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = '#334638';
      ctx.beginPath();
      ctx.ellipse(-9, -51 + bob, 6, 5, 0.2, 0, TAU);
      ctx.fill();

      // Head and bone mask.
      const headBob = Math.sin(this.game.time * 2.1) * 0.5;
      ctx.translate(0, bob);
      ctx.fillStyle = '#c4a576';
      ctx.beginPath();
      ctx.ellipse(1, -65 + headBob, 7.3, 8.5, 0.02, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#203229';
      ctx.beginPath();
      ctx.ellipse(-1, -66 + headBob, 6.6, 7.5, -0.05, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#d4c39e';
      ctx.beginPath();
      ctx.moveTo(-8, -69 + headBob);
      ctx.lineTo(-2, -73 + headBob);
      ctx.lineTo(3, -70 + headBob);
      ctx.lineTo(8, -73 + headBob);
      ctx.lineTo(6, -62 + headBob);
      ctx.lineTo(1, -59 + headBob);
      ctx.lineTo(-4, -61 + headBob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7d3a2d';
      ctx.beginPath();
      ctx.moveTo(-5, -66 + headBob);
      ctx.lineTo(4, -66 + headBob);
      ctx.lineTo(2, -63 + headBob);
      ctx.lineTo(-3, -63 + headBob);
      ctx.closePath();
      ctx.fill();

      // Eye glint, brighter in Demon Mode.
      ctx.fillStyle = demon ? '#c9fff6' : '#f1d18a';
      if (demon) {
        ctx.shadowColor = '#7ae7dc';
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(3.5, -65 + headBob, 1.2, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Hair / feather crest.
      ctx.strokeStyle = '#d7d0bb';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-2, -73 + headBob);
      ctx.quadraticCurveTo(-9, -82 + headBob, -15, -79 + headBob);
      ctx.moveTo(1, -73 + headBob);
      ctx.quadraticCurveTo(-2, -83 + headBob, -8, -87 + headBob);
      ctx.stroke();
      ctx.restore();

      // Arms and twin blades.
      const armSwing = this.action === 'attack' ? Math.sin(actionT * Math.PI) : 0;
      this.drawArm(-10, -48 + bob, -1, armSwing, demon);
      this.drawArm(11, -48 + bob, 1, armSwing, demon);

      // Blade glints.
      if (!ghost) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = demon ? 'rgba(235, 93, 63, 0.6)' : 'rgba(139, 245, 230, 0.28)';
        ctx.beginPath();
        ctx.arc(14, -48 + bob, 9, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    }

    drawArm(x, y, side, swing, demon) {
      const angle = -0.45 + swing * 0.9 * side;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = '#8d6a45';
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * 5, 8);
      ctx.lineTo(side * 8, 15);
      ctx.stroke();
      ctx.fillStyle = '#2a2e24';
      ctx.beginPath();
      ctx.arc(side * 8, 15, 2.6, 0, TAU);
      ctx.fill();
      // Blade geometry.
      ctx.save();
      ctx.translate(side * 8, 15);
      ctx.rotate(side * 1.16);
      const bladeGrad = ctx.createLinearGradient(0, 0, 0, -34);
      bladeGrad.addColorStop(0, '#5d5c53');
      bladeGrad.addColorStop(0.15, '#c0c5ba');
      bladeGrad.addColorStop(0.6, '#f1f3e9');
      bladeGrad.addColorStop(1, '#8ea9a2');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.quadraticCurveTo(-3, -18, 1, -34);
      ctx.quadraticCurveTo(4, -24, 3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = demon ? 'rgba(255, 116, 77, 0.9)' : 'rgba(126, 235, 220, 0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(-1, -20, 1, -32);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    drawSwings(sx, sy, s) {
      for (const swing of this.swings) {
        const p = 1 - swing.life / swing.maxLife;
        const alpha = Math.sin(Math.min(1, p * 1.16) * Math.PI) * 0.9;
        if (alpha <= 0) continue;
        const screenAngle = Math.atan2(Math.sin(swing.angle) * Y_SCALE, Math.cos(swing.angle));
        const start = swing.start;
        const end = swing.end;
        const arcStart = start + (end - start) * clamp(p - 0.35, 0, 0.35);
        const arcEnd = start + (end - start) * clamp(p + 0.16, 0, 1);
        const radius = swing.range * s;
        ctx.save();
        ctx.translate(sx, sy - 30 * s);
        ctx.rotate(screenAngle);
        ctx.scale(1, Y_SCALE);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = swing.color;
        ctx.lineWidth = 11 * s;
        ctx.beginPath();
        ctx.arc(0, 0, radius, arcStart, arcEnd);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = swing.second;
        ctx.lineWidth = 2.1 * s;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 3 * s, arcStart, arcEnd);
        ctx.stroke();
        if (swing.kind === 'cross') {
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = swing.color;
          ctx.lineWidth = 4 * s;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.84, -swing.end, -swing.start);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // The Thornscale Tyrant
  // ---------------------------------------------------------------------------

  class Monster {
    constructor(game) {
      this.game = game;
      this.reset();
    }

    reset() {
      this.x = 300;
      this.z = -20;
      this.face = Math.PI;
      this.maxHp = 2850;
      this.hp = this.maxHp;
      this.state = 'roar';
      this.stateTime = 0;
      this.stateDuration = 1.9;
      this.stateTriggered = false;
      this.cooldown = 0.8;
      this.attackCount = 0;
      this.chargeDir = Math.PI;
      this.chargeSpeed = 880;
      this.attackAim = Math.PI;
      this.spitAim = Math.PI;
      this.walkPhase = 0;
      this.flash = 0;
      this.staggerMeter = 0;
      this.staggerCooldown = 0;
      this.enraged = false;
      this.wounded = false;
      this.dead = false;
      this.deathTime = 0;
      this.limping = false;
      this.hitPlayerThisAttack = false;
      this.tailAngle = 0;
      this.jawOpen = 0;
      this.breathe = 0;
      this.lastDamageAt = -10;
      this.stateTag = 'Prowling';
    }

    setState(name, duration) {
      this.state = name;
      this.stateTime = 0;
      this.stateDuration = duration;
      this.stateTriggered = false;
      this.hitPlayerThisAttack = false;
      this.stateTag = name;
    }

    takeDamage(amount, crit) {
      if (this.dead) return 0;
      const dealt = Math.max(1, Math.round(amount));
      this.hp = Math.max(0, this.hp - dealt);
      this.flash = 0.12;
      this.lastDamageAt = this.game.time;
      this.staggerMeter += dealt * (crit ? 0.34 : 0.27);
      if (this.hp <= 0) {
        this.die();
        return dealt;
      }
      if (!this.enraged && this.hp / this.maxHp <= 0.5) {
        this.enraged = true;
        this.setState('enrage', 1.9);
        toast('The Tyrant is enraged', 'danger');
        this.game.shake = Math.max(this.game.shake, 16);
        audio.roar();
        burst(this.x, this.z, 105, 36, {
          minSpeed: 20, maxSpeed: 250, minUp: 30, maxUp: 220,
          colors: ['#ec5d3d', '#ffb15e', '#8c2d22', '#f4dc9c'],
          minSize: 1, maxSize: 4, life: 0.9, gravity: 80, glow: true, type: 'spark'
        });
      }
      if (!this.wounded && this.hp / this.maxHp <= 0.23) {
        this.wounded = true;
        this.limping = true;
        toast('The Tyrant is limping', 'gold');
      }
      if (this.staggerMeter >= 100 && this.staggerCooldown <= 0 && !['enrage', 'stagger', 'roar', 'dead'].includes(this.state)) {
        this.staggerMeter = 0;
        this.staggerCooldown = 8;
        this.setState('stagger', 1.32);
        toast('Monster staggered', 'gold');
        audio.stagger();
        shockRing(this.x, this.z, 200, 'rgba(245, 213, 126, 0.6)', 0.6);
        this.game.hitstop = Math.max(this.game.hitstop, 0.08);
        this.game.shake = Math.max(this.game.shake, 9);
      }
      return dealt;
    }

    die() {
      if (this.dead) return;
      this.dead = true;
      this.hp = 0;
      this.setState('dead', 99);
      this.deathTime = 0;
      this.game.shake = Math.max(this.game.shake, 18);
      this.game.hitstop = 0.16;
      toast('Thornscale Tyrant slain', 'gold');
      shockRing(this.x, this.z, 280, 'rgba(236, 199, 117, 0.68)', 0.9);
      burst(this.x, this.z, 100, 55, {
        minSpeed: 40, maxSpeed: 330, minUp: 20, maxUp: 300,
        colors: ['#f2d68f', '#e26a45', '#a4c878', '#fff4c8'],
        minSize: 1, maxSize: 4.5, life: 1.2, gravity: 140, glow: true, type: 'spark'
      });
      this.game.onMonsterSlain();
    }

    update(dt) {
      const game = this.game;
      this.flash = Math.max(0, this.flash - dt);
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.staggerCooldown = Math.max(0, this.staggerCooldown - dt);
      this.breathe += dt;
      this.stateTime += dt;

      if (this.dead) {
        this.deathTime += dt;
        this.jawOpen = damp(this.jawOpen, 0.7, 3, dt);
        return;
      }

      if (this.enraged && Math.random() < dt * 12) {
        spawnParticle({
          x: this.x + rand(-85, 85), z: this.z + rand(-45, 45), elev: rand(80, 210),
          vx: rand(-12, 12), vz: rand(-8, 8), ve: rand(16, 55),
          gravity: -10, drag: 0.7, size: rand(1, 3.4), life: rand(0.5, 1.1),
          color: Math.random() > 0.5 ? '#de5437' : '#e8c07c', type: 'dot', glow: true, alpha: 0.75
        });
      }

      // Breath and the small life that follows a forest giant.
      if (!this.dead && Math.random() < dt * (this.state === 'roar' || this.state === 'enrage' ? 18 : 3.2)) {
        const hx = this.x + Math.cos(this.face) * rand(120, 148);
        const hz = this.z + Math.sin(this.face) * rand(55, 85);
        spawnParticle({
          x: hx, z: hz, elev: rand(135, 168),
          vx: Math.cos(this.face) * rand(8, 34) + rand(-8, 8),
          vz: Math.sin(this.face) * rand(4, 18) + rand(-5, 5),
          ve: rand(4, 26), gravity: -9, drag: 0.8,
          size: rand(1.2, 3.4), life: rand(0.6, 1.3),
          color: this.enraged ? 'rgba(231, 116, 68, 0.5)' : 'rgba(224, 210, 168, 0.28)',
          type: 'dot', glow: this.enraged, alpha: 0.75
        });
      }

      const player = game.player;
      const dx = player.x - this.x;
      const dz = player.z - this.z;
      const distance = Math.hypot(dx, dz);
      const playerAngle = Math.atan2(dz, dx);

      if (this.state === 'roar') {
        this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 0.5);
        if (!this.stateTriggered && this.stateTime > 0.4) {
          this.stateTriggered = true;
          audio.roar();
          game.shake = Math.max(game.shake, 15);
          shockRing(this.x, this.z, 310, 'rgba(224, 179, 110, 0.36)', 0.9);
          shockRing(this.x, this.z, 230, 'rgba(221, 94, 62, 0.28)', 0.72);
          if (dist(player.x, player.z, this.x, this.z) < 360 && player.iframes <= 0) {
            player.action = 'stun';
            player.actionTime = 0;
            player.duration = 0.92;
            player.vx = 0;
            player.vz = 0;
            toast('Roar — stunned', 'danger');
          }
        }
        if (this.stateTime >= this.stateDuration) {
          this.setState('stalk', 0.1);
          this.cooldown = 0.7;
        }
        return;
      }

      if (this.state === 'enrage') {
        this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 0.6);
        if (!this.stateTriggered && this.stateTime > 0.35) {
          this.stateTriggered = true;
          audio.roar();
          game.shake = Math.max(game.shake, 15);
          shockRing(this.x, this.z, 360, 'rgba(230, 84, 52, 0.48)', 1.0);
          shockRing(this.x, this.z, 250, 'rgba(245, 204, 122, 0.28)', 0.75);
        }
        if (this.stateTime >= this.stateDuration) {
          this.setState('stalk', 0.1);
          this.cooldown = 0.4;
        }
        return;
      }

      if (this.state === 'stagger') {
        if (this.stateTime >= this.stateDuration) {
          this.setState('stalk', 0.1);
          this.cooldown = 0.65;
        }
        return;
      }

      if (this.state === 'stalk') {
        this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 2.1);
        let moveSpeed = 0;
        if (distance > 280) moveSpeed = this.enraged ? 82 : 58;
        else if (distance > 195) moveSpeed = this.enraged ? 56 : 38;
        else if (distance < 145) moveSpeed = -this.enraged ? -26 : -18;
        this.x += Math.cos(this.face) * moveSpeed * dt;
        this.z += Math.sin(this.face) * moveSpeed * dt;
        if (Math.abs(moveSpeed) > 1) this.walkPhase += dt * (this.enraged ? 6.4 : 4.6);
        clampToArena(this, 120);
        if (this.cooldown <= 0) {
          this.chooseAttack(distance);
        }
        return;
      }

      if (this.state === 'chargeWind') {
        const lockTime = 0.52;
        if (this.stateTime < lockTime) {
          this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 3.8);
          this.attackAim = angleTo(this.x, this.z, player.x, player.z);
        }
        if (this.stateTime >= this.stateDuration) {
          this.chargeDir = this.attackAim;
          this.face = this.attackAim;
          this.setState('charge', this.enraged ? 0.68 : 0.58);
          audio.roar();
          game.shake = Math.max(game.shake, 5);
        }
        return;
      }

      if (this.state === 'charge') {
        const speed = this.chargeSpeed * (this.enraged ? 1.15 : 1);
        this.x += Math.cos(this.chargeDir) * speed * dt;
        this.z += Math.sin(this.chargeDir) * speed * dt;
        this.walkPhase += dt * 13;
        const hitDistance = dist(this.x, this.z, player.x, player.z);
        if (!this.hitPlayerThisAttack && hitDistance < 116) {
          this.hitPlayerThisAttack = true;
          player.hurt(this.enraged ? 34 : 28, this.x, this.z);
          game.shake = Math.max(game.shake, 13);
        }
        if (Math.random() < dt * 28) {
          spawnParticle({
            x: this.x + rand(-32, 32), z: this.z + rand(-12, 12), elev: rand(2, 25),
            vx: rand(-35, 35), vz: rand(-20, 20), ve: rand(15, 70),
            gravity: 120, drag: 1.2, size: rand(1, 3.6), life: rand(0.3, 0.7),
            color: 'rgba(127, 114, 73, 0.6)', type: 'dot', glow: false, alpha: 0.6
          });
        }
        clampToArena(this, 110);
        if (this.stateTime >= this.stateDuration) {
          this.setState('recover', 0.92);
          this.cooldown = 0.45;
        }
        return;
      }

      if (this.state === 'tailWind') {
        if (this.stateTime < 0.28) {
          this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 2.2);
        }
        this.attackAim = this.face;
        if (this.stateTime >= this.stateDuration) {
          this.setState('tail', 0.46);
        }
        return;
      }

      if (this.state === 'tail') {
        if (!this.stateTriggered && this.stateTime > 0.09) {
          this.stateTriggered = true;
          const sweepDist = dist(this.x, this.z, player.x, player.z);
          if (sweepDist < 252 && sweepDist > 30) {
            player.hurt(this.enraged ? 30 : 24, this.x, this.z);
          }
          for (let i = 0; i < 16; i++) {
            const a = this.face + rand(-2.5, 2.5);
            spawnParticle({
              x: this.x + Math.cos(a) * rand(80, 190), z: this.z + Math.sin(a) * rand(45, 110), elev: rand(4, 28),
              vx: Math.cos(a) * rand(30, 130), vz: Math.sin(a) * rand(20, 70), ve: rand(10, 90),
              gravity: 150, drag: 1.2, size: rand(1, 3), life: rand(0.3, 0.65),
              color: ['#818f63', '#a8864e', '#5d6f44'][i % 3], type: 'dot', glow: false
            });
          }
          game.shake = Math.max(game.shake, 8);
          audio.noiseBurst(0.22, 900, 0.13, 'bandpass', 0.5);
        }
        if (this.stateTime >= this.stateDuration) {
          this.setState('recover', this.enraged ? 0.65 : 0.82);
          this.cooldown = 0.38;
        }
        return;
      }

      if (this.state === 'biteWind') {
        if (this.stateTime < 0.38) {
          this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 3.4);
          this.attackAim = angleTo(this.x, this.z, player.x, player.z);
        }
        this.jawOpen = damp(this.jawOpen, 0.95, 8, dt);
        if (this.stateTime >= this.stateDuration) {
          this.setState('bite', 0.34);
          this.face = this.attackAim;
          this.hitPlayerThisAttack = false;
        }
        return;
      }

      if (this.state === 'bite') {
        this.x += Math.cos(this.face) * 110 * dt;
        this.z += Math.sin(this.face) * 45 * dt;
        if (!this.stateTriggered && this.stateTime > 0.08) {
          this.stateTriggered = true;
          const md = dist(this.x, this.z, player.x, player.z);
          const ma = angleTo(this.x, this.z, player.x, player.z);
          if (md < 218 && Math.abs(angleDiff(ma, this.face)) < 0.9) {
            player.hurt(this.enraged ? 36 : 29, this.x, this.z);
          }
          game.shake = Math.max(game.shake, 7);
        }
        this.jawOpen = damp(this.jawOpen, this.stateTime < 0.2 ? 0.9 : 0.1, 10, dt);
        if (this.stateTime >= this.stateDuration) {
          this.setState('recover', 0.8);
          this.cooldown = 0.4;
        }
        return;
      }

      if (this.state === 'spitWind') {
        if (this.stateTime < 0.42) {
          this.face = this.face + angleDiff(playerAngle, this.face) * Math.min(1, dt * 2.8);
        }
        this.spitAim = angleTo(this.x, this.z, player.x, player.z);
        this.jawOpen = damp(this.jawOpen, 0.7, 7, dt);
        this.attackAim = this.spitAim;
        if (this.stateTime >= this.stateDuration) {
          this.setState('spit', 0.46);
          this.hitPlayerThisAttack = false;
          this.fireAcidVolley();
        }
        return;
      }

      if (this.state === 'spit') {
        if (this.stateTime >= this.stateDuration) {
          this.setState('recover', 0.7);
          this.cooldown = 0.5;
        }
        return;
      }

      if (this.state === 'recover') {
        this.jawOpen = damp(this.jawOpen, 0, 4, dt);
        if (this.stateTime >= this.stateDuration) {
          this.setState('stalk', 0.1);
          this.cooldown = this.enraged ? 0.38 : 0.72;
        }
        return;
      }
    }

    chooseAttack(distance) {
      this.attackCount++;
      const enrageBoost = this.enraged ? 0.18 : 0;
      if (distance > 340) {
        if (random() < 0.48 + enrageBoost) {
          this.attackAim = angleTo(this.x, this.z, this.game.player.x, this.game.player.z);
          this.setState('chargeWind', this.enraged ? 0.62 : 0.76);
        } else {
          this.spitAim = angleTo(this.x, this.z, this.game.player.x, this.game.player.z);
          this.setState('spitWind', this.enraged ? 0.55 : 0.72);
        }
      } else if (distance > 200) {
        const option = this.attackCount % 4;
        if (option === 0 || option === 2) {
          this.setState('chargeWind', this.enraged ? 0.56 : 0.7);
        } else if (option === 1) {
          this.setState('tailWind', this.enraged ? 0.45 : 0.58);
        } else {
          this.setState('biteWind', this.enraged ? 0.4 : 0.5);
        }
      } else {
        const option = this.attackCount % 3;
        if (option === 0) this.setState('biteWind', this.enraged ? 0.34 : 0.44);
        else if (option === 1) this.setState('tailWind', this.enraged ? 0.4 : 0.52);
        else this.setState('biteWind', this.enraged ? 0.3 : 0.4);
      }
    }

    fireAcidVolley() {
      const game = this.game;
      const baseTargetX = game.player.x;
      const baseTargetZ = game.player.z;
      const count = this.enraged ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 58;
        const tx = clamp(baseTargetX + spread + rand(-20, 20), -WORLD.rx + 80, WORLD.rx - 80);
        const tz = clamp(baseTargetZ + rand(-22, 22), -WORLD.rz + 80, WORLD.rz - 80);
        game.projectiles.push({
          type: 'acid',
          x: this.x + Math.cos(this.face) * 135,
          z: this.z + Math.sin(this.face) * 72,
          startX: this.x + Math.cos(this.face) * 135,
          startZ: this.z + Math.sin(this.face) * 72,
          tx,
          tz,
          t: -i * 0.11,
          duration: 0.72 + i * 0.05,
          radius: 68,
          damage: this.enraged ? 22 : 17,
          exploded: false,
          face: this.face
        });
      }
      audio.tone(190, 0.45, 0.035, 'sawtooth', 65);
      for (let i = 0; i < 14; i++) {
        spawnParticle({
          x: this.x + Math.cos(this.face) * 130, z: this.z + Math.sin(this.face) * 75, elev: rand(120, 160),
          vx: Math.cos(this.face) * rand(20, 120) + rand(-30, 30),
          vz: Math.sin(this.face) * rand(10, 50) + rand(-20, 20),
          ve: rand(10, 80), gravity: 220, drag: 1.2,
          size: rand(1, 3), life: rand(0.25, 0.55),
          color: i % 2 ? '#b9d45f' : '#647e35', type: 'dot', glow: true
        });
      }
    }

    draw() {
      const sx = worldX(this.x);
      const sy = worldY(this.z);
      const s = cam.zoom * 1.08;
      if (sx < -360 || sx > W + 360 || sy < -300 || sy > H + 320) return;

      // Shadow.
      const shadowW = this.dead ? 150 : 118;
      ctx.fillStyle = this.dead ? 'rgba(2, 7, 4, 0.32)' : 'rgba(2, 7, 4, 0.5)';
      ctx.beginPath();
      ctx.ellipse(sx + 10 * s, sy + 4 * s, shadowW * s, 26 * s, 0.03, 0, TAU);
      ctx.fill();

      // Enraged aura.
      if (this.enraged && !this.dead) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + Math.sin(this.game.time * 2.6) * 0.18;
        const aura = ctx.createRadialGradient(sx, sy - 105 * s, 15 * s, sx, sy - 105 * s, 220 * s);
        aura.addColorStop(0, `rgba(189, 45, 28, ${0.12 * pulse})`);
        aura.addColorStop(0.55, `rgba(219, 93, 44, ${0.08 * pulse})`);
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 104 * s, 220 * s, 155 * s, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      const flip = Math.cos(this.face) >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(flip * s, s);

      if (this.dead) {
        const p = clamp(this.deathTime / 1.4, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        ctx.translate(-25 * eased, 0);
        ctx.rotate(-1.18 * eased);
      }

      let bob = Math.sin(this.breathe * 1.35) * 1.6;
      let bodyTilt = 0;
      let bodyDrop = 0;
      let tailSwing = Math.sin(this.game.time * 1.1) * 0.07;
      let headForward = 0;
      let headDown = 0;
      let jaw = this.jawOpen;
      let crouch = 0;
      let legSwing = Math.sin(this.walkPhase) * (this.state === 'stalk' ? 4 : this.state === 'charge' ? 10 : 1.5);
      let wingSpread = this.enraged || ['roar', 'enrage'].includes(this.state) ? 1 : 0;

      if (this.state === 'chargeWind' || this.state === 'charge') {
        bodyTilt = 0.1;
        crouch = 10;
        headForward = this.state === 'charge' ? 16 : 5;
        headDown = 8;
        wingSpread = 0.7;
      }
      if (this.state === 'biteWind') {
        bodyTilt = -0.04;
        headForward = 4;
        headDown = -6;
        crouch = 4;
      }
      if (this.state === 'bite') {
        const p = Math.sin(clamp(this.stateTime / 0.34, 0, 1) * Math.PI);
        headForward = 26 * p;
        headDown = -3 * p;
        bodyTilt = -0.08 + p * 0.05;
      }
      if (this.state === 'tailWind') {
        tailSwing = -0.55;
        bodyTilt = -0.04;
        crouch = 4;
      }
      if (this.state === 'tail') {
        tailSwing = 0.65;
        bodyTilt = 0.07;
      }
      if (this.state === 'spitWind' || this.state === 'spit') {
        headDown = -12;
        headForward = 8;
        jaw = this.state === 'spitWind' ? 0.7 : 0.35;
        bodyTilt = -0.025;
      }
      if (this.state === 'stagger') {
        bodyTilt = 0.14 + Math.sin(this.game.time * 6) * 0.03;
        bodyDrop = 11;
        crouch = 9;
        jaw = 0.55;
      }
      if (this.state === 'roar') {
        bodyTilt = -0.08;
        headDown = -18;
        jaw = 1;
        wingSpread = 1;
      }
      if (this.state === 'enrage') {
        bodyTilt = -0.1;
        headDown = -18;
        jaw = 0.9;
        wingSpread = 1;
      }
      if (this.state === 'recover') {
        crouch = 4;
        bodyTilt = 0.02;
      }

      bodyDrop += bob;
      const bodyY = bodyDrop;
      const bodyRot = bodyTilt;

      // Tail first.
      this.drawTail(tailSwing, bodyY);
      // Wings behind the torso.
      this.drawWings(wingSpread, bodyY);

      // Hind leg.
      this.drawLeg(-48, -92, -1, legSwing * -1, bodyY, true);
      // Far foreleg.
      this.drawLeg(54, -93, 1, legSwing, bodyY, true);

      ctx.save();
      ctx.translate(0, bodyY);
      ctx.rotate(bodyRot * 0.18);

      // Torso.
      const bodyGrad = ctx.createLinearGradient(-78, -170, 94, -45);
      bodyGrad.addColorStop(0, '#263a26');
      bodyGrad.addColorStop(0.35, '#415b35');
      bodyGrad.addColorStop(0.67, '#4c6238');
      bodyGrad.addColorStop(1, '#26351f');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-78, -80);
      ctx.bezierCurveTo(-92, -119, -66, -158, -16, -166);
      ctx.bezierCurveTo(32, -174, 83, -153, 91, -113);
      ctx.bezierCurveTo(99, -73, 71, -48, 20, -48);
      ctx.bezierCurveTo(-25, -48, -66, -55, -78, -80);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a2818';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Belly plates.
      ctx.fillStyle = '#8b8e56';
      ctx.beginPath();
      ctx.moveTo(77, -62);
      ctx.bezierCurveTo(55, -46, 17, -43, -18, -53);
      ctx.bezierCurveTo(-33, -60, -31, -76, -12, -80);
      ctx.bezierCurveTo(20, -86, 58, -78, 77, -62);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(44, 56, 32, 0.7)';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(63 - i * 17, -71 + i * 3);
        ctx.quadraticCurveTo(40 - i * 15, -58 + i * 2, 18 - i * 16, -62 + i * 4);
        ctx.stroke();
      }

      // Haunch muscle.
      ctx.fillStyle = 'rgba(91, 114, 61, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-51, -101, 34, 42, -0.18, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28, 45, 28, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-47, -101, 28, -0.8, 1.35);
      ctx.stroke();

      // Moss and old scars.
      ctx.fillStyle = 'rgba(86, 111, 57, 0.65)';
      for (const [mx, my, rx, ry, rot] of [[-38, -148, 22, 8, -0.2], [6, -159, 15, 5, 0.1], [48, -136, 18, 6, 0.45], [-65, -94, 11, 4, 0.3]]) {
        ctx.beginPath();
        ctx.ellipse(mx, my, rx, ry, rot, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(47, 31, 24, 0.65)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(20, -149);
      ctx.quadraticCurveTo(34, -128, 24, -108);
      ctx.moveTo(6, -126);
      ctx.lineTo(12, -112);
      ctx.moveTo(52, -157);
      ctx.quadraticCurveTo(65, -139, 58, -123);
      ctx.stroke();

      // Layered scale texture.
      ctx.strokeStyle = 'rgba(160, 172, 100, 0.13)';
      ctx.lineWidth = 0.9;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 7; col++) {
          const x = -50 + col * 20 + (row % 2) * 8;
          const y = -143 + row * 15;
          if ((x - 2) * (x - 2) / 5800 + (y + 104) * (y + 104) / 3200 > 1) continue;
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0.2, 2.5);
          ctx.stroke();
        }
      }

      // Rim light along the spine.
      ctx.strokeStyle = 'rgba(184, 192, 112, 0.3)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-66, -136);
      ctx.bezierCurveTo(-40, -158, -12, -166, 24, -165);
      ctx.stroke();

      // Hanging moss and old wounds.
      ctx.fillStyle = 'rgba(82, 108, 55, 0.72)';
      ctx.beginPath();
      ctx.ellipse(-64, -88, 17, 6, -0.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-51, -82, 5, 13, -0.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40, 28, 21, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-29, -116);
      ctx.lineTo(-22, -101);
      ctx.moveTo(-27, -111);
      ctx.lineTo(-34, -104);
      ctx.stroke();

      // Back spines.
      for (let i = 0; i < 6; i++) {
        const x = -55 + i * 23;
        const y = -154 - Math.sin(i * 0.85) * 9;
        ctx.fillStyle = i % 2 ? '#b36a3d' : '#8b4c31';
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 3);
        ctx.quadraticCurveTo(x + 1, y - 22 - i * 1.8, x + 9, y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(232, 171, 95, 0.38)';
        ctx.beginPath();
        ctx.moveTo(x - 1, y - 2);
        ctx.quadraticCurveTo(x + 2, y - 14 - i, x + 5, y + 1);
        ctx.closePath();
        ctx.fill();
      }

      // Folded arms with claws.
      ctx.strokeStyle = '#23341f';
      ctx.lineWidth = 17;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(56, -116);
      ctx.quadraticCurveTo(79, -94, 89, -78);
      ctx.stroke();
      ctx.strokeStyle = '#4a6037';
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.fillStyle = '#d8ceb0';
      ctx.beginPath();
      ctx.moveTo(89, -78);
      ctx.lineTo(103, -74);
      ctx.lineTo(91, -72);
      ctx.lineTo(100, -66);
      ctx.lineTo(87, -68);
      ctx.closePath();
      ctx.fill();

      // Neck and head.
      this.drawHead(headForward, headDown, jaw, bodyY);

      // Near front leg.
      this.drawLeg(55, -94, 1, legSwing * 0.8, bodyY, false);
      // Near hind leg.
      this.drawLeg(-45, -91, -1, legSwing * -0.8, bodyY, false);

      // Spine ridge down the tail root.
      ctx.fillStyle = '#a75f38';
      for (let i = 0; i < 4; i++) {
        const x = -72 - i * 15;
        const y = -138 + i * 10;
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 3);
        ctx.lineTo(x - 2, y - 12);
        ctx.lineTo(x + 5, y + 4);
        ctx.closePath();
        ctx.fill();
      }

      // White damage flash.
      if (this.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = this.flash * 4.5;
        ctx.fillStyle = '#ffe8c4';
        ctx.beginPath();
        ctx.ellipse(2, -107, 88, 61, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();

      if (this.dead) {
        // Dust settling around the fallen giant.
        if (Math.random() < 0.05) {
          spawnParticle({
            x: this.x + rand(-110, 110), z: this.z + rand(-40, 40), elev: rand(0, 22),
            vx: rand(-8, 8), vz: rand(-5, 5), ve: rand(2, 18),
            gravity: 20, drag: 1, size: rand(1, 3.4), life: rand(0.6, 1.4),
            color: 'rgba(123, 113, 77, 0.4)', type: 'dot', glow: false, alpha: 0.4
          });
        }
      }

      // Enraged eye glow reflected on ground.
      if (this.enraged && !this.dead) {
        const eyeX = worldX(this.x + 126 * Math.cos(this.face) * 0 + 105);
        const eyeY = worldY(this.z - 30);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const eyeGlow = ctx.createRadialGradient(eyeX, eyeY - 170 * s, 1, eyeX, eyeY - 170 * s, 50 * s);
        eyeGlow.addColorStop(0, 'rgba(255, 89, 49, 0.2)');
        eyeGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY - 170 * s, 50 * s, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    drawTail(swing, bodyY) {
      ctx.save();
      ctx.translate(-58, -102 + bodyY);
      ctx.rotate(swing);
      // Tail base is thick, tapering into a bone-bladed tip.
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#182418';
      ctx.lineWidth = 42;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-44, 7, -91, -2, -142, 5);
      ctx.bezierCurveTo(-188, 12, -216, 3, -252, 20);
      ctx.stroke();
      const tailGrad = ctx.createLinearGradient(0, 0, -250, 0);
      tailGrad.addColorStop(0, '#405935');
      tailGrad.addColorStop(0.58, '#344b2c');
      tailGrad.addColorStop(1, '#24351f');
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 32;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(133, 144, 82, 0.6)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-5, 14);
      ctx.bezierCurveTo(-55, 20, -95, 9, -145, 16);
      ctx.bezierCurveTo(-190, 22, -217, 14, -248, 29);
      ctx.stroke();

      // Spikes along the top.
      for (let i = 0; i < 6; i++) {
        const p = i / 6;
        const x = -26 - p * 198;
        const y = 0 - Math.sin(p * 2.4) * 4;
        const size = 12 - p * 5;
        ctx.fillStyle = i % 2 ? '#ba7042' : '#8f4c30';
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 9);
        ctx.lineTo(x, y - 9 - size);
        ctx.lineTo(x + 6, y + 2);
        ctx.closePath();
        ctx.fill();
      }
      // Tail blade.
      ctx.fillStyle = '#d8cda9';
      ctx.beginPath();
      ctx.moveTo(-250, 13);
      ctx.lineTo(-284, 24);
      ctx.lineTo(-257, 31);
      ctx.lineTo(-245, 25);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(60, 51, 35, 0.7)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }

    drawWings(spread, bodyY) {
      const t = this.game.time;
      const flap = spread * (0.55 + Math.sin(t * 2.1) * 0.12);
      ctx.save();
      ctx.translate(-16, -140 + bodyY);
      // Far wing.
      ctx.save();
      ctx.translate(-18, -5);
      ctx.rotate(-0.06 - spread * 0.32);
      const farGrad = ctx.createLinearGradient(0, 0, -180, -130);
      farGrad.addColorStop(0, '#293b28');
      farGrad.addColorStop(0.6, '#1d2c1f');
      farGrad.addColorStop(1, '#18251b');
      ctx.fillStyle = farGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-54, -32 - spread * 34, -136, -66 - spread * 78, -188 - spread * 28, -101 - spread * 110);
      ctx.bezierCurveTo(-166 + spread * 8, -58 - spread * 61, -137, -25 - spread * 28, -93, 5 + spread * 15);
      ctx.bezierCurveTo(-64, 2, -31, 7, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 102, 58, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Wing bones.
      ctx.strokeStyle = 'rgba(142, 107, 58, 0.46)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.quadraticCurveTo(-74 - i * 14, -25 - i * 20 - spread * 30, -146 - i * 17 - spread * 19, -81 - i * 18 - spread * 37);
        ctx.stroke();
      }
      ctx.restore();

      // Near wing, folded along the body when calm.
      ctx.save();
      ctx.translate(-5, 0);
      ctx.rotate(-0.08 - spread * 0.42);
      const nearGrad = ctx.createLinearGradient(0, 0, -154, -160);
      nearGrad.addColorStop(0, '#31472f');
      nearGrad.addColorStop(0.55, '#263a29');
      nearGrad.addColorStop(1, '#1d2d20');
      ctx.fillStyle = nearGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-48, -28 - spread * 40, -126, -61 - spread * 93, -176 - spread * 38, -110 - spread * 132);
      ctx.bezierCurveTo(-151 + spread * 12, -55 - spread * 74, -115, -20 - spread * 34, -70, 5 + spread * 20);
      ctx.bezierCurveTo(-45, 3, -19, 7, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(194, 112, 61, 0.58)';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Ribs and ragged membrane.
      ctx.strokeStyle = 'rgba(161, 119, 63, 0.54)';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.quadraticCurveTo(-55, -20 - spread * 24, -114 - spread * 12, -66 - spread * 46);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.quadraticCurveTo(-78, -12 - spread * 30, -152 - spread * 26, -99 - spread * 58);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.quadraticCurveTo(-99, -7 - spread * 18, -170 - spread * 34, -76 - spread * 42);
      ctx.stroke();

      // Tattered edge cuts.
      ctx.strokeStyle = 'rgba(10, 20, 12, 0.65)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const x = -61 - i * 31 - spread * 10;
        const y = -18 - i * 26 - spread * 42;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12, y + 15);
        ctx.stroke();
      }

      // Membrane sheen and old tears.
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(142, 157, 95, 0.055)';
      ctx.beginPath();
      ctx.ellipse(-82 - spread * 22, -53 - spread * 50, 42, 19, -0.4, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(7, 14, 8, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-119 - spread * 18, -84 - spread * 62);
      ctx.lineTo(-107 - spread * 13, -74 - spread * 53);
      ctx.lineTo(-121 - spread * 20, -65 - spread * 44);
      ctx.stroke();

      // Wing claw.
      ctx.fillStyle = '#d1c29a';
      ctx.beginPath();
      ctx.moveTo(-108 - spread * 20, -63 - spread * 58);
      ctx.lineTo(-127 - spread * 28, -82 - spread * 78);
      ctx.lineTo(-112 - spread * 15, -74 - spread * 60);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    drawLeg(baseX, baseY, side, swing, bodyY, far) {
      ctx.save();
      ctx.translate(baseX, baseY + bodyY);
      ctx.rotate(side * swing * 0.003);
      const colorOuter = far ? '#152217' : '#1b2a1a';
      const colorInner = far ? '#2f4328' : '#3d5632';
      const footX = side * (14 + swing);
      // Thigh.
      ctx.strokeStyle = colorOuter;
      ctx.lineWidth = 33;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(side * 31, 28, footX * 0.7 + side * 10, 54);
      ctx.stroke();
      ctx.strokeStyle = colorInner;
      ctx.lineWidth = 23;
      ctx.stroke();
      // Shin.
      ctx.strokeStyle = colorOuter;
      ctx.lineWidth = 19;
      ctx.beginPath();
      ctx.moveTo(footX * 0.7 + side * 10, 50);
      ctx.quadraticCurveTo(footX + side * 5, 72, footX + side * 15, 92);
      ctx.stroke();
      ctx.strokeStyle = colorInner;
      ctx.lineWidth = 11;
      ctx.stroke();
      // Foot.
      ctx.fillStyle = far ? '#1b291b' : '#263721';
      ctx.beginPath();
      ctx.ellipse(footX + side * 22, 94, 30, 9, 0.04, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(145, 157, 92, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(footX + side * 18, 90, 15, 3.5, 0.04, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#d6c9a3';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(footX + side * (17 + i * 9), 90);
        ctx.lineTo(footX + side * (24 + i * 13), 99);
        ctx.lineTo(footX + side * (17 + i * 9), 102);
        ctx.closePath();
        ctx.fill();
      }
      // Dewclaw.
      ctx.beginPath();
      ctx.moveTo(footX - side * 7, 92);
      ctx.lineTo(footX - side * 18, 99);
      ctx.lineTo(footX - side * 5, 100);
      ctx.closePath();
      ctx.fill();
      // Thigh highlight.
      ctx.strokeStyle = 'rgba(132, 151, 83, 0.28)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(side * 4, 7);
      ctx.quadraticCurveTo(side * 27, 29, side * 13, 45);
      ctx.stroke();
      ctx.restore();
    }

    drawHead(forward, down, jaw, bodyY) {
      ctx.save();
      ctx.translate(70 + forward, -146 + down + bodyY);

      // Neck.
      ctx.strokeStyle = '#1a2919';
      ctx.lineWidth = 48;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-26, 12);
      ctx.quadraticCurveTo(-3, -15, 30, -24);
      ctx.stroke();
      ctx.strokeStyle = '#405b35';
      ctx.lineWidth = 35;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(137, 153, 88, 0.42)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-16, 20);
      ctx.quadraticCurveTo(2, -4, 26, -13);
      ctx.stroke();

      // Bone frill.
      ctx.fillStyle = '#bda878';
      ctx.beginPath();
      ctx.moveTo(6, -24);
      ctx.lineTo(-4, -59);
      ctx.lineTo(18, -48);
      ctx.lineTo(27, -74);
      ctx.lineTo(42, -50);
      ctx.lineTo(61, -62);
      ctx.lineTo(60, -36);
      ctx.lineTo(35, -24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#776747';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(91, 77, 50, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, -31);
      ctx.lineTo(23, -55);
      ctx.moveTo(34, -32);
      ctx.lineTo(37, -51);
      ctx.stroke();

      // Skull.
      const skullGrad = ctx.createLinearGradient(0, -52, 45, 19);
      skullGrad.addColorStop(0, '#4e6639');
      skullGrad.addColorStop(0.55, '#3c5330');
      skullGrad.addColorStop(1, '#293d25');
      ctx.fillStyle = skullGrad;
      ctx.beginPath();
      ctx.moveTo(12, -34);
      ctx.bezierCurveTo(25, -52, 66, -52, 89, -34);
      ctx.bezierCurveTo(105, -22, 99, -8, 79, -4);
      ctx.lineTo(29, -2);
      ctx.bezierCurveTo(10, -2, -2, -16, 12, -34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1b2b19';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Snout ridge and nose.
      ctx.fillStyle = '#607143';
      ctx.beginPath();
      ctx.moveTo(54, -34);
      ctx.bezierCurveTo(74, -40, 95, -31, 96, -19);
      ctx.bezierCurveTo(85, -14, 62, -16, 52, -23);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1c291b';
      ctx.beginPath();
      ctx.ellipse(92, -25, 5, 3, 0.2, 0, TAU);
      ctx.fill();

      // Mouth cavity, visible when the jaw drops.
      if (jaw > 0.08) {
        ctx.save();
        ctx.fillStyle = '#3b1716';
        ctx.beginPath();
        ctx.moveTo(38, -8);
        ctx.bezierCurveTo(66, -9, 88, -5, 92, 1);
        ctx.lineTo(72, 11);
        ctx.bezierCurveTo(55, 14, 40, 9, 38, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a64e3d';
        ctx.beginPath();
        ctx.ellipse(66, 4, 17, 4.5, 0.1, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // Jaw.
      ctx.save();
      ctx.translate(18, -5);
      ctx.rotate(jaw * 0.62);
      ctx.fillStyle = '#647245';
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.bezierCurveTo(25, 9, 60, 6, 79, -1);
      ctx.lineTo(68, 13);
      ctx.bezierCurveTo(39, 21, 12, 15, 1, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#23301e';
      ctx.lineWidth = 2.3;
      ctx.stroke();

      // Teeth.
      ctx.fillStyle = '#e8dfc3';
      for (let i = 0; i < 5; i++) {
        const x = 16 + i * 12;
        ctx.beginPath();
        ctx.moveTo(x, 1);
        ctx.lineTo(x + 4, -7);
        ctx.lineTo(x + 8, 1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Upper teeth.
      ctx.fillStyle = '#e8dfc3';
      for (let i = 0; i < 4; i++) {
        const x = 60 + i * 9;
        ctx.beginPath();
        ctx.moveTo(x, -6);
        ctx.lineTo(x + 3, 5 + jaw * 2);
        ctx.lineTo(x + 6, -5);
        ctx.closePath();
        ctx.fill();
      }

      // Eye.
      ctx.save();
      ctx.shadowColor = this.enraged ? '#ff4f2b' : '#ffd274';
      ctx.shadowBlur = 13;
      ctx.fillStyle = this.enraged ? '#ff5b35' : '#f3ce72';
      ctx.beginPath();
      ctx.ellipse(52, -32, 4.3, 2.2, 0.16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1b0e06';
      ctx.beginPath();
      ctx.ellipse(53, -32, 1.1, 2.1, 0.16, 0, TAU);
      ctx.fill();
      ctx.restore();
      // Heavy brow ridge.
      ctx.fillStyle = '#2b3e24';
      ctx.beginPath();
      ctx.moveTo(38, -40);
      ctx.lineTo(63, -42);
      ctx.lineTo(57, -34);
      ctx.lineTo(43, -33);
      ctx.closePath();
      ctx.fill();

      // Head scars and cheek spike.
      ctx.strokeStyle = 'rgba(42, 28, 21, 0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(37, -43);
      ctx.quadraticCurveTo(41, -31, 37, -22);
      ctx.stroke();
      ctx.fillStyle = '#c6b083';
      ctx.beginPath();
      ctx.moveTo(22, -8);
      ctx.lineTo(-9, 2);
      ctx.lineTo(18, 5);
      ctx.closePath();
      ctx.fill();

      // Horns.
      ctx.fillStyle = '#d4c49b';
      ctx.beginPath();
      ctx.moveTo(30, -46);
      ctx.quadraticCurveTo(32, -81, 8, -95);
      ctx.quadraticCurveTo(19, -70, 20, -46);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8d7e5b';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#bba679';
      ctx.beginPath();
      ctx.moveTo(50, -47);
      ctx.quadraticCurveTo(57, -73, 43, -84);
      ctx.quadraticCurveTo(48, -63, 41, -47);
      ctx.closePath();
      ctx.fill();

      // Thorn mane and cheek quills.
      for (let i = 0; i < 7; i++) {
        const a = -2.45 + i * 0.16;
        const length = 22 + (i % 3) * 8;
        const bx = 4 + Math.cos(a) * 14;
        const by = -10 + Math.sin(a) * 14;
        ctx.fillStyle = i % 2 ? 'rgba(108, 58, 37, 0.92)' : 'rgba(78, 43, 31, 0.92)';
        ctx.beginPath();
        ctx.moveTo(bx - 2, by + 3);
        ctx.lineTo(bx + Math.cos(a) * length, by + Math.sin(a) * length);
        ctx.lineTo(bx + 3, by - 2);
        ctx.closePath();
        ctx.fill();
      }

      // Saliva threads when the mouth is open.
      if (jaw > 0.25) {
        ctx.strokeStyle = 'rgba(232, 224, 190, 0.35)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(72, 1);
        ctx.quadraticCurveTo(73, 8 + jaw * 7, 69, 12 + jaw * 9);
        ctx.stroke();
      }

      // Throat glow.
      ctx.globalCompositeOperation = 'lighter';
      const throatGlow = ctx.createRadialGradient(60, 0, 0, 60, 0, 22);
      throatGlow.addColorStop(0, this.enraged ? 'rgba(238, 94, 52, 0.4)' : 'rgba(221, 164, 78, 0.22)');
      throatGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = throatGlow;
      ctx.beginPath();
      ctx.arc(60, 0, 22, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      ctx.restore();
    }

    drawTelegraph() {
      const time = this.game.time;
      const pulse = 0.55 + Math.sin(time * (this.enraged ? 16 : 11)) * 0.25;
      const color = this.enraged ? `rgba(232, 74, 43, ${0.16 + pulse * 0.1})` : `rgba(222, 91, 54, ${0.14 + pulse * 0.09})`;
      const edge = this.enraged ? 'rgba(242, 101, 60, 0.7)' : 'rgba(235, 129, 83, 0.6)';
      const sx = worldX(this.x);
      const sy = worldY(this.z);
      if (this.dead) return;

      if (this.state === 'chargeWind') {
        const len = 660;
        const width = 112;
        const aim = this.attackAim;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(Math.sin(aim) * Y_SCALE, Math.cos(aim)));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(48, -width * 0.36);
        ctx.lineTo(len, -width * 0.62);
        ctx.lineTo(len, width * 0.62);
        ctx.lineTo(48, width * 0.36);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([10, 18]);
        ctx.lineDashOffset = -time * 85;
        ctx.beginPath();
        ctx.moveTo(46, -width * 0.36);
        ctx.lineTo(len, -width * 0.62);
        ctx.moveTo(46, width * 0.36);
        ctx.lineTo(len, width * 0.62);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (this.state === 'tailWind' || this.state === 'tail') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(1, Y_SCALE);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 14]);
        ctx.lineDashOffset = time * 72;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 252 * cam.zoom, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(241, 173, 109, 0.34)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 120 * cam.zoom, 0, TAU);
        ctx.stroke();
        ctx.restore();
      } else if (this.state === 'biteWind' || this.state === 'bite') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(Math.sin(this.attackAim) * Y_SCALE, Math.cos(this.attackAim)));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.arc(0, 0, 220 * cam.zoom, -0.55, 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 220 * cam.zoom, -0.55, 0.55);
        ctx.stroke();
        ctx.restore();
      } else if (this.state === 'spitWind') {
        const tx = this.game.player.x;
        const tz = this.game.player.z;
        const px = worldX(tx);
        const py = worldY(tz);
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1, Y_SCALE);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 72 * cam.zoom, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = time * 40;
        ctx.beginPath();
        ctx.arc(0, 0, 72 * cam.zoom, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(0, 0, 32 * cam.zoom, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game
  // ---------------------------------------------------------------------------

  class Game {
    constructor() {
      this.player = new Player(this);
      this.monster = new Monster(this);
      this.time = 0;
      this.phase = 'hunt';
      this.paused = false;
      this.timer = 12 * 60;
      this.hitstop = 0;
      this.shake = 0;
      this.damageDealt = 0;
      this.comboBest = 0;
      this.projectiles = projectiles;
      this.endTimer = 0;
      this.pendingResult = null;
      this.endReason = '';
      this.minimapTimer = 0;
      this.hintTimeout = null;
      this.introHintTimer = null;
      this.flashTimeout = null;
      this.playerMovedRecently = false;
      this.controlFade = 0;
      this.cameraInit = false;
      this.firstFrame = true;
      this.bindEvents();
      this.reset();
    }

    bindEvents() {
      bindAction((name) => this.handleAction(name));
      dom.retryButton.addEventListener('click', () => this.reset());
      dom.resumeButton.addEventListener('click', () => this.resume());
      dom.guideButton.addEventListener('click', () => this.openGuide());
      dom.closeGuide.addEventListener('click', () => this.closeGuide());
      dom.resumeHunt.addEventListener('click', () => this.closeGuide());
      dom.pauseButton.addEventListener('click', () => this.togglePause());
    }

    handleAction(name) {
      if (name === 'retry') {
        if (this.phase === 'victory' || this.phase === 'defeat' || this.phase === 'ending') this.reset();
        return;
      }
      if (name === 'guide') {
        if (this.paused) {
          if (!dom.fieldGuide.hidden) this.closeGuide();
          else if (!dom.pauseScreen.hidden) this.openGuide();
        } else if (this.phase === 'hunt' || this.phase === 'ending') {
          this.openGuide();
        }
        return;
      }
      if (name === 'pause') {
        if (!dom.fieldGuide.hidden) this.closeGuide();
        else if (this.phase === 'victory' || this.phase === 'defeat') return;
        else this.togglePause();
        return;
      }
      if (this.paused) return;
      if (this.phase !== 'hunt') return;
      if (name === 'move') {
        if (this.time < 12) this.controlFade = Math.max(this.controlFade, this.time);
        return;
      }
      if (name === 'attack') this.player.startAttack();
      else if (name === 'dance') this.player.startDance();
      else if (name === 'dash') this.player.startDash();
      else if (name === 'demon') this.player.toggleDemon();
      else if (name === 'potion') this.player.startPotion();
      else if (name === 'sharpen') this.player.startSharpen();
    }

    reset() {
      this.player.reset();
      this.monster.reset();
      this.projectiles.length = 0;
      particles.length = 0;
      damageNumbers.length = 0;
      this.time = 0;
      this.phase = 'hunt';
      this.paused = false;
      this.timer = 12 * 60;
      this.hitstop = 0;
      this.shake = 0;
      this.damageDealt = 0;
      this.comboBest = 0;
      this.endTimer = 0;
      this.pendingResult = null;
      this.endReason = '';
      this.minimapTimer = 0;
      this.controlFade = 0;
      cam.x = -76;
      cam.z = 58;
      cam.zoom = baseZoom;
      cam.targetZoom = baseZoom;
      cam.shake = 0;
      cam.shakeX = 0;
      cam.shakeY = 0;
      dom.fieldGuide.hidden = true;
      dom.pauseScreen.hidden = true;
      dom.endScreen.hidden = true;
      dom.endScreen.classList.remove('defeat');
      dom.damageFlash.classList.remove('on');
      dom.lowHealth.classList.remove('on');
      dom.comboDisplay.classList.remove('visible');
      dom.toasts.innerHTML = '';
      dom.controlRibbon.classList.remove('faded', 'hidden');
      dom.monsterBar.classList.remove('rage');
      dom.rageTag.classList.remove('visible');
      dom.woundTag.classList.remove('visible');
      dom.questBanner.classList.remove('hide');
      dom.questBanner.style.animation = 'none';
      void dom.questBanner.offsetWidth;
      dom.questBanner.style.animation = '';
      if (this.hintTimeout) clearTimeout(this.hintTimeout);
      if (this.introHintTimer) clearTimeout(this.introHintTimer);
      dom.hintChip.classList.remove('visible');
      this.introHintTimer = setTimeout(() => {
        if (this.phase === 'hunt' && !this.paused) this.showHint('The Thornscale Tyrant is watching', 2600);
      }, 5600);
    }

    togglePause() {
      if (this.phase === 'victory' || this.phase === 'defeat') return;
      if (this.paused) {
        this.resume();
      } else {
        this.paused = true;
        dom.pauseScreen.hidden = false;
        dom.fieldGuide.hidden = true;
      }
    }

    resume() {
      this.paused = false;
      dom.pauseScreen.hidden = true;
      dom.fieldGuide.hidden = true;
    }

    openGuide() {
      this.paused = true;
      dom.pauseScreen.hidden = true;
      dom.fieldGuide.hidden = false;
    }

    closeGuide() {
      dom.fieldGuide.hidden = true;
      this.paused = false;
    }

    showHint(text, duration = 2400) {
      dom.hintChip.textContent = text;
      dom.hintChip.classList.add('visible');
      if (this.hintTimeout) clearTimeout(this.hintTimeout);
      this.hintTimeout = setTimeout(() => {
        dom.hintChip.classList.remove('visible');
      }, duration);
    }

    pulseSlot(el) {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 470);
    }

    flashDamage() {
      dom.damageFlash.classList.add('on');
      if (this.flashTimeout) clearTimeout(this.flashTimeout);
      this.flashTimeout = setTimeout(() => dom.damageFlash.classList.remove('on'), 150);
    }

    onMonsterSlain() {
      if (this.phase !== 'hunt') return;
      this.phase = 'ending';
      this.pendingResult = 'victory';
      this.endTimer = 2.7;
      this.timerAtEnd = this.timer;
      this.controlFade = 99;
      dom.controlRibbon.classList.add('hidden');
      this.showHint('The forest falls silent', 2800);
    }

    lose(reason) {
      if (this.phase !== 'hunt') return;
      this.phase = 'ending';
      this.pendingResult = 'defeat';
      this.endReason = reason || 'The hunt has failed';
      this.endTimer = 1.75;
      this.controlFade = 99;
      dom.controlRibbon.classList.add('hidden');
      audio.defeat();
    }

    finishHunt() {
      if (this.pendingResult === 'victory') {
        this.phase = 'victory';
        this.showEnd(true);
        audio.victory();
      } else {
        this.phase = 'defeat';
        this.showEnd(false);
      }
      this.paused = false;
    }

    showEnd(victory) {
      dom.endScreen.hidden = false;
      dom.endScreen.classList.toggle('defeat', !victory);
      if (victory) {
        dom.endEyebrow.textContent = 'Quest Complete';
        dom.endTitle.textContent = 'The Tyrant Falls';
        dom.endLine.textContent = 'The Ironwood is quiet again. For now.';
      } else {
        dom.endEyebrow.textContent = 'Quest Failed';
        dom.endTitle.textContent = 'The Hunt Ends';
        dom.endLine.textContent = this.endReason || 'The Ironwood claims another hunter.';
      }
      const elapsed = victory ? (12 * 60 - this.timerAtEnd) : (12 * 60 - this.timer);
      dom.resultTime.textContent = formatTime(Math.max(0, elapsed));
      dom.resultDamage.textContent = Math.round(this.damageDealt).toLocaleString('en-US');
      dom.resultCombo.textContent = String(this.player.comboBest);
      dom.resultPotions.textContent = String(this.player.potionsUsed);
      dom.comboDisplay.classList.remove('visible');
    }

    update(dt) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      const step = this.hitstop > 0 ? dt * 0.12 : dt;
      const previousTime = this.time;
      if (this.phase === 'hunt' || this.phase === 'ending') this.time += dt;

      if (this.phase === 'hunt') {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0;
          this.lose('Time expired');
        }
        this.player.update(step);
        this.monster.update(step);
        this.updateProjectiles(step);
        updateParticles(step);
        if (this.phase === 'hunt' && this.monster.dead && this.endTimer <= 0) {
          // Safety net if death callback ever arrives late.
          this.onMonsterSlain();
        }
      } else if (this.phase === 'ending') {
        this.endTimer -= dt;
        this.monster.update(step);
        updateParticles(step);
        this.updateProjectiles(step);
        if (this.endTimer <= 0) this.finishHunt();
      } else {
        updateParticles(dt * 0.45);
      }

      this.comboBest = Math.max(this.comboBest, this.player.comboBest);
      this.shake = damp(this.shake, 0, 7.5, dt);
      cam.shake = this.shake;
      cam.shakeX = this.shake > 0.1 ? rand(-1, 1) * this.shake : 0;
      cam.shakeY = this.shake > 0.1 ? rand(-1, 1) * this.shake * 0.7 : 0;

      if (this.phase === 'hunt' || this.phase === 'ending') {
        const p = this.player;
        const m = this.monster;
        const focusX = m.dead ? p.x : p.x * 0.72 + m.x * 0.28;
        const focusZ = m.dead ? p.z : p.z * 0.74 + m.z * 0.26;
        cam.x = damp(cam.x, focusX, 2.35, dt);
        cam.z = damp(cam.z, focusZ, 2.35, dt);
        const separation = dist(p.x, p.z, m.x, m.z);
        const targetZoom = baseZoom * clamp(1.06 - separation / 6000, 0.92, 1.035);
        cam.zoom = damp(cam.zoom, targetZoom, 1.6, dt);
        const halfX = (W / 2) / cam.zoom;
        const halfZ = (H / 2) / (cam.zoom * Y_SCALE);
        const maxX = Math.max(0, WORLD.rx - halfX + 215);
        const maxZ = Math.max(0, WORLD.rz - halfZ + 160);
        cam.x = clamp(cam.x, -maxX, maxX);
        cam.z = clamp(cam.z, -maxZ, maxZ);
      }

      this.minimapTimer -= dt;
      if (this.minimapTimer <= 0) {
        this.minimapTimer = 0.09;
        this.drawMinimap();
      }

      if (this.phase === 'hunt') {
        if (this.time > 9 && this.time < 22) dom.controlRibbon.classList.add('faded');
        if (this.time > 22) dom.controlRibbon.classList.add('hidden');
        if (this.time > 6 && !this.player.hintShown) {
          this.player.hintShown = true;
        }
      }

      // Global danger indicators.
      dom.lowHealth.classList.toggle('on', this.player.hp > 0 && this.player.hp < 38 && this.phase === 'hunt');
      this.updateHUD();
    }

    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.t += dt;
        if (p.t < 0) continue;
        if (p.t >= p.duration && !p.exploded) {
          p.exploded = true;
          const px = worldX(p.tx);
          const py = worldY(p.tz);
          const distToPlayer = dist(p.tx, p.tz, this.player.x, this.player.z);
          if (distToPlayer < p.radius && this.player.iframes <= 0) {
            this.player.hurt(p.damage, p.tx, p.tz);
          }
          shockRing(p.tx, p.tz, p.radius * 1.7, 'rgba(169, 216, 72, 0.5)', 0.45);
          burst(p.tx, p.tz, 8, 28, {
            minSpeed: 30, maxSpeed: 190, minUp: 40, maxUp: 210,
            colors: ['#b8da60', '#6f9b3e', '#d9e887', '#4f6d2a'],
            minSize: 1, maxSize: 4.5, life: 0.75, gravity: 360, glow: true, type: 'dot'
          });
          this.shake = Math.max(this.shake, 6);
          audio.noiseBurst(0.24, 480, 0.12, 'lowpass', 0.7);
        }
        if (p.t >= p.duration + 0.12) this.projectiles.splice(i, 1);
      }
    }

    updateHUD() {
      const p = this.player;
      const m = this.monster;
      const healthPct = clamp(p.hp / p.maxHp, 0, 1);
      const staminaPct = clamp(p.stamina / p.maxStamina, 0, 1);
      dom.healthFill.style.width = `${healthPct * 100}%`;
      dom.healthLag.style.width = `${healthPct * 100}%`;
      dom.healthValue.textContent = String(Math.ceil(p.hp));
      dom.healthTrack.classList.toggle('low', healthPct < 0.26);
      dom.staminaFill.style.width = `${staminaPct * 100}%`;
      const sharpCount = Math.ceil(clamp(p.sharpness / 10, 0, 10));
      const segments = dom.sharpness.children;
      for (let i = 0; i < segments.length; i++) segments[i].classList.toggle('lit', i < sharpCount);
      dom.sharpnessLabel.textContent = p.sharpnessName;
      dom.demonValue.textContent = String(Math.round(p.demonCharge));
      dom.demonGauge.classList.toggle('active', p.demon);
      dom.demonState.textContent = p.demon ? 'Active' : (p.stamina < 12 ? 'Low stamina' : 'Ready');
      dom.demonSlot.classList.toggle('active', p.demon);
      dom.potionCount.textContent = `×${p.potions}`;
      dom.potionSlot.classList.toggle('empty', p.potions <= 0);
      dom.potionSlot.classList.toggle('on-cooldown', p.action === 'heal');
      dom.whetstoneSlot.classList.toggle('on-cooldown', p.action === 'sharpen');

      const hpPct = clamp(m.hp / m.maxHp, 0, 1);
      dom.monsterBarFill.style.width = `${hpPct * 100}%`;
      dom.monsterBarLag.style.width = `${hpPct * 100}%`;
      dom.monsterBar.classList.toggle('rage', m.enraged && !m.dead);
      dom.rageTag.classList.toggle('visible', m.enraged && !m.dead);
      dom.woundTag.classList.toggle('visible', m.wounded && !m.dead);
      dom.monsterState.textContent = m.dead ? 'Slain' : this.monsterStateLabel(m);
      dom.timer.textContent = formatTime(Math.max(0, this.timer));
      dom.timer.classList.toggle('urgent', this.timer < 60 && this.phase === 'hunt');

      const showCombo = p.comboTimerShow > 0 && p.comboCount >= 2;
      dom.comboDisplay.classList.toggle('visible', showCombo);
      if (showCombo) {
        dom.comboCount.textContent = String(p.comboCount);
        let rank = 'Fine';
        if (p.comboCount >= 20) rank = 'Heavenly';
        else if (p.comboCount >= 14) rank = 'Savage';
        else if (p.comboCount >= 8) rank = 'Brutal';
        else if (p.comboCount >= 4) rank = 'Sharp';
        dom.comboRank.textContent = rank;
      }
    }

    monsterStateLabel(m) {
      const labels = {
        stalk: 'Prowling',
        roar: 'Roaring',
        enrage: 'Enraged',
        chargeWind: 'Winding up',
        charge: 'Charging',
        tailWind: 'Tail wind-up',
        tail: 'Tail sweep',
        biteWind: 'Baring fangs',
        bite: 'Bite',
        spitWind: 'Acid spit',
        spit: 'Acid spit',
        stagger: 'Staggered',
        recover: 'Recovering',
        dead: 'Slain'
      };
      return labels[m.state] || 'Prowling';
    }

    drawMinimap() {
      const c = minimapCtx;
      const size = 320;
      c.clearRect(0, 0, size, size);
      c.save();
      c.beginPath();
      c.arc(size / 2, size / 2, 154, 0, TAU);
      c.clip();
      const bg = c.createRadialGradient(160, 160, 20, 160, 160, 166);
      bg.addColorStop(0, '#173222');
      bg.addColorStop(0.7, '#0b1c12');
      bg.addColorStop(1, '#06110b');
      c.fillStyle = bg;
      c.fillRect(0, 0, size, size);

      // Faint grid rings.
      c.strokeStyle = 'rgba(177, 154, 99, 0.08)';
      c.lineWidth = 1;
      for (let r = 42; r < 170; r += 36) {
        c.beginPath();
        c.arc(160, 160, r, 0, TAU);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(160, 0);
      c.lineTo(160, 320);
      c.moveTo(0, 160);
      c.lineTo(320, 160);
      c.stroke();

      const scaleX = 126 / WORLD.rx;
      const scaleZ = 126 / WORLD.rz;
      const mapX = (x) => 160 + x * scaleX;
      const mapY = (z) => 160 + z * scaleZ;

      // Water.
      c.strokeStyle = 'rgba(75, 144, 127, 0.38)';
      c.lineWidth = 10;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(mapX(-1700), mapY(-270));
      c.bezierCurveTo(mapX(-1330), mapY(-260), mapX(-1190), mapY(-30), mapX(-940), mapY(18));
      c.bezierCurveTo(mapX(-680), mapY(74), mapX(-540), mapY(330), mapX(-650), mapY(540));
      c.stroke();

      // Tree line.
      for (let i = 0; i < 54; i++) {
        const a = (i / 54) * TAU;
        c.fillStyle = 'rgba(49, 82, 47, 0.6)';
        c.beginPath();
        c.arc(mapX(Math.cos(a) * WORLD.rx * 1.04), mapY(Math.sin(a) * WORLD.rz * 1.04), 2.4 + (i % 3), 0, TAU);
        c.fill();
      }

      // Quest marker.
      const pulse = 0.65 + Math.sin(performance.now() / 310) * 0.25;
      const mx = mapX(this.monster.x);
      const my = mapY(this.monster.z);
      c.strokeStyle = `rgba(219, 90, 63, ${0.24 * pulse})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(mx, my, 13 + pulse * 8, 0, TAU);
      c.stroke();
      c.fillStyle = `rgba(223, 82, 58, ${0.5 + pulse * 0.35})`;
      c.save();
      c.translate(mx, my);
      c.rotate(Math.PI / 4);
      c.fillRect(-5, -5, 10, 10);
      c.restore();

      // Hunter arrow.
      const px = mapX(this.player.x);
      const py = mapY(this.player.z);
      c.save();
      c.translate(px, py);
      c.rotate(this.player.face);
      c.fillStyle = '#f0d793';
      c.shadowColor = 'rgba(240, 215, 147, 0.8)';
      c.shadowBlur = 7;
      c.beginPath();
      c.moveTo(12, 0);
      c.lineTo(-7, -6);
      c.lineTo(-3, 0);
      c.lineTo(-7, 6);
      c.closePath();
      c.fill();
      c.restore();
      c.restore();

      // Rim.
      c.strokeStyle = 'rgba(198, 169, 106, 0.42)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(160, 160, 153, 0, TAU);
      c.stroke();
    }

    drawScene(t) {
      const now = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;

      // Deep forest backdrop.
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b1b12');
      sky.addColorStop(0.55, '#0a1710');
      sky.addColorStop(1, '#050b08');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Painted ground.
      const gx = worldX(WORLD.minX);
      const gy = worldY(WORLD.minZ);
      const gw = (WORLD.maxX - WORLD.minX) * cam.zoom;
      const gh = (WORLD.maxZ - WORLD.minZ) * cam.zoom * Y_SCALE;
      ctx.drawImage(groundCanvas, gx, gy, gw, gh);

      // Water glints.
      this.drawWaterGlints(t);

      // Ambient light.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const x = -W * 0.08 + i * W * 0.22 + Math.sin(t * 0.09 + i) * 32;
        const grad = ctx.createLinearGradient(x, -100, x + W * 0.28, H);
        grad.addColorStop(0, 'rgba(234, 212, 144, 0.035)');
        grad.addColorStop(0.6, 'rgba(207, 219, 150, 0.013)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 40, -20);
        ctx.lineTo(x + 150, -20);
        ctx.lineTo(x + W * 0.38 + 160, H + 20);
        ctx.lineTo(x + W * 0.38 - 40, H + 20);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      drawAmbience(t, false);

      // Telegraphed attacks live on the ground beneath everyone.
      this.monster.drawTelegraph();

      // Depth-sorted world.
      const drawables = [];
      for (const prop of props) {
        drawables.push({ z: prop.z, kind: 'prop', prop });
      }
      drawables.push({ z: this.player.z, kind: 'player' });
      drawables.push({ z: this.monster.z, kind: 'monster' });
      for (const p of this.projectiles) {
        if (p.t >= 0 && !p.exploded) drawables.push({ z: p.z + 5, kind: 'projectile', projectile: p });
      }
      drawables.sort((a, b) => a.z - b.z);

      for (const item of drawables) {
        if (item.kind === 'prop') item.prop.draw(item.prop, t);
        else if (item.kind === 'player') this.player.draw();
        else if (item.kind === 'monster') this.monster.draw();
        else this.drawProjectile(item.projectile);
      }

      // Foreground effects.
      drawParticles(false);
      drawRings();
      drawDamageNumbers();
      this.drawProjectileTargets();
      drawAmbience(t, true);
      this.drawAtmosphere(t);
      this.drawReticle();

      // Low-health edge pulse is CSS, but a subtle vignette at critical hp helps.
      if (this.player.hp < 38 && !this.player.dead) {
        ctx.save();
        const pulse = 0.06 + Math.sin(now / 220) * 0.03;
        const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.23, W / 2, H / 2, Math.max(W, H) * 0.7);
        grad.addColorStop(0, 'rgba(150, 25, 14, 0)');
        grad.addColorStop(1, `rgba(150, 25, 14, ${pulse})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    drawWaterGlints(t) {
      const points = [
        [-1460, -262], [-1320, -245], [-1200, -175], [-1110, -80],
        [-1010, 5], [-920, 48], [-820, 115], [-735, 205],
        [-680, 310], [-665, 420], [-700, 520], [-760, 615],
        [-660, 690], [-540, 760], [-430, 855], [-380, 975]
      ];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < points.length; i++) {
        const [x, z] = points[i];
        const sx = worldX(x);
        const sy = worldY(z);
        if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
        const shimmer = 0.5 + Math.sin(t * 0.7 + i * 1.8) * 0.5;
        ctx.strokeStyle = `rgba(149, 220, 198, ${0.08 + shimmer * 0.13})`;
        ctx.lineWidth = 1.2 + shimmer * 1.4;
        ctx.beginPath();
        ctx.moveTo(sx - 12, sy);
        ctx.quadraticCurveTo(sx, sy - 2, sx + 13 + shimmer * 9, sy + 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawProjectile(p) {
      if (p.t < 0) return;
      const progress = clamp(p.t / p.duration, 0, 1);
      const x = lerp(p.startX, p.tx, progress);
      const z = lerp(p.startZ, p.tz, progress);
      const elev = Math.sin(progress * Math.PI) * 175 + 25;
      const sx = worldX(x);
      const sy = worldY(z) - elev * cam.zoom;
      const s = cam.zoom;

      // Ground shadow.
      const shadowX = worldX(p.tx);
      const shadowY = worldY(p.tz);
      ctx.fillStyle = 'rgba(20, 48, 18, 0.2)';
      ctx.beginPath();
      ctx.ellipse(shadowX, shadowY, (26 + progress * 22) * s, (8 + progress * 6) * s, 0, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28 * s);
      glow.addColorStop(0, 'rgba(222, 245, 132, 0.9)');
      glow.addColorStop(0.25, 'rgba(165, 214, 80, 0.58)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, 28 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e9f4a5';
      ctx.beginPath();
      ctx.arc(sx, sy, 6.5 * s, 0, TAU);
      ctx.fill();
      // Drip trail.
      ctx.strokeStyle = 'rgba(187, 223, 104, 0.4)';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(p.face) * 14 * s, sy - 8 * s);
      ctx.lineTo(sx - Math.cos(p.face) * 45 * s, sy - 26 * s);
      ctx.stroke();
      ctx.restore();
    }

    drawProjectileTargets() {
      for (const p of this.projectiles) {
        if (p.t < 0 || p.exploded) continue;
        const tx = worldX(p.tx);
        const ty = worldY(p.tz);
        const pulse = 0.5 + Math.sin(performance.now() / 150) * 0.25;
        ctx.save();
        ctx.strokeStyle = `rgba(197, 227, 112, ${0.28 + pulse * 0.25})`;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 8]);
        ctx.lineDashOffset = -performance.now() / 80;
        ctx.beginPath();
        ctx.ellipse(tx, ty, p.radius * cam.zoom, p.radius * cam.zoom * Y_SCALE, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    drawAtmosphere(t) {
      // Low drifting mist.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 3; i++) {
        const x = ((t * 8 + i * 510) % (W + 600)) - 300;
        const y = H * 0.74 + i * 38;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 300);
        grad.addColorStop(0, 'rgba(117, 146, 111, 0.022)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 300, y - 200, 600, 400);
      }
      ctx.restore();
    }

    drawReticle() {
      if (isTouch || !input.mouse.active) return;
      const x = input.mouse.x;
      const y = input.mouse.y;
      const msx = worldX(this.monster.x);
      const msy = worldY(this.monster.z) - 86 * cam.zoom;
      const near = Math.hypot(x - msx, y - msy) < 155;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = near ? 'rgba(227, 107, 77, 0.92)' : 'rgba(232, 210, 162, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.fillStyle = near ? '#f08a65' : '#f0d999';
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    render(t) {
      this.drawScene(t);
    }
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function toast(text, type = '') {
    if (!dom.toasts) return;
    const element = document.createElement('div');
    element.className = `toast ${type}`.trim();
    element.textContent = text;
    dom.toasts.appendChild(element);
    while (dom.toasts.children.length > 4) dom.toasts.firstElementChild.remove();
    setTimeout(() => {
      if (element.parentNode) element.remove();
    }, 2800);
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  const game = new Game();

  let lastFrame = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!game.paused) game.update(dt);
    game.render(now / 1000);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Keep the minimap crisp on high-density screens.
  function sizeMinimap() {
    dom.minimap.width = 320;
    dom.minimap.height = 320;
  }
  sizeMinimap();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.phase === 'hunt' && !game.paused) game.togglePause();
  });
})();
