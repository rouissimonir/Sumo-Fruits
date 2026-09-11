/**
 * Procedural Web Audio Sound Engine for Sumo Fruits: The Bumper Bowl
 * Zero external asset dependencies - instant, crisp, responsive audio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public enabled: boolean = true;
  public volume: number = 0.7;

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio context might fail if restricted
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Traditional Hyoshigi (sumo wooden clappers) strike
   */
  public playHyoshigi(pitchMod: number = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    [1760 * pitchMod, 2240 * pitchMod].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /**
   * Taiko Drum strike - deep resonant booming thump
   */
  public playTaiko(intensity: number = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.35);

    gain.gain.setValueAtTime(Math.min(0.8, 0.4 * intensity), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  /**
   * Slingshot pull tension click
   */
  public playSlingshotStretch(pitch: number = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200 * pitch, t);
    osc.frequency.linearRampToValueAtTime(320 * pitch, t + 0.04);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Slingshot release launch whoosh
   */
  public playLaunch(mass: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = Math.max(100, 320 - mass * 1.5);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, t + 0.16);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Standard collision bump / fruit squish
   */
  public playBump(speed: number, mass: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = Math.max(80, 260 - Math.min(mass * 2, 140));
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);

    const vol = Math.min(0.4, (speed / 400) * 0.35);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Tsuppari Clash start - rapid wooden slap / impact
   */
  public playClashStart() {
    this.playHyoshigi(0.85);
    this.playTaiko(0.9);
  }

  /**
   * Rapid clash flutter slap during 25Hz vibration
   */
  public playClashSlap(tier: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(450 - tier * 15, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * Fusion Merge celebration sound - harmonic chime pop
   */
  public playFusion(tier: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    // Harmonic arpeggio based on tier
    const baseFreq = 220 * Math.pow(1.08, tier);
    const chords = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];

    chords.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.03);

      gain.gain.setValueAtTime(0.2, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.03 + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.3);
    });
  }

  /**
   * Ring Out - dramatic downward slide whistle & splash
   */
  public playRingOut() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * Yokozuna Pineapple Legendary Fanfare!
   */
  public playYokozuna() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.25, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.65);
    });

    // Sub bass boom
    this.playTaiko(1.8);
  }

  /**
   * Hazard cleared sound
   */
  public playHazardClear() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.linearRampToValueAtTime(700, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Sacred Salt Throw (Kiyome-no-Shio) - crystalline purification chime
   */
  public playSaltThrow() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const freqs = [1760, 2637, 3520, 4186];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.04);
      gain.gain.setValueAtTime(0.18, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.5);
    });
  }

  /**
   * Authentic Gyōji (Sumo Referee) synthesized vocal chant
   */
  public playRefereeCall(type: 'hakkeyoi' | 'nokotta' | 'shobu' | 'fever' | 'kinboshi' | 'kiyome') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;

    if (type === 'hakkeyoi') {
      // Rapid double hyoshigi clap + rising referee cry
      this.playHyoshigi(1.0);
      setTimeout(() => this.playHyoshigi(1.15), 110);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, t);
      osc.frequency.exponentialRampToValueAtTime(340, t + 0.28);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'nokotta') {
      // Steady rhythmic referee chant
      this.playHyoshigi(0.9);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(230, t + 0.2);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.26);
    } else if (type === 'shobu') {
      // Deep decisive match conclusion call
      this.playTaiko(1.4);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.45);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.52);
    } else if (type === 'kinboshi') {
      // Victorious Golden Star chime & taiko
      this.playTaiko(1.5);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + idx * 0.07);
        gain.gain.setValueAtTime(0.22, t + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.45);
      });
    } else if (type === 'fever') {
      // Rolling Taiko drum flurry
      this.playTaiko(1.6);
      setTimeout(() => this.playTaiko(1.4), 90);
      setTimeout(() => this.playTaiko(1.8), 180);
    } else if (type === 'kiyome') {
      this.playSaltThrow();
    }
  }

  /**
   * Straw Bale (Tawara) fracture & straw debris crunch
   */
  public playStrawBaleCrack() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  /**
   * Wasabi Puddle sticky squelch
   */
  public playWasabiSplash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.14);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Chili Pepper rocket blast boost
   */
  public playChiliBoost() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.22);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * "Not Today!" rim-save applause: fruit wipes forehead while crowd cheers!
   */
  public playRimSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Cheerful ascending chime + crowd murmur
    [440, 554.37, 659.25].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.05);
      gain.gain.setValueAtTime(0.18, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.38);
    });
  }

  /**
   * Tsuppari-inspired slap burst (3 rapid thrust impacts)
   */
  public playSlapBurst() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    [0, 0.08, 0.16].forEach((dt) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t + dt);
      osc.frequency.exponentialRampToValueAtTime(80, t + dt + 0.06);
      gain.gain.setValueAtTime(0.24, t + dt);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.07);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + dt);
      osc.stop(t + dt + 0.08);
    });
  }

  /**
   * Taiko flourish on Festival Ready activation
   */
  public playTaikoFlourish() {
    if (!this.enabled) return;
    this.playTaiko(1.4);
    setTimeout(() => this.playTaiko(1.6), 80);
    setTimeout(() => this.playTaiko(1.8), 160);
    setTimeout(() => this.playHyoshigi(1.2), 240);
  }
}

export const sound = new SoundEngine();
