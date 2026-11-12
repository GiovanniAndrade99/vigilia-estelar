// Efeitos sonoros sintetizados com a Web Audio API, sem arquivos de áudio.
// O navegador só libera o som depois de uma interação do jogador, por isso unlock().
const Sfx = {
  ctx: null,
  master: null,
  noiseBuffer: null,
  muted: false,
  volume: 0.35,
  lastPlayed: {},

  unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      this.ctx = null;
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  },

  ready() {
    return this.ctx && !this.muted && this.ctx.state === 'running';
  },

  // Evita empilhar o mesmo som várias vezes no mesmo instante.
  throttle(name, ms) {
    const t = performance.now();
    if (this.lastPlayed[name] && t - this.lastPlayed[name] < ms) return false;
    this.lastPlayed[name] = t;
    return true;
  },

  tone(f0, f1, dur, type, vol, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  noise(dur, vol, cutoff) {
    const c = this.ctx;
    const t = c.currentTime;
    if (!this.noiseBuffer) {
      this.noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  },

  shoot() {
    if (this.ready() && this.throttle('shoot', 50)) this.tone(900, 320, 0.07, 'square', 0.1);
  },
  enemyShoot() {
    if (this.ready() && this.throttle('enemyShoot', 90)) this.tone(420, 140, 0.12, 'sawtooth', 0.07);
  },
  hitEnemy() {
    if (this.ready() && this.throttle('hitEnemy', 40)) this.tone(320, 200, 0.05, 'triangle', 0.15);
  },
  explosion() {
    if (this.ready() && this.throttle('explosion', 60)) this.noise(0.35, 0.5, 1800);
  },
  bigExplosion() {
    if (!this.ready()) return;
    this.noise(1.1, 0.8, 2400);
    this.tone(140, 30, 0.9, 'sine', 0.5);
  },
  playerHit() {
    if (!this.ready()) return;
    this.tone(240, 50, 0.3, 'sawtooth', 0.28);
    this.noise(0.25, 0.4, 900);
  },
  powerup() {
    if (!this.ready()) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.09, 'square', 0.1, i * 0.07));
  },
  waveStart() {
    if (!this.ready()) return;
    this.tone(392, 392, 0.12, 'triangle', 0.2);
    this.tone(587, 587, 0.22, 'triangle', 0.2, 0.13);
  },
  waveClear() {
    if (!this.ready()) return;
    [659, 784, 988].forEach((f, i) => this.tone(f, f, 0.1, 'triangle', 0.18, i * 0.08));
  },
  victory() {
    if (!this.ready()) return;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, f, 0.16, 'square', 0.12, i * 0.13));
  },
  gameOver() {
    if (!this.ready()) return;
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.98, 0.3, 'triangle', 0.22, i * 0.25));
  },
  start() {
    if (this.ready()) this.tone(300, 900, 0.25, 'square', 0.12);
  },
};

// Qualquer interação libera o áudio do navegador.
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
  window.addEventListener(ev, () => Sfx.unlock());
});
