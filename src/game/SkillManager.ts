import { SkillDefinition, SkillState, SkillType, SKILL_DEFINITIONS } from '../types/skills';

export class SkillManager {
  public equipped: SkillType = 'SALT';
  public charge: number = 1;
  public maxCharge: number = 1;
  public rechargeProgress: number = 0;
  public rechargeGoal: number = 6;
  public isArmed: boolean = false;
  public hasBonusRechargeThisShot: boolean = false;
  private highestCareerIndexUnlocked: number = 0;
  private isDailyOverride: boolean = false;
  private dailyUnlockedSkills: SkillType[] = ['SALT'];

  constructor() {
    this.resetForNewGame();
  }

  public resetForNewGame(initialCharge: number = 1): void {
    this.charge = Math.min(this.maxCharge, initialCharge);
    this.rechargeProgress = 0;
    this.isArmed = false;
    this.hasBonusRechargeThisShot = false;
  }

  public updateCareerProgression(highestUnlockedIndex: number): void {
    this.highestCareerIndexUnlocked = highestUnlockedIndex;
    // Auto-equip Palm Strike if freshly unlocked on level 5, etc.
  }

  public setDailyKit(seed: number): void {
    this.isDailyOverride = true;
    // Derive daily kit fairly from seed
    const kit: SkillType[] = ['SALT'];
    if (seed % 2 === 0 || seed % 3 === 0) {
      kit.push('PALM_STRIKE');
    }
    if (seed % 3 === 0 || seed % 5 === 0) {
      kit.push('TAIKO_PULSE');
    }
    this.dailyUnlockedSkills = kit;
    if (!kit.includes(this.equipped)) {
      this.equipped = kit[0];
    }
    this.isArmed = false;
  }

  public clearDailyOverride(): void {
    this.isDailyOverride = false;
  }

  public getUnlockedSkills(): SkillType[] {
    if (this.isDailyOverride) {
      return [...this.dailyUnlockedSkills];
    }

    const list: SkillType[] = ['SALT'];
    if (this.highestCareerIndexUnlocked >= 4) {
      list.push('PALM_STRIKE');
    }
    if (this.highestCareerIndexUnlocked >= 11) {
      list.push('TAIKO_PULSE');
    }
    return list;
  }

  public isSkillUnlocked(skill: SkillType): boolean {
    return this.getUnlockedSkills().includes(skill);
  }

  public equipSkill(skill: SkillType): boolean {
    if (!this.isSkillUnlocked(skill)) return false;
    this.equipped = skill;
    this.isArmed = false;
    return true;
  }

  public toggleArm(): boolean {
    if (this.equipped === 'SALT') {
      // Salt uses targeting mode, not armed launch
      return false;
    }
    if (this.charge < 1) {
      this.isArmed = false;
      return false;
    }
    this.isArmed = !this.isArmed;
    return this.isArmed;
  }

  public disarm(): void {
    this.isArmed = false;
  }

  public canUseSalt(): boolean {
    return this.equipped === 'SALT' && this.charge >= 1;
  }

  public consumeSaltCharge(): boolean {
    if (!this.canUseSalt()) return false;
    this.charge = 0;
    return true;
  }

  public onPlayerLaunchCommitted(): SkillType | null {
    let activeEmpowerment: SkillType | null = null;

    if (this.isArmed && this.charge >= 1) {
      activeEmpowerment = this.equipped;
      this.charge = 0;
      this.isArmed = false;
    }

    // Step recharge on committed launch
    if (this.charge < this.maxCharge) {
      this.rechargeProgress = Math.min(this.rechargeGoal, this.rechargeProgress + 1);
      if (this.rechargeProgress >= this.rechargeGoal) {
        this.charge = this.maxCharge;
        this.rechargeProgress = 0;
      }
    }

    this.hasBonusRechargeThisShot = false;
    return activeEmpowerment;
  }

  public onPhysicalEnemyDefeat(): boolean {
    // Adds 1 recharge step on physical enemy knockout, at most once per shot!
    if (this.hasBonusRechargeThisShot || this.charge >= this.maxCharge) {
      return false;
    }
    this.hasBonusRechargeThisShot = true;
    this.rechargeProgress = Math.min(this.rechargeGoal, this.rechargeProgress + 1);
    if (this.rechargeProgress >= this.rechargeGoal) {
      this.charge = this.maxCharge;
      this.rechargeProgress = 0;
    }
    return true;
  }

  public onShotResolved(): void {
    this.hasBonusRechargeThisShot = false;
  }

  public getSnapshot(): SkillState {
    return {
      equipped: this.equipped,
      charge: this.charge,
      maxCharge: this.maxCharge,
      rechargeProgress: this.rechargeProgress,
      rechargeGoal: this.rechargeGoal,
      isArmed: this.isArmed,
      unlockedSkills: this.getUnlockedSkills(),
    };
  }

  public getDefinition(skill?: SkillType): SkillDefinition {
    return SKILL_DEFINITIONS[skill ?? this.equipped];
  }
}
