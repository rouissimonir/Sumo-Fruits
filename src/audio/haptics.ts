/**
 * Tactile Haptics and Audio Pulse Manager
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export class HapticsManager {
  private enabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public trigger(type: 'TICK' | 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'FUSION' | 'YOKOZUNA' | 'ERROR') {
    if (!this.enabled) return;

    let effect: Promise<void>;
    switch (type) {
      case 'TICK':
      case 'LIGHT':
        effect = Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'MEDIUM':
        effect = Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'HEAVY':
        effect = Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'FUSION':
      case 'YOKOZUNA':
        effect = Haptics.notification({ type: NotificationType.Success });
        break;
      case 'ERROR':
        effect = Haptics.notification({ type: NotificationType.Error });
        break;
    }

    void effect.catch(() => {
      // Fallback for browsers / devices where Capacitor native bridge isn't active
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        try {
          switch (type) {
            case 'TICK':
            case 'LIGHT':
              navigator.vibrate(10);
              break;
            case 'MEDIUM':
              navigator.vibrate(25);
              break;
            case 'HEAVY':
              navigator.vibrate(50);
              break;
            case 'FUSION':
            case 'YOKOZUNA':
              navigator.vibrate([30, 40, 60]);
              break;
            case 'ERROR':
              navigator.vibrate([40, 60, 40]);
              break;
          }
        } catch {
          // Ignored
        }
      }
    });
  }
}

export const haptics = new HapticsManager();
