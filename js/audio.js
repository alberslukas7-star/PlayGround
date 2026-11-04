// Tiny synthesised audio engine. No files, all bad decisions.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
    this.ambient = null;
    this.staticSource = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicNext = 0;
    this.musicOn = false;
    this.volume = 0.55;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    // one second of noise, reused forever
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
  }

  tone({ freq = 220, dur = 0.2, type = 'sine', gain = 0.2, when = 0, slide = null, detune = 0, filter = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    if (slide != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 900;
      f.Q.value = filter.q || 1;
      o.connect(f); f.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, gain = 0.2, when = 0, filterType = 'lowpass', freq = 1200, q = 1, slide = null }) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (slide != null) f.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  click() {
    this.tone({ freq: 520, dur: 0.05, type: 'square', gain: 0.06 });
  }

  knock() {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) {
      const w = i * 0.28;
      this.tone({ freq: 110, slide: 48, dur: 0.14, type: 'sine', gain: 0.5, when: w });
      this.noise({ dur: 0.1, gain: 0.22, when: w, filterType: 'lowpass', freq: 380 });
    }
  }

  knockFar() {
    if (!this.ctx) return;
    this.tone({ freq: 86, slide: 38, dur: 0.22, type: 'sine', gain: 0.22 });
    this.noise({ dur: 0.2, gain: 0.08, filterType: 'lowpass', freq: 260 });
  }

  creak() {
    this.tone({ freq: 210, slide: 520, dur: 0.7, type: 'sawtooth', gain: 0.08, filter: { type: 'bandpass', freq: 900, q: 8 } });
    this.noise({ dur: 0.8, gain: 0.05, filterType: 'bandpass', freq: 460, q: 5, slide: 1600 });
  }

  doorClose() {
    this.tone({ freq: 90, slide: 40, dur: 0.18, type: 'sine', gain: 0.4 });
    this.noise({ dur: 0.12, gain: 0.2, filterType: 'lowpass', freq: 340 });
  }

  success() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.16, type: 'square', gain: 0.09, when: i * 0.075 }));
  }

  horn() {
    if (!this.ctx) return;
    this.tone({ freq: 330, slide: 620, dur: 0.32, type: 'sawtooth', gain: 0.08, filter: { type: 'lowpass', freq: 1800 } });
    this.tone({ freq: 410, slide: 760, dur: 0.3, type: 'square', gain: 0.04, when: 0.05 });
  }

  sad() {
    const notes = [392, 370, 349, 311];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.24, type: 'triangle', gain: 0.11, when: i * 0.18, slide: i === 3 ? 240 : null }));
  }

  whisper() {
    this.noise({ dur: 0.7, gain: 0.07, filterType: 'bandpass', freq: 1100, q: 18, slide: 420 });
  }

  stinger() {
    if (!this.ctx) return;
    this.noise({ dur: 0.5, gain: 0.32, filterType: 'highpass', freq: 600 });
    this.tone({ freq: 1400, slide: 210, dur: 0.55, type: 'sawtooth', gain: 0.15, filter: { type: 'bandpass', freq: 1200, q: 3 } });
    this.tone({ freq: 72, slide: 31, dur: 0.8, type: 'sine', gain: 0.5 });
  }

  scream() {
    if (!this.ctx) return;
    const base = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.tone({
        freq: 900 + i * 210,
        slide: 130 + i * 40,
        dur: 1.15,
        type: i === 0 ? 'sawtooth' : 'square',
        gain: 0.14,
        detune: (i - 1) * 35,
        filter: { type: 'bandpass', freq: 1500, q: 1.6 },
      });
    }
    this.noise({ dur: 1.1, gain: 0.34, filterType: 'bandpass', freq: 1800, q: 0.8, slide: 200 });
    this.tone({ freq: 55, slide: 28, dur: 1.4, type: 'sine', gain: 0.55 });
    // fun little music-box note under the screaming
    const notes = [1046, 932, 880, 784];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.7, type: 'triangle', gain: 0.05, when: 0.1 + i * 0.18 }));
  }

  heartbeat() {
    this.tone({ freq: 62, slide: 42, dur: 0.16, type: 'sine', gain: 0.42 });
    this.tone({ freq: 56, slide: 38, dur: 0.18, type: 'sine', gain: 0.3, when: 0.22 });
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 48;
    const g = this.ctx.createGain();
    g.gain.value = 0.022;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    drone.connect(g); g.connect(this.master);
    drone.start(); lfo.start();
    // television hiss
    const hiss = this.ctx.createBufferSource();
    hiss.buffer = this.noiseBuffer;
    hiss.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = 2600; hp.Q.value = 0.5;
    const hg = this.ctx.createGain();
    hg.gain.value = 0.0045;
    hiss.connect(hp); hp.connect(hg); hg.connect(this.master);
    hiss.start();
    this.ambient = { drone, lfo, hiss, g, hg };
  }

  stopAmbient() {
    if (!this.ambient) return;
    try {
      this.ambient.drone.stop();
      this.ambient.lfo.stop();
      this.ambient.hiss.stop();
    } catch {}
    this.ambient = null;
  }

  setHorror(on) {
    if (!this.ctx || !this.ambient) return;
    const t = this.ctx.currentTime;
    this.ambient.g.gain.setTargetAtTime(on ? 0.045 : 0.022, t, 0.5);
  }

  startParty() {
    if (!this.ctx) return;
    this.stopAmbient();
    this.musicOn = true;
    this.musicStep = 0;
    this.musicNext = this.ctx.currentTime + 0.08;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = setInterval(() => this._scheduleMusic(), 90);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _scheduleMusic() {
    if (!this.ctx || !this.musicOn) return;
    const stepDur = 60 / 128 / 2; // eighth notes
    while (this.musicNext < this.ctx.currentTime + 0.3) {
      this._playStep(this.musicStep, this.musicNext);
      this.musicStep = (this.musicStep + 1) % 32;
      this.musicNext += stepDur;
    }
  }

  _playStep(step, when) {
    const t = when - this.ctx.currentTime;
    if (t < -0.05) return;
    const bar = Math.floor(step / 8) % 4;
    const local = step % 8;
    const bassRoots = [65.41, 98.0, 110.0, 87.31]; // C2 G2 A2 F2
    const melodies = [
      [523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 523.25],
      [440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25],
      [523.25, 659.25, 880.0, 1046.5, 880.0, 783.99, 659.25, 587.33],
      [698.46, 659.25, 587.33, 523.25, 587.33, 523.25, 440.0, 392.0],
    ];
    const root = bassRoots[bar];
    const octave = local === 0 ? 2 : local === 4 ? 1 : 0;
    // kick
    if (local % 4 === 0) {
      this.tone({ freq: 92, slide: 46, dur: 0.14, type: 'sine', gain: 0.28, when: t });
    }
    // snare / clap
    if (local === 4) {
      this.noise({ dur: 0.1, gain: 0.12, when: t, filterType: 'bandpass', freq: 1900, q: 1.2 });
    }
    // hats
    if (local % 2 === 1) {
      this.noise({ dur: 0.035, gain: 0.035, when: t, filterType: 'highpass', freq: 6500 });
    }
    // bass
    if (local % 2 === 0) {
      this.tone({
        freq: root * (octave ? 2 : 1),
        dur: 0.17,
        type: 'triangle',
        gain: 0.15,
        when: t,
        filter: { type: 'lowpass', freq: 420 },
      });
    }
    // cheesy lead
    const m = melodies[bar][local];
    if (m && local % 2 === 0) {
      this.tone({ freq: m, dur: 0.13, type: 'square', gain: 0.035, when: t + 0.01, filter: { type: 'lowpass', freq: 2400 } });
      this.tone({ freq: m * 1.5, dur: 0.1, type: 'triangle', gain: 0.018, when: t + 0.01 });
    }
    // OH-OH party vocal-ish
    if (local === 6 && bar % 2 === 1) {
      this.tone({ freq: 260, slide: 420, dur: 0.12, type: 'sawtooth', gain: 0.04, when: t, filter: { type: 'bandpass', freq: 900, q: 4 } });
    }
  }
}
