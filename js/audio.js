// Synthesized sound design: no audio files, everything is generated with Web Audio.
export class Sound {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.alarmTimer = null;
  }

  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    // Drone: detuned saws through a slowly breathing low-pass.
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 240;
    this.droneFilter.Q.value = 5;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;
    this.droneFilter.connect(droneGain).connect(this.master);
    this.drones = [55, 55.35, 82.4, 27.5].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 3 ? 'sine' : 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 3 ? 0.8 : i === 2 ? 0.18 : 0.35;
      o.connect(g).connect(this.droneFilter);
      o.start();
      return o;
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(this.droneFilter.frequency);
    lfo.start();

    // Air: filtered noise bed.
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const air = ctx.createBufferSource();
    air.buffer = this.noiseBuf;
    air.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const ag = ctx.createGain();
    ag.gain.value = 0.018;
    air.connect(bp).connect(ag).connect(this.master);
    air.start();
    return true;
  }

  toggle() {
    if (!this.ctx && !this._init()) return false;
    this.enabled = !this.enabled;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.enabled ? 0.8 : 0, now, 0.4);
    if (this.enabled) this.blip(660);
    return this.enabled;
  }

  _env(node, peak, attack, decay, when = this.ctx.currentTime) {
    node.gain.setValueAtTime(0.0001, when);
    node.gain.exponentialRampToValueAtTime(peak, when + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }

  blip(freq = 880) {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [0, 0.07].forEach((dt, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * (i ? 1.5 : 1);
      const g = ctx.createGain();
      o.connect(g).connect(this.master);
      this._env(g, 0.05, 0.005, 0.14, t + dt);
      o.start(t + dt);
      o.stop(t + dt + 0.2);
    });
  }

  whoosh() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 1.1);
    const g = ctx.createGain();
    src.connect(f).connect(g).connect(this.master);
    this._env(g, 0.09, 0.4, 0.9, t);
    src.start(t);
    src.stop(t + 1.5);
  }

  alarm(on) {
    if (on && !this.alarmTimer) {
      let k = 0;
      this.alarmTimer = setInterval(() => {
        if (!this.enabled) return;
        const ctx = this.ctx, t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = k++ % 2 ? 520 : 390;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;
        const g = ctx.createGain();
        o.connect(lp).connect(g).connect(this.master);
        this._env(g, 0.035, 0.01, 0.3, t);
        o.start(t);
        o.stop(t + 0.35);
      }, 700);
    } else if (!on && this.alarmTimer) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
  }

  boom() {
    if (!this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(60, t + 4.5);
    const g = ctx.createGain();
    src.connect(f).connect(g).connect(this.master);
    this._env(g, 0.9, 0.02, 5, t);
    src.start(t);
    src.stop(t + 5.5);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(24, t + 4);
    const og = ctx.createGain();
    o.connect(og).connect(this.master);
    this._env(og, 1.0, 0.01, 4.5, t);
    o.start(t);
    o.stop(t + 5);
  }

  tension(x) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.drones[0].detune.setTargetAtTime(x * -60, t, 0.3);
    this.drones[1].detune.setTargetAtTime(x * 80, t, 0.3);
  }
}
