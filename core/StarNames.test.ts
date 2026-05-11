import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameStarInCube } from './StarNames.js';

test('positive cube and small posInCube formats with E/N and zero-padded counter', () => {
  assert.equal(nameStarInCube({ i: 3, k: 7 }, 12), 'GX-E3N7-012');
});

test('negative i flips E → W', () => {
  assert.equal(nameStarInCube({ i: -2, k: 14 }, 0), 'GX-W2N14-000');
});

test('negative k flips N → S', () => {
  assert.equal(nameStarInCube({ i: 4, k: -8 }, 3), 'GX-E4S8-003');
});

test('both axes negative', () => {
  assert.equal(nameStarInCube({ i: -1, k: -1 }, 42), 'GX-W1S1-042');
});

test('origin cube keeps the axis letters (E0/N0, not blank)', () => {
  assert.equal(nameStarInCube({ i: 0, k: 0 }, 5), 'GX-E0N0-005');
});

test('posInCube wider than the pad width is not truncated', () => {
  assert.equal(nameStarInCube({ i: 1, k: 1 }, 1234), 'GX-E1N1-1234');
});

test('deterministic — identical inputs produce identical output', () => {
  const a = nameStarInCube({ i: -7, k: 11 }, 23);
  const b = nameStarInCube({ i: -7, k: 11 }, 23);
  assert.equal(a, b);
});
