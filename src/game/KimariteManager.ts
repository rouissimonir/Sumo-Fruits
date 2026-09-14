/**
 * Kimarite (Winning Sumo Techniques) & Achievements System
 */

export interface KimariteTechnique {
  id: string;
  nameJp: string;
  nameRomaji: string;
  title: string;
  description: string;
  category: 'FUSION' | 'TRICK_SHOT' | 'DEFENSE' | 'MASTERY';
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

const INITIAL_KIMARITE: KimariteTechnique[] = [
  {
    id: 'oshidashi',
    nameJp: '押し出し',
    nameRomaji: 'Oshidashi',
    title: 'Frontal Push-Out',
    description: 'Eject a rival or threatening bug hazard beyond the straw bales.',
    category: 'DEFENSE',
    icon: '🥋',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'hikiotoshi',
    nameJp: '引き落とし',
    nameRomaji: 'Hikiotoshi',
    title: 'Bank Shot Rebound',
    description: 'Execute a fusion immediately after rebounding off a perimeter Tawara bale.',
    category: 'TRICK_SHOT',
    icon: '🎯',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: 'gyaku_kaiten',
    nameJp: '逆回転',
    nameRomaji: 'Gyaku Kaiten',
    title: 'English Curve Shot',
    description: 'Hook a fruit into a fusion using sidespin / slingshot curve.',
    category: 'TRICK_SHOT',
    icon: '🌀',
    unlocked: false,
    progress: 0,
    maxProgress: 2,
  },
  {
    id: 'tsuppari_chain',
    nameJp: '突っ張り連打',
    nameRomaji: 'Tsuppari Ren-da',
    title: 'Combo Barrage',
    description: 'Achieve a 3x or higher fusion chain in a single turn.',
    category: 'FUSION',
    icon: '⚡',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'kiyome_defense',
    nameJp: '清め受け',
    nameRomaji: 'Kiyome Uke',
    title: 'Sacred Salt Barrier',
    description: 'Halt a fruit in the danger zone using Kiyome-no-Shio salt.',
    category: 'DEFENSE',
    icon: '🧂',
    unlocked: false,
    progress: 0,
    maxProgress: 2,
  },
  {
    id: 'dohyo_booster',
    nameJp: '土俵加速',
    nameRomaji: 'Dohyo Kasoku',
    title: 'Chili Pad Accelerator',
    description: 'Slingshot through an arena booster pad for extra collision momentum.',
    category: 'TRICK_SHOT',
    icon: '🌶️',
    unlocked: false,
    progress: 0,
    maxProgress: 2,
  },
  {
    id: 'ozeki_power',
    nameJp: '大関誕生',
    nameRomaji: 'Ozeki Promotion',
    title: 'Rise of an Ozeki',
    description: 'Create a Tier 7 Apple (27.0kg heavyweight champion).',
    category: 'MASTERY',
    icon: '🍎',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'tenka_muso',
    nameJp: '天下無双',
    nameRomaji: 'Tenka Musō',
    title: 'Yokozuna Supreme Deity',
    description: 'Ascend to Tier 11 Yokozuna Pineapple, the peerless master of the ring.',
    category: 'MASTERY',
    icon: '🍍',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
];

const STORAGE_KEY = 'sumo_fruits_kimarite_v1';

export class KimariteManager {
  private techniques: KimariteTechnique[] = [];
  public onUnlock: ((tech: KimariteTechnique) => void) | null = null;

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, { unlocked: boolean; progress: number; unlockedAt?: number }>;
        this.techniques = INITIAL_KIMARITE.map((k) => {
          const s = parsed[k.id];
          if (s) {
            return {
              ...k,
              unlocked: s.unlocked,
              progress: s.progress,
              unlockedAt: s.unlockedAt,
            };
          }
          return { ...k };
        });
        return;
      }
    } catch {
      // Ignore localStorage errors
    }
    this.techniques = INITIAL_KIMARITE.map((k) => ({ ...k }));
  }

  private save() {
    try {
      const data: Record<string, { unlocked: boolean; progress: number; unlockedAt?: number }> = {};
      for (const t of this.techniques) {
        data[t.id] = {
          unlocked: t.unlocked,
          progress: t.progress,
          unlockedAt: t.unlockedAt,
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }

  public getTechniques(): KimariteTechnique[] {
    return this.techniques;
  }

  public getUnlockedCount(): { unlocked: number; total: number } {
    const unlocked = this.techniques.filter((t) => t.unlocked).length;
    return { unlocked, total: this.techniques.length };
  }

  public reportAction(id: string, increment: number = 1): KimariteTechnique | null {
    const tech = this.techniques.find((t) => t.id === id);
    if (!tech || tech.unlocked) return null;

    tech.progress = Math.min(tech.maxProgress, tech.progress + increment);
    if (tech.progress >= tech.maxProgress) {
      tech.unlocked = true;
      tech.unlockedAt = Date.now();
      this.save();
      if (this.onUnlock) {
        this.onUnlock(tech);
      }
      return tech;
    }
    this.save();
    return null;
  }
}
