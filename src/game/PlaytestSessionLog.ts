const LOG_KEY = 'sumo_fruits_playtest_log_v1';
const ENABLED_KEY = 'sumo_fruits_playtest_log_enabled_v1';
const MAX_EVENTS = 200;

export type PlaytestEvent =
  | { type: 'level_start'; levelId: string; at: number }
  | { type: 'level_end'; levelId: string; at: number; result: 'WON' | 'LOST' | 'ABANDONED'; shots: number; cause: string; durationMs: number };

function browserStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; }
  catch { return null; }
}

export class PlaytestSessionLog {
  private active: { levelId: string; startedAt: number } | null = null;

  constructor(private readonly storage: Storage | null, private readonly now: () => number = Date.now) {}

  public isEnabled(): boolean { return this.storage?.getItem(ENABLED_KEY) === 'true'; }

  public setEnabled(enabled: boolean): void {
    if (enabled) this.storage?.setItem(ENABLED_KEY, 'true');
    else { this.active = null; this.storage?.removeItem(ENABLED_KEY); }
  }

  public start(levelId: string): void {
    if (!this.isEnabled()) return;
    if (this.active) this.end('ABANDONED', 0, 'Retry or changed level');
    const at = this.now();
    this.active = { levelId, startedAt: at };
    this.append({ type: 'level_start', levelId, at });
  }

  public end(result: 'WON' | 'LOST' | 'ABANDONED', shots: number, cause: string): void {
    if (!this.isEnabled() || !this.active) return;
    const at = this.now();
    const { levelId, startedAt } = this.active;
    this.active = null;
    this.append({ type: 'level_end', levelId, at, result, shots, cause, durationMs: Math.max(0, at - startedAt) });
  }

  public getEvents(): PlaytestEvent[] {
    try {
      const value: unknown = JSON.parse(this.storage?.getItem(LOG_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((event): event is PlaytestEvent =>
        !!event && typeof event === 'object' && (event.type === 'level_start' || event.type === 'level_end')
      ) : [];
    } catch { return []; }
  }

  public exportJSON(): string {
    return JSON.stringify({ app: 'SumoFruits', kind: 'local-playtest-log', version: 1, events: this.getEvents() }, null, 2);
  }

  public clear(): void { this.active = null; this.storage?.removeItem(LOG_KEY); }

  private append(event: PlaytestEvent): void {
    try { this.storage?.setItem(LOG_KEY, JSON.stringify([...this.getEvents(), event].slice(-MAX_EVENTS))); }
    catch { /* A full or restricted store must never interrupt gameplay. */ }
  }
}

export const playtestSessionLog = new PlaytestSessionLog(browserStorage());
