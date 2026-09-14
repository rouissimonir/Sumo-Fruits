import { sound } from '../audio/soundEffects';
import { haptics } from '../audio/haptics';
import { KimariteManager, KimariteTechnique } from './KimariteManager';
import {
  ArenaConfig,
  calculateChiliBoost,
  calculateSaltBraking,
  createMawashiTail,
  createStrawBales,
  DEFAULT_ARENA,
  getBaleState,
  getBowlAcceleration,
  getBowlMetrics,
  getSquashScale,
  predictTrajectory,
  stepMawashiTail,
} from '../physics/bowlMotion';
import { FusionResult, MergeClashManager } from '../physics/mergeClashManager';
import {
  ArenaMode,
  FRUIT_CATALOG,
  FruitTierData,
  GameModeType,
  HazardInstance,
  HazardKind,
  Particle,
  PhysicsTuning,
  RefereeCall,
  RivalIntent,
  RivalProfile,
  SaltZone,
  StrawBale,
  SumoFruitInstance,
  TechniqueRibbon,
  TrajectoryPoint,
} from '../types/game';
import { CareerManager } from './CareerManager';
import { RefereeDirector } from './RefereeDirector';
import { RIVAL_PROFILES, RivalSumoController } from './RivalSumo';
import { TechniqueRibbonManager } from './TechniqueRibbonManager';

export interface GameStats {
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  lives: number;
  occupancy: number; // 0.0 to > 1.0
  overflowTimer: number; // 0 to 2.0s
  isOverflowing: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  gameOverReason: string;
  nextTiers: [number, number];
  currentLoadedTier: number;
  highestTierReached: number;
  arenaMode: ArenaMode;
  gameMode: GameModeType;
  saltCharges: number;
  maxSaltCharges: number;
  saltLaunchCount: number;
  isSaltTargeting: boolean;
  comboCount: number;
  comboMultiplier: number;
  crowdHype: number;
  isFever: boolean;
  feverTimer: number;
  festivalReadyShots: number;
  activeRefereeCall: RefereeCall | null;
  activeRibbons: TechniqueRibbon[];
  strawBales: StrawBale[];
  tuning: PhysicsTuning;
  careerStageIndex: number;
  careerStageCount: number;
  currentRivalProfile: RivalProfile | null;
  hasActiveRival: boolean;
  rivalIntent: RivalIntent | null;
  activeChallengeId: string | null;
  launcherSpin: number; // -1 to +1 (English sidespin bias)
  unlockedKimariteCount: number;
  totalKimariteCount: number;
}

export class GameEngine {
  public arena: ArenaConfig = { ...DEFAULT_ARENA };
  public fruits: SumoFruitInstance[] = [];
  public hazards: HazardInstance[] = [];
  public particles: Particle[] = [];
  public saltZones: SaltZone[] = [];
  public strawBales: StrawBale[] = createStrawBales(16, 3);
  public mergeManager: MergeClashManager = new MergeClashManager();

  // Subsystems
  public careerManager: CareerManager = new CareerManager();
  public rivalController: RivalSumoController = new RivalSumoController();
  public refereeDirector: RefereeDirector = new RefereeDirector();
  public techniqueRibbons: TechniqueRibbonManager = new TechniqueRibbonManager();
  public kimariteManager: KimariteManager = new KimariteManager();
  public gameMode: GameModeType = 'CLASSIC';
  public activeChallengeId: string | null = null;

  // Launcher state & Shot Lifecycle
  public launcherPos = { x: 450, y: 760 }; // Below the bowl
  public dragPos = { x: 450, y: 760 };
  public isDragging = false;
  public loadedFruit: SumoFruitInstance | null = null;
  public upcomingTiers: [number, number] = [1, 2];
  public trajectoryPoints: TrajectoryPoint[] = [];
  public launcherSpin: number = 0; // -1 to +1 (English curve spin)

  // Shot state machine
  public shotState: 'IDLE' | 'AIMING' | 'LAUNCHED' | 'CHAIN_RESOLVING' | 'RIVAL_ACTION' | 'SETTLING' = 'IDLE';
  public shotSettlementTimer = 0;
  public bonusRechargeGrantedThisShot = false;
  public bankShotDetected = false;
  public shotInitialMergeDone = false;

  // Game stats
  public score = 0;
  public highScore = 0;
  public isNewHighScore = false;
  public lives = 3;
  public overflowTimer = 0;
  public isOverflowing = false;
  public isPaused = false;
  public isGameOver = false;
  public gameOverReason = '';
  public highestTier = 1;

  // Salt Throw Ability (1 charge starting, 1 max, 6 launches to refill)
  public saltCharges = 1;
  public maxSaltCharges = 1;
  public saltLaunchCount = 0;
  public isSaltTargeting = false;
  public saltTargetPos = { x: 0, y: 0 };

  // Combo & Crowd Hype
  public comboCount = 0;
  public comboMultiplier = 1;
  public comboTimer = 0;
  public crowdHype = 0; // 0 to 100
  public currentShotHypeGained = 0; // capped at 30/shot
  public isFever = false;
  public feverTimer = 0;
  public festivalReadyShots = 0; // Next 3 shots double merge score
  private feverPulseTimer = 0;

  // Gyōji (Sumo Referee) Callouts
  public activeRefereeCall: RefereeCall | null = null;

  // Physics Tuning
  public tuning: PhysicsTuning = {
    slopeK: 0.55,
    escapeSpeed: 220,
    clashDuration: 0.5,
    hitStopScale: 0.05,
    shockwaveImpulse: 380,
    baleMaxHealth: 3,
    restitution: 0.78,
    rimDamping: 0.65,
  };

  // Juice & Camera Trauma
  public cameraTrauma = 0;
  public cameraOffset = { x: 0, y: 0 };
  public hitStopRemaining = 0; // seconds
  public ringOutFlashTimer = 0; // Dramatic red/amber screen flash on ring-out
  public kinboshiFlashTimer = 0; // Golden flash on rival ring-out victory

  // Settings
  public reducedMotion = false;

  private nextEntityId = 1;
  private totalShots = 0;
  private hazardSpawnCooldown = 3.5;
  private rivalSpawnTimer = 16.0;

  // Listeners for UI state updates
  public onStatsChange: ((stats: GameStats) => void) | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem('sumo_suika_high_score');
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // localStorage may fail in restricted environments
    }

    this.upcomingTiers = [this.rollSpawnTier(), this.rollSpawnTier()];
    this.strawBales = createStrawBales(16, this.tuning.baleMaxHealth);
    this.loadNextFruit();

    this.kimariteManager.onUnlock = (tech) => {
      this.techniqueRibbons.addRibbon(
        `決まり手解禁: ${tech.title}!`,
        `${tech.nameRomaji} (${tech.nameJp}) technique mastered!`,
        '#FFD700',
        4.0,
        tech.nameJp,
        '🥋',
        tech.category
      );
      this.refereeDirector.triggerCall('決まり手', tech.nameRomaji.toUpperCase(), tech.title, '#FFD700', 'YOKOZUNA');
      this.activeRefereeCall = this.refereeDirector.getActiveCall();
      sound.playTaikoRoll();
      haptics.trigger('FUSION');
      this.triggerCameraTrauma(0.25);
    };
  }

  public setArenaSize(width: number, height: number) {
    // Keep arena centered and scaled nicely for any screen width
    const minDim = Math.min(width, height);
    const radius = Math.max(180, Math.min(330, (minDim - 140) * 0.46));
    const centerX = width / 2;
    const centerY = Math.max(radius + 50, height * 0.44);

    this.arena = {
      ...this.arena,
      centerX,
      centerY,
      radius,
      radiusX: this.arena.mode === 'ELLIPTICAL' ? radius * 1.25 : radius,
      radiusY: this.arena.mode === 'ELLIPTICAL' ? radius * 0.85 : radius,
      slopeK: this.tuning.slopeK,
      escapeSpeedThreshold: this.tuning.escapeSpeed,
      capacityFactor: 0.82,
    };

    this.launcherPos = {
      x: centerX,
      y: Math.min(height - 65, centerY + radius + 75),
    };

    if (this.loadedFruit && this.loadedFruit.state === 'IDLE') {
      this.loadedFruit.x = this.launcherPos.x;
      this.loadedFruit.y = this.launcherPos.y;
    }
  }

  public setArenaMode(mode: ArenaMode) {
    this.arena.mode = mode;
    if (mode === 'ELLIPTICAL') {
      this.arena.radiusX = this.arena.radius * 1.25;
      this.arena.radiusY = this.arena.radius * 0.85;
    } else {
      this.arena.radiusX = this.arena.radius;
      this.arena.radiusY = this.arena.radius;
      this.arena.wobbleX = 0;
      this.arena.wobbleY = 0;
    }
    sound.playHyoshigi(1.2);
    this.emitStats();
  }

  public updateTuning(newTuning: Partial<PhysicsTuning>) {
    this.tuning = { ...this.tuning, ...newTuning };
    this.arena.slopeK = this.tuning.slopeK;
    this.arena.escapeSpeedThreshold = this.tuning.escapeSpeed;
    this.emitStats();
  }

  public setGameMode(mode: GameModeType, challengeId?: string) {
    this.gameMode = mode;
    this.activeChallengeId = challengeId || null;
    this.restart();

    if (mode === 'CAREER') {
      const stage = this.careerManager.getCurrentStage();
      this.setArenaMode(stage.arenaMode);
      this.rivalController.setProfile(stage.rival);
      this.spawnCareerRival();
      this.triggerRefereeCall('本場所', 'BANZUKE BOUT', stage.name, '#FFD700', 'hakkeyoi');
    } else if (mode === 'CHALLENGE' && challengeId) {
      if (challengeId === 'WOBBLE_SEA') {
        this.setArenaMode('WOBBLE');
      } else if (challengeId === 'BROKEN_TAWARA') {
        this.setArenaMode('CIRCULAR');
        [0, 4, 8, 12].forEach((idx) => {
          if (this.strawBales[idx]) this.strawBales[idx].health = 0;
        });
      }
      this.triggerRefereeCall('巡業', 'FESTIVAL CHALLENGE', challengeId.replace('_', ' '), '#E74C3C', 'shobu');
    } else {
      this.setArenaMode('CIRCULAR');
      this.triggerRefereeCall('初日', 'CLASSIC BOWL', 'Traditional Dohyō Bout', '#2ECC71', 'hakkeyoi');
    }
    this.emitStats();
  }

  public spawnCareerRival() {
    // Remove existing rivals
    this.fruits = this.fruits.filter((f) => f.team !== 'RIVAL');
    const rivalFruit = this.rivalController.spawnRival(this.arena, this.nextEntityId++);
    this.fruits.push(rivalFruit);
    this.spawnSparks(rivalFruit.x, rivalFruit.y, this.rivalController.profile.color, 25);
  }

  public triggerRefereeCall(
    textJp: string,
    textRomaji: string,
    subText: string,
    color: string,
    soundType?: 'hakkeyoi' | 'nokotta' | 'shobu' | 'fever' | 'kinboshi' | 'kiyome'
  ) {
    this.refereeDirector.triggerCall(textJp, textRomaji, subText, color, 'ORDINARY', 1.8);
    this.activeRefereeCall = this.refereeDirector.getActiveCall();
    if (soundType) {
      sound.playRefereeCall(soundType);
    }
    this.emitStats();
  }

  public addHype(amount: number) {
    if (this.festivalReadyShots > 0) return; // Frozen during active festival

    const allowed = Math.min(amount, Math.max(0, 30 - this.currentShotHypeGained));
    this.currentShotHypeGained += allowed;
    this.crowdHype = Math.min(100, this.crowdHype + allowed);

    if (this.crowdHype >= 100 && this.festivalReadyShots <= 0) {
      this.festivalReadyShots = 3;
      this.crowdHype = 0;
      this.refereeDirector.triggerCall('大入り', 'FESTIVAL READY!', 'NEXT 3 SHOTS 2X MERGE SCORE!', '#FFD700', 'YOKOZUNA');
      this.activeRefereeCall = this.refereeDirector.getActiveCall();
      sound.playTaikoFlourish();
      this.spawnConfetti(this.arena.centerX, this.arena.centerY, 60);
      this.triggerCameraTrauma(0.35);
    }
    this.emitStats();
  }

  // Sacred Salt Ability
  public enterSaltTargeting() {
    if (this.saltCharges <= 0 || this.isGameOver || this.isPaused) return;
    this.isSaltTargeting = true;
    this.saltTargetPos = { x: this.arena.centerX, y: this.arena.centerY };
    this.emitStats();
  }

  public cancelSaltTargeting() {
    this.isSaltTargeting = false;
    this.emitStats();
  }

  public throwSalt(targetX?: number, targetY?: number): boolean {
    if (this.saltCharges <= 0 || this.isGameOver || this.isPaused) return false;

    // Deduct charge
    this.saltCharges = 0;
    this.saltLaunchCount = 0;
    this.isSaltTargeting = false;

    const x = targetX ?? this.saltTargetPos.x ?? this.arena.centerX;
    const y = targetY ?? this.saltTargetPos.y ?? this.arena.centerY;
    const radius = 90; // 90px footprint as requested

    // 1 salt zone at a time
    this.saltZones = [];
    this.saltZones.push({
      id: this.nextEntityId++,
      x,
      y,
      radius,
      duration: 6.0,
      maxDuration: 6.0,
      activeInPlay: true,
    });

    // Dissolve non-rival hazards inside salt radius (25% knockout score, 0 recharge, no combo advance)
    for (const h of this.hazards) {
      if (h.ringOut || h.kind === 'CHILI' || h.kind === 'RIVAL') continue;
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < radius + h.radius) {
        h.ringOut = true;
        const bonus = Math.round(h.scoreValue * 0.25);
        this.score += bonus;
        this.spawnSparks(h.x, h.y, '#FFFFFF', 16);
        if (h.kind === 'WASABI') {
          sound.playHazardClear();
          this.techniqueRibbons.addRibbon('Wasabi Purified!', 'Sacred Salt dissolved the sticky sludge!', '#4B69FD');
        }
      }
    }

    // Shimmering salt crystal particles
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 45,
        vy: -20 - Math.random() * 45,
        color: '#FFFFFF',
        size: 2.5 + Math.random() * 3.5,
        life: 0.8 + Math.random() * 0.6,
        maxLife: 1.4,
        type: 'SALT',
      });
    }

    sound.playSaltThrow();
    this.refereeDirector.triggerCall('清め', 'KIYOME-NO-SHIO', 'Sacred Salt Zone Purified!', '#4B69FD', 'ORDINARY');
    this.activeRefereeCall = this.refereeDirector.getActiveCall();
    this.techniqueRibbons.addRibbon('Sacred Salt', 'Dohyō purified with Kiyome-no-Shio', '#4B69FD');
    this.triggerCameraTrauma(0.12);
    this.emitStats();
    return true;
  }

  private rollSpawnTier(): number {
    // Spawnable tiers are 1-3
    const r = Math.random();
    if (r < 0.55) return 1;
    if (r < 0.85) return 2;
    return 3;
  }

  public addScore(amount: number) {
    this.score += amount;
    if (this.score > this.highScore) {
      const wasRecord = this.isNewHighScore;
      this.highScore = this.score;
      this.isNewHighScore = true;
      try {
        localStorage.setItem('sumo_suika_high_score', this.highScore.toString());
      } catch {
        // storage fallback
      }

      if (!wasRecord && this.highScore >= 1000) {
        this.techniqueRibbons.addRibbon(
          'New High Score Record!',
          `Record shattered: ${this.highScore.toLocaleString()} pts!`,
          '#FFD700',
          3.5,
          '最高',
          '🏆'
        );
        this.refereeDirector.triggerCall('最高得点', 'NEW RECORD!', `${this.highScore.toLocaleString()} PTS!`, '#FFD700', 'YOKOZUNA');
        this.activeRefereeCall = this.refereeDirector.getActiveCall();
        sound.playTaikoFlourish();
        this.spawnConfetti(this.arena.centerX, this.arena.centerY - 50, 40);
      }
    }
  }

  public restart() {
    this.fruits = [];
    this.hazards = [];
    this.particles = [];
    this.saltZones = [];
    this.strawBales = createStrawBales(16, this.tuning.baleMaxHealth);
    this.mergeManager.clear();
    this.score = 0;
    this.isNewHighScore = false;
    this.lives = 3;
    this.overflowTimer = 0;
    this.isOverflowing = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.gameOverReason = '';
    this.cameraTrauma = 0;
    this.totalShots = 0;
    this.highestTier = 1;
    this.saltCharges = 1;
    this.maxSaltCharges = 1;
    this.saltLaunchCount = 0;
    this.isSaltTargeting = false;
    this.shotState = 'IDLE';
    this.shotSettlementTimer = 0;
    this.bonusRechargeGrantedThisShot = false;
    this.bankShotDetected = false;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.crowdHype = 0;
    this.currentShotHypeGained = 0;
    this.isFever = false;
    this.feverTimer = 0;
    this.festivalReadyShots = 0;
    this.activeRefereeCall = null;
    this.refereeDirector.clear();
    this.techniqueRibbons.clear();
    this.upcomingTiers = [this.rollSpawnTier(), this.rollSpawnTier()];
    this.loadNextFruit();
    this.emitStats();
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.emitStats();
    return this.isPaused;
  }

  public loadNextFruit() {
    const tier = this.upcomingTiers[0];
    this.upcomingTiers = [this.upcomingTiers[1], this.rollSpawnTier()];

    const catalog = FRUIT_CATALOG[tier - 1];
    const fruit: SumoFruitInstance = {
      id: this.nextEntityId++,
      tier,
      x: this.launcherPos.x,
      y: this.launcherPos.y,
      vx: 0,
      vy: 0,
      state: 'IDLE',
      team: 'PLAYER',
      entryPending: true,
      rimPermission: false,
      clashId: null,
      squash: { amplitude: 0, normalX: 0, normalY: 0, elapsed: 0, active: false },
      ripple: { elapsed: 0, impactAngle: 0, active: false },
      leftTail: createMawashiTail(
        this.launcherPos.x - catalog.radius * 0.4,
        this.launcherPos.y + catalog.radius * 0.7,
        catalog.radius
      ),
      rightTail: createMawashiTail(
        this.launcherPos.x + catalog.radius * 0.4,
        this.launcherPos.y + catalog.radius * 0.7,
        catalog.radius
      ),
      fallProgress: 0,
      lookTarget: null,
      panic: false,
      hasEnteredRing: false,
      wasInRimDanger: false,
      nearRimSaved: false,
    };

    this.loadedFruit = fruit;
    this.dragPos = { x: this.launcherPos.x, y: this.launcherPos.y };
    this.updateTrajectory();
    this.emitStats();
  }

  // Pointer interactions
  public handlePointerDown(x: number, y: number): boolean {
    if (this.isGameOver || this.isPaused || !this.loadedFruit) return false;

    // Check if clicked close to launcher/loaded fruit
    const dist = Math.hypot(x - this.launcherPos.x, y - this.launcherPos.y);
    const cat = FRUIT_CATALOG[this.loadedFruit.tier - 1];

    if (dist <= cat.radius + 35) {
      this.isDragging = true;
      this.loadedFruit.state = 'AIMING';
      this.handlePointerMove(x, y);
      sound.playSlingshotStretch(1.0);
      return true;
    }
    return false;
  }

  public handlePointerMove(x: number, y: number) {
    if (!this.isDragging || !this.loadedFruit) return;

    // Drag vector d = x_pointer - x_origin
    const dx = x - this.launcherPos.x;
    const dy = y - this.launcherPos.y;
    const dist = Math.hypot(dx, dy);
    const maxPull = 180;

    if (dist > maxPull) {
      this.dragPos = {
        x: this.launcherPos.x + (dx / dist) * maxPull,
        y: this.launcherPos.y + (dy / dist) * maxPull,
      };
    } else {
      this.dragPos = { x, y };
    }

    // Calculate English sidespin bias (-1 to +1) based on horizontal offset dx normalized by pull
    // When pulling back downwards (dy > 0), dragging left/right imparts lateral spin
    const lateralOffset = (this.dragPos.x - this.launcherPos.x) / 80;
    const prevSpin = this.launcherSpin;
    this.launcherSpin = Math.max(-1.0, Math.min(1.0, lateralOffset));

    if (Math.abs(this.launcherSpin - prevSpin) > 0.35) {
      haptics.trigger('TICK');
    }

    this.loadedFruit.x = this.dragPos.x;
    this.loadedFruit.y = this.dragPos.y;
    this.updateTrajectory();
  }

  public handlePointerUp(): boolean {
    if (!this.isDragging || !this.loadedFruit) return false;
    this.isDragging = false;

    const dx = this.dragPos.x - this.launcherPos.x;
    const dy = this.dragPos.y - this.launcherPos.y;
    const pullDist = Math.hypot(dx, dy);
    const minPull = 14;

    if (pullDist >= minPull) {
      // Spring coefficient k_spring = 12
      const kSpring = 12.8;
      const impulseMag = kSpring * pullDist;
      const dirX = -dx / pullDist;
      const dirY = -dy / pullDist;

      const cat = FRUIT_CATALOG[this.loadedFruit.tier - 1];
      const launchVx = (dirX * impulseMag) / cat.mass;
      const launchVy = (dirY * impulseMag) / cat.mass;

      this.loadedFruit.vx = launchVx;
      this.loadedFruit.vy = launchVy;
      // Set English spin on the launched fruit (up to 12 rad/s)
      this.loadedFruit.spin = this.launcherSpin * 12.0;
      this.loadedFruit.rotation = 0;
      this.loadedFruit.state = 'IN_RING';
      this.loadedFruit.entryPending = true;
      this.loadedFruit.hasEnteredRing = false;
      this.loadedFruit.wasInRimDanger = false;
      this.loadedFruit.nearRimSaved = false;
      this.loadedFruit.panic = false;
      this.loadedFruit.rimPermission = true; // Allowed to cross rim to enter

      this.fruits.push(this.loadedFruit);
      this.totalShots++;

      // Mobile tactile feel
      haptics.trigger('LIGHT');

      // Sidespin audio cue
      if (Math.abs(this.launcherSpin) > 0.25) {
        sound.playCurveSpin(this.launcherSpin);
      }

      // Shot lifecycle setup
      this.shotState = 'LAUNCHED';
      this.shotSettlementTimer = 0;
      this.bonusRechargeGrantedThisShot = false;
      this.bankShotDetected = false;
      this.shotInitialMergeDone = false;
      this.currentShotHypeGained = 0;

      // Sacred Salt charge: refills through 6 committed launches
      if (this.saltCharges < this.maxSaltCharges) {
        this.saltLaunchCount++;
        if (this.saltLaunchCount >= 6) {
          this.saltCharges = 1;
          this.saltLaunchCount = 0;
          this.techniqueRibbons.addRibbon(
            'Salt Ready!',
            'Kiyome-no-Shio replenished!',
            '#4B69FD',
            2.5,
            '清塩',
            '🧂',
            'RECHARGE'
          );
          sound.playTaikoFlourish();
          haptics.trigger('MEDIUM');
        }
      }

      // Festival Shot consuming
      if (this.festivalReadyShots > 0) {
        this.festivalReadyShots--;
        sound.playTaikoFlourish();
        this.techniqueRibbons.addRibbon(
          'Festival Shot!',
          '2x Merge Score Activated!',
          '#FFD700',
          2.5,
          '祭',
          '⚡',
          'FEVER'
        );
        haptics.trigger('MEDIUM');
      }

      // Notify Rival Controller (never retargets mid-shot; executes or plans)
      this.rivalController.onPlayerLaunchCommitted(this.arena, this.fruits);

      sound.playLaunch(cat.mass);
      this.triggerCameraTrauma(0.08);

      // Gyōji callout: HAKKEYOI!
      this.triggerRefereeCall('発気揚々', 'HAKKEYOI!', 'TACHIAI CHARGE!', '#2ECC71', 'hakkeyoi');

      this.loadedFruit = null;
      this.trajectoryPoints = [];
      this.launcherSpin = 0;

      // Cooldown before loading next fruit (ensures smooth shot rhythm)
      setTimeout(() => {
        if (!this.isGameOver && !this.loadedFruit) {
          this.loadNextFruit();
        }
      }, 550);

      return true;
    } else {
      // Released without sufficient pull -> return to origin
      this.loadedFruit.x = this.launcherPos.x;
      this.loadedFruit.y = this.launcherPos.y;
      this.loadedFruit.state = 'IDLE';
      this.trajectoryPoints = [];
      this.launcherSpin = 0;
      return false;
    }
  }

  private updateTrajectory() {
    if (!this.loadedFruit || !this.isDragging) {
      this.trajectoryPoints = [];
      return;
    }

    const dx = this.dragPos.x - this.launcherPos.x;
    const dy = this.dragPos.y - this.launcherPos.y;
    const pullDist = Math.hypot(dx, dy);

    if (pullDist < 12) {
      this.trajectoryPoints = [];
      return;
    }

    const kSpring = 12.8;
    const impulseMag = kSpring * pullDist;
    const dirX = -dx / pullDist;
    const dirY = -dy / pullDist;

    const cat = FRUIT_CATALOG[this.loadedFruit.tier - 1];
    const launchVx = (dirX * impulseMag) / cat.mass;
    const launchVy = (dirY * impulseMag) / cat.mass;

    const obstacles = this.fruits
      .filter((f) => f.state === 'IN_RING' || f.state === 'CLASHING')
      .map((f) => ({
        x: f.x,
        y: f.y,
        radius: FRUIT_CATALOG[f.tier - 1].radius,
      }));

    this.trajectoryPoints = predictTrajectory(
      this.launcherPos.x,
      this.launcherPos.y,
      launchVx,
      launchVy,
      cat,
      obstacles,
      this.arena,
      1.2,
      45,
      this.launcherSpin * 12.0
    );
  }

  // Camera Shake & Hit-stop
  public triggerCameraTrauma(amount: number) {
    if (this.reducedMotion) return;
    this.cameraTrauma = Math.min(1.0, this.cameraTrauma + amount);
  }

  public triggerHitStop(seconds: number) {
    this.hitStopRemaining = Math.max(this.hitStopRemaining, seconds);
  }

  /**
   * Main simulation step. Called at 60-120Hz.
   */
  public update(realDt: number) {
    if (this.isPaused || this.isGameOver) return;

    // Handle hit-stop (Engine.time_scale = 0.05 during hit-stop)
    let timeScale = 1.0;
    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= realDt;
      timeScale = this.tuning.hitStopScale;
    }
    const dt = realDt * timeScale;

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.comboMultiplier = 1;
      }
    }

    // Fever Mode timer decay
    if (this.isFever) {
      this.feverTimer -= dt;
      this.feverPulseTimer += dt;
      if (this.feverPulseTimer >= 0.8) {
        this.feverPulseTimer = 0;
        sound.playRefereeCall('fever');
      }
      if (this.feverTimer <= 0) {
        this.isFever = false;
        this.crowdHype = 0;
      }
    }

    // Gyōji banner timer decay
    if (this.activeRefereeCall) {
      this.activeRefereeCall.duration -= dt;
      if (this.activeRefereeCall.duration <= 0) {
        this.activeRefereeCall = null;
      }
    }

    // Salt zones decay
    for (let i = this.saltZones.length - 1; i >= 0; i--) {
      this.saltZones[i].duration -= dt;
      if (this.saltZones[i].duration <= 0) {
        this.saltZones.splice(i, 1);
      }
    }

    // Dynamic Wobble Arena tilt
    if (this.arena.mode === 'WOBBLE') {
      let sumWeight = 0;
      let sumX = 0;
      let sumY = 0;
      for (const f of this.fruits) {
        if (f.state !== 'IN_RING') continue;
        const mass = FRUIT_CATALOG[f.tier - 1].mass;
        sumWeight += mass;
        sumX += (f.x - this.arena.centerX) * mass;
        sumY += (f.y - this.arena.centerY) * mass;
      }
      if (sumWeight > 0) {
        const targetWobbleX = Math.max(-45, Math.min(45, (sumX / sumWeight) * 0.35));
        const targetWobbleY = Math.max(-45, Math.min(45, (sumY / sumWeight) * 0.35));
        this.arena.wobbleX += (targetWobbleX - this.arena.wobbleX) * Math.min(1, dt * 2.5);
        this.arena.wobbleY += (targetWobbleY - this.arena.wobbleY) * Math.min(1, dt * 2.5);
      } else {
        this.arena.wobbleX *= Math.max(0, 1 - dt * 2.0);
        this.arena.wobbleY *= Math.max(0, 1 - dt * 2.0);
      }
    }

    // Update Camera Shake
    if (this.cameraTrauma > 0) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - realDt * 1.5);
      const shake = this.cameraTrauma * this.cameraTrauma;
      const angle = Math.random() * Math.PI * 2;
      const dist = shake * 16;
      this.cameraOffset = {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      };
    } else {
      this.cameraOffset = { x: 0, y: 0 };
    }

    // Decay screen flash visual cues
    if (this.ringOutFlashTimer > 0) {
      this.ringOutFlashTimer = Math.max(0, this.ringOutFlashTimer - realDt);
    }
    if (this.kinboshiFlashTimer > 0) {
      this.kinboshiFlashTimer = Math.max(0, this.kinboshiFlashTimer - realDt);
    }

    // Step 0: Subsystem Directors & Managers
    this.refereeDirector.update(dt);
    this.activeRefereeCall = this.refereeDirector.getActiveCall();
    this.techniqueRibbons.update(dt);

    // Step 0.5: Rival Sumo Controller Update (Executing moves or planning)
    if (this.rivalController.fruitInstance && this.rivalController.fruitInstance.state !== 'RING_OUT') {
      const rivalAction = this.rivalController.update(dt, this.arena, this.fruits);
      if (rivalAction.fxEvent === 'SLAP') {
        sound.playSlapBurst();
        if (rivalAction.slapImpulse) {
          const { x: sx, y: sy, radius: sRad, strength: sStr } = rivalAction.slapImpulse;
          for (const f of this.fruits) {
            if (f.team === 'PLAYER' && f.state === 'IN_RING') {
              const d = Math.hypot(f.x - sx, f.y - sy);
              if (d < sRad + 25) {
                const nx = (f.x - sx) / (d || 1);
                const ny = (f.y - sy) / (d || 1);
                f.vx += nx * sStr;
                f.vy += ny * sStr;
              }
            }
          }
          this.triggerCameraTrauma(0.18);
        }
      } else if (rivalAction.fxEvent === 'RUSH') {
        this.spawnSparks(this.rivalController.fruitInstance.x, this.rivalController.fruitInstance.y, '#E67E22', 2);
      }
    }

    // Bounded Shot Settlement Check
    if (this.shotState === 'LAUNCHED' || this.shotState === 'CHAIN_RESOLVING') {
      this.shotSettlementTimer += dt;
      let allSettled = true;
      for (const f of this.fruits) {
        if (f.state === 'IN_RING' && !f.entryPending) {
          if (Math.hypot(f.vx, f.vy) > 24) {
            allSettled = false;
            break;
          }
        }
      }
      const hasActiveClashes = this.mergeManager.getActiveClashes().length > 0;
      if ((allSettled && !hasActiveClashes && this.shotSettlementTimer > 0.45) || this.shotSettlementTimer > 3.2) {
        this.shotState = 'IDLE';
        this.rivalController.planNextIntent(this.arena, this.fruits);
      }
    }

    // Step 1: Advance Clashes
    const fruitMap = new Map<number, SumoFruitInstance>();
    for (const f of this.fruits) fruitMap.set(f.id, f);

    const readyFusions = this.mergeManager.updateClashes(dt, fruitMap);
    for (const fusion of readyFusions) {
      this.handleFusionCommit(fusion);
    }

    // Step 2: Integrate Fruit Physics
    this.updateFruitPhysics(dt);

    // Step 3: Integrate Hazard Physics (including Rival Sumo AI)
    this.updateHazardPhysics(dt);

    // Step 4: Resolve Body-to-Body Collisions & Pair Transactions
    this.resolveCollisions();

    // Step 5: Capacity & 2.0s Overflow Check
    this.checkCapacityAndOverflow(dt);

    // Step 6: Hazard Spawning
    this.updateHazardDirector(dt);

    // Step 7: Update Particles
    this.updateParticles(dt);

    this.emitStats();
  }

  private updateFruitPhysics(dt: number) {
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const fruit = this.fruits[i];
      const cat = FRUIT_CATALOG[fruit.tier - 1];

      if (fruit.state === 'RING_OUT') {
        fruit.fallProgress += dt * 2.8;
        fruit.y += 120 * dt;
        if (fruit.fallProgress >= 1.0) {
          this.fruits.splice(i, 1);
        }
        continue;
      }

      if (fruit.state === 'CLASHING') {
        const clash = this.mergeManager
          .getActiveClashes()
          .find((c) => c.id === fruit.clashId);
        if (clash && Math.floor(clash.elapsedTime * 25) % 4 === 0) {
          sound.playClashSlap(fruit.tier);
        }
        continue;
      }

      if (fruit.state !== 'IN_RING') continue;

      // Inward bowl acceleration (elliptical and wobble responsive)
      const { ax, ay } = getBowlAcceleration(fruit.x, fruit.y, this.arena);
      const metrics = getBowlMetrics(fruit.x, fruit.y, cat.radius, this.arena);

      // Check if fruit is inside a sacred salt zone (explicit directional braking)
      let inSaltZone = false;
      for (const z of this.saltZones) {
        if (Math.hypot(fruit.x - z.x, fruit.y - z.y) < z.radius + cat.radius * 0.5) {
          inSaltZone = true;
          break;
        }
      }

      // English gyro curve acceleration
      let spinAx = 0;
      let spinAy = 0;
      if (fruit.spin && Math.abs(fruit.spin) > 0.05) {
        const speed = Math.hypot(fruit.vx, fruit.vy);
        if (speed > 10) {
          const perpX = -fruit.vy / speed;
          const perpY = fruit.vx / speed;
          const curveForce = fruit.spin * speed * 0.35;
          spinAx = perpX * curveForce;
          spinAy = perpY * curveForce;
        }
        fruit.spin *= Math.max(0, 1 - 0.8 * dt);
        fruit.rotation = (fruit.rotation || 0) + fruit.spin * dt;
      } else {
        fruit.rotation = (fruit.rotation || 0) + (fruit.vx * 0.003);
      }

      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;

      const damping = Math.max(0, 1 - cat.damp * dt);
      fruit.vx = (fruit.vx + (ax + spinAx) * dt) * damping;
      fruit.vy = (fruit.vy + (ay + spinAy) * dt) * damping;

      // Sacred Salt Braking Formula: a_salt = -gamma_salt * v - k_brake * max(0, v . n_out) * n_out
      if (inSaltZone) {
        const { ax: saltAx, ay: saltAy } = calculateSaltBraking(
          fruit.vx,
          fruit.vy,
          metrics.normalX,
          metrics.normalY,
          metrics.dSurface
        );
        fruit.vx += saltAx * dt;
        fruit.vy += saltAy * dt;
        if (metrics.dSurface < 40) {
          this.kimariteManager.reportAction('kiyome_defense');
        }
      }

      // Wasabi drag while body overlaps
      for (const h of this.hazards) {
        if (h.kind === 'WASABI' && !h.ringOut) {
          const d = Math.hypot(fruit.x - h.x, fruit.y - h.y);
          if (d < h.radius + cat.radius * 0.7) {
            const wasabiFactor = Math.max(0, 1 - 2.8 * dt);
            fruit.vx *= wasabiFactor;
            fruit.vy *= wasabiFactor;
          }
        }
      }

      // Squash and ripple decay
      if (fruit.squash.active) {
        fruit.squash.elapsed += dt;
        if (fruit.squash.elapsed > 0.6) fruit.squash.active = false;
      }
      if (fruit.ripple.active) {
        fruit.ripple.elapsed += dt;
        if (fruit.ripple.elapsed > 0.8) fruit.ripple.active = false;
      }

      // Sweat wiping timer decay
      if (fruit.wipingSweatTimer && fruit.wipingSweatTimer > 0) {
        fruit.wipingSweatTimer -= dt;
      }

      // Step 2-segment Verlet tails
      const tailRootOffsetY = cat.radius * 0.65;
      stepMawashiTail(
        fruit.leftTail,
        fruit.x - cat.radius * 0.45,
        fruit.y + tailRootOffsetY,
        fruit.vx,
        fruit.vy,
        dt
      );
      stepMawashiTail(
        fruit.rightTail,
        fruit.x + cat.radius * 0.45,
        fruit.y + tailRootOffsetY,
        fruit.vx,
        fruit.vy,
        dt
      );

      // Rim check & permissions
      const vOut = fruit.vx * metrics.normalX + fruit.vy * metrics.normalY;

      // Identify straw bale sector at this collision angle
      const baleIndex = Math.floor(((metrics.angle ?? 0) / (Math.PI * 2)) * 16) % 16;
      const bale = this.strawBales[baleIndex];
      const escapeThreshold = bale && bale.health <= 0 ? 80 : this.arena.escapeSpeedThreshold;

      // Entry pedestal logic
      if (fruit.entryPending) {
        if (metrics.dSurface > 25) {
          fruit.entryPending = false;
          fruit.hasEnteredRing = true;
          fruit.rimPermission = false;
          fruit.panic = false;
          fruit.wasInRimDanger = false;
        }
      } else {
        if (!fruit.hasEnteredRing) {
          fruit.hasEnteredRing = true;
        }

        // Rim permission logic based on straw bale integrity
        if (metrics.dSurface <= 15 && vOut >= escapeThreshold) {
          fruit.rimPermission = true;
        } else if (metrics.dSurface > 25) {
          fruit.rimPermission = false;
        }

        // Rim bounce vs Ring-out
        if (metrics.dCenter < 0) {
          this.commitRingOut(fruit);
        } else if (metrics.dSurface <= 0 && !fruit.rimPermission) {
          if (vOut > 0) {
            // Fruit struck the rim! Mark as having been in rim danger
            fruit.wasInRimDanger = true;

            // Register bank shot if last launched fruit rebounded off rim
            this.bankShotDetected = true;

            // Damage straw bale on heavy impact
            if (bale && bale.health > 0 && vOut > 115) {
              bale.health = Math.max(0, bale.health - 1);
              sound.playStrawBaleCrack();
              this.spawnStrawParticles(fruit.x, fruit.y, 8);
              if (bale.health === 0) {
                this.refereeDirector.triggerCall('俵割れ', 'TAWARA BREACH!', 'STRAW BALE SHATTERED!', '#E67E22', 'COMBO');
                this.activeRefereeCall = this.refereeDirector.getActiveCall();
                this.techniqueRibbons.addRibbon(
                  'Tawara Breach!',
                  'Straw bale shattered open!',
                  '#E67E22',
                  2.5,
                  '俵破',
                  '💥',
                  'HAZARD'
                );
              }
            }

            fruit.vx -= (1 + cat.restitution) * vOut * metrics.normalX;
            fruit.vy -= (1 + cat.restitution) * vOut * metrics.normalY;
            fruit.x = this.arena.centerX + metrics.normalX * (this.arena.radius - cat.radius);
            fruit.y = this.arena.centerY + metrics.normalY * (this.arena.radius - cat.radius);

            fruit.squash = {
              amplitude: Math.min(0.4, vOut / 450),
              normalX: metrics.normalX,
              normalY: metrics.normalY,
              elapsed: 0,
              active: true,
            };
            sound.playBump(vOut, cat.mass);
          }
        }
      }

      // "Not Today!" Tawara Rim Save detection (only for active fruits already inside the ring)
      if (fruit.hasEnteredRing && !fruit.entryPending) {
        // Did fruit enter critical rim danger?
        if (metrics.dSurface <= 22 && vOut > 15) {
          fruit.wasInRimDanger = true;
        }

        // Recovered from the brink back inward safely
        if (fruit.wasInRimDanger && metrics.dSurface > 45 && vOut <= 12 && !fruit.nearRimSaved) {
          fruit.wasInRimDanger = false;
          fruit.nearRimSaved = true;
          fruit.wipingSweatTimer = 1.4;
          this.techniqueRibbons.addRibbon(
            'Not Today!',
            'Saved from the Tawara brink!',
            '#2ECC71',
            2.5,
            '残っ',
            '🛡️',
            'DEFENSE'
          );
          sound.playRimSave();
        } else if (metrics.dSurface > 70) {
          fruit.nearRimSaved = false;
        }

        fruit.panic = (metrics.dSurface < 28 && vOut > 10) || metrics.dSurface < 15;
      } else {
        fruit.panic = false;
        fruit.wasInRimDanger = false;
      }

      fruit.lookTarget = this.findEyeTarget(fruit, metrics);
    }
  }

  private spawnStrawParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 30,
        color: '#D4AC0D',
        size: 2 + Math.random() * 3,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        type: 'DUST',
      });
    }
  }

  private findEyeTarget(
    fruit: SumoFruitInstance,
    metrics: { dSurface: number; normalX: number; normalY: number }
  ) {
    let closestDist = 220;
    let target = null;

    for (const h of this.hazards) {
      if (h.ringOut) continue;
      const d = Math.hypot(h.x - fruit.x, h.y - fruit.y);
      if (d < closestDist) {
        closestDist = d;
        target = { x: h.x, y: h.y };
      }
    }

    if (!target && metrics.dSurface < 85) {
      target = {
        x: this.arena.centerX + metrics.normalX * this.arena.radius,
        y: this.arena.centerY + metrics.normalY * this.arena.radius,
      };
    }

    return target;
  }

  private updateHazardPhysics(dt: number) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];

      if (hazard.ringOut) {
        hazard.fallProgress += dt * 2.5;
        hazard.y += 140 * dt;
        if (hazard.fallProgress >= 1.0) {
          this.hazards.splice(i, 1);
        }
        continue;
      }

      if (hazard.hitFlashTimer && hazard.hitFlashTimer > 0) {
        hazard.hitFlashTimer -= dt;
      }

      // Rival Sumo AI behavior
      if (hazard.kind === 'RIVAL') {
        hazard.aiChargeTimer = (hazard.aiChargeTimer || 1.8) - dt;
        if (hazard.aiChargeTimer <= 0) {
          hazard.aiChargeTimer = 1.8 + Math.random() * 1.2;
          // Target closest player fruit and charge towards it
          let targetFruit: SumoFruitInstance | null = null;
          let minDist = 9999;
          for (const f of this.fruits) {
            if (f.state !== 'IN_RING') continue;
            const d = Math.hypot(f.x - hazard.x, f.y - hazard.y);
            if (d < minDist) {
              minDist = d;
              targetFruit = f;
            }
          }
          if (targetFruit) {
            const dx = targetFruit.x - hazard.x;
            const dy = targetFruit.y - hazard.y;
            const dist = Math.hypot(dx, dy) || 1;
            hazard.vx += (dx / dist) * 260;
            hazard.vy += (dy / dist) * 260;
            sound.playTaiko(1.2);
            this.spawnSparks(hazard.x, hazard.y, '#9B59B6', 8);
          }
        }
      }

      const { ax, ay } = getBowlAcceleration(hazard.x, hazard.y, this.arena);
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;

      const damping = Math.max(0, 1 - hazard.damp * dt);
      hazard.vx = (hazard.vx + ax * dt) * damping;
      hazard.vy = (hazard.vy + ay * dt) * damping;

      hazard.rotation += (hazard.vx + hazard.vy) * 0.01;

      const metrics = getBowlMetrics(hazard.x, hazard.y, hazard.radius, this.arena);
      const vOut = hazard.vx * metrics.normalX + hazard.vy * metrics.normalY;

      if (metrics.dCenter < 0) {
        // Cleared out of bowl!
        hazard.ringOut = true;
        const isFestivalShot = this.festivalReadyShots > 0 || this.isFever;
        const finalMult = Math.min(6.0, this.comboMultiplier * (isFestivalShot ? 2.0 : 1.0));
        const scoreBonus = Math.round(hazard.scoreValue * finalMult);
        this.score += scoreBonus;
        this.addHype(hazard.kind === 'RIVAL' ? 25 : 8);

        // Kimarite Oshidashi push-out
        this.kimariteManager.reportAction('oshidashi');
        haptics.trigger('MEDIUM');

        // Natural hazard knockout grants 1 step toward salt charge (max 1/shot)
        if (!this.bonusRechargeGrantedThisShot && this.saltCharges < this.maxSaltCharges) {
          this.bonusRechargeGrantedThisShot = true;
          this.saltLaunchCount++;
          if (this.saltLaunchCount >= 6) {
            this.saltCharges = 1;
            this.saltLaunchCount = 0;
            this.techniqueRibbons.addRibbon('Salt Ready!', 'Kiyome-no-Shio replenished from ring-out!', '#4B69FD');
            sound.playTaikoFlourish();
          }
        }

        if (hazard.kind === 'RIVAL') {
          this.refereeDirector.triggerCall('金星', 'KINBOSHI!', 'RIVAL YORIKIRI DEFEAT!', '#FFD700', 'RIVAL_DEFEAT');
          this.activeRefereeCall = this.refereeDirector.getActiveCall();
          this.techniqueRibbons.addRibbon('Kinboshi Victory!', `${hazard.name} defeated!`, '#FFD700');
          sound.playTaikoFlourish();
          this.spawnConfetti(hazard.x, hazard.y, 45);

          if (this.gameMode === 'CAREER') {
            const hasMore = this.careerManager.completeCurrentStage();
            if (hasMore) {
              this.techniqueRibbons.addRibbon('Stage Cleared!', 'Next Banzuke bout unlocked!', '#2ECC71', 3.0);
            } else {
              this.techniqueRibbons.addRibbon('Yokozuna Beaten!', 'You are the Grand Champion!', '#FFD700', 4.0);
            }
          }
        } else {
          sound.playHazardClear();
          this.techniqueRibbons.addRibbon('Ring-Out!', `${hazard.name} ejected from the Dohyō`, '#E67E22');
          this.spawnSparks(hazard.x, hazard.y, '#F1C40F', 12);
        }
        this.triggerCameraTrauma(0.2);
      } else if (metrics.dSurface <= 0 && !hazard.cleansing && vOut < 180) {
        if (vOut > 0) {
          hazard.vx -= (1 + hazard.restitution) * vOut * metrics.normalX;
          hazard.vy -= (1 + hazard.restitution) * vOut * metrics.normalY;
        }
      }
    }
  }

  private resolveCollisions() {
    // 1. Fruit to Fruit collisions
    const n = this.fruits.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const fA = this.fruits[i];
        const fB = this.fruits[j];

        if (fA.state === 'RING_OUT' || fB.state === 'RING_OUT') continue;
        if (fA.state === 'MERGING' || fB.state === 'MERGING') continue;
        if (fA.state === 'CLASHING' && fB.state === 'CLASHING') continue;

        const catA = FRUIT_CATALOG[fA.tier - 1];
        const catB = FRUIT_CATALOG[fB.tier - 1];
        const minDist = catA.radius + catB.radius;

        const dx = fB.x - fA.x;
        const dy = fB.y - fA.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Check for transaction match (same tier)
          const decision = this.mergeManager.evaluatePair(fA, fB);

          if (decision) {
            if (decision.type === 'CLASH') {
              this.mergeManager.startClash(fA, fB);
              sound.playClashStart();
              this.triggerHitStop(0.06);
              this.triggerCameraTrauma(0.18);
              this.spawnSparks((fA.x + fB.x) / 2, (fA.y + fB.y) / 2, '#FFFFFF', 16);
              return;
            } else if (decision.type === 'MERGE') {
              const fusion = this.mergeManager.commitFusion(fA, fB);
              this.handleFusionCommit(fusion);
              return;
            }
          }

          // Elastic collision response
          const overlap = minDist - dist;
          const totalMass = catA.mass + catB.mass;

          if (fA.state === 'IN_RING') {
            fA.x -= nx * overlap * (catB.mass / totalMass);
            fA.y -= ny * overlap * (catB.mass / totalMass);
          }
          if (fB.state === 'IN_RING') {
            fB.x += nx * overlap * (catA.mass / totalMass);
            fB.y += ny * overlap * (catA.mass / totalMass);
          }

          const relVx = fB.vx - fA.vx;
          const relVy = fB.vy - fA.vy;
          const velAlongNormal = relVx * nx + relVy * ny;

          if (velAlongNormal < 0) {
            const restitution = (catA.restitution + catB.restitution) / 2;
            const impulseMag = (-(1 + restitution) * velAlongNormal) / (1 / catA.mass + 1 / catB.mass);

            const impX = nx * impulseMag;
            const impY = ny * impulseMag;

            if (fA.state === 'IN_RING') {
              fA.vx -= impX / catA.mass;
              fA.vy -= impY / catA.mass;
            }
            if (fB.state === 'IN_RING') {
              fB.vx += impX / catB.mass;
              fB.vy += impY / catB.mass;
            }

            const bumpSpeed = Math.abs(velAlongNormal);
            if (bumpSpeed > 40) {
              fA.squash = {
                amplitude: Math.min(0.42, bumpSpeed / 400),
                normalX: nx,
                normalY: ny,
                elapsed: 0,
                active: true,
              };
              fB.squash = {
                amplitude: Math.min(0.42, bumpSpeed / 400),
                normalX: -nx,
                normalY: -ny,
                elapsed: 0,
                active: true,
              };
              sound.playBump(bumpSpeed, (catA.mass + catB.mass) / 2);
            }
          }
        }
      }
    }

    // 2. Fruit to Hazard collisions (special handling for Wasabi, Chili, Rival)
    for (const fruit of this.fruits) {
      if (fruit.state !== 'IN_RING') continue;
      const cat = FRUIT_CATALOG[fruit.tier - 1];

      for (const hazard of this.hazards) {
        if (hazard.ringOut) continue;
        const minDist = cat.radius + hazard.radius;
        const dx = hazard.x - fruit.x;
        const dy = hazard.y - fruit.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          if (hazard.kind === 'WASABI') {
            // Wasabi sticky sludge: can be damaged by Rikishi impacts, pushed physically, or purified by salt
            const impactSpeed = Math.hypot(fruit.vx, fruit.vy);
            const damage = cat.tier >= 4 || impactSpeed > 160 ? 2 : 1;

            if (!hazard.hitFlashTimer || hazard.hitFlashTimer <= 0) {
              hazard.hp = Math.max(0, (hazard.hp ?? 3) - damage);
              hazard.hitFlashTimer = 0.25;
              sound.playWasabiSplash();
              this.spawnSparks(hazard.x, hazard.y, '#2ECC71', 10);

              // Separate bodies smoothly
              fruit.x -= nx * overlap * 0.4;
              fruit.y -= ny * overlap * 0.4;
              hazard.x += nx * overlap * 0.6;
              hazard.y += ny * overlap * 0.6;

              // Transfer momentum: push Wasabi, apply sticky drag to fruit
              fruit.vx *= 0.72;
              fruit.vy *= 0.72;
              hazard.vx += nx * 180;
              hazard.vy += ny * 180;

              if (hazard.hp <= 0) {
                // Wasabi completely defeated & squashed!
                hazard.ringOut = true;
                this.score += hazard.scoreValue;
                this.addHype(12);
                sound.playHazardClear();
                this.techniqueRibbons.addRibbon('Wasabi Squashed!', '3 hits crushed the sticky sludge!', '#2ECC71');
                this.spawnSparks(hazard.x, hazard.y, '#2ECC71', 25);
                this.triggerCameraTrauma(0.12);
              }
            } else {
              fruit.x -= nx * overlap * 0.5;
              fruit.y -= ny * overlap * 0.5;
              hazard.x += nx * overlap * 0.5;
              hazard.y += ny * overlap * 0.5;
              fruit.vx *= 0.88;
              fruit.vy *= 0.88;
            }
            continue;
          }

          if (hazard.kind === 'CHILI') {
            // Chili pepper explosive rocket boost!
            fruit.vx -= nx * 340;
            fruit.vy -= ny * 340;
            hazard.vx += nx * 280;
            hazard.vy += ny * 280;
            sound.playChiliBoost();
            haptics.trigger('MEDIUM');
            this.kimariteManager.reportAction('dohyo_booster');
            this.spawnFlameParticles(fruit.x, fruit.y, 14);
            this.triggerCameraTrauma(0.18);
            continue;
          }

          if (hazard.kind === 'GINKO_MAGNET') {
            // Ginko Nut Sacred Magnet: attracts same or nearby fruits toward each other
            fruit.vx += nx * 140;
            fruit.vy += ny * 140;
            hazard.vx -= nx * 80;
            hazard.vy -= ny * 80;
            sound.playGinkoMagnet();
            haptics.trigger('LIGHT');
            this.spawnSparks(hazard.x, hazard.y, '#F1C40F', 8);
            continue;
          }

          fruit.x -= nx * overlap * 0.3;
          fruit.y -= ny * overlap * 0.3;
          hazard.x += nx * overlap * 0.7;
          hazard.y += ny * overlap * 0.7;

          const relVx = hazard.vx - fruit.vx;
          const relVy = hazard.vy - fruit.vy;
          const vNorm = relVx * nx + relVy * ny;

          if (vNorm < 0) {
            const rest = (cat.restitution + hazard.restitution) / 2;
            const imp = (-(1 + rest) * vNorm) / (1 / cat.mass + 1 / hazard.mass);

            fruit.vx -= (nx * imp) / cat.mass;
            fruit.vy -= (ny * imp) / cat.mass;
            hazard.vx += (nx * imp) / hazard.mass;
            hazard.vy += (ny * imp) / hazard.mass;

            sound.playBump(Math.abs(vNorm), cat.mass);
          }
        }
      }
    }
  }

  private spawnFlameParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: Math.random() > 0.4 ? '#E74C3C' : '#F39C12',
        size: 3 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        type: 'FLAME',
      });
    }
  }

  private handleFusionCommit(fusion: FusionResult) {
    this.fruits = this.fruits.filter(
      (f) => f.id !== fusion.consumedIds[0] && f.id !== fusion.consumedIds[1]
    );

    const catNext = FRUIT_CATALOG[fusion.newTier - 1];

    const newFruit: SumoFruitInstance = {
      id: this.nextEntityId++,
      tier: fusion.newTier,
      x: fusion.spawnX,
      y: fusion.spawnY,
      vx: fusion.spawnVx,
      vy: fusion.spawnVy,
      state: 'IN_RING',
      team: 'PLAYER',
      entryPending: false,
      rimPermission: false,
      clashId: null,
      squash: {
        amplitude: 0.35,
        normalX: 0,
        normalY: 1,
        elapsed: 0,
        active: true,
      },
      ripple: { elapsed: 0, impactAngle: 0, active: true },
      leftTail: createMawashiTail(
        fusion.spawnX - catNext.radius * 0.45,
        fusion.spawnY + catNext.radius * 0.65,
        catNext.radius
      ),
      rightTail: createMawashiTail(
        fusion.spawnX + catNext.radius * 0.45,
        fusion.spawnY + catNext.radius * 0.65,
        catNext.radius
      ),
      fallProgress: 0,
      lookTarget: null,
      panic: false,
      hasEnteredRing: true,
      wasInRimDanger: false,
      nearRimSaved: false,
    };

    this.fruits.push(newFruit);

    // Combo chain & hype multipliers (1.0x, 1.5x, 2.0x, 2.5x, 3.0x max)
    this.comboCount++;
    const comboMultipliers = [1.0, 1.0, 1.5, 2.0, 2.5, 3.0];
    this.comboMultiplier = comboMultipliers[Math.min(this.comboCount, 5)];
    this.comboTimer = 2.5;

    const isFestivalShot = this.festivalReadyShots > 0 || this.isFever;
    const finalMult = Math.min(6.0, this.comboMultiplier * (isFestivalShot ? 2.0 : 1.0));

    const baseScore = fusion.score;
    const finalScore = Math.round(baseScore * finalMult);
    this.addScore(finalScore);
    this.highestTier = Math.max(this.highestTier, fusion.newTier);
    this.addHype(12);

    // Ribbons & Technique Callouts
    if (this.bankShotDetected && !this.shotInitialMergeDone) {
      this.techniqueRibbons.addRibbon(
        'Bank Shot Fusion!',
        'Rebounded off Tawara into pristine fusion!',
        '#3498DB',
        2.5,
        '引落',
        '🎯',
        'KIMARITE'
      );
      sound.playHyoshigi(1.4);
      this.kimariteManager.reportAction('hikiotoshi');
    }
    this.shotInitialMergeDone = true;

    // Check if the fruit that merged was launched with spin
    if (Math.abs(newFruit.vx) > 30 || Math.abs(newFruit.vy) > 30) {
      this.kimariteManager.reportAction('gyaku_kaiten');
    }

    if (this.comboCount >= 2) {
      this.techniqueRibbons.addRibbon(
        `${this.comboCount}x Fusion Chain!`,
        `Chain multiplier ${finalMult.toFixed(1)}x`,
        '#F39C12',
        2.5,
        '連鎖',
        '🔥',
        'COMBO'
      );
      if (this.comboCount >= 3) {
        this.kimariteManager.reportAction('tsuppari_chain');
        sound.playCrowdChant();
      }
    }

    // Dynamic Gyōji Callouts on milestones
    if (fusion.newTier >= 10 || fusion.isYokozuna) {
      this.refereeDirector.triggerCall('横綱昇進', 'YOKOZUNA ASCENSION!', 'SUPREME PINEAPPLE DEITY!', '#FFD700', 'YOKOZUNA');
      this.activeRefereeCall = this.refereeDirector.getActiveCall();
      this.techniqueRibbons.addRibbon(
        'Yokozuna Divine',
        'Grand Champion of the Celestial Bowl',
        '#FFD700',
        3.5,
        '横綱',
        '👑',
        'KIMARITE'
      );
      this.rivalController.cancelNextAttackYokozuna();
      this.spawnConfetti(fusion.spawnX, fusion.spawnY, 50);
      this.kimariteManager.reportAction('tenka_muso');
      haptics.trigger('YOKOZUNA');
      sound.playTaikoRoll();
    } else if (fusion.newTier >= 7) {
      this.refereeDirector.triggerCall('大関誕生', 'OZEKI PROMOTION!', `${catNext.name} DOMINATES THE RING!`, '#E74C3C', 'COMBO');
      this.activeRefereeCall = this.refereeDirector.getActiveCall();
      this.kimariteManager.reportAction('ozeki_power');
      haptics.trigger('HEAVY');
    } else if (this.comboCount >= 3) {
      this.refereeDirector.triggerCall('残った', 'NOKOTTA!', `${this.comboCount}x COMBO STREAK!`, '#3498DB', 'COMBO');
      this.activeRefereeCall = this.refereeDirector.getActiveCall();
      haptics.trigger('FUSION');
    } else {
      haptics.trigger('FUSION');
    }

    // Shockwave emission
    this.mergeManager.applyShockwave(
      fusion.shockwave.x,
      fusion.shockwave.y,
      fusion.shockwave.radius,
      this.tuning.shockwaveImpulse,
      this.fruits,
      this.hazards,
      [newFruit.id]
    );

    // Particle FX
    this.spawnSparks(fusion.spawnX, fusion.spawnY, catNext.color, 24);
    this.spawnRipple(fusion.spawnX, fusion.spawnY, fusion.shockwave.radius);

    if (fusion.isYokozuna) {
      // YOKOZUNA PINEAPPLE SPECIAL EVENT
      sound.playYokozuna();
      this.triggerCameraTrauma(0.55);
      this.spawnConfetti(fusion.spawnX, fusion.spawnY, 80);

      // Cleanse all active hazards by launching them outward
      for (const h of this.hazards) {
        h.cleansing = true;
        const dx = h.x - this.arena.centerX;
        const dy = h.y - this.arena.centerY;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        h.vx = nx * 380;
        h.vy = ny * 380;
      }
    } else {
      sound.playFusion(fusion.newTier);
      this.triggerCameraTrauma(0.25);
    }
  }

  private commitRingOut(fruit: SumoFruitInstance) {
    fruit.state = 'RING_OUT';

    // If fruit was a rival, it is a Kinboshi victory!
    if (fruit.team === 'RIVAL') {
      this.addScore(800);
      this.addHype(25);
      this.kinboshiFlashTimer = 0.35;
      this.triggerHitStop(0.08);
      this.refereeDirector.triggerCall('金星', 'KINBOSHI!', 'RIVAL YORIKIRI DEFEAT!', '#FFD700', 'RIVAL_DEFEAT');
      this.activeRefereeCall = this.refereeDirector.getActiveCall();
      this.techniqueRibbons.addRibbon(
        'Kinboshi Victory!',
        `${this.rivalController.profile.name} pushed out!`,
        '#FFD700',
        3.5,
        '金星',
        '⭐',
        'KIMARITE'
      );
      sound.playTaikoFlourish();
      this.spawnConfetti(fruit.x, fruit.y, 45);

      if (this.gameMode === 'CAREER') {
        const hasMore = this.careerManager.completeCurrentStage();
        if (hasMore) {
          this.techniqueRibbons.addRibbon('Stage Cleared!', 'Next Banzuke bout unlocked!', '#2ECC71', 3.0, '勝星', '🏆');
        } else {
          this.techniqueRibbons.addRibbon('Yokozuna Beaten!', 'You are the Grand Champion!', '#FFD700', 4.0, '優勝', '👑');
        }
      }
      this.triggerCameraTrauma(0.4);
      this.spawnSplash(fruit.x, fruit.y, this.rivalController.profile.color);
      return;
    }

    this.lives = Math.max(0, this.lives - 1);
    this.ringOutFlashTimer = 0.45;
    this.triggerHitStop(0.12);
    sound.playRingOut();
    this.triggerCameraTrauma(0.45);
    this.spawnSplash(fruit.x, fruit.y, FRUIT_CATALOG[fruit.tier - 1].color);
    this.techniqueRibbons.addRibbon(
      'Ring-Out!',
      `${FRUIT_CATALOG[fruit.tier - 1].name} fell from the Dohyō!`,
      '#E74C3C',
      3.0,
      '勇足',
      '🚨',
      'RING_OUT'
    );

    if (this.lives <= 0) {
      this.isGameOver = true;
      this.gameOverReason = 'All 3 wrestlers were pushed out of the dohyō!';
    }
  }

  private checkCapacityAndOverflow(dt: number) {
    // A_occupied = sum(pi * r_i^2) + sum(A_hazard)
    let occupiedArea = 0;
    let anyProtruding = false;

    for (const f of this.fruits) {
      if (f.state === 'RING_OUT' || f.entryPending) continue;
      const r = FRUIT_CATALOG[f.tier - 1].radius;
      occupiedArea += Math.PI * r * r;

      const m = getBowlMetrics(f.x, f.y, r, this.arena);
      if (m.dSurface < -2) {
        anyProtruding = true;
      }
    }

    for (const h of this.hazards) {
      if (h.ringOut) continue;
      occupiedArea += Math.PI * h.radius * h.radius;
    }

    // A_capacity = 0.82 * pi * R^2
    const capacityArea = this.arena.capacityFactor * Math.PI * this.arena.radius * this.arena.radius;
    const occupancy = occupiedArea / capacityArea;

    // Condition: Occupancy > 1.0 AND protruding continuously for > 2.0s
    if (occupancy > 1.0 && anyProtruding) {
      this.isOverflowing = true;
      this.overflowTimer += dt;
      if (this.overflowTimer >= 2.0) {
        this.isGameOver = true;
        this.gameOverReason = 'Dohyō capacity exceeded! The bowl overflowed!';
      }
    } else {
      this.isOverflowing = false;
      this.overflowTimer = Math.max(0, this.overflowTimer - dt * 2);
    }
  }

  private updateHazardDirector(dt: number) {
    if (this.totalShots < 3) return; // No hazards during first few shots

    this.hazardSpawnCooldown -= dt;
    if (this.hazardSpawnCooldown <= 0 && this.hazards.length < 4) {
      this.hazardSpawnCooldown = 7.0 + Math.random() * 5.0;
      this.spawnHazard();
    }

    // Rival Sumo AI Director: spawns every 24-32 seconds if none currently active
    const hasRival = this.hazards.some((h) => h.kind === 'RIVAL' && !h.ringOut);
    if (!hasRival && this.totalShots >= 5) {
      this.rivalSpawnTimer -= dt;
      if (this.rivalSpawnTimer <= 0) {
        this.rivalSpawnTimer = 24.0 + Math.random() * 8.0;
        this.spawnRival();
      }
    }
  }

  private spawnRival() {
    const angle = Math.random() * Math.PI * 2;
    const r = this.arena.radius * 0.45;
    const x = this.arena.centerX + Math.cos(angle) * r;
    const y = this.arena.centerY + Math.sin(angle) * r;

    const rival: HazardInstance = {
      id: this.nextEntityId++,
      kind: 'RIVAL',
      name: 'Rival Rikishi (Tengu)',
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 30,
      mass: 8.5,
      damp: 0.6,
      restitution: 0.85,
      resistance: 0.5,
      scoreValue: 600,
      cleansing: false,
      ringOut: false,
      fallProgress: 0,
      rotation: 0,
      aiChargeTimer: 1.5,
    };

    this.hazards.push(rival);
    this.triggerRefereeCall('宿敵参上', 'RIVAL CHALLENGER ENTERS!', 'BEWARE THE OSHIDASHI RUSH!', '#9B59B6', 'hakkeyoi');
    this.spawnSparks(x, y, '#9B59B6', 22);
    this.triggerCameraTrauma(0.2);
  }

  private spawnHazard() {
    const roll = Math.random();
    let kind: HazardKind = 'BUG';
    let name = 'Rotten Beetle';
    let radius = 18;
    let mass = 3.5;
    let damp = 0.7;
    let rest = 0.85;
    let scoreVal = 120;

    if (roll < 0.28) {
      kind = 'ICE';
      name = 'Ice Cube';
      radius = 22;
      mass = 6.0;
      damp = 0.35;
      rest = 0.95;
      scoreVal = 150;
    } else if (roll < 0.52) {
      kind = 'BUG';
      name = 'Rotten Beetle';
      radius = 18;
      mass = 3.5;
      damp = 0.7;
      rest = 0.85;
      scoreVal = 120;
    } else if (roll < 0.70) {
      kind = 'WASABI';
      name = 'Wasabi Sludge';
      radius = 24;
      mass = 5.0;
      damp = 1.1;
      rest = 0.4;
      scoreVal = 180;
    } else if (roll < 0.86) {
      kind = 'CHILI';
      name = 'Fiery Chili';
      radius = 20;
      mass = 4.0;
      damp = 0.4;
      rest = 0.95;
      scoreVal = 220;
    } else {
      kind = 'GINKO_MAGNET';
      name = 'Sacred Ginko Nut';
      radius = 22;
      mass = 4.5;
      damp = 0.5;
      rest = 0.85;
      scoreVal = 250;
    }

    // Find safe spawn location within bowl
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.arena.radius * 0.65);
      const x = this.arena.centerX + Math.cos(angle) * r;
      const y = this.arena.centerY + Math.sin(angle) * r;

      let safe = true;
      for (const f of this.fruits) {
        const cat = FRUIT_CATALOG[f.tier - 1];
        if (Math.hypot(f.x - x, f.y - y) < cat.radius + 30) {
          safe = false;
          break;
        }
      }

      if (safe) {
        const hazard: HazardInstance = {
          id: this.nextEntityId++,
          kind,
          name,
          x,
          y,
          vx: 0,
          vy: 0,
          radius,
          mass,
          damp,
          restitution: rest,
          resistance: 0.2,
          scoreValue: scoreVal,
          cleansing: false,
          ringOut: false,
          fallProgress: 0,
          rotation: 0,
          hp: kind === 'WASABI' ? 3 : undefined,
          maxHp: kind === 'WASABI' ? 3 : undefined,
          hitFlashTimer: 0,
        };

        this.hazards.push(hazard);
        const sparkColor =
          kind === 'WASABI'
            ? '#2ECC71'
            : kind === 'CHILI'
            ? '#E74C3C'
            : kind === 'ICE'
            ? '#3498DB'
            : kind === 'GINKO_MAGNET'
            ? '#F1C40F'
            : '#D35400';
        this.spawnSparks(x, y, sparkColor, 12);

        if (kind === 'WASABI') {
          this.techniqueRibbons.addRibbon(
            'Wasabi Appeared!',
            'Sticky sludge on Dohyō! Hit 3x, Push Out, or use Salt [S]',
            '#2ECC71',
            3.0,
            '山葵',
            '🍃',
            'HAZARD'
          );
        } else if (kind === 'GINKO_MAGNET') {
          this.techniqueRibbons.addRibbon(
            'Ginko Magnet!',
            'Sacred magnetic nut pulls nearby fruit into orbit!',
            '#F1C40F',
            3.0,
            '銀杏',
            '🧲',
            'HAZARD'
          );
          sound.playGinkoMagnet();
        }
        break;
      }
    }
  }

  // Particle systems
  private spawnSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        type: 'SPARK',
      });
    }
  }

  private spawnRipple(x: number, y: number, maxRadius: number) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: 'rgba(255, 255, 255, 0.4)',
      size: maxRadius,
      life: 0.5,
      maxLife: 0.5,
      type: 'RIPPLE',
    });
  }

  private spawnConfetti(x: number, y: number, count: number) {
    const colors = ['#F1C40F', '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#FFFFFF'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 320;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 6,
        life: 1.2 + Math.random() * 0.8,
        maxLife: 2.0,
        type: 'CONFETTI',
      });
    }
  }

  private spawnSplash(x: number, y: number, color: string) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 50,
        color,
        size: 4 + Math.random() * 6,
        life: 0.6,
        maxLife: 0.6,
        type: 'SPLASH',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'CONFETTI' || p.type === 'SALT') {
        p.vy += 70 * dt; // gravity
      }
    }
  }

  private emitStats() {
    if (!this.onStatsChange) return;

    let occupiedArea = 0;
    for (const f of this.fruits) {
      if (f.state === 'RING_OUT' || f.entryPending) continue;
      const r = FRUIT_CATALOG[f.tier - 1].radius;
      occupiedArea += Math.PI * r * r;
    }
    for (const h of this.hazards) {
      if (h.ringOut) continue;
      occupiedArea += Math.PI * h.radius * h.radius;
    }
    const capacityArea = this.arena.capacityFactor * Math.PI * this.arena.radius * this.arena.radius;
    const occupancy = occupiedArea / capacityArea;

    const rivalFruit = this.fruits.find((f) => f.team === 'RIVAL' && f.state !== 'RING_OUT');

    this.onStatsChange({
      score: this.score,
      highScore: this.highScore,
      isNewHighScore: this.isNewHighScore,
      lives: this.lives,
      occupancy: Math.min(1.5, occupancy),
      overflowTimer: this.overflowTimer,
      isOverflowing: this.isOverflowing,
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
      gameOverReason: this.gameOverReason,
      nextTiers: this.upcomingTiers,
      currentLoadedTier: this.loadedFruit ? this.loadedFruit.tier : 1,
      highestTierReached: this.highestTier,
      arenaMode: this.arena.mode,
      gameMode: this.gameMode,
      saltCharges: this.saltCharges,
      maxSaltCharges: this.maxSaltCharges,
      saltLaunchCount: this.saltLaunchCount,
      isSaltTargeting: this.isSaltTargeting,
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      crowdHype: this.crowdHype,
      isFever: this.isFever,
      feverTimer: this.feverTimer,
      festivalReadyShots: this.festivalReadyShots,
      activeRefereeCall: this.activeRefereeCall,
      activeRibbons: this.techniqueRibbons.getActiveRibbons(),
      strawBales: this.strawBales,
      tuning: this.tuning,
      careerStageIndex: this.careerManager.currentStageIndex,
      careerStageCount: this.careerManager.stages.length,
      currentRivalProfile: this.rivalController.profile,
      hasActiveRival: !!rivalFruit,
      rivalIntent: this.rivalController.intent,
      activeChallengeId: this.activeChallengeId,
      launcherSpin: this.launcherSpin,
      unlockedKimariteCount: this.kimariteManager.getUnlockedCount().unlocked,
      totalKimariteCount: this.kimariteManager.getUnlockedCount().total,
    });
  }
}
