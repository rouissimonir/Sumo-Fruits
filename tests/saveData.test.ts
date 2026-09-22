import assert from 'node:assert/strict';
import test from 'node:test';
import { exportSaveData, importSaveData, resetSaveData } from '../src/game/saveData';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

test('backup round trip retains career progress, cosmetics, settings, and daily results', () => {
  const original = memoryStorage({
    sumo_fruits_campaign_progress_v1: '{"completedLevelIds":["career-10"],"unlockedRewardIds":["TRAINING_MAWASHI"]}',
    sumo_fruits_kimarite_v1: '{"oshidashi":{"unlocked":true}}',
    sumo_game_settings_v1: '{"bgmVolume":0.4}',
    sumo_suika_daily_missions_v1: '{"date":"2026-09-22"}',
    'daily_basho_2026-09-22': '{"completed":true}',
    unrelated_key: 'leave me alone',
  });
  const backup = exportSaveData(original);
  assert.ok(backup.sumo_fruits_campaign_progress_v1?.includes('TRAINING_MAWASHI'));
  assert.equal(backup.unrelated_key, undefined);

  const restored = memoryStorage();
  assert.equal(importSaveData(restored, backup), 5);
  assert.deepEqual(exportSaveData(restored), backup);
  resetSaveData(original);
  assert.deepEqual(exportSaveData(original), {});
  assert.equal(original.getItem('unrelated_key'), 'leave me alone');
});

test('import rejects empty or unrelated data', () => {
  const storage = memoryStorage();
  assert.throws(() => importSaveData(storage, { unrelated_key: 'value' }));
  assert.equal(storage.length, 0);
});
