import { ArenaConditionType, ArenaMode, HazardKind } from './game';

export type CampaignObjective =
  | { type: 'CREATE_TIER'; tier: number; count: number }
  | { type: 'CLEAR_HAZARDS'; count: number; kinds?: HazardKind[]; physicalOnly?: boolean }
  | { type: 'DEFEAT_RIVAL'; count: 1 }
  | { type: 'SURVIVE_SHOTS'; count: number }
  | { type: 'REACH_SCORE'; score: number };

export type CampaignStampRule =
  | { type: 'SHOT_LIMIT'; max: number }
  | { type: 'NO_RING_OUT' }
  | { type: 'MIN_LIVES'; count: number }
  | { type: 'COMBO'; count: number }
  | { type: 'MULTI_CLEAR'; count: number }
  | { type: 'USE_SALT' }
  | { type: 'CREATE_TIER'; tier: number }
  | { type: 'WIN' };

export interface CampaignBoardFruit {
  tier: number;
  x: number;
  y: number;
}

export interface CampaignBoardHazard {
  kind: Exclude<HazardKind, 'RIVAL'>;
  x: number;
  y: number;
}

export interface CampaignLevel {
  id: string;
  index: number;
  chapter: number;
  title: string;
  subtitle: string;
  objectiveText: string;
  objective: CampaignObjective;
  techniqueText: string;
  techniqueRule?: CampaignStampRule;
  masteryText: string;
  masteryRule?: CampaignStampRule;
  shotLimit: number;
  lives: number;
  saltCharges: number;
  arenaMode: ArenaMode;
  arenaCondition: ArenaConditionType;
  queue: number[];
  initialFruits?: CampaignBoardFruit[];
  initialHazards?: CampaignBoardHazard[];
  brokenBales?: number[];
  rivalId?: 'TENGU_ORANGE' | 'CHERRY_SLAPPER' | 'COCONUT_TANK' | 'DRAGONFRUIT_YOKOZUNA';
  reward?: string;
}

export type CampaignResultStatus = 'ACTIVE' | 'WON' | 'LOST';

export interface CampaignResult {
  status: CampaignResultStatus;
  reason: string;
  earnedStamps: number;
  newStamps: number;
}

export interface CampaignProgress {
  version: 1;
  completedLevelIds: string[];
  stampsByLevel: Record<string, number>;
  bestScores: Record<string, number>;
  unlockedRewards: string[];
  lastLevelId: string;
}

export interface CampaignSnapshot {
  activeLevelId: string | null;
  activeLevelIndex: number;
  levelCount: number;
  chapter: number;
  title: string;
  objectiveText: string;
  progress: number;
  target: number;
  shotsUsed: number;
  shotLimit: number;
  result: CampaignResult | null;
  completedLevelIds: string[];
  stampsByLevel: Record<string, number>;
  bestScores: Record<string, number>;
  unlockedRewards: string[];
  highestUnlockedIndex: number;
}
