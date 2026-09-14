import { DailyMission } from '../types/game';

const STORAGE_KEY = 'sumo_suika_daily_missions_v1';

const MISSION_TEMPLATES: Omit<DailyMission, 'current' | 'completed'>[] = [
  {
    id: 'merges_15',
    title: 'Dohyō Fusions',
    description: 'Perform 15 fruitful sumo fusions',
    target: 15,
    rewardScore: 1000,
    icon: '🍊',
    category: 'DAILY',
  },
  {
    id: 'combo_3x',
    title: 'Tsuppari Combo Chain',
    description: 'Reach a 3x or higher combo streak in a single bout',
    target: 3,
    rewardScore: 1500,
    icon: '⚡',
    category: 'DAILY',
  },
  {
    id: 'reach_tier_6',
    title: 'Peach Sekitori',
    description: 'Merge and cultivate a Tier 6 Peach wrestler',
    target: 6,
    rewardScore: 2000,
    icon: '🍑',
    category: 'DAILY',
  },
  {
    id: 'salt_purify_2',
    title: 'Sacred Kiyome',
    description: 'Cast Kiyome-no-Shio salt 2 times to purify the clay',
    target: 2,
    rewardScore: 1200,
    icon: '🧂',
    category: 'DAILY',
  },
  {
    id: 'bank_shot_2',
    title: 'Tawara Bank Shots',
    description: 'Complete 2 fusions rebounding off the Tawara rice bales',
    target: 2,
    rewardScore: 1800,
    icon: '🌾',
    category: 'DAILY',
  },
  {
    id: 'score_5000',
    title: 'Grand Tournament Score',
    description: 'Amass 5,000 tournament points in one match',
    target: 5000,
    rewardScore: 2500,
    icon: '🏆',
    category: 'DAILY',
  },
];

export class MissionManager {
  private missions: DailyMission[] = [];
  private lastDateStr = '';
  public onMissionComplete: ((mission: DailyMission) => void) | null = null;

  constructor() {
    this.initMissions();
  }

  private getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private initMissions() {
    const today = this.getTodayString();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === today && Array.isArray(parsed.missions) && parsed.missions.length > 0) {
          this.missions = parsed.missions;
          this.lastDateStr = today;
          return;
        }
      }
    } catch {
      // localStorage may fail
    }

    // Generate fresh daily missions for today
    this.generateDailyMissions(today);
  }

  private generateDailyMissions(dateStr: string) {
    // Seeded shuffle using date hash so everyone gets consistent daily missions for the day
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash * 31 + dateStr.charCodeAt(i)) % 100000;
    }

    const pool = [...MISSION_TEMPLATES];
    // Deterministic shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      hash = (hash * 9301 + 49297) % 233280;
      const j = Math.floor((hash / 233280) * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Pick 4 daily missions
    const selected = pool.slice(0, 4);
    this.missions = selected.map((m) => ({
      ...m,
      current: 0,
      completed: false,
    }));
    this.lastDateStr = dateStr;
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          date: this.lastDateStr,
          missions: this.missions,
        })
      );
    } catch {
      // Ignored in private/sandboxed modes
    }
  }

  public getMissions(): DailyMission[] {
    // Check if new day rolled over
    const today = this.getTodayString();
    if (this.lastDateStr !== today) {
      this.generateDailyMissions(today);
    }
    return this.missions;
  }

  public reportProgress(missionId: string, amount: number, isDirectSet: boolean = false) {
    const today = this.getTodayString();
    if (this.lastDateStr !== today) {
      this.generateDailyMissions(today);
    }

    let modified = false;
    for (const m of this.missions) {
      if (m.id === missionId && !m.completed) {
        if (isDirectSet) {
          m.current = Math.max(m.current, amount);
        } else {
          m.current += amount;
        }

        if (m.current >= m.target) {
          m.current = m.target;
          m.completed = true;
          if (this.onMissionComplete) {
            this.onMissionComplete(m);
          }
        }
        modified = true;
      }
    }

    if (modified) {
      this.save();
    }
  }

  public reportEvent(event: {
    type: 'MERGE' | 'COMBO' | 'TIER' | 'SALT' | 'BANK_SHOT' | 'SCORE' | 'RIVAL_DEFEAT';
    value?: number;
  }) {
    switch (event.type) {
      case 'MERGE':
        this.reportProgress('merges_15', 1);
        break;
      case 'COMBO':
        if ((event.value ?? 0) >= 3) {
          this.reportProgress('combo_3x', event.value ?? 0, true);
        }
        break;
      case 'TIER':
        if ((event.value ?? 0) >= 6) {
          this.reportProgress('reach_tier_6', event.value ?? 0, true);
        }
        break;
      case 'SALT':
        this.reportProgress('salt_purify_2', 1);
        break;
      case 'BANK_SHOT':
        this.reportProgress('bank_shot_2', 1);
        break;
      case 'SCORE':
        this.reportProgress('score_5000', event.value ?? 0, true);
        break;
    }
  }

  public getCompletedCount(): { completed: number; total: number } {
    const m = this.getMissions();
    return {
      completed: m.filter((item) => item.completed).length,
      total: m.length,
    };
  }
}
