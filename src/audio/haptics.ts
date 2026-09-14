/**
 * Tactile Haptics and Audio Pulse Manager
 */

export class HapticsManager {
  private enabled: boolean = true;

  constructor() {
    this.enabled = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public trigger(type: 'TICK' | 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'FUSION' | 'YOKOZUNA' | 'ERROR') {
    if (!this.enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;

    try {
      switch (type) {
        case 'TICK':
          navigator.vibrate(8);
          break;
        case 'LIGHT':
          navigator.vibrate(18);
          break;
        case 'MEDIUM':
          navigator.vibrate([28, 20, 28]);
          break;
        case 'HEAVY':
          navigator.vibrate([45, 30, 60]);
          break;
        case 'FUSION':
          navigator.vibrate([22, 15, 35, 20, 45]);
          break;
        case 'YOKOZUNA':
          navigator.vibrate([60, 40, 80, 50, 120]);
          break;
        case 'ERROR':
          navigator.vibrate([50, 60, 50]);
          break;
      }
    } catch {
      // Ignore vibration blocks on certain browsers/user gestures
    }
  }
}

export const haptics = new HapticsManager();
