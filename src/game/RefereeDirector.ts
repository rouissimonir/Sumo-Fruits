import { RefereeCall, RefereePriority } from '../types/game';
import { sound } from '../audio/soundEffects';

const PRIORITY_RANKS: Record<RefereePriority, number> = {
  MATCH_RESULT: 100,
  RESULT: 100,
  YOKOZUNA: 90,
  RIVAL_DEFEAT: 80,
  PERSONAL_BEST: 70,
  KIMARITE: 60,
  EDGE_DANGER: 40,
  COMBO: 30,
  TACHIAI: 20,
  ORDINARY: 10,
};

export class RefereeDirector {
  private activeCall: RefereeCall | null = null;
  private queue: RefereeCall[] = [];
  private nextId = 1;
  private edgeDangerCooldowns: Map<number, number> = new Map(); // fruitId -> lastTriggerTime

  public getActiveCall(): RefereeCall | null {
    return this.activeCall;
  }

  public getActivePriorityRank(): number {
    return this.activeCall ? PRIORITY_RANKS[this.activeCall.priority] || 0 : 0;
  }

  /**
   * Check if a fruit can emit a Nokotta! edge danger chant (4.0s cooldown per fruit)
   */
  public canTriggerEdgeDanger(fruitId: number, currentTimeSec: number): boolean {
    const lastTime = this.edgeDangerCooldowns.get(fruitId) || -999;
    if (currentTimeSec - lastTime >= 4.0) {
      this.edgeDangerCooldowns.set(fruitId, currentTimeSec);
      return true;
    }
    return false;
  }

  public triggerCall(
    textJp: string,
    textRomaji: string,
    subText: string,
    color: string,
    priority: RefereePriority = 'ORDINARY',
    duration: number = 2.0,
    soundType?: 'hakkeyoi' | 'nokotta' | 'shobu' | 'yokozuna' | 'kinboshi' | 'personal_best' | 'kimarite' | 'fever' | 'kiyome'
  ) {
    const call: RefereeCall = {
      id: this.nextId++,
      textJp,
      textRomaji,
      subText,
      color,
      duration,
      maxDuration: duration,
      priority,
      audioCue: soundType,
    };

    const newRank = PRIORITY_RANKS[priority] || 10;

    if (!this.activeCall) {
      this.activeCall = call;
      if (soundType) {
        sound.playRefereeCall(soundType);
      }
      return;
    }

    const currentRank = PRIORITY_RANKS[this.activeCall.priority] || 10;

    if (newRank >= currentRank) {
      // Preempt immediately - interrupt current voice line if higher rank
      if (newRank > currentRank || newRank >= 80) {
        sound.stopRefereeVoice();
      }
      this.activeCall = call;
      // Filter out lower priority items from queue
      this.queue = this.queue.filter((c) => (PRIORITY_RANKS[c.priority] || 0) >= newRank);
      if (soundType) {
        sound.playRefereeCall(soundType);
      }
    } else if (this.queue.length < 2) {
      // Queue if space available and meaningful priority
      if (newRank >= 40) {
        this.queue.push(call);
      }
    }
  }

  public update(dt: number) {
    if (!this.activeCall) return;

    this.activeCall.duration -= dt;
    if (this.activeCall.duration <= 0) {
      if (this.queue.length > 0) {
        this.activeCall = this.queue.shift() || null;
        if (this.activeCall?.audioCue) {
          sound.playRefereeCall(this.activeCall.audioCue);
        }
      } else {
        this.activeCall = null;
      }
    }
  }

  public clear() {
    sound.stopRefereeVoice();
    this.activeCall = null;
    this.queue = [];
    this.edgeDangerCooldowns.clear();
  }
}
