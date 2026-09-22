/**
 * Procedural Web Audio Sound Engine for Sumo Fruits: The Bumper Bowl
 * Bundled Shamisen music with procedural, responsive impact effects.
 */

export type MusicScene = 'MENU' | 'GAMEPLAY' | 'BOSS' | 'VERSUS';

const MUSIC_TRACKS: Record<MusicScene, string> = {
  MENU: '/audio/natsu-matsuri.mp3',
  GAMEPLAY: '/audio/new-spring-loop.mp3',
  BOSS: '/audio/ancient-japan.mp3',
  VERSUS: '/audio/japan-taiko.mp3',
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicSceneGain: GainNode | null = null;
  private musicDuckGain: GainNode | null = null;
  private musicBuffers = new Map<MusicScene, AudioBuffer>();
  private musicLoads = new Map<MusicScene, Promise<AudioBuffer>>();
  private musicSource: AudioBufferSourceNode | null = null;
  private currentMusicScene: MusicScene | null = null;
  private requestedMusicScene: MusicScene = 'GAMEPLAY';
  private musicTransitionId = 0;
  private hypeGain: GainNode | null = null;
  private hypeTimer: number | null = null;
  private hypeLevel = 0;
  private lastImpactDuck = -1;
  private voiceGain: GainNode | null = null;
  private activeVoiceOscillators: OscillatorNode[] = [];
  private activeMusicOscillators = new Set<OscillatorNode>();
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicRequested = false;
  private musicEnabled = true;
  private musicVolume = 0.6;
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

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.getMusicGain(), this.ctx.currentTime);
      this.musicSceneGain = this.ctx.createGain();
      this.musicSceneGain.gain.setValueAtTime(1, this.ctx.currentTime);
      this.musicDuckGain = this.ctx.createGain();
      this.musicGain.connect(this.musicSceneGain);
      this.musicSceneGain.connect(this.musicDuckGain);
      this.musicDuckGain.connect(this.ctx.destination);

      this.hypeGain = this.ctx.createGain();
      this.hypeGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.hypeGain.connect(this.musicGain);

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

  private getMusicGain(): number {
    return this.musicEnabled ? this.musicVolume * 0.35 : 0;
  }

  /** Make room for impacts without changing the player's volume setting. */
  private duckMusic(amount: number, seconds: number): void {
    if (!this.enabled || !this.ctx || !this.musicDuckGain) return;
    const t = this.ctx.currentTime;
    const gain = this.musicDuckGain.gain;
    gain.cancelAndHoldAtTime(t);
    gain.linearRampToValueAtTime(amount, t + 0.025);
    gain.setTargetAtTime(1, t + seconds, 0.18);
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.getMusicGain(), this.ctx.currentTime, 0.04);
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.getMusicGain(), this.ctx.currentTime, 0.04);
    }
    if (enabled) this.ensureMusicLoop();
  }

  /** Load the bundled loop once, after audio has been unlocked by a gesture. */
  public startMusic(): void {
    this.musicRequested = true;
    this.init();
    this.ensureMusicLoop();
  }

  /** Selects music from gameplay state; repeated calls do not restart a track. */
  public setMusicScene(scene: MusicScene): void {
    if (this.requestedMusicScene === scene) return;
    this.requestedMusicScene = scene;
    this.musicTransitionId++;
    this.updateHypeLayer();
    this.init();
    this.ensureMusicLoop();
  }

  /** Hype percussion fades in only near a full crowd meter. */
  public setHypeLevel(level: number): void {
    this.hypeLevel = Math.max(0, Math.min(1, level));
    this.updateHypeLayer();
  }

  private updateHypeLayer(): void {
    if (!this.ctx || !this.hypeGain) return;
    const allowed = this.requestedMusicScene === 'GAMEPLAY' && this.hypeLevel >= 0.75;
    const strength = allowed ? (this.hypeLevel - 0.75) / 0.25 : 0;
    this.hypeGain.gain.setTargetAtTime(strength * 0.32, this.ctx.currentTime, 0.18);
    if (allowed && this.hypeTimer === null) {
      this.scheduleHypeBeat();
      this.hypeTimer = window.setInterval(() => this.scheduleHypeBeat(), 480);
    } else if (!allowed && this.hypeTimer !== null) {
      window.clearInterval(this.hypeTimer);
      this.hypeTimer = null;
    }
  }

  private scheduleHypeBeat(): void {
    if (!this.ctx || !this.hypeGain || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.015;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.hypeGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  private loadMusicScene(scene: MusicScene): Promise<AudioBuffer> {
    const cached = this.musicBuffers.get(scene);
    if (cached) return Promise.resolve(cached);
    const loading = this.musicLoads.get(scene);
    if (loading) return loading;
    const request = fetch(MUSIC_TRACKS[scene])
      .then(response => {
        if (!response.ok) throw new Error(`Music asset unavailable: ${scene}`);
        return response.arrayBuffer();
      })
      .then(bytes => this.ctx!.decodeAudioData(bytes))
      .then(buffer => {
        this.musicBuffers.set(scene, buffer);
        this.musicLoads.delete(scene);
        return buffer;
      })
      .catch(error => {
        this.musicLoads.delete(scene);
        throw error;
      });
    this.musicLoads.set(scene, request);
    return request;
  }

  private ensureMusicLoop(): void {
    if (
      !this.musicRequested ||
      !this.musicEnabled ||
      !this.ctx ||
      !this.musicGain ||
      this.ctx.state !== 'running' ||
      (typeof document !== 'undefined' && document.hidden)
    ) return;

    if (this.musicSource && this.currentMusicScene === this.requestedMusicScene) return;

    const scene = this.requestedMusicScene;
    const transitionId = this.musicTransitionId;
    void this.loadMusicScene(scene)
      .then(buffer => {
        if (transitionId !== this.musicTransitionId || scene !== this.requestedMusicScene) return;
        this.transitionToMusic(scene, buffer);
      })
      .catch(() => {
        // Original ambience remains available if a bundled track cannot decode.
        if (!this.musicSource && this.musicTimer === null) {
          this.scheduleMusicPhrase();
          this.musicTimer = window.setInterval(() => this.scheduleMusicPhrase(), 4800);
        }
      });
  }

  private transitionToMusic(scene: MusicScene, buffer: AudioBuffer): void {
    if (!this.ctx || !this.musicGain || !this.musicSceneGain) return;
    const oldSource = this.musicSource;
    const oldScene = this.currentMusicScene;
    const t = this.ctx.currentTime;
    const fadeSeconds = oldSource ? 0.45 : 0.12;
    this.pauseMusicLoop();
    this.musicSceneGain.gain.cancelScheduledValues(t);
    this.musicSceneGain.gain.setValueAtTime(this.musicSceneGain.gain.value, t);
    this.musicSceneGain.gain.linearRampToValueAtTime(0.0001, t + fadeSeconds);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start(t + fadeSeconds);
    this.musicSource = source;
    this.currentMusicScene = scene;
    this.musicSceneGain.gain.setValueAtTime(0.0001, t + fadeSeconds);
    this.musicSceneGain.gain.linearRampToValueAtTime(1, t + fadeSeconds + 0.65);
    if (oldSource) {
      window.setTimeout(() => {
        try { oldSource.stop(); } catch { /* Already stopped. */ }
        oldSource.disconnect();
        if (oldScene && oldScene !== scene) this.musicBuffers.delete(oldScene);
      }, Math.ceil((fadeSeconds + 0.05) * 1000));
    }
  }

  private scheduleMusicPhrase(): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running' || !this.musicEnabled) return;

    // A sparse in-sen-inspired pentatonic phrase. It stays deliberately quiet so impacts and callouts lead.
    const phrases = [
      [220.0, 261.63, 329.63, 293.66],
      [196.0, 246.94, 293.66, 261.63],
      [220.0, 293.66, 329.63, 392.0],
      [196.0, 220.0, 293.66, 246.94],
    ];
    const notes = phrases[this.musicStep % phrases.length];
    this.musicStep++;
    const start = this.ctx.currentTime + 0.03;

    notes.forEach((frequency, index) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const gain = this.ctx!.createGain();
      const noteStart = start + index * 1.08;

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency, noteStart);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1050, noteStart);
      filter.Q.setValueAtTime(0.7, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.32 : 0.22, noteStart + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);
      this.activeMusicOscillators.add(osc);
      osc.onended = () => this.activeMusicOscillators.delete(osc);
      osc.start(noteStart);
      osc.stop(noteStart + 1.4);
    });
  }

  private pauseMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const osc of this.activeMusicOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // The note may have already ended.
      }
    }
    this.activeMusicOscillators.clear();
  }

  public toggleMute(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public suspend() {
    this.pauseMusicLoop();
    if (this.ctx?.state === 'running') {
      void this.ctx.suspend().catch(() => {
        // The platform may already be suspending audio while backgrounded.
      });
    }
  }

  public resume() {
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume().then(() => this.ensureMusicLoop()).catch(() => {});
    } else {
      this.ensureMusicLoop();
    }
  }

  /**
   * Hardware-level Web Audio unlock for iOS Safari / WKWebView.
   * Plays a 1-sample silent buffer on user gesture to wake the hardware bus.
   */
  public unlockAudio() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => this.ensureMusicLoop()).catch(() => {});
    } else {
      this.ensureMusicLoop();
    }
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch {
      // Ignored
    }
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
    if (speed > 150 && t - this.lastImpactDuck > 0.3) {
      this.lastImpactDuck = t;
      this.duckMusic(0.65, 0.08);
    }
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
    this.duckMusic(0.45, 0.3);
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
    this.duckMusic(0.4, 0.35);
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

  /** Four-second ceremonial reward sting: taiko pickup, rising shamisen-like notes, final clap. */
  public playRewardFanfare(): void {
    if (!this.musicEnabled) return;
    this.init();
    if (!this.ctx || !this.musicDuckGain || !this.musicSceneGain) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + 0.03;
    const fanfareBus = ctx.createGain();
    fanfareBus.gain.setValueAtTime(this.getMusicGain() * 1.2, start);
    fanfareBus.connect(this.musicDuckGain);

    const background = this.musicSceneGain.gain;
    background.cancelScheduledValues(start);
    background.setTargetAtTime(0.32, start, 0.08);
    background.setTargetAtTime(1, start + 4.1, 0.28);

    [0, 0.22, 0.44, 2.7, 2.9, 3.1].forEach((offset, index) => {
      const drum = ctx.createOscillator();
      const drumGain = ctx.createGain();
      const t = start + offset;
      drum.type = 'sine';
      drum.frequency.setValueAtTime(index < 3 ? 105 : 135, t);
      drum.frequency.exponentialRampToValueAtTime(46, t + 0.2);
      drumGain.gain.setValueAtTime(index === 5 ? 0.95 : 0.68, t);
      drumGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      drum.connect(drumGain);
      drumGain.connect(fanfareBus);
      drum.start(t);
      drum.stop(t + 0.3);
    });

    [392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const note = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const t = start + 0.65 + index * 0.48;
      note.type = index % 2 === 0 ? 'triangle' : 'sine';
      note.frequency.setValueAtTime(frequency, t);
      noteGain.gain.setValueAtTime(0.001, t);
      noteGain.gain.exponentialRampToValueAtTime(0.34, t + 0.035);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      note.connect(noteGain);
      noteGain.connect(fanfareBus);
      note.start(t);
      note.stop(t + 0.55);
    });

    window.setTimeout(() => fanfareBus.disconnect(), 4700);
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
    this.duckMusic(0.3, 1.2);

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
   * Life Regained / 1UP Flourish sound: sacred ascending pentatonic bells + taiko drum
   */
  public playLifeGain() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Japanese Yo-scale inspired ascending shimmer: D5, F5, G5, A5, C6, D6
    const freqs = [587.33, 698.46, 783.99, 880.0, 1046.5, 1174.66];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.065);
      gain.gain.setValueAtTime(0.22, t + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.065 + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.065);
      osc.stop(t + idx * 0.065 + 0.48);
    });
    // Add warm supportive taiko bass at the peak
    setTimeout(() => this.playTaiko(1.2), 200);
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

// Auto-register one-time unlock handlers for iOS Web Audio
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'keydown', 'mousedown'];
  const handleUnlock = () => {
    sound.unlockAudio();
    unlockEvents.forEach((ev) => window.removeEventListener(ev, handleUnlock, { capture: true }));
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, handleUnlock, { capture: true, passive: true }));
}
