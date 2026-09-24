import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board } from '../src/logic.js';
import { MODES, bonusMoves } from '../src/modes.js';

test('classic swaps earn moves back for specials and long chains', () => {
  assert.equal(bonusMoves([{ type: 'swap' }, { type: 'clear', created: [], cascade: 1 }]), 0);
  assert.equal(bonusMoves([{ type: 'clear', created: [{}], cascade: 1 }, { type: 'clear', created: [], cascade: 2 }]), 1);
  assert.equal(bonusMoves([{ type: 'clear', created: [], cascade: 1 }, { type: 'clear', created: [], cascade: 2 }, { type: 'clear', created: [], cascade: 3 }]), 1);
});

test('each mode has its own best score and leaderboard', () => {
  assert.notEqual(MODES.classic.bestKey, MODES.zen.bestKey);
  assert.notEqual(MODES.classic.leaderboard, MODES.zen.leaderboard);
  assert.equal(MODES.zen.leaderboard, 'potion-match'); // the existing scores were played this way
});

test('a classic game always ends: 30 swaps plus a few earned back', () => {
  for (let g = 0; g < 50; g++) {
    const board = new Board();
    let moves = MODES.classic.moves;
    let played = 0;
    while (moves > 0 && played < 1000) {
      const result = board.resolveSwap(...board.findMove());
      moves += bonusMoves(result.steps) - 1;
      played++;
    }
    assert.ok(played < 200, `game ${g} ran ${played} swaps`);
  }
});
