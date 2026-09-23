/** Keys owned by the game. Keep this list aligned with the managers that persist them. */
export const SAVE_KEYS = [
  'sumo_suika_high_score',
  'sumo_fruits_kimarite_v1',
  'sumo_fruits_campaign_progress_v1',
  'sumo_tutorial_completed_v1',
  'sumo_suika_daily_missions_v1',
  'sumo_game_settings_v1',
] as const;

export function isSaveKey(key: string): boolean {
  return (SAVE_KEYS as readonly string[]).includes(key) || /^daily_basho_\d{4}-\d{2}-\d{2}$/.test(key);
}

export function exportSaveData(storage: Storage): Record<string, string> {
  const data: Record<string, string> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key || !isSaveKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return data;
}

export function importSaveData(storage: Storage, data: unknown): number {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid save data');
  const entries = Object.entries(data as Record<string, unknown>);
  const validEntries = entries.filter(([key, value]) => isSaveKey(key) && typeof value === 'string') as [string, string][];
  if (validEntries.length === 0) throw new Error('No game save data found');
  for (const [key, value] of validEntries) storage.setItem(key, value);
  return validEntries.length;
}

export function resetSaveData(storage: Storage): void {
  for (const key of Object.keys(exportSaveData(storage))) storage.removeItem(key);
  storage.removeItem('sumo_fruits_playtest_log_v1');
  storage.removeItem('sumo_fruits_playtest_log_enabled_v1');
}
