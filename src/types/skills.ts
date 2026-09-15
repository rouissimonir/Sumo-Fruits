export type SkillType = 'SALT' | 'PALM_STRIKE' | 'TAIKO_PULSE';

export interface SkillDefinition {
  id: SkillType;
  name: string;
  nameJp: string;
  actionType: 'TARGET_AREA' | 'EMPOWER_LAUNCH';
  description: string;
  unlockLevelIndex: number; // 0 for Salt, 4 for Palm Strike (after Lv 4), 12 for Taiko Pulse (after Lv 12)
  icon: string;
  color: string;
  accentColor: string;
}

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
  SALT: {
    id: 'SALT',
    name: 'Sacred Salt',
    nameJp: '清め塩',
    actionType: 'TARGET_AREA',
    description: 'Target a 90px zone to purify beetles, melt ice, cleanse wasabi, and brake player rikishi.',
    unlockLevelIndex: 0,
    icon: '🧂',
    color: '#3498DB',
    accentColor: '#EBF5FB',
  },
  PALM_STRIKE: {
    id: 'PALM_STRIKE',
    name: 'Palm Strike',
    nameJp: '張り手突き',
    actionType: 'EMPOWER_LAUNCH',
    description: 'Empowers next launch: adds 350 forward impulse, shatters Ice Cubs, breaks beetle armor, and interrupts Tengu / Coconut.',
    unlockLevelIndex: 4,
    icon: '✋',
    color: '#E67E22',
    accentColor: '#FEF9E7',
  },
  TAIKO_PULSE: {
    id: 'TAIKO_PULSE',
    name: 'Taiko Pulse',
    nameJp: '太鼓衝撃波',
    actionType: 'EMPOWER_LAUNCH',
    description: 'Empowers next launch: unleashes a 110px shockwave on contact, dispersing Wasabi, Ginkgo, and interrupting Cherry / Dragonfruit.',
    unlockLevelIndex: 12,
    icon: '🥁',
    color: '#C0392B',
    accentColor: '#FDEDEC',
  },
};

export interface SkillState {
  equipped: SkillType;
  charge: number; // 0 or 1
  maxCharge: number; // 1
  rechargeProgress: number; // 0 to 6
  rechargeGoal: number; // 6
  isArmed: boolean; // For Palm Strike & Taiko Pulse
  unlockedSkills: SkillType[];
}
