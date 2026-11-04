/* Everything you hear is made from oscillators and noise. Sorry. */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.ambienceGain = null;
    this.noiseBuffer = null;
    this.mode = 'ambient';
    this.partyLevel = 0;
    this.muted = false;
    this.started = false;
    this.totalStep = 0;
    this.nextNoteTime = 0;
    this.timer = null;
    this.horrorNodes = null;
    this.crowdSource = null;
    this.voices = 0;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);

    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.42;
    this.ambienceGain.connect(this.master);

    this.noiseBuffer = this.makeNoise(2.2);
    this.startAmbience();
    this.startScheduler();
    this.started = true;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.96 * last + 0.04 * white;
      data[i] = white * 0.7 + last * 0.3;
    }
    return buffer;
  }

  noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = loop;
    return src;
  }

  startAmbience() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // low room tone
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 48;
    const dg = ctx.createGain();
    dg.gain.value = 0.05;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 120;
    drone.connect(dlp).connect(dg).connect(this.ambienceGain);
    drone.start(now);

    const drone2 = ctx.createOscillator();
    drone2.type = 'triangle';
    drone2.frequency.value = 73.4;
    const dg2 = ctx.createGain();
    dg2.gain.value = 0.016;
    drone2.connect(dg2).connect(this.ambienceGain);
    drone2.start(now);

    // TV hiss
    const hiss = this.noiseSource(true);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    const hg = ctx.createGain();
    hg.gain.value = 0.022;
    hiss.connect(hp).connect(lp).connect(hg).connect(this.ambienceGain);
    hiss.start(now);

    // party crowd murmur (only audible once party begins)
    const crowd = this.noiseSource(true);
    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 420;
    cf.Q.value = 0.7;
    const cg = ctx.createGain();
    cg.gain.value = 0.0;
    crowd.connect(cf).connect(cg).connect(this.ambienceGain);
    crowd.start(now);
    this.crowdGain = cg;
    this.crowdSource = crowd;

    // slow LFO on the crowd
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.17;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(cg.gain);
    lfo.start(now);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
  }

  startScheduler() {
    this.nextNoteTime = this.ctx.currentTime + 0.12;
    this.timer = setInterval(() => {
      if (!this.ctx) return;
      const ahead = 0.18;
      while (this.nextNoteTime < this.ctx.currentTime + ahead) {
        const dur = this.mode === 'horror' ? 0.18 : 60 / 118 / 2;
        this.scheduleStep(this.totalStep, this.nextNoteTime, dur);
        this.totalStep++;
        this.nextNoteTime += dur;
      }
    }, 30);
  }

  scheduleStep(step, time, dur) {
    if (this.mode === 'party') this.scheduleParty(step, time, dur);
    else if (this.mode === 'horror') this.scheduleHorror(step, time, dur);
  }

  scheduleParty(step, time, dur) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const prog = [
      { root: 110.0, notes: [220.0, 261.63, 329.63], lead: [440, 523.25, 659.25, 523.25, 440, 392, 329.63, 392] },
      { root: 87.31, notes: [174.61, 220.0, 261.63], lead: [349.23, 440, 523.25, 440, 349.23, 329.63, 261.63, 329.63] },
      { root: 130.81, notes: [261.63, 329.63, 392.0], lead: [523.25, 659.25, 783.99, 659.25, 523.25, 466.16, 392, 466.16] },
      { root: 98.0, notes: [196.0, 246.94, 293.66], lead: [392, 493.88, 587.33, 493.88, 392, 349.23, 293.66, 349.23] },
    ][bar];
    const level = this.partyLevel;
    const gain = 0.3 + level * 0.7;

    // kick
    if (s % 4 === 0) {
      this.kick(time, 0.5 * gain);
    }
    // snare
    if (s === 4 || s === 12) {
      this.snare(time, 0.22 * gain);
    }
    // hats
    if (level > 0.15 && s % 2 === 1) {
      this.hat(time, 0.07 * gain);
    }
    // bass
    const bassSteps = [0, 3, 6, 8, 11, 14];
    if (bassSteps.includes(s)) {
      const mult = s === 3 || s === 11 ? 1.5 : (s === 6 || s === 14 ? 2 : 1);
      this.musicTone(time, prog.root * mult, dur * 0.8, 'triangle', 0.16 * gain, { filter: 700 });
    }
    // chord stab
    if (level > 0.18 && (s === 0 || s === 6 || s === 10)) {
      prog.notes.forEach((f, i) => {
        this.musicTone(time, f, dur * 0.55, 'square', 0.022 * gain, { filter: 1400, detune: i * 2 });
      });
    }
    // lead
    if (level > 0.34 && s % 2 === 0) {
      const note = prog.lead[(s / 2) | 0];
      this.musicTone(time, note, dur * 0.8, 'sawtooth', 0.055 * gain, { filter: 1900, vibrato: true });
    }
    // sparkle at the top
    if (level >= 1 && s === 15) {
      this.musicTone(time, 1046.5, 0.16, 'sine', 0.05, {});
    }
    if (this.crowdGain) {
      this.crowdGain.gain.setTargetAtTime(level * 0.045, time, 0.4);
    }
  }

  scheduleHorror(step, time, dur) {
    const s = step % 16;
    if (s === 0) {
      this.musicTone(time, 38.5, 1.6, 'sawtooth', 0.09, { filter: 90, detune: -8 });
      this.musicTone(time, 39.5, 1.6, 'sawtooth', 0.07, { filter: 120, detune: 9 });
    }
    if (s === 8) {
      this.musicTone(time, 41.2, 1.3, 'triangle', 0.05, { filter: 200 });
    }
    if (s === 3 || s === 11) {
      const notes = [311.13, 329.63, 466.16, 622.25];
      this.musicTone(time, notes[(step >> 2) % notes.length], 0.22, 'square', 0.026, { filter: 900 });
    }
    if (Math.random() < 0.06) this.whisper(0.2);
    if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(0.0, time, 0.6);
  }

  musicTone(time, freq, dur, type = 'sine', gain = 0.1, opts = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.03, dur));
    let node = osc;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      f.Q.value = 0.7;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const lg = ctx.createGain();
      lg.gain.value = 2.5;
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(time);
      lfo.stop(time + dur + 0.05);
    }
  }

  kick(time, gain = 0.5) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    osc.connect(g).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  snare(time, gain = 0.2) {
    const ctx = this.ctx;
    const src = this.noiseSource();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.2);
  }

  hat(time, gain = 0.06) {
    const ctx = this.ctx;
    const src = this.noiseSource();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.06);
  }

  /* ---------------- one shots ---------------- */

  knock(count = 3) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const t = t0 + i * 0.19;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(96, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.3);
      const src = this.noiseSource();
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.18, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      src.connect(f).connect(ng).connect(this.master);
      src.start(t);
      src.stop(t + 0.15);
    }
  }

  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(640, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  doorCreak(open = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(open ? 90 : 240, t);
    osc.frequency.exponentialRampToValueAtTime(open ? 250 : 70, t + 0.75);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(800, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.8);
    f.Q.value = 5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(f).connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.95);
  }

  doorSlam() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.36);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.45, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  step() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.13);
  }

  voice(kind = 'human') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const count = 3 + ((Math.random() * 3) | 0);
    const base = kind === 'human' ? 150 + Math.random() * 90 : 62 + Math.random() * 24;
    for (let i = 0; i < count; i++) {
      const st = t + i * 0.09;
      const osc = this.ctx.createOscillator();
      osc.type = kind === 'human' ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(base * (1 + Math.random() * 0.1), st);
      osc.frequency.exponentialRampToValueAtTime(base * (0.8 + Math.random() * 0.35), st + 0.08);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = kind === 'human' ? 700 : 220;
      f.Q.value = 3;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(kind === 'human' ? 0.055 : 0.075, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.085);
      osc.connect(f).connect(g).connect(this.master);
      osc.start(st);
      osc.stop(st + 0.1);
    }
    if (kind !== 'human') {
      this.whisper(0.18);
    }
  }

  whisper(dur = 0.4) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1100, t);
    f.frequency.linearRampToValueAtTime(2400, t + dur);
    f.Q.value = 4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  cheer() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(1800, t + 0.5);
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.95);
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      this.musicTone(t + i * 0.05, freq, 0.25, 'triangle', 0.045, {});
    });
  }

  scare() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // sub boom
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(70, t);
    sub.frequency.exponentialRampToValueAtTime(24, t + 1.1);
    const subG = this.ctx.createGain();
    subG.gain.setValueAtTime(0.75, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subG).connect(this.master);
    sub.start(t);
    sub.stop(t + 1.2);

    // screaming cluster
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 ? 'sawtooth' : 'square';
      const freq = 220 + i * 95 + Math.random() * 80;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * (1.6 + Math.random() * 0.5), t + 0.35);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 1.0);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900 + i * 300;
      f.Q.value = 1.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
      osc.connect(f).connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 1.1);
    }

    // noise blast
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.85);
  }

  boom() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(22, t + 1.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 1.5);
  }

  jingle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.musicTone(t + i * 0.13, f, 0.28, 'triangle', 0.08, {});
      this.musicTone(t + i * 0.13, f * 2, 0.22, 'sine', 0.03, {});
    });
    this.cheer();
  }

  badJingle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [392, 370, 349.23, 329.63, 311.13, 220];
    notes.forEach((f, i) => {
      this.musicTone(t + i * 0.16, f, 0.3, 'sawtooth', 0.04, { filter: 900 });
    });
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (!this.ctx || !this.musicGain) return;
    if (mode === 'party') {
      this.musicGain.gain.setTargetAtTime(0.06 + this.partyLevel * 0.17, this.ctx.currentTime, 0.8);
    } else if (mode === 'horror') {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(0.2, this.ctx.currentTime, 0.3);
    } else {
      this.musicGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.8);
    }
  }

  setPartyLevel(level) {
    this.partyLevel = Math.max(0, Math.min(1, level));
    if (!this.ctx) return;
    if (this.mode !== 'horror' && this.mode !== 'win') {
      if (this.partyLevel > 0 && this.mode !== 'party') this.setMode('party');
      if (this.mode === 'party') {
        this.musicGain.gain.setTargetAtTime(0.06 + this.partyLevel * 0.18, this.ctx.currentTime, 0.5);
      }
    }
    if (this.crowdGain) {
      this.crowdGain.gain.setTargetAtTime(this.partyLevel * 0.05, this.ctx.currentTime, 0.6);
    }
  }

  stopMusic() {
    this.mode = 'ambient';
    if (this.ctx) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    if (this.ctx) this.ctx.close();
  }
}
