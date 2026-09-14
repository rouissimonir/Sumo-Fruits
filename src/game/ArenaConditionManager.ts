import {
  ArenaConditionState,
  ArenaConditionType,
  DailyBashoState,
  SumoFruitInstance,
} from '../types/game';

export const CONDITION_METADATA: Record<
  ArenaConditionType,
  { nameJp: string; nameRomaji: string; description: string; badgeColor: string; icon: string }
> = {
  NONE: {
    nameJp: '清浄土俵',
    nameRomaji: 'Standard Clay',
    description: 'Traditional sun-dried sacred clay surface.',
    badgeColor: '#A0522D',
    icon: '🌾',
  },
  GRIPPY_CLAY: {
    nameJp: '濡れ土俵',
    nameRomaji: 'Grippy Clay',
    description: 'Sacred wet clay increases rolling friction (+0.85 damping). Fruits stop faster!',
    badgeColor: '#27AE60',
    icon: '💧',
  },
  KAMIKAZE_WIND: {
    nameJp: '神風',
    nameRomaji: 'Kamikaze Breeze',
    description: 'Courtyard gusts gently push wrestlers (up to 35 px/s² acceleration).',
    badgeColor: '#2980B9',
    icon: '🍃',
  },
  CLOSING_RING: {
    nameJp: '縮小土俵',
    nameRomaji: 'Closing Ring',
    description: 'Every 5 shots the legal boundary contracts by 3%. 2.0s grace period if outside!',
    badgeColor: '#C0392B',
    icon: '⚡',
  },
};

export class ArenaConditionManager {
  public state: ArenaConditionState;
  private seedRngState: number = 12345;
  private useSeededRng = false;

  constructor(initialType: ArenaConditionType = 'NONE', arenaRadius: number = 340) {
    const meta = CONDITION_METADATA[initialType];
    this.state = {
      type: initialType,
      nameJp: meta.nameJp,
      nameRomaji: meta.nameRomaji,
      description: meta.description,
      badgeColor: meta.badgeColor,
      extraDamping: initialType === 'GRIPPY_CLAY' ? 0.85 : 0.0,
      windForceX: 0,
      windForceY: 0,
      windSpeed: 0,
      windAngle: 0,
      legalRadiusRatio: 1.0,
      legalRadius: arenaRadius,
      shotsUntilShrink: 5,
      shrinkCount: 0,
      outOfBoundsTimers: {},
    };
  }

  public setCondition(type: ArenaConditionType, arenaRadius: number = 340) {
    const meta = CONDITION_METADATA[type];
    this.state.type = type;
    this.state.nameJp = meta.nameJp;
    this.state.nameRomaji = meta.nameRomaji;
    this.state.description = meta.description;
    this.state.badgeColor = meta.badgeColor;
    this.state.extraDamping = type === 'GRIPPY_CLAY' ? 0.85 : 0.0;
    this.state.legalRadiusRatio = 1.0;
    this.state.legalRadius = arenaRadius;
    this.state.shotsUntilShrink = 5;
    this.state.shrinkCount = 0;
    this.state.outOfBoundsTimers = {};

    if (type === 'KAMIKAZE_WIND') {
      this.scheduleNewWind();
    } else {
      this.state.windForceX = 0;
      this.state.windForceY = 0;
      this.state.windSpeed = 0;
      this.state.windAngle = 0;
    }
  }

  public setSeed(seed: number | null) {
    this.useSeededRng = seed !== null;
    this.seedRngState = Math.max(1, Math.floor(seed ?? 12345));
  }

  public syncArenaRadius(arenaRadius: number) {
    this.state.legalRadius = arenaRadius * this.state.legalRadiusRatio;
  }

  private nextRandom(): number {
    if (!this.useSeededRng) return Math.random();
    this.seedRngState = (this.seedRngState * 1664525 + 1013904223) >>> 0;
    return this.seedRngState / 0x100000000;
  }

  /**
   * Schedule immutable wind vector for the upcoming shot
   */
  public scheduleNewWind() {
    if (this.state.type !== 'KAMIKAZE_WIND') {
      this.state.windForceX = 0;
      this.state.windForceY = 0;
      this.state.windSpeed = 0;
      this.state.windAngle = 0;
      return;
    }

    // Angle between 0 and 2*PI, wind force magnitude 90-150 N
    const angle = this.nextRandom() * Math.PI * 2;
    const forceMag = 85 + this.nextRandom() * 55; // N
    this.state.windAngle = angle;
    this.state.windSpeed = forceMag;
    this.state.windForceX = Math.cos(angle) * forceMag;
    this.state.windForceY = Math.sin(angle) * forceMag;
  }

  /**
   * Call on each shot committed/launched
   */
  public onShotCommitted(shotCount: number, arenaRadius: number = 340): { shrunk: boolean; newRatio: number } {
    if (this.state.type === 'KAMIKAZE_WIND') {
      // Wind was scheduled at aiming time, will re-schedule when shot completes or starts
    }

    if (this.state.type === 'CLOSING_RING') {
      this.state.shotsUntilShrink--;
      if (this.state.shotsUntilShrink <= 0) {
        this.state.shotsUntilShrink = 5;
        this.state.shrinkCount++;
        // Contract by 3% per 5 shots down to 50%
        this.state.legalRadiusRatio = Math.max(0.5, 1.0 - 0.03 * this.state.shrinkCount);
        this.state.legalRadius = arenaRadius * this.state.legalRadiusRatio;
        return { shrunk: true, newRatio: this.state.legalRadiusRatio };
      }
    }

    return { shrunk: false, newRatio: this.state.legalRadiusRatio };
  }

  /**
   * Wind acceleration rule: a_wind = (F_wind / m), clamped at 35 px/s^2
   */
  public getWindAcceleration(mass: number): { ax: number; ay: number } {
    if (this.state.type !== 'KAMIKAZE_WIND' || this.state.windSpeed <= 0) {
      return { ax: 0, ay: 0 };
    }

    const rawAx = this.state.windForceX / Math.max(0.5, mass);
    const rawAy = this.state.windForceY / Math.max(0.5, mass);
    const mag = Math.hypot(rawAx, rawAy);

    const maxAcc = 35; // px/s^2
    if (mag > maxAcc) {
      const scale = maxAcc / mag;
      return { ax: rawAx * scale, ay: rawAy * scale };
    }

    return { ax: rawAx, ay: rawAy };
  }

  /**
   * Surface extra damping (Grippy Clay adds +0.85 s^-1)
   */
  public getExtraDamping(): number {
    return this.state.type === 'GRIPPY_CLAY' ? 0.85 : 0.0;
  }

  /**
   * Updates out-of-bounds grace period timers for Closing Ring mode
   */
  public updateOutOfBounds(
    fruits: SumoFruitInstance[],
    arenaCenterX: number,
    arenaCenterY: number,
    dt: number
  ): { eliminatedIds: number[]; warningIds: number[] } {
    if (this.state.type !== 'CLOSING_RING') {
      this.state.outOfBoundsTimers = {};
      return { eliminatedIds: [], warningIds: [] };
    }

    const legalR = this.state.legalRadius;
    const eliminatedIds: number[] = [];
    const warningIds: number[] = [];

    const activeFruitIds = new Set<number>();

    for (const f of fruits) {
      if (f.state !== 'IN_RING' || f.entryPending) continue;
      activeFruitIds.add(f.id);

      const dist = Math.hypot(f.x - arenaCenterX, f.y - arenaCenterY);
      // Fruit is outside legal boundary if center is beyond legalR
      if (dist > legalR) {
        const currentTimer = (this.state.outOfBoundsTimers[f.id] || 0) + dt;
        this.state.outOfBoundsTimers[f.id] = currentTimer;
        warningIds.push(f.id);

        if (currentTimer >= 2.0) {
          // Grace period expired - eliminate fruit!
          eliminatedIds.push(f.id);
          delete this.state.outOfBoundsTimers[f.id];
        }
      } else {
        // Pushed back inside - recovered safely!
        if (this.state.outOfBoundsTimers[f.id] !== undefined) {
          delete this.state.outOfBoundsTimers[f.id];
        }
      }
    }

    // Clean up dead IDs
    for (const idStr of Object.keys(this.state.outOfBoundsTimers)) {
      const id = parseInt(idStr, 10);
      if (!activeFruitIds.has(id)) {
        delete this.state.outOfBoundsTimers[id];
      }
    }

    return { eliminatedIds, warningIds };
  }

  /**
   * Deterministic Daily Basho UTC date calculation and state generator
   */
  public static getUTCKey(date: Date = new Date()): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public static generateDailyBasho(date: Date = new Date()): DailyBashoState {
    const dateStr = ArenaConditionManager.getUTCKey(date);
    const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const utcYearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const dayNumber = Math.floor((utcMidnight - utcYearStart) / 86400000) + 1;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash * 37 + dateStr.charCodeAt(i)) % 1000000;
    }

    // Deterministic condition rotation
    const conditions: ArenaConditionType[] = [
      'GRIPPY_CLAY',
      'KAMIKAZE_WIND',
      'CLOSING_RING',
      'GRIPPY_CLAY',
      'KAMIKAZE_WIND',
      'CLOSING_RING',
      'NONE',
    ];
    const conditionIndex = hash % conditions.length;
    const condition = conditions[conditionIndex];

    const rivalNames = [
      'Tengu the Wind Striker',
      'Kappa the Wet Clay Master',
      'Oni the Ring Shrinker',
      'Raijin the Thunder Basher',
      'Fujin the Breeze Sage',
    ];
    const rivalName = rivalNames[hash % rivalNames.length];

    const titles = [
      'Grand Autumn Basho',
      'Sacred Shrine Cup',
      'Emperor’s Daily Honbasho',
      'Imperial Dohyō Championship',
      'Sacred Salt Invitational',
    ];
    const title = `${titles[hash % titles.length]} (${dateStr})`;

    let savedHighScore = 0;
    let savedCompleted = false;
    let savedBouts = 0;

    try {
      const raw = localStorage.getItem(`daily_basho_${dateStr}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        savedHighScore = parsed.highScore || 0;
        savedCompleted = !!parsed.completed;
        savedBouts = parsed.boutsPlayed || 0;
      }
    } catch {
      // Storage fallback
    }

    return {
      dateStr,
      dayNumber,
      seed: hash,
      title,
      condition,
      rivalName,
      highScore: savedHighScore,
      completed: savedCompleted,
      boutsPlayed: savedBouts,
    };
  }

  public static recordDailyBashoScore(
    dateStr: string,
    score: number,
    completed: boolean = true
  ): { highScore: number; completed: boolean; boutsPlayed: number } {
    try {
      const raw = localStorage.getItem(`daily_basho_${dateStr}`);
      let currentHigh = 0;
      let bouts = 0;
      if (raw) {
        const parsed = JSON.parse(raw);
        currentHigh = parsed.highScore || 0;
        bouts = parsed.boutsPlayed || 0;
      }
      const newHigh = Math.max(currentHigh, score);
      localStorage.setItem(
        `daily_basho_${dateStr}`,
        JSON.stringify({
          highScore: newHigh,
          completed,
          boutsPlayed: bouts + 1,
        })
      );
      return { highScore: newHigh, completed, boutsPlayed: bouts + 1 };
    } catch {
      // Storage fallback
      return { highScore: score, completed, boutsPlayed: 1 };
    }
  }
}
