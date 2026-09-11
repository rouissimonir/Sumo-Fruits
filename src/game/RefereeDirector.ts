import { RefereeCall, RefereePriority } from '../types/game';

const PRIORITY_RANKS: Record<RefereePriority, number> = {
  RESULT: 5,
  YOKOZUNA: 4,
  RIVAL_DEFEAT: 3,
  COMBO: 2,
  ORDINARY: 1,
};

export class RefereeDirector {
  private activeCall: RefereeCall | null = null;
  private queue: RefereeCall[] = [];
  private nextId = 1;

  public getActiveCall(): RefereeCall | null {
    return this.activeCall;
  }

  public triggerCall(
    textJp: string,
    textRomaji: string,
    subText: string,
    color: string,
    priority: RefereePriority = 'ORDINARY',
    duration: number = 2.0
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
    };

    if (!this.activeCall) {
      this.activeCall = call;
      return;
    }

    const currentRank = PRIORITY_RANKS[this.activeCall.priority];
    const newRank = PRIORITY_RANKS[priority];

    if (newRank >= currentRank) {
      // Preempt immediately
      this.activeCall = call;
      this.queue = this.queue.filter((c) => PRIORITY_RANKS[c.priority] >= newRank);
    } else if (this.queue.length < 2) {
      // Queue if space available and not low priority junk
      if (newRank >= 2) {
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
      } else {
        this.activeCall = null;
      }
    }
  }

  public clear() {
    this.activeCall = null;
    this.queue = [];
  }
}
