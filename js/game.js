import {
  WORLD_W as W, WORLD_H as H, WORM_R as R, GRAV, TURN_TIME, MOVE_BUDGET,
  BUILD_LIMIT, GRID, BUILDS, WEAPONS, TEAM_COLORS, NAMES,
} from './config.js';
import { Terrain } from './terrain.js';
import { Sound } from './audio.js';
import {
  clamp, lerp, rand, dist, damp, TAU, mulberry32,
} from './utils.js';
import {
  simulateTrajectory, computePlacement, walkWorm, updateWorm, supportAt,
} from './physics.js';
import {
  fire, updateProjectiles, damageWorm, killWorm, damageLlama,
} from './actions.js';
import { placeBuild } from './build.js';
import { planAI } from './ai.js';
import {
  addText, updateParticles, updateTexts, burstDust,
} from './effects.js';
import {
  drawScreenSky, drawWorldBackground, drawWindStreaks, drawBuilding, drawLlama,
  drawWorm, drawDeadWorm, drawProjectile, drawParticles, drawTexts,
  drawAimPreview, drawBuildGhost, drawRangeRing, drawScreenOverlay,
} from './visuals.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new Sound();
    this.weapons = WEAPONS;
    this.view = { cw: 1, ch: 1, dpr: 1, scale: 1 };
    this.camX = 0;
    this.camY = 0;
    this.state = 'menu';
    this.time = 0;
    this.keys = { left: false, right: false, up: false, down: false };
    this.clouds = [];
    this.streaks = [];
    this.dom = {
      hud: document.getElementById('hud'),
      startScreen: document.getElementById('startScreen'),
      playBtn: document.getElementById('playBtn'),
      againBtn: document.getElementById('againBtn'),
      gameOver: document.getElementById('gameOver'),
      soundBtn: document.getElementById('soundBtn'),
      youWorms: document.getElementById('youWorms'),
      enemyWorms: document.getElementById('enemyWorms'),
      youMats: document.getElementById('youMats'),
      enemyMats: document.getElementById('enemyMats'),
      turnLabel: document.getElementById('turnLabel'),
      turnPanel: document.querySelector('.turn-panel'),
      windPill: document.getElementById('windPill'),
      windArrow: document.getElementById('windArrow'),
      windText: document.getElementById('windText'),
      timerPill: document.getElementById('timerPill'),
      timerText: document.getElementById('timerText'),
      weaponBar: document.getElementById('weaponBar'),
      buildToggle: document.getElementById('buildToggle'),
      buildPalette: document.getElementById('buildPalette'),
      buildChips: [...document.querySelectorAll('.build-chip')],
      fireBtn: document.getElementById('fireBtn'),
      powerSlider: document.getElementById('powerSlider'),
      powerValue: document.getElementById('powerValue'),
      banner: document.getElementById('banner'),
      targetChip: document.getElementById('targetChip'),
      targetArrow: document.getElementById('targetArrow'),
      targetText: document.getElementById('targetText'),
      resultKicker: document.getElementById('resultKicker'),
      resultTitle: document.getElementById('resultTitle'),
      resultCopy: document.getElementById('resultCopy'),
      resultStats: document.getElementById('resultStats'),
      rotateHint: document.getElementById('rotateHint'),
      dismissRotate: document.getElementById('dismissRotate'),
    };
    this.weaponButtons = [];
    this.pipSig = '';
    this.sliderActive = false;
    this.resultTimer = null;
    this.worldBg = null;
    this.skyCache = null;
    this.vignetteCache = null;
    this.cacheKey = '';
    this.running = false;
    this.lastTime = 0;
    this.setupWorld();
    this.bindUI();
    this.buildWeaponBar();
    this.computeView();
    this.updateCamera(0, true);
    this.updateHud(true);
    this.loop = this.loop.bind(this);
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  setupWorld() {
    this.terrain = new Terrain(W, H, Math.floor(rand(1, 999999)));
    this.teams = TEAM_COLORS.map((t, i) => ({ ...t, id: i, mats: 100 }));
    this.teamCursor = [0, 0];
    this.worms = [
      this.makeWorm(0, 0, 128),
      this.makeWorm(0, 1, 218),
      this.makeWorm(1, 0, W - 128),
      this.makeWorm(1, 1, W - 218),
    ];
    this.llamas = [];
    const llamaXs = [W * 0.4, W * 0.545, W * 0.7];
    llamaXs.forEach((x, i) => {
      const top = this.terrain.topAt(x);
      if (top < H - 10) {
        this.llamas.push({ x, y: top - 24, hp: 40, maxHp: 40, alive: true, phase: i * 2.4 });
      }
    });
    this.buildings = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.deadWorms = [];
    this.wind = 0;
    this.timer = TURN_TIME;
    this.moveLeft = MOVE_BUDGET;
    this.buildsUsed = 0;
    this.turnTeam = 0;
    this.active = null;
    this.selectedWeapon = 0;
    this.aim = { angle: 45, power: 60 };
    this.lastAim = [{ angle: 45, power: 60 }, { angle: 135, power: 60 }];
    this.buildMode = false;
    this.buildType = 'wall';
    this.rampDir = 1;
    this.pointer = null;
    this.drag = null;
    this.shake = 0;
    this.flash = 0;
    this.settleTimer = 0;
    this.settleFocus = null;
    this.lastExplosion = null;
    this.bannerUntil = 0;
    this.deadWorms = [];
    this.aiStage = 0;
    this.aiTimer = 0;
    this.aiPlan = null;
    this.aiSkill = 1;
    this.stats = { shots: 0, hits: 0, damage: 0, taken: 0, builds: 0, llamas: 0 };
    this.lastTimerSec = 99;
    this.moveDust = 0;
    this.rotateDismissed = false;
    const rng = mulberry32(1337);
    this.clouds = Array.from({ length: 9 }, () => ({
      x: rng() * (W + 200) - 100,
      y: 90 + rng() * 250,
      s: 0.55 + rng() * 0.95,
      o: 0.1 + rng() * 0.16,
    }));
    this.streaks = Array.from({ length: 11 }, () => ({
      x: rng() * W,
      y: 90 + rng() * (H * 0.55),
      s: 0.4 + rng() * 0.9,
    }));
    this.pipSig = '';
    this.state = 'menu';
    this.settleFocus = null;
    this.worldBg = null;
  }

  makeWorm(team, slot, x) {
    // Spawn on the main battlefield, not on a decorative floating island
    // that happens to hover above the drop zone.
    const top = this.terrain.surfaceBelow(x, H * 0.35, H);
    const y = (top ?? H * 0.62) - R - 1;
    return {
      team, slot, name: NAMES[team][slot], x, y,
      health: 100, maxHealth: 100, alive: true, grounded: true,
      vx: 0, vy: 0, flash: 0, recoil: 0, phase: rand(0, TAU),
      ammo: { rocket: Infinity, grenade: 3, cluster: 2 },
    };
  }

  bindUI() {
    this.dom.playBtn.addEventListener('click', () => this.startMatch());
    this.dom.againBtn.addEventListener('click', () => this.startMatch());
    this.dom.soundBtn.addEventListener('click', () => {
      const muted = !this.sound.muted;
      this.sound.setMuted(muted);
      this.dom.soundBtn.classList.toggle('muted', muted);
      if (!muted) this.sound.ui();
    });
    this.dom.fireBtn.addEventListener('click', () => {
      this.sound.unlock();
      fire(this);
    });
    this.dom.buildToggle.addEventListener('click', () => this.toggleBuild());
    const hold = (el, down, up) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.sound.unlock();
        el.classList.add('pressed');
        try { el.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
        down();
      });
      const release = () => {
        el.classList.remove('pressed');
        up?.();
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
    };
    hold(document.getElementById('moveLeft'), () => { this.keys.left = true; }, () => { this.keys.left = false; });
    hold(document.getElementById('moveRight'), () => { this.keys.right = true; }, () => { this.keys.right = false; });
    hold(document.getElementById('aimUp'), () => { this.keys.up = true; }, () => { this.keys.up = false; });
    hold(document.getElementById('aimDown'), () => { this.keys.down = true; }, () => { this.keys.down = false; });
    document.getElementById('jumpBtn').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.sound.unlock();
      this.jump();
    });
    this.dom.powerSlider.addEventListener('input', () => {
      this.aim.power = Number(this.dom.powerSlider.value);
    });
    this.dom.powerSlider.addEventListener('pointerdown', () => { this.sliderActive = true; });
    this.dom.powerSlider.addEventListener('pointerup', () => { this.sliderActive = false; });
    this.dom.powerSlider.addEventListener('change', () => { this.sliderActive = false; });
    for (const chip of this.dom.buildChips) {
      chip.addEventListener('click', () => {
        this.setBuildType(chip.dataset.build);
      });
    }
    this.dom.dismissRotate.addEventListener('click', () => {
      this.rotateDismissed = true;
      this.dom.rotateHint.classList.add('is-hidden');
    });
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => {
      this.keys.left = this.keys.right = this.keys.up = this.keys.down = false;
    });
    window.addEventListener('resize', () => {
      this.computeView();
      this.updateCamera(0, false);
    });
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    c.addEventListener('pointermove', (e) => this.onPointerMove(e));
    c.addEventListener('pointerup', (e) => this.onPointerUp(e));
    c.addEventListener('pointercancel', () => { this.drag = null; });
    c.addEventListener('pointerleave', () => {
      if (!this.drag) this.pointer = null;
    });
  }

  buildWeaponBar() {
    this.dom.weaponBar.innerHTML = WEAPONS.map((wp, i) => `
      <button class="weapon-btn" data-index="${i}" aria-label="${wp.name}">
        <span class="weapon-icon">${wp.icon}</span>
        <span class="weapon-info">
          <span class="weapon-name">${wp.name}</span>
          <span class="weapon-ammo">${Number.isFinite(wp.ammo) ? wp.ammo : '∞'}</span>
        </span>
        <span class="weapon-key">${i + 1}</span>
      </button>`).join('');
    this.weaponButtons = [...this.dom.weaponBar.querySelectorAll('.weapon-btn')];
    this.weaponButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sound.unlock();
        this.selectWeapon(Number(btn.dataset.index));
      });
    });
  }

  startMatch() {
    clearTimeout(this.resultTimer);
    this.sound.unlock();
    this.setupWorld();
    this.dom.startScreen.classList.add('is-hidden');
    this.dom.gameOver.classList.add('is-hidden');
    this.dom.hud.classList.remove('is-hidden');
    this.dom.soundBtn.classList.remove('is-hidden');
    this.computeView();
    this.updateCamera(0, true);
    this.startTurn(0, true);
    this.maybeShowRotateHint();
    this.startLoop();
  }

  pickWorm(team) {
    const roster = this.worms.filter((w) => w.team === team);
    for (let i = 0; i < roster.length; i++) {
      const idx = (this.teamCursor[team] + i) % roster.length;
      if (roster[idx].alive) {
        this.teamCursor[team] = (idx + 1) % roster.length;
        return roster[idx];
      }
    }
    return null;
  }

  startTurn(team, first = false) {
    if (this.state === 'over') return;
    const worm = this.pickWorm(team);
    if (!worm) { this.endMatch(1 - team); return; }
    this.turnTeam = team;
    this.active = worm;
    this.state = team === 0 ? 'aim' : 'enemy';
    this.timer = TURN_TIME;
    this.lastTimerSec = 99;
    this.moveLeft = MOVE_BUDGET;
    this.buildsUsed = 0;
    this.buildMode = false;
    this.buildPreview = null;
    this.rampDir = team === 0 ? 1 : -1;
    this.wind = first ? 26 : rand(-155, 155);
    this.teams[team].mats = Math.min(180, this.teams[team].mats + 28);
    this.aim = { ...(this.lastAim[team] || { angle: team === 0 ? 45 : 135, power: 60 }) };
    this.aim.angle = clamp(this.aim.angle, 5, 175);
    this.aiStage = 0;
    this.aiTimer = 1.05;
    this.aiPlan = null;
    this.pointer = null;
    this.drag = null;
    this.showBanner(team === 0 ? 'YOUR TURN' : 'RIVAL TURN', team === 0 ? '' : 'coral', 1250);
    this.sound.turn(team === 0);
    this.updateCamera(0, first);
    this.updateHud(true);
  }

  finishTurn() {
    if (this.state === 'over') return;
    if (this.checkGameOver()) return;
    this.startTurn(1 - this.turnTeam);
  }

  checkGameOver() {
    const alive0 = this.worms.filter((w) => w.team === 0 && w.alive).length;
    const alive1 = this.worms.filter((w) => w.team === 1 && w.alive).length;
    if (alive0 === 0 && alive1 === 0) { this.endMatch(null); return true; }
    if (alive0 === 0) { this.endMatch(1); return true; }
    if (alive1 === 0) { this.endMatch(0); return true; }
    return false;
  }

  endMatch(winner) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.buildMode = false;
    this.drag = null;
    this.pointer = null;
    this.dom.targetChip.classList.add('is-hidden');
    const won = winner === 0;
    this.dom.resultKicker.textContent = won ? 'VICTORY ROYALE' : winner === 1 ? 'MATCH COMPLETE' : 'DOUBLE KNOCKOUT';
    this.dom.resultTitle.textContent = won ? 'YOU WIN!' : winner === 1 ? 'KNOCKED OUT' : 'DRAW';
    this.dom.resultCopy.textContent = won
      ? 'Your squad out-built and out-blasted the rivals. The battlefield is yours.'
      : winner === 1
        ? 'The rivals broke through your fort. Rebuild, reload, and drop in again.'
        : 'Both squads went down swinging. What a mess.';
    this.dom.resultStats.innerHTML = `
      <div><b>${this.stats.shots}</b><span>SHOTS FIRED</span></div>
      <div><b>${Math.round(this.stats.damage)}</b><span>DAMAGE DEALT</span></div>
      <div><b>${this.stats.llamas}</b><span>LLAMAS LOOTED</span></div>`;
    if (won) this.sound.win(); else this.sound.lose();
    this.showBanner(won ? 'VICTORY!' : 'DEFEAT', won ? 'gold' : 'coral', 2000);
    this.updateHud(true);
    this.resultTimer = setTimeout(() => {
      if (this.state === 'over') this.dom.gameOver.classList.remove('is-hidden');
    }, 1100);
  }

  maybeShowRotateHint() {
    if (this.rotateDismissed) return;
    if (window.innerHeight > window.innerWidth * 1.15 && window.innerWidth < 700) {
      this.dom.rotateHint.classList.remove('is-hidden');
      setTimeout(() => this.dom.rotateHint.classList.add('is-hidden'), 9000);
    }
  }

  loop(now) {
    if (!this.running) return;
    if (!this.lastTime) this.lastTime = now;
    const dt = clamp((now - this.lastTime) / 1000, 0, 0.05);
    this.lastTime = now;
    if (this.state === 'menu') {
      // Keep a cheap animation frame alive while the start screen is up so
      // input stays responsive and headless capture tools can measure a
      // stable control. The battlefield itself is not drawn until the match
      // starts; that first full-canvas paint is expensive on software GPUs.
      this.time += dt;
      this.updateAmbient(dt);
      requestAnimationFrame(this.loop);
      return;
    }
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    this.lastTime = 0;
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.time += dt;
    this.computeView();
    this.updateAmbient(dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.9);
    this.shake *= Math.exp(-5.5 * dt);
    if (this.shake < 0.2) this.shake = 0;

    updateParticles(this, dt);
    updateTexts(this, dt);
    for (const d of this.deadWorms) d.t += dt;
    this.deadWorms = this.deadWorms.filter((d) => d.t < 3.5);

    for (const w of this.worms) updateWorm(this, w, dt);

    if (this.state === 'aim') {
      this.updateTimer(dt);
      this.updatePlayer(dt);
    } else if (this.state === 'enemy') {
      this.updateTimer(dt);
      this.updateAI(dt);
    } else if (this.state === 'flying') {
      updateProjectiles(this, dt);
    } else if (this.state === 'settle') {
      this.settleTimer -= dt;
      if (this.settleTimer <= 0) this.finishTurn();
    }

    this.updateCamera(dt, false);
    this.updateBanner();
    this.updateHud();
    this.updateTargetChip();
  }

  computeView() {
    const cw = this.canvas.clientWidth || window.innerWidth || 960;
    const ch = this.canvas.clientHeight || window.innerHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(cw * dpr);
    const bh = Math.round(ch * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    const fit = Math.min(cw / W, ch / H);
    let scale = fit;
    if (cw / ch < 0.85 && cw < 820) scale = Math.max(fit, Math.min(0.85, cw / 640));
    this.view = { cw, ch, dpr, scale, fit };
  }

  updateAmbient(dt) {
    for (const c of this.clouds) {
      c.x += dt * (5 + c.s * 4) * (this.wind >= 0 ? 1 : -1);
      if (c.x > W + 180) c.x = -180;
      if (c.x < -180) c.x = W + 180;
    }
  }

  updateCamera(dt, instant) {
    const { cw, ch, scale } = this.view;
    const vw = cw / scale;
    const vh = ch / scale;
    let fx = W / 2;
    let fy = H * 0.54;
    if (this.state === 'flying' && this.projectiles.length) {
      const p = this.projectiles[0];
      fx = p.x;
      fy = p.y - 30;
    } else if (this.state === 'settle' && this.settleFocus) {
      fx = this.settleFocus.x;
      fy = this.settleFocus.y - 20;
    } else if (this.active) {
      fx = this.active.x;
      fy = this.active.y - 20;
    }
    const tx = vw >= W ? (W - vw) / 2 : clamp(fx - vw / 2, 0, W - vw);
    const ty = vh >= H ? (H - vh) / 2 : clamp(fy - vh / 2, 0, H - vh);
    if (instant || !this.lastTime) {
      this.camX = tx;
      this.camY = ty;
    } else {
      this.camX = damp(this.camX, tx, 5.5, dt);
      this.camY = damp(this.camY, ty, 5.5, dt);
    }
  }

  updateTimer(dt) {
    this.timer -= dt;
    if (this.state === 'aim' && this.timer <= 10 && this.timer > 0) {
      const sec = Math.ceil(this.timer);
      if (sec !== this.lastTimerSec) {
        this.lastTimerSec = sec;
        this.sound.tick();
      }
    }
    if (this.timer <= 0) {
      this.timer = 0;
      if (this.state === 'enemy' && this.aiStage < 2 && this.aiPlan) {
        this.aiStage = 2;
        fire(this);
        return;
      }
      if (this.state === 'aim' || this.state === 'enemy') {
        this.showBanner("TIME'S UP", 'coral', 950);
        this.state = 'settle';
        this.settleTimer = 0.9;
        this.settleFocus = this.active ? { x: this.active.x, y: this.active.y } : null;
        this.drag = null;
        this.updateHud(true);
      }
    }
  }

  updatePlayer(dt) {
    const w = this.active;
    if (!w || !w.alive) return;
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir !== 0 && this.moveLeft > 0) {
      const step = Math.min(112 * dt, this.moveLeft);
      const moved = walkWorm(this, w, dir * step);
      this.moveLeft = Math.max(0, this.moveLeft - Math.abs(moved));
      if (Math.abs(moved) > 0.1) {
        this.moveDust -= dt;
        if (this.moveDust <= 0) {
          this.moveDust = 0.16;
          burstDust(this, w.x, w.y + R, 2);
        }
      }
    } else {
      this.moveDust = 0;
    }
    const aimSpeed = 62;
    if (this.keys.up) this.aim.angle = clamp(this.aim.angle + aimSpeed * dt, 5, 175);
    if (this.keys.down) this.aim.angle = clamp(this.aim.angle - aimSpeed * dt, 5, 175);
  }

  updateAI(dt) {
    if (!this.active || !this.active.alive) {
      this.state = 'settle';
      this.settleTimer = 0.8;
      return;
    }
    this.aiTimer -= dt;
    if (this.aiStage === 0) {
      if (this.aiTimer <= 0) {
        this.aiPlan = planAI(this);
        if (this.aiPlan) {
          this.selectedWeapon = this.aiPlan.weaponIndex;
          this.aim.angle = this.aiPlan.angle;
          this.aim.power = this.aiPlan.power;
          this.showBanner('RIVAL IS AIMING', 'coral', 900);
        }
        this.aiStage = 1;
        this.aiTimer = 1.1;
        this.updateHud(true);
      }
    } else if (this.aiStage === 1) {
      if (this.aiTimer <= 0) {
        this.aiStage = 2;
        fire(this);
      }
    }
  }

  jump() {
    if (this.state !== 'aim' || this.buildMode) return;
    const w = this.active;
    if (!w || !w.alive || !w.grounded || this.moveLeft <= 0) return;
    w.vy = -435;
    w.grounded = false;
    this.moveLeft = Math.max(0, this.moveLeft - 10);
    this.sound.jump();
    burstDust(this, w.x, w.y + R, 7);
  }

  beginSettle() {
    if (this.state !== 'flying') return;
    this.state = 'settle';
    this.settleTimer = 1.7;
    this.settleFocus = this.lastExplosion
      ? { x: this.lastExplosion.x, y: this.lastExplosion.y }
      : (this.active ? { x: this.active.x, y: this.active.y } : { x: W / 2, y: H / 2 });
    this.projectiles = [];
    this.updateHud(true);
  }

  damageWorm(w, amount, sourceTeam, cause, sourceWorm) {
    damageWorm(this, w, amount, sourceTeam, cause, sourceWorm);
  }

  addText(x, y, text, color, size) {
    addText(this, x, y, text, color, size);
  }

  showBanner(text, kind = '', ms = 1200) {
    const el = this.dom.banner;
    el.textContent = text;
    el.className = `banner show${kind ? ' ' + kind : ''}`;
    this.bannerUntil = this.time + ms / 1000;
  }

  toast(text, ms = 900) {
    this.showBanner(text, 'toast', ms);
  }

  updateBanner() {
    if (this.bannerUntil && this.time >= this.bannerUntil) {
      this.dom.banner.classList.remove('show');
      this.bannerUntil = 0;
    }
  }

  onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (this.state === 'menu') {
      if (k === 'enter' || k === ' ') { e.preventDefault(); this.startMatch(); }
      return;
    }
    if (this.state === 'over') {
      if (k === 'enter' || k === 'r') this.startMatch();
      return;
    }
    if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown' || k === ' ') e.preventDefault();
    if (k === 'a' || k === 'arrowleft') this.keys.left = true;
    if (k === 'd' || k === 'arrowright') this.keys.right = true;
    if (k === 'w' || k === 'arrowup') this.keys.up = true;
    if (k === 's' || k === 'arrowdown') this.keys.down = true;
    if (k === ' ' && !e.repeat) this.jump();
    if (k === 'enter' && !e.repeat) {
      this.sound.unlock();
      fire(this);
    }
    if (k === '1' || k === '2' || k === '3') this.selectWeapon(Number(k) - 1);
    if (k === 'b' && !e.repeat) this.toggleBuild();
    if (k === 'r' && !e.repeat) {
      this.rampDir *= -1;
      if (this.buildType === 'ramp') this.toast('RAMP FLIPPED', 700);
      this.updateHud(true);
    }
    if (k === 'escape') {
      this.buildMode = false;
      this.drag = null;
      this.updateHud(true);
    }
  }

  onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') this.keys.left = false;
    if (k === 'd' || k === 'arrowright') this.keys.right = false;
    if (k === 'w' || k === 'arrowup') this.keys.up = false;
    if (k === 's' || k === 'arrowdown') this.keys.down = false;
  }

  onPointerDown(e) {
    this.sound.unlock();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this.toWorld(e);
    this.pointer = p;
    if (this.state !== 'aim' || !this.active) return;
    if (this.buildMode) {
      this.placeCurrentBuild(p);
      return;
    }
    this.drag = { id: e.pointerId, sx: p.x, sy: p.y, moved: 0 };
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    this.aimFromPoint(p);
  }

  onPointerMove(e) {
    const p = this.toWorld(e);
    this.pointer = p;
    if (this.drag && this.drag.id === e.pointerId) {
      const moved = Math.hypot(p.x - this.drag.sx, p.y - this.drag.sy);
      if (moved > this.drag.moved) this.drag.moved = moved;
      if (this.drag.moved > 4) this.aimFromPoint(p);
    }
  }

  onPointerUp(e) {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const moved = this.drag.moved;
    this.drag = null;
    if (moved > 10 && this.state === 'aim' && !this.buildMode) {
      fire(this);
    }
  }

  toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / this.view.scale + this.camX,
      y: (e.clientY - rect.top) / this.view.scale + this.camY,
    };
  }

  aimFromPoint(p) {
    const w = this.active;
    if (!w) return;
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const d = Math.hypot(dx, dy);
    if (d < 9) return;
    let ang = (Math.atan2(-dy, dx) * 180) / Math.PI;
    ang = clamp(ang, 3, 177);
    this.aim.angle = ang;
    this.aim.power = clamp((d - 18) / 5.0, 5, 100);
  }

  placeCurrentBuild(p) {
    if (!this.active) return;
    const ok = placeBuild(this, this.buildType, p.x, p.y, 0, false);
    if (ok) this.buildPreview = null;
  }

  selectWeapon(i) {
    if (i < 0 || i >= WEAPONS.length) return;
    const w = this.active;
    if (this.state !== 'aim' || !w) return;
    if (i !== 0 && (w.ammo[WEAPONS[i].id] ?? 0) <= 0) {
      this.toast('OUT OF AMMO', 800);
      this.sound.invalid();
      return;
    }
    this.selectedWeapon = i;
    this.buildMode = false;
    this.sound.select();
    this.updateHud(true);
  }

  toggleBuild(force) {
    if (this.state !== 'aim') return;
    this.buildMode = force === undefined ? !this.buildMode : force;
    this.drag = null;
    this.buildPreview = null;
    if (this.buildMode) this.showBanner('BUILD MODE', 'gold', 650);
    this.sound.select();
    this.updateHud(true);
  }

  setBuildType(type) {
    if (!BUILDS[type] || this.state !== 'aim') return;
    this.buildType = type;
    this.buildMode = true;
    this.sound.select();
    this.updateHud(true);
  }

  wormPipHTML(team) {
    return this.worms.filter((w) => w.team === team).map((w) => {
      const hp = Math.max(0, Math.ceil(w.health));
      const cls = ['worm-pip'];
      if (this.active === w && w.alive) cls.push('active');
      if (!w.alive) cls.push('dead');
      else if (hp <= 30) cls.push('crit');
      else if (hp <= 60) cls.push('low');
      return `<div class="${cls.join(' ')}">
        <div class="worm-pip-top"><span>${w.name}</span><span>${w.alive ? hp : '—'}</span></div>
        <div class="worm-hp"><i style="width:${Math.max(0, hp)}%"></i></div>
      </div>`;
    }).join('');
  }

  updateHud(force = false) {
    const d = this.dom;
    const sig = this.worms.map((w) => `${w.team}${w.alive ? 1 : 0}${Math.ceil(w.health)}${w === this.active ? 1 : 0}`).join('|');
    if (force || sig !== this.pipSig) {
      d.youWorms.innerHTML = this.wormPipHTML(0);
      d.enemyWorms.innerHTML = this.wormPipHTML(1);
      this.pipSig = sig;
    }

    d.youMats.querySelector('b').textContent = Math.floor(this.teams[0].mats);
    d.enemyMats.querySelector('b').textContent = Math.floor(this.teams[1].mats);

    const labels = {
      menu: 'GET READY', aim: 'YOUR TURN', enemy: 'RIVAL TURN',
      flying: 'INCOMING!', settle: 'IMPACT!', over: 'MATCH OVER',
    };
    d.turnLabel.textContent = labels[this.state] || 'READY';
    d.turnPanel.classList.toggle('enemy', this.turnTeam === 1 && this.state !== 'menu' && this.state !== 'over');
    d.turnPanel.classList.toggle('urgent', this.timer <= 10 && (this.state === 'aim' || this.state === 'enemy'));

    d.windArrow.style.transform = this.wind < 0 ? 'rotate(180deg)' : 'rotate(0deg)';
    d.windText.textContent = `${Math.abs(Math.round(this.wind / 10))}`;
    d.windPill.title = `Wind pushes shots ${this.wind < 0 ? 'left' : 'right'} at ${Math.abs(Math.round(this.wind / 10))} m/s`;

    const showTimer = this.state === 'aim' || this.state === 'enemy' || this.state === 'flying' || this.state === 'settle';
    d.timerText.textContent = showTimer ? `${Math.max(0, Math.ceil(this.timer))}` : '—';
    d.timerPill.classList.toggle('urgent', showTimer && this.timer <= 10);

    this.weaponButtons.forEach((btn, i) => {
      const wp = WEAPONS[i];
      const w = this.active;
      const ammo = w ? (w.ammo[wp.id] ?? 0) : wp.ammo;
      const finite = Number.isFinite(ammo);
      btn.classList.toggle('active', i === this.selectedWeapon && this.state !== 'over');
      btn.classList.toggle('empty', finite && ammo <= 0);
      btn.querySelector('.weapon-ammo').textContent = finite ? `${ammo}` : '∞';
      btn.disabled = this.state !== 'aim';
    });

    const mats = this.teams[0].mats;
    d.buildToggle.classList.toggle('active', this.buildMode);
    d.buildToggle.setAttribute('aria-pressed', String(this.buildMode));
    d.buildPalette.classList.toggle('open', this.buildMode);
    d.buildPalette.setAttribute('aria-hidden', String(!this.buildMode));
    for (const chip of d.buildChips) {
      const type = chip.dataset.build;
      const cfg = BUILDS[type];
      chip.classList.toggle('active', this.buildType === type);
      chip.disabled = this.state !== 'aim' || mats < cfg.cost || this.buildsUsed >= BUILD_LIMIT;
      if (type === 'ramp' && this.lastRampDir !== this.rampDir) {
        chip.innerHTML = `<span class="piece-icon ramp"></span>RAMP ${this.rampDir === 1 ? '↗' : '↖'} <b>${cfg.cost}</b>`;
      }
    }
    this.lastRampDir = this.rampDir;

    d.powerValue.textContent = `${Math.round(this.aim.power)}%`;
    if (!this.sliderActive) d.powerSlider.value = `${Math.round(this.aim.power)}`;
    d.fireBtn.disabled = this.state !== 'aim' || !this.active;
  }

  updateTargetChip() {
    const chip = this.dom.targetChip;
    if (this.state !== 'aim' || !this.active || !this.active.alive) {
      chip.classList.add('is-hidden');
      return;
    }
    const enemies = this.worms.filter((w) => w.team !== this.active.team && w.alive);
    if (!enemies.length) { chip.classList.add('is-hidden'); return; }
    const nearest = enemies.reduce((a, b) => (dist(a.x, a.y, this.active.x, this.active.y) < dist(b.x, b.y, this.active.x, this.active.y) ? a : b));
    const sx = (nearest.x - this.camX) * this.view.scale;
    const off = sx < 24 || sx > this.view.cw - 24;
    if (!off) {
      chip.classList.add('is-hidden');
      return;
    }
    chip.classList.remove('is-hidden');
    this.dom.targetArrow.style.transform = sx < 0 ? 'rotate(180deg)' : 'rotate(0deg)';
    this.dom.targetText.textContent = `RIVAL ${Math.round(dist(this.active.x, this.active.y, nearest.x, nearest.y) / 6)}m`;
  }

  currentBuildPreview() {
    if (!this.active || this.state !== 'aim') return null;
    let px;
    let py;
    if (this.pointer) {
      px = this.pointer.x;
      py = this.pointer.y;
    } else {
      px = this.active.x + 108;
      py = this.active.y - 18;
    }
    return computePlacement(this, this.buildType, px, py, 0);
  }

  ensureCaches() {
    const { cw, ch } = this.view;
    const key = `${cw}x${ch}`;
    if (this.cacheKey !== key) {
      this.cacheKey = key;
      this.skyCache = document.createElement('canvas');
      this.skyCache.width = cw;
      this.skyCache.height = ch;
      drawScreenSky(this.skyCache.getContext('2d', { willReadFrequently: true }), this);

      this.vignetteCache = document.createElement('canvas');
      this.vignetteCache.width = cw;
      this.vignetteCache.height = ch;
      const vc = this.vignetteCache.getContext('2d', { willReadFrequently: true });
      const vg = vc.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.32, cw / 2, ch / 2, Math.max(cw, ch) * 0.78);
      vg.addColorStop(0, 'rgba(10, 6, 22, 0)');
      vg.addColorStop(1, 'rgba(10, 6, 22, 0.45)');
      vc.fillStyle = vg;
      vc.fillRect(0, 0, cw, ch);
    }
    if (!this.worldBg) {
      this.worldBg = document.createElement('canvas');
      this.worldBg.width = W;
      this.worldBg.height = H;
      drawWorldBackground(this.worldBg.getContext('2d', { willReadFrequently: true }), this);
    }
  }

  render() {
    this.computeView();
    const { cw, ch, dpr, scale } = this.view;
    const ctx = this.ctx;
    this.ensureCaches();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (this.skyCache) ctx.drawImage(this.skyCache, 0, 0, cw, ch);

    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(-this.camX * scale + shakeX, -this.camY * scale + shakeY);
    ctx.scale(scale, scale);

    if (this.worldBg) ctx.drawImage(this.worldBg, 0, 0);
    this.terrain.draw(ctx);

    for (const b of this.buildings) drawBuilding(ctx, this, b);
    for (const l of this.llamas) drawLlama(ctx, this, l);

    if (this.buildMode && this.state === 'aim') {
      drawRangeRing(ctx, this);
      const bp = this.currentBuildPreview();
      if (bp) drawBuildGhost(ctx, this, bp);
    }

    if ((this.state === 'aim' || this.state === 'enemy') && this.active && this.active.alive && !this.buildMode) {
      const preview = simulateTrajectory(this, this.active, this.aim.angle, this.aim.power, WEAPONS[this.selectedWeapon], true);
      drawAimPreview(ctx, this, preview, this.state === 'enemy' ? 0.65 : 1);
    }

    for (const w of this.worms) drawWorm(ctx, this, w);
    for (const d of this.deadWorms) drawDeadWorm(ctx, this, d);
    for (const p of this.projectiles) drawProjectile(ctx, this, p);
    drawParticles(ctx, this);
    drawTexts(ctx, this);
    drawWindStreaks(ctx, this);

    ctx.restore();

    // If the battlefield is letterboxed vertically (e.g. a 16:10 desktop or
    // portrait phone), continue the underground instead of exposing the
    // sunset sky as a bright strip behind the dock.
    const worldBottom = (H - this.camY) * scale;
    if (worldBottom < ch) {
      const ground = ctx.createLinearGradient(0, worldBottom, 0, ch);
      ground.addColorStop(0, '#2a1513');
      ground.addColorStop(1, '#1b0d0c');
      ctx.fillStyle = ground;
      ctx.fillRect(0, worldBottom, cw, ch - worldBottom);
    }

    drawScreenOverlay(ctx, this);
  }

}
