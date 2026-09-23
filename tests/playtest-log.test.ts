import assert from 'node:assert/strict';
import test from 'node:test';
import { PlaytestSessionLog } from '../src/game/PlaytestSessionLog';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key); },
    setItem: (key, value) => { data.set(key, value); },
  };
}

test('opt-in log exports two played levels with shots, outcomes and duration', () => {
  const storage = memoryStorage();
  let now = 1000;
  const log = new PlaytestSessionLog(storage, () => now);
  log.start('career-01');
  assert.equal(log.getEvents().length, 0);
  log.setEnabled(true);
  log.start('career-01');
  now = 4500;
  log.end('WON', 2, 'Objective complete!');
  now = 5000;
  log.start('career-02');
  now = 9000;
  log.end('LOST', 6, 'No shots left');
  const exported = JSON.parse(log.exportJSON()) as { events: Array<Record<string, unknown>> };
  assert.deepEqual(exported.events.map((event) => event.type), ['level_start', 'level_end', 'level_start', 'level_end']);
  assert.deepEqual(exported.events.filter((event) => event.type === 'level_end').map((event) =>
    [event.levelId, event.result, event.shots, event.durationMs]), [
    ['career-01', 'WON', 2, 3500],
    ['career-02', 'LOST', 6, 4000],
  ]);
  log.setEnabled(false);
  log.start('career-03');
  assert.equal(log.getEvents().length, 4);
});
