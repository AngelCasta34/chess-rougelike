export default class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.ctx = null;
    this.muted = false;
    this._init();
  }

  _init() {
  }

  _getCtx() {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
    return this.ctx;
  }

  _resume() {
    const ctx = this._getCtx();
    if (ctx?.state === "suspended") ctx.resume();
  }

  // Base oscillator tone, fades out over duration
  _tone(freq, duration, type = "square", vol = 0.3, delay = 0) {
    if (this.muted) return;
    this._resume();
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // Frequency ramp 
  _sweep(startFreq, endFreq, duration, type = "square", vol = 0.3, delay = 0) {
    if (this.muted) return;
    this._resume();
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // Short noise burst 
  _noise(duration, vol = 0.2, delay = 0) {
    if (this.muted) return;
    this._resume();
    const ctx = this._getCtx();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const bufSize = ctx.sampleRate * duration;
    const buf  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src  = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.start(t);
  }

  // Game Sound Events 

  // Player moves to empty tile
  playMove() {
    this._tone(320, 0.07, "sine", 0.12);
  }

  // Player attacks an enemy
  playAttack() {
    this._sweep(380, 160, 0.1, "square", 0.28);
    this._noise(0.06, 0.15);
  }

  // Enemy hit / takes damage
  playHit() {
    this._sweep(260, 120, 0.1, "square", 0.22);
    this._noise(0.05, 0.12);
  }

  // Enemy dies
  playDeath() {
    this._sweep(440, 100, 0.18, "sawtooth", 0.28);
    this._noise(0.12, 0.18);
  }

  // Player takes damage 
  playPlayerHurt() {
    this._sweep(220, 70, 0.28, "sawtooth", 0.38);
    this._noise(0.15, 0.25);
  }

  // Shield blocks a hit
  playShieldBlock() {
    this._tone(600, 0.08, "sine", 0.2);
    this._tone(800, 0.12, "sine", 0.15, 0.05);
  }

  // Card played
  playCardPlay() {
    this._tone(520, 0.06, "sine", 0.18);
    this._tone(660, 0.09, "sine", 0.14, 0.06);
  }

  // End turn click
  playEndTurn() {
    this._tone(440, 0.05, "sine", 0.14);
    this._tone(550, 0.07, "sine", 0.10, 0.07);
  }

  // Gold pickup
  playGold() {
    this._tone(880, 0.08, "sine", 0.18);
    this._tone(1100, 0.12, "sine", 0.14, 0.08);
  }

  // Healing
  playHeal() {
    this._tone(440, 0.1, "sine", 0.18);
    this._tone(550, 0.1, "sine", 0.15, 0.1);
    this._tone(660, 0.15, "sine", 0.12, 0.2);
  }

  // Floor clear / victory fanfare
  playVictory() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, i) => {
      this._tone(freq, 0.28, "sine", 0.22, i * 0.12);
    });
  }

  // Boss entrance
  playBossEntrance() {
    this._sweep(100, 50, 0.5, "sawtooth", 0.35);
    this._sweep(100, 50, 0.5, "sawtooth", 0.35, 0.55);
    this._noise(0.3, 0.25, 0.2);
  }

  // Game over
  playGameOver() {
    this._sweep(330, 60, 1.0, "sawtooth", 0.32);
    this._tone(110, 0.8, "square", 0.2, 0.3);
  }
}
