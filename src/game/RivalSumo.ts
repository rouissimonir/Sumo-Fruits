import { ArenaConfig, createMawashiTail, getBowlMetrics } from '../physics/bowlMotion';
import { FRUIT_CATALOG, RivalActionType, RivalIntent, RivalProfile, SumoFruitInstance } from '../types/game';

export const RIVAL_PROFILES: Record<string, RivalProfile> = {
  TENGU_ORANGE: {
    id: 'TENGU_ORANGE',
    name: 'Tengu Orange',
    title: 'Wind God of the Dohyō',
    fruitName: 'Orange',
    tier: 5,
    color: '#E67E22',
    crest: '👺',
    mass: 8.5,
    radius: 36,
    moveType: 'OSHIDASHI_PUSH',
    attackIntervalShots: 2,
    habitDescription: 'Charges straight along a locked telegraphed lane every 2nd shot.',
    defeatQuote: 'Felled by pristine positioning!',
  },
  CHERRY_SLAPPER: {
    id: 'CHERRY_SLAPPER',
    name: 'Cherry Slapper',
    title: 'Twin-Stem Tsuppari Virtuoso',
    fruitName: 'Cherry',
    tier: 1,
    color: '#C0392B',
    crest: '🍒',
    mass: 6.0,
    radius: 32,
    moveType: 'TSUPPARI_SLAP',
    attackIntervalShots: 2,
    habitDescription: 'Delivers 3 short close-range thrusts in a visible forward cone; dazed on a miss.',
    defeatQuote: 'My flurries met your stone defense...',
  },
  COCONUT_TANK: {
    id: 'COCONUT_TANK',
    name: 'Coconut Tank',
    title: 'Unyielding Shell Rikishi',
    fruitName: 'Coconut',
    tier: 8,
    color: '#795548',
    crest: '🥥',
    mass: 14.0,
    radius: 46,
    moveType: 'OSHIDASHI_PUSH',
    attackIntervalShots: 2,
    habitDescription: 'Massive center tank that bulldozes forward toward the player cluster.',
    defeatQuote: 'Even ancient ironwood can be uprooted!',
  },
  DRAGONFRUIT_YOKOZUNA: {
    id: 'DRAGONFRUIT_YOKOZUNA',
    name: 'Dragonfruit Yokozuna',
    title: 'Grand Champion of the Celestial Bowl',
    fruitName: 'Dragonfruit',
    tier: 10,
    color: '#8E44AD',
    crest: '🐉',
    mass: 16.0,
    radius: 52,
    moveType: 'OSHIDASHI_PUSH',
    attackIntervalShots: 2,
    habitDescription: 'Master of both relentless frontal drives and crushing rim pressure.',
    defeatQuote: 'Splendid bout! You are worthy of the white tsuna cord.',
  },
};

export class RivalSumoController {
  public profile: RivalProfile;
  public fruitInstance: SumoFruitInstance | null = null;
  public intent: RivalIntent | null = null;
  public shotCounter: number = 0;
  public isExecuting: boolean = false;
  public executionTimer: number = 0;
  public executionTotalTime: number = 0;
  public slapStepsRemaining: number = 0;
  public isRecovering: boolean = false;
  public recoveryTimer: number = 0;
  public attackCanceledByYokozuna: boolean = false;
  public isCounteredThisShot: boolean = false;
  public knockbackMultiplier: number = 1.0;
  public dragonfruitAlternator: boolean = false; // true = rush, false = slap

  constructor(profile: RivalProfile = RIVAL_PROFILES.TENGU_ORANGE) {
    this.profile = profile;
  }

  public setProfile(profile: RivalProfile) {
    this.profile = profile;
    this.reset();
  }

  public reset() {
    this.fruitInstance = null;
    this.intent = null;
    this.shotCounter = 0;
    this.isExecuting = false;
    this.executionTimer = 0;
    this.slapStepsRemaining = 0;
    this.isRecovering = false;
    this.recoveryTimer = 0;
    this.attackCanceledByYokozuna = false;
    this.isCounteredThisShot = false;
    this.knockbackMultiplier = 1.0;
    this.dragonfruitAlternator = false;
  }

  public spawnRival(
    arena: ArenaConfig,
    nextId: number
  ): SumoFruitInstance {
    // Rival enters from the opposite side of the launcher (top of the bowl)
    const x = arena.centerX;
    const y = arena.centerY - arena.radius * 0.55;

    const rivalFruit: SumoFruitInstance = {
      id: nextId,
      tier: this.profile.tier,
      team: 'RIVAL',
      x,
      y,
      vx: 0,
      vy: 20, // Gentle entrance nudge toward center
      state: 'IN_RING',
      entryPending: false,
      rimPermission: false,
      clashId: null,
      squash: { amplitude: 0, normalX: 0, normalY: 0, elapsed: 0, active: false },
      ripple: { elapsed: 0, impactAngle: 0, active: false },
      leftTail: createMawashiTail(x - this.profile.radius * 0.4, y + this.profile.radius * 0.7, this.profile.radius),
      rightTail: createMawashiTail(x + this.profile.radius * 0.4, y + this.profile.radius * 0.7, this.profile.radius),
      fallProgress: 0,
      lookTarget: { x: arena.centerX, y: arena.centerY + 100 },
      panic: false,
    };

    this.fruitInstance = rivalFruit;
    this.planNextIntent(arena, []);
    return rivalFruit;
  }

  /**
   * Plans and advertises next action.
   * Locked when announced so player can plan and outsmart it!
   */
  public planNextIntent(
    arena: ArenaConfig,
    playerFruits: SumoFruitInstance[]
  ) {
    if (!this.fruitInstance || this.fruitInstance.state === 'RING_OUT') {
      this.intent = null;
      return;
    }

    // Find nearest player fruit to aim toward
    let targetX = arena.centerX;
    let targetY = arena.centerY + 120;
    let minDist = Infinity;

    for (const f of playerFruits) {
      if (f.state !== 'IN_RING' || f.team !== 'PLAYER') continue;
      const d = Math.hypot(f.x - this.fruitInstance.x, f.y - this.fruitInstance.y);
      if (d < minDist) {
        minDist = d;
        targetX = f.x;
        targetY = f.y;
      }
    }

    const dx = targetX - this.fruitInstance.x;
    const dy = targetY - this.fruitInstance.y;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    let moveType = this.profile.moveType;
    if (this.profile.id === 'DRAGONFRUIT_YOKOZUNA') {
      moveType = this.dragonfruitAlternator ? 'OSHIDASHI_PUSH' : 'TSUPPARI_SLAP';
    }

    const shotsUntil = Math.max(1, this.profile.attackIntervalShots - (this.shotCounter % this.profile.attackIntervalShots));

    this.intent = {
      type: moveType,
      dirX,
      dirY,
      targetX,
      targetY,
      length: moveType === 'OSHIDASHI_PUSH' ? Math.min(260, len + 50) : 130,
      coneAngle: moveType === 'TSUPPARI_SLAP' ? Math.PI / 4 : undefined,
      shotsUntilAttack: shotsUntil,
      locked: true,
    };

    this.fruitInstance.lookTarget = { x: targetX, y: targetY };
  }

  /**
   * Called when player commits a launch
   */
  public onPlayerLaunchCommitted(arena: ArenaConfig, playerFruits: SumoFruitInstance[]) {
    if (!this.fruitInstance || this.fruitInstance.state === 'RING_OUT') return;
    this.shotCounter++;

    // Check if attack is scheduled for this shot
    if (this.shotCounter % this.profile.attackIntervalShots === 0) {
      if (!this.attackCanceledByYokozuna) {
        this.startExecution();
      }
      this.attackCanceledByYokozuna = false;
    } else {
      // Re-plan next intent with updated positions
      this.planNextIntent(arena, playerFruits);
    }
  }

  private startExecution() {
    if (!this.intent || !this.fruitInstance) return;
    this.isExecuting = true;
    this.executionTimer = 0;

    if (this.intent.type === 'OSHIDASHI_PUSH') {
      this.executionTotalTime = 0.45;
      // Apply initial forward propulsion drive to rival's body
      const driveSpeed = 260 + (this.profile.mass > 12 ? 40 : 80);
      this.fruitInstance.vx = this.intent.dirX * driveSpeed;
      this.fruitInstance.vy = this.intent.dirY * driveSpeed;
    } else if (this.intent.type === 'TSUPPARI_SLAP') {
      this.executionTotalTime = 0.6;
      this.slapStepsRemaining = 3;
    }
  }

  /**
   * Updates rival action physics during simulation loop
   */
  public update(dt: number, arena: ArenaConfig, playerFruits: SumoFruitInstance[]): {
    slapImpulse?: { x: number; y: number; radius: number; strength: number };
    fxEvent?: 'SLAP' | 'RUSH' | 'RECOVERY';
  } {
    if (!this.fruitInstance || this.fruitInstance.state === 'RING_OUT') {
      this.isExecuting = false;
      this.intent = null;
      return {};
    }

    // Handle recovery breath
    if (this.isRecovering) {
      this.recoveryTimer -= dt;
      if (this.recoveryTimer <= 0) {
        this.isRecovering = false;
        this.planNextIntent(arena, playerFruits);
      }
      return {};
    }

    if (!this.isExecuting) return {};

    this.executionTimer += dt;

    if (this.intent?.type === 'OSHIDASHI_PUSH') {
      // Continuous sustained forward thrust during push
      const thrustPower = 180 * (1 - this.executionTimer / this.executionTotalTime);
      this.fruitInstance.vx += this.intent.dirX * thrustPower * dt;
      this.fruitInstance.vy += this.intent.dirY * thrustPower * dt;

      if (this.executionTimer >= this.executionTotalTime) {
        this.isExecuting = false;
        this.isRecovering = true;
        this.recoveryTimer = 0.6; // Brief visible exhale recovery
        return { fxEvent: 'RECOVERY' };
      }
      return { fxEvent: 'RUSH' };
    }

    if (this.intent?.type === 'TSUPPARI_SLAP') {
      // 3 short burst thrusts
      const stepDuration = this.executionTotalTime / 3;
      const currentStep = Math.floor(this.executionTimer / stepDuration);
      const stepProgress = (this.executionTimer % stepDuration) / stepDuration;

      if (stepProgress < dt * 4 && this.slapStepsRemaining > 0) {
        this.slapStepsRemaining--;
        // Thrust impulse forward
        const slapImpulseSpeed = 120;
        this.fruitInstance.vx += this.intent.dirX * slapImpulseSpeed;
        this.fruitInstance.vy += this.intent.dirY * slapImpulseSpeed;

        const slapReach = 65;
        const impactX = this.fruitInstance.x + this.intent.dirX * slapReach;
        const impactY = this.fruitInstance.y + this.intent.dirY * slapReach;

        return {
          slapImpulse: {
            x: impactX,
            y: impactY,
            radius: 50,
            strength: 140,
          },
          fxEvent: 'SLAP',
        };
      }

      if (this.executionTimer >= this.executionTotalTime) {
        this.isExecuting = false;
        this.isRecovering = true;
        this.recoveryTimer = 0.7; // Miss recovery
        return { fxEvent: 'RECOVERY' };
      }
    }

    return {};
  }

  public cancelNextAttackYokozuna() {
    this.attackCanceledByYokozuna = true;
    this.isExecuting = false;
    this.isRecovering = true;
    this.recoveryTimer = 1.2;
  }

  public counterBossAttack(skill: 'PALM_STRIKE' | 'TAIKO_PULSE'): boolean {
    const id = this.profile.id;
    let effective = false;

    // Palm Strike counters Tengu Orange (rush) and Coconut Tank (brace/rush)
    if (skill === 'PALM_STRIKE' && (id === 'TENGU_ORANGE' || id === 'COCONUT_TANK')) {
      effective = true;
    }
    // Taiko Pulse counters Cherry Slapper (slaps) and Dragonfruit Yokozuna (current attack)
    if (skill === 'TAIKO_PULSE' && (id === 'CHERRY_SLAPPER' || id === 'DRAGONFRUIT_YOKOZUNA')) {
      effective = true;
    }

    if (!effective) return false;

    // Interrupt active execution or upcoming attack
    this.isExecuting = false;
    this.isRecovering = true;
    this.recoveryTimer = 1.4; // Dazed recovery
    this.attackCanceledByYokozuna = true; // Prevents retaliation for remainder of this shot

    // Apply knockback modifier once; repeated contact must not stack it
    if (!this.isCounteredThisShot) {
      this.isCounteredThisShot = true;
      this.knockbackMultiplier = 1.35;
    }

    return true;
  }

  public onShotResolved() {
    this.isCounteredThisShot = false;
    this.knockbackMultiplier = 1.0;
    if (this.profile.id === 'DRAGONFRUIT_YOKOZUNA') {
      this.dragonfruitAlternator = !this.dragonfruitAlternator;
    }
  }
}
