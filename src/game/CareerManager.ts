import { CAMPAIGN_LEVELS, getCampaignLevel } from '../content/campaign';
import { CampaignLevel, CampaignProgress, CampaignResult, CampaignSnapshot, CampaignStampRule } from '../types/campaign';
import { HazardKind } from '../types/game';
import { REWARD_DEFINITIONS, RewardId, RewardSlot, normalizeRewardId } from '../types/rewards';

const STORAGE_KEY = 'sumo_fruits_campaign_progress_v1';
const emptyProgress = (): CampaignProgress => ({
  version: 2, completedLevelIds: [], stampsByLevel: {}, bestScores: {},
  unlockedRewardIds: [], equippedRewards: {}, lastLevelId: CAMPAIGN_LEVELS[0].id,
});

export class CareerManager {
  public currentStageIndex = 0;
  public stages = CAMPAIGN_LEVELS;
  public activeLevel: CampaignLevel | null = null;
  public shotsUsed = 0;
  public objectiveProgress = 0;
  public playerRingOuts = 0;
  public usedSalt = false;
  public maxCombo = 0;
  public createdYokozuna = false;
  public highestCreatedTier = 0;
  public result: CampaignResult | null = null;
  public usedSkills: Set<'PALM_STRIKE' | 'TAIKO_PULSE'> = new Set();
  public progress: CampaignProgress = this.loadProgress();
  private queueIndex = 0;
  private lastRemovalShot = -1;
  private removalsThisShot = 0;
  private maxRemovalsInShot = 0;

  public getCurrentStage(): CampaignLevel {
    return this.activeLevel ?? CAMPAIGN_LEVELS[this.currentStageIndex];
  }

  public isUnlocked(index: number): boolean { return index <= this.getHighestUnlockedIndex(); }

  public getHighestUnlockedIndex(): number {
    let highest = 0;
    for (let i = 0; i < CAMPAIGN_LEVELS.length - 1; i++) {
      if (this.progress.completedLevelIds.includes(CAMPAIGN_LEVELS[i].id)) highest = i + 1;
      else break;
    }
    return highest;
  }

  public startLevel(levelId: string): CampaignLevel {
    const level = getCampaignLevel(levelId);
    if (!level) throw new Error(`Unknown campaign level: ${levelId}`);
    if (!this.isUnlocked(level.index)) throw new Error(`Campaign level is locked: ${levelId}`);
    this.activeLevel = level;
    this.currentStageIndex = level.index;
    this.progress.lastLevelId = level.id;
    this.resetAttempt();
    this.saveProgress();
    return level;
  }

  public restartAttempt(): void { this.resetAttempt(); }

  public consumeNextTier(): number {
    const level = this.activeLevel;
    if (!level) return 1;
    const tier = level.queue[Math.min(this.queueIndex, level.queue.length - 1)] ?? 1;
    this.queueIndex++;
    return tier;
  }

  public peekTiers(): [number, number] {
    const level = this.activeLevel;
    if (!level) return [1, 1];
    return [
      level.queue[Math.min(this.queueIndex, level.queue.length - 1)] ?? 1,
      level.queue[Math.min(this.queueIndex + 1, level.queue.length - 1)] ?? 1,
    ];
  }

  public recordShot(): void { if (this.isActive()) this.shotsUsed++; }

  public recordShotResolved(score: number, lives: number): void {
    if (!this.isActive() || !this.activeLevel) return;
    if (this.activeLevel.objective.type === 'SURVIVE_SHOTS') {
      this.objectiveProgress = Math.min(this.shotsUsed, this.activeLevel.objective.count);
    }
    const level = this.activeLevel;
    // Final-life loss takes precedence over victory within the same resolving shot
    if (lives <= 0) {
      this.fail('All of your rikishi were pushed out.');
      return;
    }
    if (this.objectiveProgress >= this.getTarget(level)) {
      this.complete(score, lives);
      return;
    }
    if (this.shotsUsed >= level.shotLimit) {
      this.fail(`No shots left — ${level.objectiveText.toLowerCase()} is still incomplete.`);
      return;
    }
  }

  public recordFusion(tier: number, combo: number, score: number, lives: number): void {
    if (!this.isActive() || !this.activeLevel) return;
    this.maxCombo = Math.max(this.maxCombo, combo);
    if (tier === 11) this.createdYokozuna = true;
    this.highestCreatedTier = Math.max(this.highestCreatedTier, tier);
    const objective = this.activeLevel.objective;
    if (objective.type === 'CREATE_TIER' && tier >= objective.tier) {
      this.objectiveProgress = Math.min(objective.count, this.objectiveProgress + 1);
    }
    this.evaluate(score, lives);
  }

  public recordHazardRemoval(kind: HazardKind, cause: 'RING_OUT' | 'SALT' | 'DESTROYED', score: number, lives: number): void {
    if (!this.isActive() || !this.activeLevel) return;
    const objective = this.activeLevel.objective;
    if (objective.type === 'CLEAR_HAZARDS') {
      const kindMatches = !objective.kinds || objective.kinds.includes(kind);
      const causeMatches = !objective.physicalOnly || cause === 'RING_OUT';
      if (kindMatches && causeMatches) {
        this.objectiveProgress = Math.min(objective.count, this.objectiveProgress + 1);
        if (this.lastRemovalShot === this.shotsUsed) this.removalsThisShot++;
        else { this.lastRemovalShot = this.shotsUsed; this.removalsThisShot = 1; }
        this.maxRemovalsInShot = Math.max(this.maxRemovalsInShot, this.removalsThisShot);
      }
    }
    this.evaluate(score, lives);
  }

  public recordRivalDefeat(score: number, lives: number): void {
    if (!this.isActive() || !this.activeLevel) return;
    if (this.activeLevel.objective.type === 'DEFEAT_RIVAL') this.objectiveProgress = 1;
    this.evaluate(score, lives);
  }

  public recordPlayerRingOut(): void { if (this.isActive()) this.playerRingOuts++; }
  public recordSaltUsed(): void { if (this.isActive()) this.usedSalt = true; }

  public recordSkillUsed(skill: 'PALM_STRIKE' | 'TAIKO_PULSE'): void {
    if (this.isActive()) this.usedSkills.add(skill);
  }

  public equipReward(rewardId: RewardId): boolean {
    if (!this.progress.unlockedRewardIds.includes(rewardId)) return false;
    const reward = REWARD_DEFINITIONS[rewardId];
    this.progress.equippedRewards[reward.slot] = rewardId;
    this.saveProgress();
    return true;
  }

  public getEquippedReward(slot: RewardSlot): RewardId | null {
    const rewardId = this.progress.equippedRewards[slot];
    return rewardId && this.progress.unlockedRewardIds.includes(rewardId) ? rewardId : null;
  }

  public getNextReward(): { rewardId: RewardId; levelId: string; levelIndex: number } | null {
    const level = CAMPAIGN_LEVELS.find((candidate) =>
      candidate.rewardId && !this.progress.unlockedRewardIds.includes(candidate.rewardId)
    );
    return level?.rewardId ? { rewardId: level.rewardId, levelId: level.id, levelIndex: level.index } : null;
  }

  public sync(score: number, lives: number): void {
    if (!this.isActive() || !this.activeLevel) return;
    if (this.activeLevel.objective.type === 'REACH_SCORE') {
      this.objectiveProgress = Math.min(score, this.activeLevel.objective.score);
    }
    this.evaluate(score, lives);
  }

  public fail(reason: string): void {
    if (this.isActive()) this.result = { status: 'LOST', reason, earnedStamps: 0, newStamps: 0 };
  }

  public clearResult(): void { this.result = null; }

  public getSnapshot(): CampaignSnapshot {
    const level = this.activeLevel;
    return {
      activeLevelId: level?.id ?? null,
      activeLevelIndex: level?.index ?? this.currentStageIndex,
      levelCount: CAMPAIGN_LEVELS.length,
      chapter: level?.chapter ?? Math.floor(this.currentStageIndex / 6) + 1,
      title: level?.title ?? '', objectiveText: level?.objectiveText ?? '',
      progress: this.objectiveProgress, target: level ? this.getTarget(level) : 0,
      shotsUsed: this.shotsUsed, shotLimit: level?.shotLimit ?? 0,
      result: this.result ? { ...this.result } : null,
      completedLevelIds: [...this.progress.completedLevelIds],
      stampsByLevel: { ...this.progress.stampsByLevel }, bestScores: { ...this.progress.bestScores },
      unlockedRewardIds: [...this.progress.unlockedRewardIds],
      equippedRewards: { ...this.progress.equippedRewards },
      highestUnlockedIndex: this.getHighestUnlockedIndex(),
    };
  }

  public getContinueLevelId(): string {
    const saved = getCampaignLevel(this.progress.lastLevelId);
    return saved && this.isUnlocked(saved.index) ? saved.id : CAMPAIGN_LEVELS[this.getHighestUnlockedIndex()].id;
  }

  private resetAttempt(): void {
    this.shotsUsed = 0; this.objectiveProgress = 0; this.playerRingOuts = 0;
    this.usedSalt = false; this.usedSkills.clear(); this.maxCombo = 0; this.createdYokozuna = false; this.highestCreatedTier = 0; this.result = null;
    this.queueIndex = 0; this.lastRemovalShot = -1; this.removalsThisShot = 0; this.maxRemovalsInShot = 0;
  }

  private isActive(): boolean { return !!this.activeLevel && !this.result; }

  private getTarget(level: CampaignLevel): number {
    const objective = level.objective;
    if (objective.type === 'CREATE_TIER' || objective.type === 'CLEAR_HAZARDS' || objective.type === 'SURVIVE_SHOTS') return objective.count;
    return objective.type === 'DEFEAT_RIVAL' ? 1 : objective.score;
  }

  private evaluate(score: number, lives: number): void {
    const level = this.activeLevel;
    if (!level || this.result) return;
    if (lives <= 0) { this.fail('All of your rikishi were pushed out.'); return; }
    if (this.objectiveProgress >= this.getTarget(level)) { this.complete(score, lives); return; }
  }

  private complete(score: number, lives: number): void {
    const level = this.activeLevel;
    if (!level || this.result) return;
    const technique = this.evaluateStampRule(level.techniqueRule ?? this.getTechniqueRule(level), lives);
    const mastery = this.evaluateStampRule(level.masteryRule ?? this.getMasteryRule(level.index), lives);
    const earnedStamps = 1 + Number(technique) + Number(mastery);
    const oldStamps = this.progress.stampsByLevel[level.id] ?? 0;
    this.progress.stampsByLevel[level.id] = Math.max(oldStamps, earnedStamps);
    this.progress.bestScores[level.id] = Math.max(this.progress.bestScores[level.id] ?? 0, score);
    if (!this.progress.completedLevelIds.includes(level.id)) this.progress.completedLevelIds.push(level.id);
    let unlockedRewardId: RewardId | undefined;
    if (level.rewardId && !this.progress.unlockedRewardIds.includes(level.rewardId)) {
      this.progress.unlockedRewardIds.push(level.rewardId);
      unlockedRewardId = level.rewardId;
    }
    const next = CAMPAIGN_LEVELS[level.index + 1];
    if (next) this.progress.lastLevelId = next.id;
    this.saveProgress();
    this.result = {
      status: 'WON',
      reason: level.index === CAMPAIGN_LEVELS.length - 1 ? 'Road to Yokozuna conquered!' : 'Objective complete!',
      earnedStamps,
      newStamps: Math.max(0, earnedStamps - oldStamps),
      unlockedRewardId,
    };
  }

  private evaluateStampRule(rule: CampaignStampRule, lives: number): boolean {
    switch (rule.type) {
      case 'SHOT_LIMIT': return this.shotsUsed <= rule.max;
      case 'NO_RING_OUT': return this.playerRingOuts === 0;
      case 'MIN_LIVES': return lives >= rule.count;
      case 'COMBO': return this.maxCombo >= rule.count;
      case 'MULTI_CLEAR': return this.maxRemovalsInShot >= rule.count;
      case 'USE_SALT': return this.usedSalt;
      case 'USE_SKILL': return this.usedSkills.has(rule.skill);
      case 'CREATE_TIER': return this.highestCreatedTier >= rule.tier;
      case 'WIN': return true;
    }
  }

  private getTechniqueRule(level: CampaignLevel): CampaignStampRule {
    const index = level.index;
    if ([0, 10].includes(index)) return { type: 'SHOT_LIMIT', max: 1 };
    if ([1, 4].includes(index)) return { type: 'COMBO', count: 2 };
    if ([9, 22].includes(index)) return { type: 'COMBO', count: 3 };
    if ([7, 20].includes(index)) return { type: 'MULTI_CLEAR', count: 2 };
    if ([3, 8].includes(index)) return { type: 'USE_SALT' };
    if (index === 23) return { type: 'CREATE_TIER', tier: 11 };
    return { type: 'SHOT_LIMIT', max: Math.max(1, Math.floor(level.shotLimit * 0.6)) };
  }

  private getMasteryRule(index: number): CampaignStampRule {
    const limits: Record<number, number> = { 1: 4, 3: 2, 4: 3, 6: 6, 8: 5, 9: 8, 12: 7, 13: 4, 15: 8, 18: 9, 20: 5, 21: 6 };
    if (limits[index]) return { type: 'SHOT_LIMIT', max: limits[index] };
    if ([5, 11, 17, 19, 22, 23].includes(index)) return { type: 'MIN_LIVES', count: 2 };
    return { type: 'NO_RING_OUT' };
  }

  private loadProgress(): CampaignProgress {
    try {
      if (typeof localStorage === 'undefined') return emptyProgress();
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyProgress();
      const parsed = JSON.parse(raw) as Partial<CampaignProgress> & { unlockedRewards?: unknown[] };
      const legacyRewards = [
        ...(Array.isArray(parsed.unlockedRewardIds) ? parsed.unlockedRewardIds : []),
        ...(Array.isArray(parsed.unlockedRewards) ? parsed.unlockedRewards : []),
      ];
      const unlockedRewardIds = [...new Set(legacyRewards.map(normalizeRewardId).filter((id): id is RewardId => id !== null))];
      const equippedRewards: CampaignProgress['equippedRewards'] = {};
      if (parsed.equippedRewards && typeof parsed.equippedRewards === 'object') {
        for (const slot of ['MAWASHI', 'BOWL', 'TAWARA'] as const) {
          const rewardId = normalizeRewardId(parsed.equippedRewards[slot]);
          if (rewardId && unlockedRewardIds.includes(rewardId) && REWARD_DEFINITIONS[rewardId].slot === slot) {
            equippedRewards[slot] = rewardId;
          }
        }
      }
      return {
        version: 2,
        completedLevelIds: Array.isArray(parsed.completedLevelIds) ? parsed.completedLevelIds.filter((id): id is string => typeof id === 'string' && !!getCampaignLevel(id)) : [],
        stampsByLevel: parsed.stampsByLevel && typeof parsed.stampsByLevel === 'object' ? parsed.stampsByLevel : {},
        bestScores: parsed.bestScores && typeof parsed.bestScores === 'object' ? parsed.bestScores : {},
        unlockedRewardIds,
        equippedRewards,
        lastLevelId: typeof parsed.lastLevelId === 'string' && getCampaignLevel(parsed.lastLevelId) ? parsed.lastLevelId : CAMPAIGN_LEVELS[0].id,
      };
    } catch { return emptyProgress(); }
  }

  private saveProgress(): void {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress)); }
    catch { /* Campaign remains playable when storage is unavailable. */ }
  }
}
