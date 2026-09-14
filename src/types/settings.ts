export interface GameSettings {
  sfxVolume: number; // 0.0 to 1.0
  sfxMuted: boolean;
  bgmVolume: number; // 0.0 to 1.0
  bgmMuted: boolean;
  hapticsEnabled: boolean;
  language: 'EN' | 'JA';
  highContrast: boolean; // Colorblind / bold indicators
  reducedMotion: boolean; // Disable screen shake & trauma
  showTrajectoryGuide: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.75,
  sfxMuted: false,
  bgmVolume: 0.60,
  bgmMuted: false,
  hapticsEnabled: true,
  language: 'EN',
  highContrast: false,
  reducedMotion: false,
  showTrajectoryGuide: true,
};

const STORAGE_KEY = 'sumo_game_settings_v1';

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage might fail if private mode is strict
  }
}
