import assert from 'node:assert/strict';
import test from 'node:test';
import { CAMPAIGN_LEVELS } from '../src/content/campaign';
import { CareerManager } from '../src/game/CareerManager';
import { GameEngine } from '../src/game/GameEngine';
import { FRUIT_CATALOG } from '../src/types/game';
import { DEFAULT_ARENA } from '../src/physics/bowlMotion';
import { RIVAL_PROFILES, RivalSumoController } from '../src/game/RivalSumo';
import { REWARD_DEFINITIONS } from '../src/types/rewards';
import { CONDITION_METADATA } from '../src/game/ArenaConditionManager';

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

test('bouts 3 through 6 form the intended enemy and skill tutorial sequence', () => {
  const [pushout, salt, palm, tengu] = CAMPAIGN_LEVELS.slice(2, 6);
  assert.deepEqual(pushout.objective, { type: 'CLEAR_HAZARDS', count: 1, kinds: ['BUG'], physicalOnly: true });
  assert.equal(salt.recommendedSkill, 'SALT');
  assert.equal(salt.initialHazards?.[0]?.kind, 'ICE');
  assert.equal(palm.recommendedSkill, 'PALM_STRIKE');
  assert.deepEqual(palm.techniqueRule, { type: 'USE_SKILL', skill: 'PALM_STRIKE' });
  assert.equal(tengu.rivalId, 'TENGU_ORANGE');
  assert.equal(tengu.rewardId, 'TRAINING_MAWASHI');
  assert.ok(REWARD_DEFINITIONS[tengu.rewardId].mawashiColor);
});

test('career introduces each arena condition before its late-game mastery bout', () => {
  assert.equal(CAMPAIGN_LEVELS[7].arenaCondition, 'GRIPPY_CLAY');
  assert.equal(CAMPAIGN_LEVELS[13].arenaCondition, 'KAMIKAZE_WIND');
  assert.equal(CAMPAIGN_LEVELS[19].arenaCondition, 'CLOSING_RING');
  assert.ok(CAMPAIGN_LEVELS[7].encounterHint);
  assert.ok(CAMPAIGN_LEVELS[13].encounterHint);
  assert.ok(CAMPAIGN_LEVELS[19].encounterHint);
});

test('arena conditions provide reviewed Japanese and English player-facing copy', () => {
  for (const metadata of Object.values(CONDITION_METADATA)) {
    assert.ok(metadata.nameJp.length > 0);
    assert.ok(metadata.nameRomaji.length > 0);
    assert.ok(metadata.descriptionJa.length > 0);
    assert.ok(metadata.shortEffect.length > 0);
  }
  assert.equal(CONDITION_METADATA.NONE.nameJp, '通常土俵');
  assert.equal(CONDITION_METADATA.GRIPPY_CLAY.nameJp, '湿り土俵');
  assert.equal(CONDITION_METADATA.KAMIKAZE_WIND.nameJp, '神社の風');
});

test('Palm Strike is available, equipped, and demonstrated when bout 5 starts', () => {
  const engine = new GameEngine();
  engine.careerManager.progress.completedLevelIds = CAMPAIGN_LEVELS.slice(0, 4).map((level) => level.id);
  engine.startCareerLevel('career-05');
  assert.ok(engine.skillManager.getUnlockedSkills().includes('PALM_STRIKE'));
  assert.equal(engine.skillManager.equipped, 'PALM_STRIKE');
  assert.equal(engine.hazards.find((hazard) => hazard.kind === 'ICE')?.crackLevel, 1);
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

test('Tengu keeps its announced charge lane and exposes its flank after a miss', () => {
  const controller = new RivalSumoController(RIVAL_PROFILES.TENGU_ORANGE);
  controller.spawnRival({ ...DEFAULT_ARENA }, 99);
  controller.onPlayerLaunchCommitted({ ...DEFAULT_ARENA }, []);
  const announced = controller.intent ? { ...controller.intent } : null;
  assert.ok(announced?.locked);
  controller.onPlayerLaunchCommitted({ ...DEFAULT_ARENA }, []);
  assert.equal(controller.isExecuting, true);
  assert.equal(controller.intent?.targetX, announced?.targetX);
  assert.equal(controller.intent?.targetY, announced?.targetY);

  controller.update(0.5, { ...DEFAULT_ARENA }, []);
  assert.equal(controller.isVulnerable(), true);
  const sideKnockback = controller.getCollisionKnockbackMultiplier(1, 0);
  const frontKnockback = controller.getCollisionKnockbackMultiplier(0, 1);
  assert.ok(sideKnockback > frontKnockback);

  controller.onShotResolved();
  assert.equal(controller.isVulnerable(), true, 'the opening must remain for the next player shot');
  controller.onPlayerLaunchCommitted({ ...DEFAULT_ARENA }, []);
  controller.onShotResolved();
  assert.equal(controller.isVulnerable(), false);
});

test('Tengu reward ownership and equipped mawashi persist across manager instances', () => {
  const values = new Map<string, string>();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } as Storage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

  try {
    const manager = new CareerManager();
    manager.progress.completedLevelIds = CAMPAIGN_LEVELS.slice(0, 5).map((level) => level.id);
    manager.startLevel('career-06');
    manager.recordRivalDefeat(2400, 3);
    assert.equal(manager.result?.unlockedRewardId, 'TRAINING_MAWASHI');
    assert.equal(manager.equipReward('TRAINING_MAWASHI'), true);

    const restored = new CareerManager();
    assert.ok(restored.progress.unlockedRewardIds.includes('TRAINING_MAWASHI'));
    assert.equal(restored.getEquippedReward('MAWASHI'), 'TRAINING_MAWASHI');
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  }
});
