// Tiny procedural sound kit — no external assets.
export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 20;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.buildNoise();
    } catch {
      this.ctx = null;
    }
  }

  buildNoise() {
    const len = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    this.noiseBuffer = buffer;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone(freq, dur, type = 'sine', gain = 0.15, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.now() + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  noise(dur, freq = 900, gain = 0.2, delay = 0, q = 0.8, type = 'lowpass') {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const t = this.now() + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  ui() { this.tone(520, 0.07, 'triangle', 0.06, 660); }
  select() { this.tone(430, 0.09, 'square', 0.045, 620); }

  shoot(kind = 'rocket') {
    if (kind === 'rocket') {
      this.noise(0.38, 1800, 0.24, 0, 1.3);
      this.tone(140, 0.32, 'sawtooth', 0.1, 48);
      this.tone(560, 0.12, 'square', 0.04, 180);
    } else if (kind === 'cluster') {
      this.noise(0.3, 1300, 0.2, 0, 1.1);
      this.tone(240, 0.18, 'square', 0.07, 90);
    } else {
      this.noise(0.22, 900, 0.18, 0, 0.8);
      this.tone(190, 0.16, 'triangle', 0.09, 120);
    }
  }

  explosion(big = 1) {
    this.noise(0.55 + big * 0.25, 520, 0.35, 0, 0.9);
    this.noise(0.34, 180, 0.4, 0.01, 0.7);
    this.tone(86, 0.6, 'sine', 0.34, 34);
    this.tone(52, 0.8, 'triangle', 0.22, 26, 0.03);
  }

  split() { this.tone(720, 0.12, 'square', 0.06, 1000); this.tone(980, 0.1, 'square', 0.04, 1400, 0.04); }
  build() {
    this.tone(170, 0.07, 'square', 0.08, 130);
    this.noise(0.11, 2400, 0.12, 0.02, 1.2, 'highpass');
    this.tone(420, 0.1, 'triangle', 0.05, 550, 0.05);
  }
  invalid() { this.tone(150, 0.14, 'square', 0.06, 110); }
  jump() { this.tone(330, 0.13, 'sine', 0.07, 540); }
  hurt() { this.tone(220, 0.18, 'sawtooth', 0.08, 90); this.noise(0.12, 600, 0.09); }
  llama() {
    this.tone(660, 0.12, 'square', 0.06, 880);
    this.tone(880, 0.12, 'square', 0.05, 1180, 0.09);
    this.tone(1180, 0.18, 'triangle', 0.05, 1500, 0.18);
  }
  turn(player) {
    if (player) {
      this.tone(392, 0.13, 'triangle', 0.06, 392);
      this.tone(587, 0.22, 'triangle', 0.06, 587, 0.12);
    } else {
      this.tone(294, 0.14, 'triangle', 0.05, 294);
      this.tone(220, 0.22, 'triangle', 0.05, 220, 0.12);
    }
  }
  win() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => this.tone(n, 0.3, 'triangle', 0.08, n, i * 0.11));
    this.tone(1568, 0.6, 'sine', 0.07, 1568, 0.55);
  }
  lose() {
    const notes = [392, 349, 294, 220];
    notes.forEach((n, i) => this.tone(n, 0.36, 'triangle', 0.075, n * 0.98, i * 0.16));
  }
  tick() { this.tone(880, 0.04, 'square', 0.03, 880); }
}
