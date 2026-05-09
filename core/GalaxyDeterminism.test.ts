import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGalaxyData } from './GalaxyData.js';
import { hashFloat32 } from '../tools/HashFloat32.js';

const OPTS = {
  seed: 42,
  count: 2000,
  radius: 50,
  innerRadius: 4.5,
  thickness: 0,
  arms: 6,
  spin: 0.9,
  spread: 0.95,
  fieldRatio: 0.3,
  minDistance: 0.25,
  fillCenter: false,
};

test('two GalaxyData with the same seed produce byte-identical buffers', () => {
  const a = createGalaxyData(OPTS).data;
  const b = createGalaxyData(OPTS).data;
  assert.equal(a.count, b.count);
  for (let i = 0; i < a.positions.length; i++) {
    assert.equal(a.positions[i], b.positions[i], `positions[${i}] drift`);
  }
  for (let i = 0; i < a.colors.length; i++) {
    assert.equal(a.colors[i], b.colors[i], `colors[${i}] drift`);
  }
  for (let i = 0; i < a.sizes.length; i++) {
    assert.equal(a.sizes[i], b.sizes[i], `sizes[${i}] drift`);
  }
});

// Cross-engine determinism check.
// The `npm run test:cross` Playwright suite re-runs the same hashes inside
// Chromium / Firefox / WebKit and compares — any mismatch means a non-
// deterministic op slipped into the generation pipeline.
test('GalaxyData hash for seed=42 is stable across runtimes', () => {
  const g = createGalaxyData(OPTS).data;
  const expected = {
    positions: 0x499932ba,
    colors:    0xd02e9caf,
    sizes:     0x02f4f232,
  };
  assert.equal(hashFloat32(g.positions), expected.positions, 'positions hash drifted');
  assert.equal(hashFloat32(g.colors),    expected.colors,    'colors hash drifted');
  assert.equal(hashFloat32(g.sizes),     expected.sizes,     'sizes hash drifted');
});
