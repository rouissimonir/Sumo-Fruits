import test from 'node:test';
import assert from 'node:assert/strict';
import { VersusManager } from '../src/game/VersusManager';
import { GameEngine } from '../src/game/GameEngine';
import { SumoFruitInstance } from '../src/types/game';

test('P2 wins a shot with two P1 victims and one P2 victim regardless of processing order', () => {
  for (const owners of [[1, 1, 2], [2, 1, 1]]) {
    const engine = new GameEngine();
    engine.setGameMode('VERSUS');
    const template = engine.loadedFruit!;
    const commit = engine as unknown as { commitRingOut(fruit: SumoFruitInstance): void };
    for (const [index, owner] of owners.entries()) {
      commit.commitRingOut({ ...template, id: 100 + index,
        team: owner === 1 ? 'PLAYER_1' : 'PLAYER_2',
        state: 'IN_RING', entryPending: false, hasEnteredRing: true });
    }
    assert.equal(engine.versusManager.state.boutHistory.length, 0);
    assert.equal(engine.versusManager.evaluateShotLimitBoutOutcome([]).winner, 2);
    engine.fruits.push({
      ...template,
      id: 999,
      team: 'PLAYER_2',
      state: 'IN_RING',
      entryPending: false,
      hasEnteredRing: true,
      x: engine.arena.centerX,
      y: engine.arena.centerY,
      vx: 0,
      vy: 0,
    });
    engine.shotState = 'LAUNCHED';
    for (let step = 0; step < 90; step++) engine.update(1 / 60);
    assert.equal(engine.versusManager.state.boutHistory.length, 1);
    assert.equal(engine.versusManager.state.boutHistory[0].winner, 2);
    assert.equal(engine.versusManager.state.isMatchOver, false);
    assert.equal(engine.versusManager.state.boutTransitionPending, true);
    assert.ok(engine.fruits.length > 0, 'finished bout remains visible behind the result screen');

    engine.confirmNextVersusBout();
    assert.equal(engine.versusManager.state.boutTransitionPending, false);
    assert.equal(engine.versusManager.state.currentBout, 2);
    assert.equal(engine.versusManager.state.p1RoundsWon, 0);
    assert.equal(engine.versusManager.state.p2RoundsWon, 1);
    assert.equal(engine.loadedFruit?.team, 'PLAYER_1');
  }
});

test('one bout cannot award multiple wins and the second P2 bout wins the match', () => {
  const manager = new VersusManager();
  manager.recordBoutVictory(2, 'Push-out', '', 1);
  manager.recordBoutVictory(1, 'Late callback', '', 1);
  assert.equal(manager.state.p1RoundsWon, 0);
  assert.equal(manager.state.p2RoundsWon, 1);
  assert.equal(manager.state.boutTransitionPending, true);
  manager.resetForNextBout();
  assert.equal(manager.state.boutTransitionPending, false);
  manager.recordBoutVictory(2, 'Push-out', '', 1);
  manager.recordBoutVictory(1, 'Late callback', '', 1);
  assert.equal(manager.state.matchWinner, 2);
  assert.equal(manager.state.boutHistory.length, 2);
});

test('new bout scores do not inherit a previous P1 lead', () => {
  const manager = new VersusManager();
  manager.addScore(1, 1000);
  manager.recordBoutVictory(1, 'Points', '', 0);
  manager.resetForNextBout();
  manager.addScore(2, 100);
  assert.equal(manager.evaluateShotLimitBoutOutcome([]).winner, 2);
  assert.equal(manager.state.boutHistory[0].p1Score, 1000);
});
