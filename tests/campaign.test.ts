import assert from 'node:assert/strict';
import test from 'node:test';
import { CAMPAIGN_LEVELS } from '../src/content/campaign';
import { CareerManager } from '../src/game/CareerManager';
import { GameEngine } from '../src/game/GameEngine';
import { FRUIT_CATALOG } from '../src/types/game';

test('campaign defines 24 sequential, valid levels in four chapters', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 24);
  assert.deepEqual([...new Set(CAMPAIGN_LEVELS.map((level) => level.chapter))], [1, 2, 3, 4]);
  assert.equal(new Set(CAMPAIGN_LEVELS.map((level) => level.id)).size, 24);
  CAMPAIGN_LEVELS.forEach((level, index) => {
    assert.equal(level.index, index);
    assert.ok(level.queue.length >= level.shotLimit);
    assert.ok(level.queue.every((tier) => tier >= 1 && tier <= 10));
    assert.ok(level.lives >= 1 && level.lives <= 3);
  });
});

test('prepared campaign fruit start inside the safe bowl and do not overlap', () => {
  for (const level of CAMPAIGN_LEVELS) {
    const fruits = level.initialFruits ?? [];
    for (const item of fruits) {
      const radius = FRUIT_CATALOG[item.tier - 1].radius;
      assert.ok(Math.hypot(item.x, item.y) + radius <= 300, `${level.id} fruit starts too close to the rim`);
    }
    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const a = fruits[i];
        const b = fruits[j];
        const minDistance = FRUIT_CATALOG[a.tier - 1].radius + FRUIT_CATALOG[b.tier - 1].radius;
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= minDistance, `${level.id} prepared fruit overlap`);
      }
    }
  }
});

test('campaign uses a stable authored queue and retry resets it', () => {
  const manager = new CareerManager();
  manager.startLevel('career-01');
  const first = manager.consumeNextTier();
  const second = manager.consumeNextTier();
  manager.restartAttempt();
  assert.equal(manager.consumeNextTier(), first);
  assert.equal(manager.consumeNextTier(), second);
});

test('campaign completes an objective once and unlocks the next bout', () => {
  const manager = new CareerManager();
  manager.startLevel('career-01');
  manager.recordShot();
  manager.recordFusion(2, 1, 100, 3);
  assert.equal(manager.result?.status, 'WON');
  assert.equal(manager.progress.completedLevelIds.filter((id) => id === 'career-01').length, 1);
  assert.equal(manager.getHighestUnlockedIndex(), 1);
  manager.recordFusion(2, 2, 200, 3);
  assert.equal(manager.progress.completedLevelIds.filter((id) => id === 'career-01').length, 1);
});

test('campaign physical pushout objectives reject salt removal', () => {
  const manager = new CareerManager();
  manager.progress.completedLevelIds = ['career-01', 'career-02'];
  manager.startLevel('career-03');
  manager.recordHazardRemoval('BUG', 'SALT', 30, 3);
  assert.equal(manager.objectiveProgress, 0);
  manager.recordHazardRemoval('BUG', 'RING_OUT', 120, 3);
  assert.equal(manager.result?.status, 'WON');
});

test('campaign fails only after the final committed shot resolves', () => {
  const manager = new CareerManager();
  manager.startLevel('career-01');
  for (let i = 0; i < CAMPAIGN_LEVELS[0].shotLimit; i++) manager.recordShot();
  assert.equal(manager.result, null);
  manager.recordShotResolved(0, 3);
  assert.equal(manager.result?.status, 'LOST');
});

test('career score cannot overwrite the classic high score', () => {
  const engine = new GameEngine();
  engine.highScore = 500;
  engine.startCareerLevel('career-01');
  engine.addScore(5000);
  assert.equal(engine.score, 5000);
  assert.equal(engine.highScore, 500);
});
