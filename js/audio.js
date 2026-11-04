export class Soundscape {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.muted = false;
    this.started = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.32;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  startAmbient() {
    const ctx = this.ensure();
    if (!ctx || this.ambient) return;
    const out = ctx.createGain();
    out.gain.value = 0.11;
    out.connect(this.master);

    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55;
    const drone2 = ctx.createOscillator();
    drone2.type = "triangle";
    drone2.frequency.value = 82.41;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.07;
    const droneGain2 = ctx.createGain();
    droneGain2.gain.value = 0.026;
    drone.connect(droneGain).connect(out);
    drone2.connect(droneGain2).connect(out);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.028;
    lfo.connect(lfoGain).connect(droneGain.gain);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 210;
    filter.Q.value = 0.8;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.026;
    noise.connect(filter).connect(windGain).connect(out);

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.035;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 0.018;
    windLfo.connect(windLfoGain).connect(windGain.gain);

    drone.start();
    drone2.start();
    lfo.start();
    noise.start();
    windLfo.start();
    this.ambient = { out, drone, drone2, lfo, noise, windLfo };
    this.started = true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.32, this.ctx.currentTime, 0.04);
    }
  }

  tone({ freq = 220, dur = 0.12, type = "sine", vol = 0.12, slide = 1, delay = 0, attack = 0.004 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  noise({ dur = 0.12, vol = 0.08, freq = 900, q = 0.6, type = "bandpass", delay = 0, slide = 1 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (slide !== 1) filter.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  shoot(style) {
    if (style === "scythe") {
      this.noise({ dur: 0.18, vol: 0.065, freq: 1500, q: 0.8, slide: 0.18 });
      this.tone({ freq: 120, dur: 0.09, type: "sine", vol: 0.03, slide: 0.5 });
    } else if (style === "crossbow") {
      this.noise({ dur: 0.08, vol: 0.055, freq: 2100, q: 1.1, slide: 0.4 });
      this.tone({ freq: 330, dur: 0.06, type: "square", vol: 0.02, slide: 0.7 });
    } else if (style === "wand") {
      this.tone({ freq: 520, dur: 0.22, type: "sine", vol: 0.045, slide: 1.9 });
      this.tone({ freq: 780, dur: 0.15, type: "triangle", vol: 0.018, slide: 1.3, delay: 0.02 });
    } else {
      this.noise({ dur: 0.07, vol: 0.04, freq: 2500, q: 2, slide: 0.4 });
    }
  }

  hit(crit = false) {
    this.noise({ dur: crit ? 0.11 : 0.06, vol: crit ? 0.085 : 0.05, freq: crit ? 1100 : 750, q: 0.7, slide: 0.4 });
    if (crit) this.tone({ freq: 145, dur: 0.1, type: "triangle", vol: 0.05, slide: 0.6 });
  }

  enemyDie() {
    this.noise({ dur: 0.12, vol: 0.036, freq: 380, q: 0.6, slide: 0.5 });
  }

  pickup(rarity = "common") {
    const notes = rarity === "legendary" ? [392, 523, 659, 784, 1047] : rarity === "rare" ? [392, 523, 659, 784] : rarity === "magic" ? [330, 440, 554] : [300, 390];
    notes.forEach((freq, i) => this.tone({ freq, dur: 0.36, type: "triangle", vol: rarity === "legendary" ? 0.055 : 0.035, delay: i * 0.065 }));
    if (rarity === "legendary") this.noise({ dur: 0.8, vol: 0.02, freq: 2400, q: 2, slide: 0.4, delay: 0.1 });
  }

  coin() {
    this.tone({ freq: 880, dur: 0.08, type: "square", vol: 0.015, slide: 1.15 });
    this.tone({ freq: 1320, dur: 0.11, type: "triangle", vol: 0.018, delay: 0.035 });
  }

  heal() {
    [330, 440, 660].forEach((freq, i) => this.tone({ freq, dur: 0.4, type: "sine", vol: 0.03, delay: i * 0.07 }));
  }

  levelup() {
    [261.6, 329.6, 392, 523.3].forEach((freq, i) => {
      this.tone({ freq, dur: 0.8, type: "triangle", vol: 0.04, delay: i * 0.08 });
      this.tone({ freq: freq * 2, dur: 0.55, type: "sine", vol: 0.018, delay: i * 0.08 + 0.01 });
    });
    this.noise({ dur: 1.1, vol: 0.018, freq: 2400, q: 1.4, slide: 0.3 });
  }

  hurt() {
    this.noise({ dur: 0.17, vol: 0.09, freq: 240, q: 0.5, slide: 0.35 });
    this.tone({ freq: 95, dur: 0.16, type: "sine", vol: 0.06, slide: 0.7 });
  }

  dash() {
    this.noise({ dur: 0.26, vol: 0.06, freq: 700, q: 0.5, slide: 2.5 });
    this.tone({ freq: 180, dur: 0.16, type: "sine", vol: 0.025, slide: 1.8 });
  }

  nova() {
    this.tone({ freq: 70, dur: 0.75, type: "sine", vol: 0.14, slide: 0.45 });
    this.noise({ dur: 0.55, vol: 0.1, freq: 380, q: 0.7, slide: 0.3 });
    [220, 330, 440].forEach((freq, i) => this.tone({ freq, dur: 0.8, type: "triangle", vol: 0.025, delay: i * 0.03, slide: 1.5 }));
  }

  death() {
    this.tone({ freq: 110, dur: 2.4, type: "sine", vol: 0.1, slide: 0.32 });
    this.tone({ freq: 165, dur: 2.1, type: "triangle", vol: 0.035, slide: 0.3, delay: 0.12 });
    this.noise({ dur: 1.8, vol: 0.04, freq: 200, q: 0.4, slide: 0.4 });
  }

  victory() {
    [261.6, 329.6, 392, 523.3, 659.3, 783.9].forEach((freq, i) => {
      this.tone({ freq, dur: 1.6, type: "triangle", vol: 0.035, delay: i * 0.16 });
    });
    this.noise({ dur: 2, vol: 0.02, freq: 3000, q: 0.8, slide: 0.4, delay: 0.25 });
  }

  boss() {
    this.tone({ freq: 55, dur: 1.4, type: "sine", vol: 0.13, slide: 0.7 });
    this.tone({ freq: 82.4, dur: 1.2, type: "triangle", vol: 0.05, slide: 0.75 });
    this.noise({ dur: 1.2, vol: 0.07, freq: 260, q: 0.5, slide: 0.4 });
  }

  wave() {
    this.tone({ freq: 98, dur: 0.8, type: "sine", vol: 0.06, slide: 0.9 });
    this.tone({ freq: 147, dur: 0.7, type: "triangle", vol: 0.025, slide: 0.9, delay: 0.09 });
  }

  click() {
    this.tone({ freq: 660, dur: 0.055, type: "triangle", vol: 0.025, slide: 0.8 });
  }

  error() {
    this.tone({ freq: 140, dur: 0.16, type: "square", vol: 0.02, slide: 0.8 });
  }
}
