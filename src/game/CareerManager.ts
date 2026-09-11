import { CareerStage, ChallengeScenario } from '../types/game';
import { RIVAL_PROFILES } from './RivalSumo';

export const CAREER_STAGES: CareerStage[] = [
  {
    index: 0,
    name: 'Maegashira Bout',
    rankTitle: 'Rank 1: Maegashira',
    rival: RIVAL_PROFILES.TENGU_ORANGE,
    arenaMode: 'CIRCULAR',
    complicationDescription: 'Basic dohyō. Learn Tengu Orange’s telegraphed rush lane every 2nd shot.',
    unlocked: true,
    completed: false,
    hasWasabi: false,
    hasChili: false,
    hasFragileRims: false,
  },
  {
    index: 1,
    name: 'Komusubi Bout',
    rankTitle: 'Rank 2: Komusubi',
    rival: RIVAL_PROFILES.CHERRY_SLAPPER,
    arenaMode: 'ELLIPTICAL',
    complicationDescription: 'Elliptical bowl (q=1.25). Watch the narrow flanks and Cherry Slapper’s 3-thrust slap cone.',
    unlocked: false,
    completed: false,
    hasWasabi: false,
    hasChili: false,
    hasFragileRims: false,
  },
  {
    index: 2,
    name: 'Sekiwake Bout',
    rankTitle: 'Rank 3: Sekiwake',
    rival: RIVAL_PROFILES.COCONUT_TANK,
    arenaMode: 'CIRCULAR',
    complicationDescription: 'Sticky wasabi patches line the sand. Trap the heavy Coconut Tank or lure him across them!',
    unlocked: false,
    completed: false,
    hasWasabi: true,
    hasChili: false,
    hasFragileRims: false,
  },
  {
    index: 3,
    name: 'Yokozuna Championship',
    rankTitle: 'Rank 4: Yokozuna Title Bout',
    rival: RIVAL_PROFILES.DRAGONFRUIT_YOKOZUNA,
    arenaMode: 'CIRCULAR',
    complicationDescription: 'Destructible straw guards! Heavy impacts crack the rim. Defeat the Grand Champion!',
    unlocked: false,
    completed: false,
    hasWasabi: false,
    hasChili: true,
    hasFragileRims: true,
  },
];

export const FESTIVAL_CHALLENGES: ChallengeScenario[] = [
  {
    id: 'WOBBLE_SEA',
    title: 'Wobble Sea',
    subtitle: 'Dynamic Mass-Weighted Dohyō',
    objective: 'Reach Melon (Tier 7) while the bowl gently tilts toward fruit weight!',
    arenaMode: 'WOBBLE',
    description: 'The bowl leans into clusters. Use sacred salt to anchor your heavy rikishi against the shifting slope.',
    hasWasabi: false,
    hasChili: true,
  },
  {
    id: 'BROKEN_TAWARA',
    title: 'Broken Tawara Breach',
    subtitle: 'Fragile Rim High-Stakes Ring-Out',
    objective: 'Survive 12 launches and score 3,000 points with 4 broken rim guards!',
    arenaMode: 'CIRCULAR',
    description: 'Four bales are broken down to the low ceramic lip. One miscalculated rebound means sudden ring-out.',
    brokenBales: [0, 4, 8, 12],
    hasWasabi: true,
    hasChili: true,
  },
  {
    id: 'ONE_BEAUTIFUL_SHOT',
    title: 'One Beautiful Shot',
    subtitle: 'Handcrafted Trick-Shot Puzzle',
    objective: 'Execute a single master shot to fuse two Peaches and eject the Beetle!',
    arenaMode: 'CIRCULAR',
    description: 'Two Peaches sit on opposite sides of a stubborn beetle. Angle your launch off the rim for a double clash!',
    brokenBales: [2],
    allowedShots: 2,
  },
];

export class CareerManager {
  public currentStageIndex: number = 0;
  public stages: CareerStage[] = JSON.parse(JSON.stringify(CAREER_STAGES));
  public activeChallenge: ChallengeScenario | null = null;

  public getCurrentStage(): CareerStage {
    return this.stages[this.currentStageIndex];
  }

  public completeCurrentStage(): boolean {
    const current = this.stages[this.currentStageIndex];
    current.completed = true;

    if (this.currentStageIndex + 1 < this.stages.length) {
      this.stages[this.currentStageIndex + 1].unlocked = true;
      return true; // Unlocked next
    }
    return false; // Champion beaten!
  }

  public advanceStage() {
    if (this.currentStageIndex + 1 < this.stages.length) {
      this.currentStageIndex++;
    }
  }

  public setStage(idx: number) {
    if (idx >= 0 && idx < this.stages.length && this.stages[idx].unlocked) {
      this.currentStageIndex = idx;
    }
  }

  public resetProgress() {
    this.stages = JSON.parse(JSON.stringify(CAREER_STAGES));
    this.currentStageIndex = 0;
    this.activeChallenge = null;
  }
}
