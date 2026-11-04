(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const canvas = $('#game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const els = {
    score: $('#score'),
    best: $('#best'),
    wave: $('#wave'),
    combo: $('#combo'),
    hpFill: $('#hpFill'),
    hpText: $('#hpText'),
    dashFill: $('#dashFill'),
    healthMeter: $('.meter.health'),
    banner: $('#banner'),
    bannerMain: $('#banner .banner-main'),
    bannerSub: $('#banner .banner-sub'),
    overlay: $('#overlay'),
    screens: [...document.querySelectorAll('.screen')],
    stick: $('#stick'),
    knob: $('#knob'),
    dashBtn: $('#dashBtn'),
  };

  const COLORS = {
    cyan: '#4df3ff',
    pink: '#ff2fb0',
    purple: '#a06bff',
    amber: '#ffb347',
    green: '#3dffb0',
  };

  const TYPES = {
    drifter: { hp: 22, r: 12, speed: 92, dmg: 9, score: 10, color: COLORS.cyan },
    darter: { hp: 14, r: 9, speed: 185, dmg: 8, score: 15, color: COLORS.purple },
    spitter: { hp: 34, r: 15, speed: 78, dmg: 10, score: 25, color: COLORS.pink },
    brute: { hp: 108, r: 27, speed: 56, dmg: 24, score: 40, color: COLORS.amber },
  };

  const SPEED = 315;
  const DASH_CD = 1.15;
  const BEST_KEY = 'neonSurgeBest';

  let W = 1, H = 1, DPR = 1;
  let bgCanvas = null, bgCtx = null;
  let ambient = 0;
  let last = performance.now();
  let muted = false;
  let audio = null;
  let lastSfx = 0;

  const keys = new Set();
  const touch = { x: 0, y: 0 };

  const G = {
    state: 'menu',
    time: 0,
    score: 0,
    kills: 0,
    reboots: 0,
    wave: 1,
    combo: 1,
    comboT: 0,
    overdrive: 0,
    shake: 0,
    flash: 0,
    clearT: 0,
    spawnT: 0,
    spawnQueue: [],
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    particles: [],
    pickups: [],
    floats: [],
    best: 0,
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, String(G.best)); } catch { /* ignore */ }
  }
  G.best = loadBest();

  /* ---------------- Audio ---------------- */
  function ensureAudio() {
    if (!audio) {
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
      } catch { audio = null; }
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tone(f, f2, dur, type, vol) {
    if (!audio || muted) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, f), now);
    if (f2 && f2 !== f) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol || 0.04, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  const sfx = {
    shoot() {
      const t = performance.now();
      if (t - lastSfx < 34) return;
      lastSfx = t;
      tone(760, 520, 0.06, 'triangle', 0.022);
    },
    hit() { tone(210, 120, 0.05, 'square', 0.018); },
    kill() { tone(340, 70, 0.18, 'sawtooth', 0.035); },
    hurt() { tone(150, 48, 0.28, 'sawtooth', 0.05); },
    dash() { tone(240, 880, 0.16, 'sine', 0.04); },
    pickup() { tone(660, 1320, 0.16, 'sine', 0.04); },
    wave() { tone(330, 660, 0.14, 'triangle', 0.035); tone(495, 990, 0.22, 'triangle', 0.03); },
    reboot() { tone(90, 300, 0.3, 'sawtooth', 0.045); tone(420, 980, 0.35, 'sine', 0.035); },
  };

  /* ---------------- Sizing ---------------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const touchMode = coarse || navigator.maxTouchPoints > 0 || W <= 700;
    document.body.classList.toggle('touch', touchMode);

    buildBackground();

    if (G.player) {
      G.player.x = clamp(G.player.x, 24, W - 24);
      G.player.y = clamp(G.player.y, 24, H - 24);
    }
  }

  // The starfield, grid and vignette never change, so bake them into an
  // offscreen canvas and blit it once per frame. This keeps the render loop
  // cheap even on software renderers.
  function buildBackground() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    bgCtx = bgCanvas.getContext('2d');
    bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const base = bgCtx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#05060f');
    base.addColorStop(0.55, '#080a18');
    base.addColorStop(1, '#0d0918');
    bgCtx.fillStyle = base;
    bgCtx.fillRect(0, 0, W, H);

    const glowA = bgCtx.createRadialGradient(W * 0.18, H * 0.18, 0, W * 0.18, H * 0.18, Math.max(W, H) * 0.55);
    glowA.addColorStop(0, 'rgba(56, 92, 255, 0.14)');
    glowA.addColorStop(1, 'rgba(56, 92, 255, 0)');
    bgCtx.fillStyle = glowA;
    bgCtx.fillRect(0, 0, W, H);

    const glowB = bgCtx.createRadialGradient(W * 0.85, H * 0.82, 0, W * 0.85, H * 0.82, Math.max(W, H) * 0.5);
    glowB.addColorStop(0, 'rgba(200, 40, 170, 0.11)');
    glowB.addColorStop(1, 'rgba(200, 40, 170, 0)');
    bgCtx.fillStyle = glowB;
    bgCtx.fillRect(0, 0, W, H);

    const count = Math.round((W * H) / 15000);
    for (let i = 0; i < count; i++) {
      bgCtx.globalAlpha = rand(0.1, 0.55);
      bgCtx.fillStyle = i % 7 === 0 ? '#9fdcff' : '#bfe9ff';
      const r = rand(0.5, 1.7);
      bgCtx.fillRect(Math.random() * W, Math.random() * H, r, r);
    }
    bgCtx.globalAlpha = 1;

    const gs = 64;
    bgCtx.lineWidth = 1;
    for (let i = 0; i <= W / gs + 1; i++) {
      const x = i * gs;
      bgCtx.strokeStyle = i % 4 === 0 ? 'rgba(96, 136, 255, 0.12)' : 'rgba(96, 136, 255, 0.05)';
      bgCtx.beginPath();
      bgCtx.moveTo(x, 0);
      bgCtx.lineTo(x, H);
      bgCtx.stroke();
    }
    for (let j = 0; j <= H / gs + 1; j++) {
      const y = j * gs;
      bgCtx.strokeStyle = j % 4 === 0 ? 'rgba(96, 136, 255, 0.12)' : 'rgba(96, 136, 255, 0.05)';
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(W, y);
      bgCtx.stroke();
    }

    const vignette = bgCtx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.58)');
    bgCtx.fillStyle = vignette;
    bgCtx.fillRect(0, 0, W, H);
  }

  /* ---------------- Game setup ---------------- */
  function reset() {
    G.time = 0;
    G.score = 0;
    G.kills = 0;
    G.reboots = 0;
    G.wave = 1;
    G.combo = 1;
    G.comboT = 0;
    G.overdrive = 0;
    G.shake = 0;
    G.flash = 0;
    G.clearT = 0;
    G.spawnT = 0.35;
    G.spawnQueue = [];
    G.enemies = [];
    G.bullets = [];
    G.ebullets = [];
    G.particles = [];
    G.pickups = [];
    G.floats = [];
    G.player = {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      r: 13,
      hp: 100,
      maxHp: 100,
      angle: -Math.PI / 2,
      fireT: 0,
      dashT: 0,
      dashCd: 0,
      dashDir: { x: 0, y: -1 },
      invuln: 0,
      trail: [],
      speed: SPEED,
    };
    updateHud(true);
  }

  function startGame() {
    ensureAudio();
    reset();
    G.state = 'playing';
    hideOverlay();
    buildWave(1);
    // Open with a visible ring of drifters so the action reads instantly.
    const p = G.player;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + rand(-0.35, 0.35);
      const dist = Math.min(330, Math.max(170, Math.min(W, H) * 0.42));
      const x = clamp(p.x + Math.cos(a) * dist, 54, W - 54);
      const y = clamp(p.y + Math.sin(a) * dist, 84, H - 54);
      spawnEnemy('drifter', x, y);
    }
    showBanner('WAVE 1', 'SURVIVE');
    syncBest();
  }

  function buildWave(wave) {
    G.wave = wave;
    els.wave.textContent = String(wave);
    G.spawnT = 0.35;
    G.clearT = 0;
    const queue = [];
    let budget = Math.min(80, Math.round(4 + wave * 2.6));
    const eligible = [
      { type: 'drifter', cost: 1, min: 1, weight: 1.0 },
      { type: 'darter', cost: 1, min: 2, weight: wave >= 4 ? 1.5 : 0.9 },
      { type: 'spitter', cost: 2, min: 3, weight: 0.8 },
      { type: 'brute', cost: 3, min: 4, weight: 0.7 },
    ].filter((d) => wave >= d.min);

    if (wave === 4) {
      queue.push('brute');
      budget -= 3;
    }

    while (budget > 0) {
      const options = eligible.filter((d) => d.cost <= budget);
      if (!options.length) break;
      const bag = [];
      for (const opt of options) {
        const n = Math.max(1, Math.round(opt.weight * 10));
        for (let i = 0; i < n; i++) bag.push(opt);
      }
      const pick = bag[(Math.random() * bag.length) | 0];
      queue.push(pick.type);
      budget -= pick.cost;
    }

    for (let i = queue.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    G.spawnQueue = queue;
    G.spawnT = 0.7;
    if (wave > 1) showBanner('WAVE ' + wave, wave % 3 === 0 ? 'REPAIR BONUS' : 'INCOMING');
    sfx.wave();
  }

  function spawnEnemy(type, atX, atY) {
    const base = TYPES[type];
    const p = G.player;
    let x = W / 2, y = H / 2;
    if (typeof atX === 'number' && typeof atY === 'number') {
      x = atX;
      y = atY;
    } else {
      for (let attempt = 0; attempt < 20; attempt++) {
        const edge = (Math.random() * 4) | 0;
        const pad = 48;
        if (edge === 0) { x = rand(pad, W - pad); y = pad; }
        else if (edge === 1) { x = W - pad; y = rand(pad, H - pad); }
        else if (edge === 2) { x = rand(pad, W - pad); y = H - pad; }
        else { x = pad; y = rand(pad, H - pad); }
        if (Math.hypot(x - p.x, y - p.y) > 240) break;
      }
    }

    // Enemy strength keeps growing, but is softly capped so an endless run
    // always stays winnable with enough skill.
    const hpMul = 1 + Math.min(12, (G.wave - 1) * 0.14);
    const spMul = Math.min(1.65, 1 + (G.wave - 1) * 0.028);
    G.enemies.push({
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      r: base.r,
      hp: base.hp * hpMul,
      maxHp: base.hp * hpMul,
      speed: base.speed * spMul,
      dmg: base.dmg,
      score: base.score,
      color: base.color,
      t: 0,
      hitT: 0,
      shootT: rand(0.8, 1.6),
      phase: Math.random() * Math.PI * 2,
      face: 0,
    });

    burst(x, y, base.color, 10, 150);
    G.particles.push({ x, y, vx: 0, vy: 0, r: 26, life: 0.4, maxLife: 0.4, color: base.color, ring: true });
    if (G.enemies.length > 60) G.enemies.shift();
  }

  /* ---------------- Input ---------------- */
  function moveVector() {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    x += touch.x;
    y += touch.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, len: Math.min(1, len) };
  }

  function tryDash() {
    if (G.state !== 'playing') return;
    const p = G.player;
    if (!p || p.dashCd > 0) return;
    const mv = moveVector();
    const dir = mv.len > 0.15 ? { x: mv.x / (mv.len || 1), y: mv.y / (mv.len || 1) }
      : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
    p.dashDir = dir;
    p.dashT = 0.16;
    p.dashCd = DASH_CD;
    p.invuln = Math.max(p.invuln, 0.34);
    burst(p.x, p.y, COLORS.cyan, 12, 220);
    sfx.dash();
  }

  function togglePause() {
    if (G.state === 'playing') {
      G.state = 'paused';
      showScreen('pauseScreen');
    } else if (G.state === 'paused') {
      resumeGame();
    }
  }

  function resumeGame() {
    if (G.state !== 'paused') return;
    G.state = 'playing';
    hideOverlay();
    last = performance.now();
  }

  function toggleMute() {
    muted = !muted;
    if (!muted && audio) tone(660, 990, 0.1, 'sine', 0.03);
    showBanner(muted ? 'MUTED' : 'SOUND ON', muted ? 'PRESS M' : '');
  }

  keysHandler();
  function keysHandler() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      ensureAudio();
      keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'Space') tryDash();
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
      if (e.code === 'KeyM') toggleMute();
      if (e.code === 'Enter') {
        if (G.state === 'menu') startGame();
        else if (G.state === 'paused') resumeGame();
      }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => {
      keys.clear();
      if (G.state === 'playing') togglePause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.state === 'playing') togglePause();
    });
  }

  /* ---------------- Touch ---------------- */
  let stickPointer = null;

  function stickVec(e) {
    const r = els.stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = r.width * 0.32;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    els.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.x = dx / max;
    touch.y = dy / max;
  }

  els.stick.addEventListener('pointerdown', (e) => {
    if (stickPointer !== null) return;
    stickPointer = e.pointerId;
    els.stick.setPointerCapture(e.pointerId);
    ensureAudio();
    stickVec(e);
    e.preventDefault();
  });
  els.stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickPointer) return;
    stickVec(e);
    e.preventDefault();
  });
  const endStick = (e) => {
    if (e.pointerId !== stickPointer) return;
    stickPointer = null;
    touch.x = 0;
    touch.y = 0;
    els.knob.style.transform = '';
  };
  els.stick.addEventListener('pointerup', endStick);
  els.stick.addEventListener('pointercancel', endStick);
  els.stick.addEventListener('lostpointercapture', endStick);

  els.dashBtn.addEventListener('pointerdown', (e) => {
    ensureAudio();
    tryDash();
    e.preventDefault();
  });

  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
  window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') document.body.classList.add('touch');
  }, { passive: true });

  /* ---------------- HUD ---------------- */
  function syncBest() {
    els.best.textContent = 'BEST ' + G.best;
  }

  function bumpBest() {
    if (G.score <= G.best) return;
    G.best = G.score;
    saveBest();
    syncBest();
  }

  function updateHud(force) {
    const p = G.player;
    if (!p) return;
    const hpPct = clamp(p.hp / p.maxHp, 0, 1) * 100;
    els.hpFill.style.width = hpPct + '%';
    els.hpText.textContent = String(Math.ceil(p.hp));
    els.healthMeter.classList.toggle('low', hpPct < 30);
    const dashPct = clamp(1 - p.dashCd / DASH_CD, 0, 1) * 100;
    els.dashFill.style.width = dashPct + '%';

    const scoreText = String(G.score);
    if (force || els.score.textContent !== scoreText) els.score.textContent = scoreText;
    if (force || els.wave.textContent !== String(G.wave)) els.wave.textContent = String(G.wave);

    const showCombo = G.combo > 1.01 && G.comboT > 0;
    els.combo.classList.toggle('on', showCombo);
    if (showCombo) els.combo.textContent = 'x' + G.combo.toFixed(1) + ' COMBO';
  }

  function showBanner(main, sub) {
    els.bannerMain.textContent = main;
    els.bannerSub.textContent = sub || '';
    els.banner.classList.remove('show');
    void els.banner.offsetWidth;
    els.banner.classList.add('show');
  }

  function showScreen(id) {
    els.overlay.classList.remove('hidden');
    for (const s of els.screens) s.classList.toggle('active', s.id === id);
  }

  function hideOverlay() {
    els.overlay.classList.add('hidden');
  }

  // The run never ends: losing all hull HP triggers an in-place reboot.
  // Nearby threats are cleared, the ship returns at center with full HP and
  // a short invulnerability window, and the score takes a 20% hit.
  function reboot() {
    if (G.state !== 'playing') return;
    const p = G.player;
    G.reboots++;
    const penalty = Math.round(G.score * 0.2);
    G.score = Math.max(0, G.score - penalty);
    G.combo = 1;
    G.comboT = 0;

    // Clear the immediate area and all incoming fire so the respawn is fair.
    for (let i = G.enemies.length - 1; i >= 0; i--) {
      const e = G.enemies[i];
      if (Math.hypot(e.x - (W / 2), e.y - (H / 2)) < 320) {
        burst(e.x, e.y, e.color, 10, 220);
        G.enemies.splice(i, 1);
      }
    }
    G.ebullets.length = 0;

    burst(p.x, p.y, COLORS.cyan, 52, 380);
    burst(p.x, p.y, COLORS.pink, 26, 260);
    G.shake = 30;
    G.flash = 0.85;
    sfx.reboot();

    p.hp = p.maxHp;
    p.invuln = 3.2;
    p.x = W / 2;
    p.y = H / 2;
    p.vx = 0;
    p.vy = 0;
    p.dashT = 0;
    p.dashCd = 0;
    p.fireT = 0.25;
    p.trail.length = 0;

    floatText(p.x, p.y - 36, penalty > 0 ? '-' + penalty + ' SCORE' : 'SYSTEM RESTORED', COLORS.amber);
    showBanner('REBOOT', 'THE RUN CONTINUES');
    updateHud(true);
  }

  /* ---------------- Effects ---------------- */
  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.25, speed);
      const life = rand(0.25, 0.7);
      G.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: rand(1, 3.2),
        life,
        maxLife: life,
        color,
        ring: false,
      });
    }
    if (G.particles.length > 460) G.particles.splice(0, G.particles.length - 460);
  }

  function floatText(x, y, text, color) {
    G.floats.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function damagePlayer(amount) {
    const p = G.player;
    if (!p || G.state !== 'playing' || p.invuln > 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invuln = 0.95;
    G.combo = 1;
    G.comboT = 0;
    G.shake = Math.min(26, 10 + amount * 0.7);
    G.flash = 0.55;
    sfx.hurt();
    burst(p.x, p.y, COLORS.pink, 14, 180);
    updateHud(true);
    if (p.hp <= 0) reboot();
  }

  /* ---------------- Update ---------------- */
  function update(dt) {
    G.time += dt;
    const p = G.player;

    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.fireT -= dt;
    G.overdrive = Math.max(0, G.overdrive - dt);
    G.comboT = Math.max(0, G.comboT - dt);
    if (G.comboT <= 0) G.combo = 1;
    G.shake = Math.max(0, G.shake - 55 * dt);
    G.flash = Math.max(0, G.flash - dt * 2.2);

    const mv = moveVector();

    // Movement / dash
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += p.dashDir.x * 1500 * dt;
      p.y += p.dashDir.y * 1500 * dt;
      p.trail.push({ x: p.x, y: p.y, angle: p.angle, life: 0.3, maxLife: 0.3 });
      if (p.trail.length > 26) p.trail.shift();
    } else {
      const tx = mv.x * SPEED;
      const ty = mv.y * SPEED;
      p.vx += (tx - p.vx) * Math.min(1, dt * 14);
      p.vy += (ty - p.vy) * Math.min(1, dt * 14);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    p.x = clamp(p.x, 22, W - 22);
    p.y = clamp(p.y, 22, H - 22);

    for (let i = p.trail.length - 1; i >= 0; i--) {
      p.trail[i].life -= dt;
      if (p.trail[i].life <= 0) p.trail.splice(i, 1);
    }

    // Aim at nearest enemy
    const target = nearestEnemy(p.x, p.y, 1000);
    if (target) {
      const want = Math.atan2(target.y - p.y, target.x - p.x);
      p.angle += angDiff(want, p.angle) * Math.min(1, dt * 18);
    } else if (mv.len > 0.2) {
      const want = Math.atan2(mv.y, mv.x);
      p.angle += angDiff(want, p.angle) * Math.min(1, dt * 8);
    }

    // Auto fire
    if (target && p.fireT <= 0) {
      const spread = rand(-0.03, 0.03);
      const a = p.angle + spread;
      const spd = 1080;
      G.bullets.push({
        x: p.x + Math.cos(p.angle) * 20,
        y: p.y + Math.sin(p.angle) * 20,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 4,
        dmg: 12,
        life: 1.0,
        color: G.overdrive > 0 ? '#ff8ae0' : '#9dfbff',
      });
      burst(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, G.overdrive > 0 ? COLORS.pink : COLORS.cyan, 2, 90);
      p.fireT = G.overdrive > 0 ? 0.075 : 0.155;
      sfx.shoot();
    }

    // Spawn queue
    if (G.spawnQueue.length > 0) {
      G.spawnT -= dt;
      if (G.spawnT <= 0) {
        spawnEnemy(G.spawnQueue.shift());
        G.spawnT = Math.max(0.16, 0.5 - G.wave * 0.015);
      }
    }

    updateEnemies(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateFloats(dt);

    // Wave progression
    if (G.spawnQueue.length === 0 && G.enemies.length === 0) {
      G.clearT += dt;
      if (G.clearT > 1.6) {
        const next = G.wave + 1;
        if (next % 3 === 0) {
          p.hp = Math.min(p.maxHp, p.hp + 15);
          floatText(p.x, p.y - 30, '+15 HP', COLORS.green);
          burst(p.x, p.y, COLORS.green, 14, 160);
        }
        buildWave(next);
      }
    } else {
      G.clearT = 0;
    }

    updateHud(false);
  }

  function nearestEnemy(x, y, maxDist) {
    let best = null;
    let bd = maxDist * maxDist;
    for (const e of G.enemies) {
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function angDiff(a, b) {
    let d = (a - b + Math.PI) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    return d - Math.PI;
  }

  function updateEnemies(dt) {
    const p = G.player;
    for (const e of G.enemies) {
      e.t += dt;
      e.hitT = Math.max(0, e.hitT - dt);
      let dx = p.x - e.x;
      let dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      let ax = 0, ay = 0;

      if (e.type === 'spitter') {
        const radial = d > 300 ? 1 : (d < 235 ? -1 : 0);
        const strafe = Math.sin(e.t * 1.35 + e.phase) * 0.85;
        ax = nx * radial - ny * strafe;
        ay = ny * radial + nx * strafe;
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 660) {
          const a = Math.atan2(dy, dx) + rand(-0.05, 0.05);
          G.ebullets.push({
            x: e.x + Math.cos(a) * (e.r + 6),
            y: e.y + Math.sin(a) * (e.r + 6),
            vx: Math.cos(a) * 235,
            vy: Math.sin(a) * 235,
            r: 6,
            dmg: 9,
            life: 4.5,
            t: 0,
          });
          e.shootT = Math.max(0.95, 2.2 - G.wave * 0.04) * rand(0.85, 1.25);
        }
      } else {
        ax = nx;
        ay = ny;
        if (e.type === 'darter') {
          const wob = Math.sin(e.t * 7 + e.phase) * 0.55;
          ax += -ny * wob;
          ay += nx * wob;
        }
      }

      const alen = Math.hypot(ax, ay) || 1;
      ax /= alen;
      ay /= alen;
      e.vx += (ax * e.speed - e.vx) * Math.min(1, dt * 4);
      e.vy += (ay * e.speed - e.vy) * Math.min(1, dt * 4);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.face = Math.atan2(dy, dx);

      const pd = Math.hypot(p.x - e.x, p.y - e.y);
      if (pd < e.r + p.r) {
        if (p.invuln <= 0) {
          damagePlayer(e.dmg);
          const kx = (e.x - p.x) / (pd || 1);
          const ky = (e.y - p.y) / (pd || 1);
          p.vx += kx * 260;
          p.vy += ky * 260;
          e.vx -= kx * 160;
          e.vy -= ky * 160;
        }
        const overlap = e.r + p.r - pd;
        if (overlap > 0) {
          e.x -= nx * overlap * 0.5;
          e.y -= ny * overlap * 0.5;
        }
      }
    }

    // Gentle separation so the swarm does not stack perfectly
    for (let i = 0; i < G.enemies.length; i++) {
      const a = G.enemies[i];
      for (let j = i + 1; j < G.enemies.length; j++) {
        const b = G.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const min = (a.r + b.r) * 0.9;
        if (d < min) {
          const push = (min - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  function updateBullets(dt) {
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const b = G.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) {
        G.bullets.splice(i, 1);
        continue;
      }
      let hit = false;
      for (let j = G.enemies.length - 1; j >= 0; j--) {
        const e = G.enemies[j];
        const rr = e.r + b.r;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          e.hp -= b.dmg;
          e.hitT = 0.09;
          e.vx += b.vx * 0.014;
          e.vy += b.vy * 0.014;
          burst(b.x, b.y, e.color, 4, 150);
          sfx.hit();
          if (e.hp <= 0) killEnemy(j);
          hit = true;
          break;
        }
      }
      if (hit) G.bullets.splice(i, 1);
    }
  }

  function killEnemy(index) {
    const e = G.enemies[index];
    if (!e) return;
    G.enemies.splice(index, 1);
    G.kills++;
    G.combo = Math.min(8, G.combo + 0.2);
    G.comboT = 2.8;
    const points = Math.round(e.score * G.combo);
    G.score += points;
    bumpBest();
    G.shake = Math.max(G.shake, 4 + e.r * 0.16);
    burst(e.x, e.y, e.color, e.type === 'brute' ? 30 : 14, e.type === 'brute' ? 320 : 220);
    G.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, r: e.r * 1.6, life: 0.35, maxLife: 0.35, color: e.color, ring: true });
    floatText(e.x, e.y - e.r - 6, '+' + points, G.combo >= 2 ? COLORS.amber : '#dffcff');
    sfx.kill();

    const roll = Math.random();
    if (roll < 0.08) {
      G.pickups.push({ x: e.x, y: e.y, type: 'hp', t: 0, life: 14 });
    } else if (roll < 0.15) {
      G.pickups.push({ x: e.x, y: e.y, type: 'od', t: 0, life: 14 });
    }
  }

  function updateEnemyBullets(dt) {
    const p = G.player;
    for (let i = G.ebullets.length - 1; i >= 0; i--) {
      const b = G.ebullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.t += dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
        G.ebullets.splice(i, 1);
        continue;
      }
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (p.r + b.r) ** 2) {
        damagePlayer(b.dmg);
        burst(b.x, b.y, COLORS.pink, 8, 160);
        G.ebullets.splice(i, 1);
      }
    }
  }

  function updatePickups(dt) {
    const p = G.player;
    for (let i = G.pickups.length - 1; i >= 0; i--) {
      const q = G.pickups[i];
      q.t += dt;
      q.life -= dt;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 150) {
        q.x += (dx / d) * 150 * dt;
        q.y += (dy / d) * 150 * dt;
      }
      if (d < p.r + 18) {
        if (q.type === 'hp') {
          p.hp = Math.min(p.maxHp, p.hp + 25);
          floatText(q.x, q.y, '+25 HP', COLORS.green);
          burst(q.x, q.y, COLORS.green, 14, 180);
          sfx.pickup();
        } else {
          G.overdrive = 6;
          floatText(q.x, q.y, 'OVERDRIVE', COLORS.pink);
          burst(q.x, q.y, COLORS.pink, 18, 220);
          sfx.pickup();
          tone(520, 1560, 0.22, 'sine', 0.04);
        }
        G.pickups.splice(i, 1);
        updateHud(true);
        continue;
      }
      if (q.life <= 0) G.pickups.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) { G.particles.splice(i, 1); continue; }
      if (p.ring) {
        p.r += 90 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(0.03, dt);
        p.vy *= Math.pow(0.03, dt);
      }
    }
  }

  function updateFloats(dt) {
    for (let i = G.floats.length - 1; i >= 0; i--) {
      const f = G.floats[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) G.floats.splice(i, 1);
    }
  }

  /* ---------------- Render ---------------- */
  function drawBackground() {
    ctx.drawImage(bgCanvas, 0, 0, W, H);
  }

  function drawPickups(t) {
    for (const q of G.pickups) {
      const color = q.type === 'hp' ? COLORS.green : COLORS.pink;
      const pulse = 1 + Math.sin(q.t * 5) * 0.12;
      const alpha = q.life < 3 ? (Math.sin(q.t * 14) * 0.35 + 0.65) : 1;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.scale(pulse, pulse);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      if (q.type === 'hp') {
        ctx.fillRect(-5, -1.6, 10, 3.2);
        ctx.fillRect(-1.6, -5, 3.2, 10);
      } else {
        ctx.beginPath();
        ctx.moveTo(2, -8);
        ctx.lineTo(-5, 1);
        ctx.lineTo(0, 1);
        ctx.lineTo(-2, 8);
        ctx.lineTo(5, -1);
        ctx.lineTo(0, -1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawEnemyBullets(t) {
    for (const b of G.ebullets) {
      ctx.save();
      ctx.shadowColor = COLORS.pink;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffd9f3';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 47, 176, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 3 + Math.sin(t * 10 + b.t * 8) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemies(t) {
    for (const e of G.enemies) {
      const flash = e.hitT > 0;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowColor = e.color;
      ctx.shadowBlur = flash ? 26 : 14;
      ctx.lineWidth = 2;
      ctx.strokeStyle = flash ? '#ffffff' : e.color;
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.85)' : hexA(e.color, 0.14);

      if (e.type === 'drifter') {
        ctx.rotate(e.t * 1.2 + e.phase);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const r = i % 2 ? e.r * 0.72 : e.r;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
      } else if (e.type === 'darter') {
        ctx.rotate(e.face);
        ctx.beginPath();
        ctx.moveTo(e.r * 1.4, 0);
        ctx.lineTo(-e.r, e.r * 0.8);
        ctx.lineTo(-e.r * 0.45, 0);
        ctx.lineTo(-e.r, -e.r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (e.type === 'spitter') {
        ctx.rotate(e.t * 0.7);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = Math.cos(a) * e.r;
          const y = Math.sin(a) * e.r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.42, 0, Math.PI * 2);
        ctx.strokeStyle = e.color;
        ctx.stroke();
        ctx.fillStyle = hexA(e.color, 0.45);
        ctx.fill();
      } else {
        ctx.rotate(e.t * 0.35);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = i % 2 ? e.r * 0.82 : e.r;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.46, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(e.color, 0.6);
        ctx.stroke();
      }
      ctx.restore();

      if (e.hp < e.maxHp) {
        const w = e.r * 2;
        const x = e.x - e.r;
        const y = e.y - e.r - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, y, w, 3);
        ctx.fillStyle = e.color;
        ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 3);
      }
    }
    ctx.shadowBlur = 0;
  }

  function drawBullets() {
    for (const b of G.bullets) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer(t) {
    const p = G.player;
    if (!p) return;

    for (const tr of p.trail) {
      const a = tr.life / tr.maxLife;
      ctx.save();
      ctx.globalAlpha = a * 0.3;
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.angle);
      ctx.fillStyle = COLORS.cyan;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const blink = p.invuln > 0 && Math.floor(t * 22) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = blink ? 0.42 : 1;

    // Engine flame
    const speed = Math.hypot(p.vx, p.vy);
    const flame = 8 + Math.min(16, speed * 0.04) + Math.sin(t * 40) * 3;
    const flameGrad = ctx.createLinearGradient(-10, 0, -10 - flame, 0);
    flameGrad.addColorStop(0, 'rgba(180, 252, 255, 0.9)');
    flameGrad.addColorStop(1, 'rgba(77, 243, 255, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-10 - flame, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = G.overdrive > 0 ? COLORS.pink : COLORS.cyan;
    ctx.shadowBlur = 26;
    ctx.fillStyle = blink ? 'rgba(255,255,255,0.8)' : '#d8feff';
    ctx.strokeStyle = G.overdrive > 0 ? COLORS.pink : COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-11, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = G.overdrive > 0 ? COLORS.pink : COLORS.cyan;
    ctx.beginPath();
    ctx.arc(3, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (p.invuln > 0) {
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(t * 18) * 0.08;
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (G.overdrive > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(t * 10) * 0.05;
      ctx.fillStyle = COLORS.pink;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of G.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      if (p.ring) {
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats() {
    ctx.textAlign = 'center';
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    for (const f of G.floats) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  function render(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (G.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    }

    drawBackground();
    drawPickups(t);
    drawEnemyBullets(t);
    drawEnemies(t);
    drawBullets();
    drawPlayer(t);
    drawParticles();
    drawFloats();
    ctx.restore();

    if (G.flash > 0) {
      ctx.fillStyle = `rgba(255, 54, 94, ${G.flash * 0.24})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- Loop ---------------- */
  function loop(now) {
    const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
    last = now;
    ambient += dt;

    if (G.state === 'playing') {
      update(dt);
    } else if (G.state === 'menu') {
      // Keep ambient particles drifting on the title screen.
      updateParticles(dt * 0.8);
      G.shake = Math.max(0, G.shake - 55 * dt);
      G.flash = Math.max(0, G.flash - dt * 2.2);
    }

    render(ambient);
    requestAnimationFrame(loop);
  }

  /* ---------------- Wiring ---------------- */
  $('#playBtn').addEventListener('click', startGame);
  $('#resumeBtn').addEventListener('click', resumeGame);
  $('#pauseBtn').addEventListener('click', togglePause);

  window.addEventListener('resize', resize);
  window.addEventListener('pointerdown', ensureAudio, { once: true });

  resize();
  reset();
  syncBest();
  showScreen('startScreen');
  requestAnimationFrame((now) => {
    last = now;
    requestAnimationFrame(loop);
  });

  // Expose a tiny debug hook for automated smoke tests.
  window.__neonSurge = { G, startGame };
})();
