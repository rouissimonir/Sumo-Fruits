export interface FruitTierData {
  tier: number;
  name: string;
  radius: number; // in world pixels
  mass: number;
  damp: number;
  restitution: number;
  resistance: number; // 0.0 - 1.0 (Tier 11 = 1.0)
  color: string;
  secondaryColor: string;
  mawashiColor: string;
  faceDetails: {
    eyeOffset: number;
    eyeSize: number;
    pupilSize: number;
    mawashiWidth: number;
  };
}

export const FRUIT_CATALOG: FruitTierData[] = [
  {
    tier: 1,
    name: 'Blueberry',
    radius: 16,
    mass: 1.0,
    damp: 0.8,
    restitution: 0.85,
    resistance: 0.05,
    color: '#4B69FD',
    secondaryColor: '#2D44D2',
    mawashiColor: '#FFFFFF',
    faceDetails: { eyeOffset: 4, eyeSize: 3, pupilSize: 1.5, mawashiWidth: 4 }
  },
  {
    tier: 2,
    name: 'Cherry',
    radius: 22,
    mass: 2.2,
    damp: 0.9,
    restitution: 0.82,
    resistance: 0.10,
    color: '#DE2638',
    secondaryColor: '#A51624',
    mawashiColor: '#FFEAA7',
    faceDetails: { eyeOffset: 6, eyeSize: 3.5, pupilSize: 1.8, mawashiWidth: 5 }
  },
  {
    tier: 3,
    name: 'Lime',
    radius: 28,
    mass: 4.0,
    damp: 1.0,
    restitution: 0.80,
    resistance: 0.18,
    color: '#6CE838',
    secondaryColor: '#4CA822',
    mawashiColor: '#2C3E50',
    faceDetails: { eyeOffset: 8, eyeSize: 4.5, pupilSize: 2.2, mawashiWidth: 6 }
  },
  {
    tier: 4,
    name: 'Strawberry',
    radius: 36,
    mass: 7.0,
    damp: 1.1,
    restitution: 0.78,
    resistance: 0.28,
    color: '#FF3B62',
    secondaryColor: '#D11C41',
    mawashiColor: '#F1C40F',
    faceDetails: { eyeOffset: 10, eyeSize: 5.5, pupilSize: 2.5, mawashiWidth: 7 }
  },
  {
    tier: 5,
    name: 'Peach',
    radius: 46,
    mass: 11.5,
    damp: 1.2,
    restitution: 0.75,
    resistance: 0.40,
    color: '#FFB38A',
    secondaryColor: '#E68555',
    mawashiColor: '#8E44AD',
    faceDetails: { eyeOffset: 13, eyeSize: 6.5, pupilSize: 3.0, mawashiWidth: 9 }
  },
  {
    tier: 6,
    name: 'Orange',
    radius: 58,
    mass: 18.0,
    damp: 1.4,
    restitution: 0.72,
    resistance: 0.55,
    color: '#FFA21F',
    secondaryColor: '#D67600',
    mawashiColor: '#16A085',
    faceDetails: { eyeOffset: 16, eyeSize: 8, pupilSize: 3.8, mawashiWidth: 11 }
  },
  {
    tier: 7,
    name: 'Apple',
    radius: 72,
    mass: 27.0,
    damp: 1.6,
    restitution: 0.70,
    resistance: 0.70,
    color: '#F02828',
    secondaryColor: '#B51515',
    mawashiColor: '#D35400',
    faceDetails: { eyeOffset: 20, eyeSize: 9.5, pupilSize: 4.5, mawashiWidth: 14 }
  },
  {
    tier: 8,
    name: 'Melon',
    radius: 88,
    mass: 40.0,
    damp: 1.8,
    restitution: 0.68,
    resistance: 0.82,
    color: '#B6E85B',
    secondaryColor: '#89BD31',
    mawashiColor: '#2980B9',
    faceDetails: { eyeOffset: 24, eyeSize: 11, pupilSize: 5.2, mawashiWidth: 17 }
  },
  {
    tier: 9,
    name: 'Coconut',
    radius: 106,
    mass: 58.0,
    damp: 2.0,
    restitution: 0.65,
    resistance: 0.92,
    color: '#8B5A2B',
    secondaryColor: '#5C3814',
    mawashiColor: '#E74C3C',
    faceDetails: { eyeOffset: 28, eyeSize: 13, pupilSize: 6.0, mawashiWidth: 20 }
  },
  {
    tier: 10,
    name: 'Watermelon',
    radius: 130,
    mass: 85.0,
    damp: 2.3,
    restitution: 0.60,
    resistance: 0.98,
    color: '#2BA84A',
    secondaryColor: '#196E2F',
    mawashiColor: '#9B59B6',
    faceDetails: { eyeOffset: 34, eyeSize: 15, pupilSize: 7.0, mawashiWidth: 24 }
  },
  {
    tier: 11,
    name: 'Yokozuna Pineapple',
    radius: 160,
    mass: 150.0,
    damp: 3.0,
    restitution: 0.50,
    resistance: 1.00,
    color: '#FFD700',
    secondaryColor: '#D4AF37',
    mawashiColor: '#C0392B', // Ceremonial red & gold
    faceDetails: { eyeOffset: 42, eyeSize: 18, pupilSize: 8.5, mawashiWidth: 30 }
  }
];

export type FruitState =
  | 'IDLE'
  | 'AIMING'
  | 'IN_RING'
  | 'CLASHING'
  | 'MERGING'
  | 'RING_OUT';

export interface VerletParticle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

export interface MawashiTail {
  particles: VerletParticle[]; // [pinned root, particle 1, particle 2]
  segmentLength: number;
}

export interface SquashState {
  amplitude: number;
  normalX: number;
  normalY: number;
  elapsed: number;
  active: boolean;
}

export interface RippleState {
  elapsed: number;
  impactAngle: number;
  active: boolean;
}

export interface SumoFruitInstance {
  id: number;
  tier: number;
  team: 'PLAYER' | 'RIVAL';
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: FruitState;
  entryPending: boolean;
  rimPermission: boolean;
  clashId: number | null;
  squash: SquashState;
  ripple: RippleState;
  leftTail: MawashiTail;
  rightTail: MawashiTail;
  fallProgress: number; // 0 to 1 for ring-out animation
  lookTarget: { x: number; y: number } | null;
  panic: boolean;
  nearRimSaved?: boolean;
  wipingSweatTimer?: number;
  hasEnteredRing?: boolean;
  wasInRimDanger?: boolean;
}

export type HazardKind = 'BUG' | 'ICE' | 'WASABI' | 'CHILI' | 'RIVAL';

export interface HazardInstance {
  id: number;
  kind: HazardKind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  damp: number;
  restitution: number;
  resistance: number;
  scoreValue: number;
  cleansing: boolean;
  ringOut: boolean;
  fallProgress: number;
  rotation: number;
  aiChargeTimer?: number;
  aiChargeDir?: { x: number; y: number };
  chiliArrowAngle?: number;
  wasabiConsumed?: boolean;
  hp?: number;
  maxHp?: number;
  hitFlashTimer?: number;
}

export type TawaraState = 'INTACT' | 'FRAYED' | 'CRACKED' | 'BROKEN';

export interface StrawBale {
  index: number;
  angleStart: number;
  angleEnd: number;
  health: number; // 3: Intact, 2: Frayed, 1: Cracked, 0: Broken
  maxHealth: number;
  state: TawaraState;
  lastHitTime?: number;
}

export interface SaltZone {
  id: number;
  x: number;
  y: number;
  radius: number; // ~90 px
  duration: number; // remaining gameplay seconds
  maxDuration: number;
  activeInPlay: boolean; // active for first 3s of next committed shot
}

export type RefereePriority = 'RESULT' | 'YOKOZUNA' | 'RIVAL_DEFEAT' | 'COMBO' | 'ORDINARY';

export interface RefereeCall {
  id: number;
  textJp: string;
  textRomaji: string;
  subText: string;
  color: string;
  duration: number;
  maxDuration: number;
  priority: RefereePriority;
}

export type ArenaMode = 'CIRCULAR' | 'ELLIPTICAL' | 'WOBBLE';
export type GameModeType = 'CLASSIC' | 'CAREER' | 'CHALLENGE';

export type RivalActionType = 'OSHIDASHI_PUSH' | 'TSUPPARI_SLAP' | 'RECOVERY' | 'IDLE';

export interface RivalIntent {
  type: RivalActionType;
  dirX: number;
  dirY: number;
  targetX?: number;
  targetY?: number;
  length: number;
  coneAngle?: number;
  shotsUntilAttack: number;
  locked: boolean;
}

export interface RivalProfile {
  id: string;
  name: string;
  title: string;
  fruitName: string;
  tier: number;
  color: string;
  crest: string;
  mass: number;
  radius: number;
  moveType: 'OSHIDASHI_PUSH' | 'TSUPPARI_SLAP';
  attackIntervalShots: number;
  habitDescription: string;
  defeatQuote: string;
}

export interface CareerStage {
  index: number;
  name: string;
  rankTitle: string;
  rival: RivalProfile;
  arenaMode: ArenaMode;
  complicationDescription: string;
  unlocked: boolean;
  completed: boolean;
  hasWasabi?: boolean;
  hasChili?: boolean;
  hasFragileRims?: boolean;
}

export interface ChallengeScenario {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  arenaMode: ArenaMode;
  description: string;
  rival?: RivalProfile;
  hasWasabi?: boolean;
  hasChili?: boolean;
  brokenBales?: number[];
  allowedShots?: number;
}

export interface TechniqueRibbon {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  duration: number;
}

export interface PhysicsTuning {
  slopeK: number;
  escapeSpeed: number;
  clashDuration: number;
  hitStopScale: number;
  shockwaveImpulse: number;
  baleMaxHealth: number;
  restitution: number;
  rimDamping: number;
}

export interface ClashRecord {
  id: number;
  fruitAId: number;
  fruitBId: number;
  sourceTier: number;
  elapsedTime: number; // up to 0.5s
  lockX_A: number;
  lockY_A: number;
  lockX_B: number;
  lockY_B: number;
  incomingVxA: number;
  incomingVyA: number;
  incomingVxB: number;
  incomingVyB: number;
  deferredImpulseX: number;
  deferredImpulseY: number;
  normalX: number;
  normalY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'SPARK' | 'CONFETTI' | 'RIPPLE' | 'SPLASH' | 'DUST' | 'SALT' | 'FLAME' | 'SKID';
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  impact?: boolean;
  boosted?: boolean;
}
