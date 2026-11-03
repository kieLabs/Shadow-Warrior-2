export class AudioEngine {
  constructor(save) {
    this.enabled = save.settings.sound;
    this.musicEnabled = save.settings.music;
    this.volume = save.settings.volume;
    this.context = null;
    this.master = null;
    this.musicTimer = null;
    this.step = 0;
    this.unlocked = false;
  }
  ensure() {
    if (this.context) return;
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.context.destination);
  }
  resume() { this.unlocked = true; this.ensure(); this.context?.resume?.(); if (this.musicEnabled) this.startMusic(); }
  setSettings(settings) {
    this.enabled = Boolean(settings.sound);
    this.musicEnabled = Boolean(settings.music);
    this.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .05);
    if (this.musicEnabled && this.unlocked) this.startMusic(); else this.stopMusic();
  }
  tone(frequency, duration, type = 'sine', gain = .12, slide = 0) {
    if (!this.enabled) return;
    this.ensure(); if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    amp.gain.setValueAtTime(gain, now); amp.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(amp); amp.connect(this.master); osc.start(now); osc.stop(now + duration + .02);
  }
  play(name) {
    if (!this.enabled) return;
    const sounds = {
      jump: [260, .11, 'triangle', .09, 120], doublejump: [380, .15, 'triangle', .1, 240],
      hit: [105, .09, 'square', .075, -45], heavy: [78, .18, 'sawtooth', .09, -35],
      coin: [880, .08, 'sine', .07, 240], gem: [660, .22, 'sine', .1, 520],
      hurt: [145, .16, 'sawtooth', .09, -80], boss: [55, .35, 'sawtooth', .1, -20],
      win: [520, .45, 'triangle', .12, 500], lose: [180, .5, 'sawtooth', .1, -110],
      dodge: [320, .09, 'triangle', .06, -130], select: [440, .07, 'sine', .05, 100],
    };
    const [f, d, t, g, s] = sounds[name] || sounds.select;
    this.tone(f, d, t, g, s);
    if (name === 'win') setTimeout(() => this.tone(780, .35, 'triangle', .09, 210), 120);
  }
  startMusic() {
    if (!this.musicEnabled || !this.unlocked || this.musicTimer) return;
    this.ensure(); if (!this.context) return;
    const notes = [110, 146.8, 164.8, 130.8, 196, 164.8, 146.8, 123.5];
    this.musicTimer = setInterval(() => {
      if (!this.musicEnabled || !this.context) return;
      const note = notes[this.step++ % notes.length];
      const old = this.enabled; this.enabled = true;
      this.tone(note, .34, 'triangle', .025, 8);
      if (this.step % 4 === 0) this.tone(note * 2, .12, 'sine', .018, 0);
      this.enabled = old;
    }, 410);
  }
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }
  destroy() { this.stopMusic(); this.context?.close?.(); this.context = null; }
}
