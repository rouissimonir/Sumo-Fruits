import { SumoFruitInstance } from './game';

export type VersusTurnPhase =
  | 'PREPARE'
  | 'AIMING'
  | 'SHOT_IN_PLAY'
  | 'RESOLVING'
  | 'RESULT'
  | 'NEXT_PLAYER';

export type TurnObjectiveKind =
  | 'ATTACK'
  | 'DEFEND'
  | 'MERGE'
  | 'REPOSITION';

export interface VersusTurnObjective {
  kind: TurnObjectiveKind;
  player: 1 | 2;
  targetFruitId: number | null;
  message: string;
  rimDirection?: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
  urgency: number; // 0 to 1
}

export interface VersusClaimToken {
  player: 1 | 2;
  turnId: number;
  originatedFromLaunch: boolean;
  stealUsed: boolean;
}

export interface FruitDangerState {
  fruitId: number;
  owner: 1 | 2;
  wasDangerousAtTurnStart: boolean;
  enteredDangerThisShot: boolean;
  exitedDangerThisShot: boolean;
  scoringLocked: boolean;
}

export type VersusScoreCategory =
  | 'MERGE'
  | 'RIM_PRESSURE'
  | 'RESCUE'
  | 'RING_OUT'
  | 'BANK_RING_OUT'
  | 'MULTI_RING_OUT'
  | 'YOKOZUNA';

export interface VersusScoreEvent {
  id: string;
  turnId: number;
  player: 1 | 2;
  category: VersusScoreCategory;
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  description: string;
  timestamp: number;
}

export interface BaseVersusEvent {
  id: string;
  turnId: number;
  player: 1 | 2;
  timestamp: number;
}

export interface MergeEvent extends BaseVersusEvent {
  kind: 'MERGE';
  resultingTier: number;
  fruitAId: number;
  fruitBId: number;
}

export interface ClaimFusionEvent extends BaseVersusEvent {
  kind: 'CLAIM_FUSION';
  attackerPlayer: 1 | 2;
  stolenFruitTier: number;
  createdTier: number;
  stolenFruitId: number;
}

export interface RimDangerEvent extends BaseVersusEvent {
  kind: 'RIM_DANGER';
  victimFruitId: number;
  victimTier: number;
  rimDirection?: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
}

export interface RescueEvent extends BaseVersusEvent {
  kind: 'RESCUE';
  rescuedFruitId: number;
  rescuedTier: number;
}

export interface RingOutEvent extends BaseVersusEvent {
  kind: 'RING_OUT';
  victimFruitId: number;
  victimTier: number;
  victimOwner: 1 | 2;
  isSelfRingOut: boolean;
  hadPriorBank: boolean;
}

export interface BankContactEvent extends BaseVersusEvent {
  kind: 'BANK_CONTACT';
  baleIndex: number;
}

export interface YokozunaEvent extends BaseVersusEvent {
  kind: 'YOKOZUNA';
  createdFruitId: number;
}

export type VersusActionEvent =
  | MergeEvent
  | ClaimFusionEvent
  | RimDangerEvent
  | RescueEvent
  | RingOutEvent
  | BankContactEvent
  | YokozunaEvent;

export interface VersusTurnContext {
  id: number;
  actingPlayer: 1 | 2;
  launchedFruitId: number;
  startedAt: number;
  objective: VersusTurnObjective | null;
  bankContact: boolean;
  stealUsed: boolean;
  events: VersusActionEvent[];
  startingPositions: Map<number, { x: number; y: number }>;
  startingDangerIds: Set<number>;
  touchedFruitIds: Set<number>;
}

export interface VersusTurnSummary {
  turnId: number;
  player: 1 | 2;
  headline: string;
  totalPoints: number;
  primaryCategory?: VersusScoreCategory;
  primaryEvent: VersusActionEvent | null;
  details: string[];
  ringOutCount: number;
  mergeCount: number;
  stolenFruitTier?: number;
  displayDuration: number;
}
