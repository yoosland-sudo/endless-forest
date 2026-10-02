const MIN_GAP = { hit: 0.045, throw: 0.09, kill: 0.04, coin: 0.06, burn: 0.15 };

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = {};
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.3;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  burst(dur, { vol = 0.3, freq = 1200, delay = 0 } = {}) {
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (MIN_GAP[name] && now - (this.last[name] || 0) < MIN_GAP[name]) return;
    this.last[name] = now;
    const r = 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'throw': this.tone(900 * r, 0.05, { type: 'triangle', vol: 0.05, slide: 0.6 }); break;
      case 'hit': this.tone(520 * r, 0.07, { type: 'square', vol: 0.06, slide: 0.5 }); break;
      case 'kill': this.tone(680 * r, 0.12, { type: 'triangle', vol: 0.16, slide: 1.8 }); this.burst(0.08, { vol: 0.1, freq: 2400 }); break;
      case 'coin': this.tone(1320 * r, 0.06, { vol: 0.06 }); break;
      case 'burn': this.burst(0.1, { vol: 0.05, freq: 700 }); break;
      case 'treeHit': this.tone(140, 0.18, { type: 'sine', vol: 0.35, slide: 0.5 }); this.burst(0.12, { vol: 0.15, freq: 400 }); break;
      case 'boom': this.burst(0.3, { vol: 0.3, freq: 300 }); this.tone(90, 0.3, { vol: 0.25, slide: 0.5 }); break;
      case 'zap': this.burst(0.08, { vol: 0.12, freq: 3500 }); break;
      case 'frost': this.tone(1600, 0.25, { vol: 0.08, slide: 0.5 }); this.burst(0.2, { vol: 0.08, freq: 5000 }); break;
      case 'wave': this.tone(660, 0.12, { type: 'triangle', vol: 0.12 }); this.tone(990, 0.16, { type: 'triangle', vol: 0.12, delay: 0.08 }); break;
      case 'pickOpen': this.tone(520, 0.1, { vol: 0.12 }); this.tone(780, 0.14, { vol: 0.12, delay: 0.07 }); break;
      case 'pick': this.tone(880, 0.08, { type: 'triangle', vol: 0.15 }); this.tone(1320, 0.14, { type: 'triangle', vol: 0.15, delay: 0.06 }); break;
      case 'set': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.15, delay: i * 0.07 })); break;
      case 'record': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.2, { type: 'square', vol: 0.07, delay: i * 0.08 })); break;
      case 'bossAppear': this.tone(110, 0.9, { type: 'sawtooth', vol: 0.18, slide: 0.6 }); this.burst(0.6, { vol: 0.15, freq: 200 }); break;
      case 'summon': this.tone(220, 0.3, { type: 'sawtooth', vol: 0.08, slide: 1.5 }); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.16, delay: i * 0.09 })); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.14, delay: i * 0.14 })); break;
      case 'tap': this.tone(700, 0.05, { type: 'triangle', vol: 0.1 }); break;
      case 'buy': this.tone(988, 0.08, { vol: 0.12 }); this.tone(1480, 0.12, { vol: 0.12, delay: 0.06 }); break;
      case 'clearing': this.tone(440, 0.15, { type: 'triangle', vol: 0.1 }); break;
      default: break;
    }
  }
}
