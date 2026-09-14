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
      // Haptics can be unavailable in desktop browsers and some simulators.
    });
  }
}

export const haptics = new HapticsManager();
