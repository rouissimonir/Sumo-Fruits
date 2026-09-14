/**
 * Procedural Web Audio Sound Engine for Sumo Fruits: The Bumper Bowl
 * Zero external asset dependencies - instant, crisp, responsive audio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private activeVoiceOscillators: OscillatorNode[] = [];
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

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.voiceGain.connect(this.masterGain);
    } catch {
      // Audio context might fail if restricted
    }
  }

  public stopRefereeVoice() {
    if (this.ctx && this.voiceGain) {
      try {
        const t = this.ctx.currentTime;
        this.voiceGain.gain.cancelScheduledValues(t);
        this.voiceGain.gain.setValueAtTime(0, t);
        // Reset gain slightly in the future for next call
        this.voiceGain.gain.setValueAtTime(1.0, t + 0.05);
      } catch {
        // Safe fallback
      }
    }
    for (const osc of this.activeVoiceOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped
      }
    }
    this.activeVoiceOscillators = [];
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setEnabled(!this.enabled);
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
   * Ring Out - dramatic downward slide whistle & heavy taiko rim thud
   */
  public playRingOut() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    // Downward pitch slide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.38);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.44);

    // Deep taiko thud on landing outside the clay
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(120, t + 0.12);
    thudOsc.frequency.exponentialRampToValueAtTime(35, t + 0.45);

    thudGain.gain.setValueAtTime(0.4, t + 0.12);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);
    thudOsc.start(t + 0.12);
    thudOsc.stop(t + 0.5);
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
   * Authentic Gyōji (Sumo Referee) synthesized vocal chant with priority vocal formants
   */
  public playRefereeCall(
    type:
      | 'hakkeyoi'
      | 'nokotta'
      | 'shobu'
      | 'yokozuna'
      | 'kinboshi'
      | 'personal_best'
      | 'kimarite'
      | 'fever'
      | 'kiyome'
  ) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const voiceDest = this.voiceGain || this.masterGain;

    if (type === 'hakkeyoi') {
      // Crisp Tachiai launch shout + rapid double Hyoshigi clappers
      this.playHyoshigi(1.0);
      setTimeout(() => this.playHyoshigi(1.15), 100);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(360, t + 0.26);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(voiceDest);
      this.activeVoiceOscillators.push(osc);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'nokotta') {
      // Steady rhythmic referee chant on edge danger / struggle
      this.playHyoshigi(0.9);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(230, t + 0.22);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(voiceDest);
      this.activeVoiceOscillators.push(osc);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === 'shobu') {
      // Match Result conclusion call - Shōbu Ari! (勝負あり)
      this.playTaiko(1.6);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.55);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(voiceDest);
      this.activeVoiceOscillators.push(osc);
      osc.start(t);
      osc.stop(t + 0.65);
    } else if (type === 'yokozuna') {
      // Tier 11 Pineapple Coronation - Yokozuna Shinjin! (横綱昇進)
      this.playYokozuna();
    } else if (type === 'kinboshi') {
      // Victorious Golden Star Kinboshi - Hyōshigi double strike + brass cry
      this.playHyoshigi(0.85);
      setTimeout(() => this.playHyoshigi(1.2), 120);
      this.playTaiko(1.5);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + idx * 0.07);
        gain.gain.setValueAtTime(0.22, t + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.4);
        osc.connect(gain);
        gain.connect(voiceDest);
        this.activeVoiceOscillators.push(osc);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.45);
      });
    } else if (type === 'personal_best') {
      // High score shattered - Saikō Tokuten! (最高得点)
      this.playTaikoFlourish();
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.06);
        gain.gain.setValueAtTime(0.2, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(voiceDest);
        this.activeVoiceOscillators.push(osc);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.4);
      });
    } else if (type === 'kimarite') {
      // Validated sumo technique awarded
      this.playHyoshigi(1.1);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.linearRampToValueAtTime(440, t + 0.18);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(voiceDest);
      this.activeVoiceOscillators.push(osc);
      osc.start(t);
      osc.stop(t + 0.28);
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

  /**
   * Authentic Taiko Drum Roll for high-stakes moments / Yokozuna
   */
  public playTaikoRoll() {
    if (!this.enabled) return;
    const count = 6;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playTaiko(0.9 + (i / count) * 0.7);
      }, i * 65);
    }
  }

  /**
   * Authentic Crowd Chanting: "YOI-SHO!" unison cadence
   */
  public playCrowdChant() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Layered formants simulating crowd resonance
    const formantFreqs = [180, 240, 360, 480];
    formantFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.88, t + 0.35);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700 + idx * 150, t);
      filter.Q.value = 3.0;

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.5);
    });

    // Followed by a sharp taiko beat
    setTimeout(() => this.playTaiko(1.3), 180);
  }

  /**
   * Curve Shot Sidespin whoosh (frequency glide)
   */
  public playCurveSpin(spin: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = spin > 0 ? 300 : 480;
    const endFreq = spin > 0 ? 560 : 260;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.22);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Ginko Magnet resonance chime
   */
  public playGinkoMagnet() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.04);
      gain.gain.setValueAtTime(0.12, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.42);
    });
  }
}

export const sound = new SoundEngine();
