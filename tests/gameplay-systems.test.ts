import assert from 'node:assert/strict';
import test from 'node:test';
import { ArenaConditionManager } from '../src/game/ArenaConditionManager';
import { GameEngine } from '../src/game/GameEngine';
import { VersusManager } from '../src/game/VersusManager';
import { createMawashiTail, DEFAULT_ARENA, predictTrajectory } from '../src/physics/bowlMotion';
import { MergeClashManager } from '../src/physics/mergeClashManager';
import { FRUIT_CATALOG, SumoFruitInstance } from '../src/types/game';
import { DEFAULT_SETTINGS, loadGameSettings } from '../src/types/settings';

function fruit(id: number, team: SumoFruitInstance['team']): SumoFruitInstance {
  return {
    id,
    tier: 1,
    team,
    x: 100 + id * 10,
    y: 100,
    vx: 0,
    vy: 0,
    state: 'IN_RING',
    entryPending: false,
    rimPermission: false,
    clashId: null,
    squash: { amplitude: 0, normalX: 0, normalY: 0, elapsed: 0, active: false },
    ripple: { elapsed: 0, impactAngle: 0, active: false },
    leftTail: { particles: [], segmentLength: 1 },
    rightTail: { particles: [], segmentLength: 1 },
    fallProgress: 0,
    lookTarget: null,
    panic: false,
    hasEnteredRing: true,
  };
}

test('trajectory prediction keeps a straight launch on its aim line', () => {
  const arena = { ...DEFAULT_ARENA, centerX: 0, centerY: 0, radius: 2000, radiusX: 2000, radiusY: 2000, slopeK: 0 };
  const points = predictTrajectory(0, 0, 240, 0, FRUIT_CATALOG[0], [], arena, 0.5, 10);
  assert.ok(points.length > 2);
  assert.ok(points.every((point) => point.y === 0));
});

test('trajectory sweep catches a small obstacle between simulation endpoints', () => {
  const arena = { ...DEFAULT_ARENA, centerX: 0, centerY: 0, radius: 2000, radiusX: 2000, radiusY: 2000, slopeK: 0 };
  const points = predictTrajectory(0, 0, 1000, 0, FRUIT_CATALOG[0], [{ x: 50, y: 0, radius: 2 }], arena, 0.1, 1);
  assert.equal(points.at(-1)?.impact, true);
});

test('versus gives both players the same ordered fruit stream', () => {
  const manager = new VersusManager();
  manager.reset();
  const p1First = manager.consumeCurrentLoadedTier().tier;
  manager.advanceTurn();
  manager.setHandoverPending(false);
  const p2First = manager.consumeCurrentLoadedTier().tier;
  assert.equal(p2First, p1First);
  assert.deepEqual(manager.state.p1NextTiers, manager.state.p2NextTiers);
});

test('fast-flow versus loads the next player fruit after shot settlement', () => {
  const engine = new GameEngine();
  engine.setGameMode('VERSUS');
  engine.setArenaSize(390, 844);
  assert.equal(engine.loadedFruit?.team, 'PLAYER_1');

  const { x, y } = engine.launcherPos;
  assert.equal(engine.handlePointerDown(x, y), true);
  engine.handlePointerMove(x, y + 70);
  assert.equal(engine.handlePointerUp(), true);
  assert.equal(engine.loadedFruit, null);

  for (const launched of engine.fruits) {
    launched.x = engine.arena.centerX;
    launched.y = engine.arena.centerY;
    launched.vx = 0;
    launched.vy = 0;
    launched.entryPending = false;
    launched.hasEnteredRing = true;
  }
  engine.update(0.5);

  assert.equal(engine.versusManager.state.playerTurn, 2);
  assert.equal(engine.versusManager.state.isHandoverPending, false);
  assert.equal(engine.loadedFruit?.team, 'PLAYER_2');
  assert.equal(engine.loadedFruit?.state, 'IDLE');
});

test('opposing owners collide but cannot fuse', () => {
  const manager = new MergeClashManager();
  assert.equal(manager.evaluatePair(fruit(1, 'PLAYER_1'), fruit(2, 'PLAYER_2')), null);
  assert.equal(manager.evaluatePair(fruit(3, 'PLAYER_1'), fruit(4, 'PLAYER_1'))?.type, 'MERGE');
});

test('mobile launcher stays visually connected to the bowl with pull-back room below', () => {
  const engine = new GameEngine();
  engine.setArenaSize(390, 844);
  const bowlBottom = engine.arena.centerY + engine.arena.radius;
  assert.equal(engine.launcherPos.y - bowlBottom, 42);
  assert.ok(844 - engine.launcherPos.y >= 70);
});

test('closing ring contracts every five shots and enforces a two-second grace', () => {
  const manager = new ArenaConditionManager('CLOSING_RING', 100);
  for (let shot = 1; shot < 5; shot++) assert.equal(manager.onShotCommitted(shot, 100).shrunk, false);
  assert.equal(manager.onShotCommitted(5, 100).shrunk, true);
  assert.equal(manager.state.legalRadius, 97);

  const outside = fruit(10, 'PLAYER');
  outside.x = 98;
  outside.y = 0;
  assert.deepEqual(manager.updateOutOfBounds([outside], 0, 0, 1.99).eliminatedIds, []);
  assert.deepEqual(manager.updateOutOfBounds([outside], 0, 0, 0.02).eliminatedIds, [10]);
});

test('closing-ring elimination commits the ring-out and deducts a life', () => {
  const engine = new GameEngine();
  engine.arena = {
    ...engine.arena,
    centerX: 0,
    centerY: 0,
    radius: 100,
    radiusX: 100,
    radiusY: 100,
    slopeK: 0,
  };
  engine.arenaConditionManager.setCondition('CLOSING_RING', 100);
  for (let shot = 1; shot <= 5; shot++) {
    engine.arenaConditionManager.onShotCommitted(shot, 100);
  }

  const endangeredFruit = fruit(20, 'PLAYER');
  endangeredFruit.x = 98;
  endangeredFruit.y = 0;
  endangeredFruit.leftTail = createMawashiTail(92, 10, FRUIT_CATALOG[0].radius);
  endangeredFruit.rightTail = createMawashiTail(104, 10, FRUIT_CATALOG[0].radius);
  engine.fruits = [endangeredFruit];

  for (let i = 0; i < 121; i++) engine.update(1 / 60);

  assert.equal(engine.lives, 2);
  assert.equal(endangeredFruit.state, 'RING_OUT');
});

test('daily basho selection is stable for the same UTC date', () => {
  const date = new Date('2026-09-14T23:59:59Z');
  assert.deepEqual(
    ArenaConditionManager.generateDailyBasho(date),
    ArenaConditionManager.generateDailyBasho(date)
  );
});

test('staging and launching fruits with entryPending cannot trigger ring-outs', () => {
  const engine = new GameEngine();
  engine.arena = {
    ...engine.arena,
    centerX: 0,
    centerY: 0,
    radius: 100,
    radiusX: 100,
    radiusY: 100,
    slopeK: 0,
  };
  const launchingFruit = fruit(99, 'PLAYER');
  launchingFruit.entryPending = true;
  launchingFruit.hasEnteredRing = false;
  launchingFruit.x = 140;
  launchingFruit.leftTail = createMawashiTail(134, 10, FRUIT_CATALOG[0].radius);
  launchingFruit.rightTail = createMawashiTail(146, 10, FRUIT_CATALOG[0].radius);
  engine.fruits = [launchingFruit];

  for (let i = 0; i < 120; i++) engine.update(1 / 60);

  assert.equal(engine.lives, 3);
  assert.equal(launchingFruit.state, 'IN_RING');
  assert.equal(launchingFruit.entryPending, true);
  assert.equal(launchingFruit.hasEnteredRing, false);
});

test('crossing a stored high score announces the record immediately', () => {
  const engine = new GameEngine();
  engine.score = 490;
  engine.highScore = 500;
  engine.isNewHighScore = false;

  engine.addScore(20);

  assert.equal(engine.highScore, 510);
  assert.equal(engine.isNewHighScore, true);
  assert.ok(engine.techniqueRibbons.getActiveRibbons().some((ribbon) => ribbon.title === 'New High Score Record!'));
});

test('default settings contain valid volume, audio, haptics and accessibility keys', () => {
  const settings = loadGameSettings();
  assert.equal(typeof settings.sfxVolume, 'number');
  assert.equal(typeof settings.sfxMuted, 'boolean');
  assert.equal(typeof settings.bgmVolume, 'number');
  assert.equal(typeof settings.bgmMuted, 'boolean');
  assert.equal(typeof settings.hapticsEnabled, 'boolean');
  assert.equal(typeof settings.highContrast, 'boolean');
  assert.equal(typeof settings.reducedMotion, 'boolean');
  assert.ok(['EN', 'JA'].includes(settings.language));
});
