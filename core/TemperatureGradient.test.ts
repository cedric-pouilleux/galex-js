import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGalaxyData } from './GalaxyData.js';
import type { TemperatureGradient } from './StarColor.js';

const BASE_OPTS = {
  seed: 1337,
  count: 1500,
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

function meanTemp(temps: Float32Array): number {
  let s = 0;
  for (let i = 0; i < temps.length; i++) s += temps[i];
  return s / temps.length;
}

test('omitted gradient leaves temps identical to legacy buffers', () => {
  const a = createGalaxyData(BASE_OPTS).data;
  const b = createGalaxyData({ ...BASE_OPTS, temperatureGradient: null }).data;
  for (let i = 0; i < a.temps.length; i++) {
    assert.equal(a.temps[i], b.temps[i], `temps[${i}] drift on null gradient`);
  }
});

test('identity gradient (returns 1) is a no-op on the temperature buffer', () => {
  const reference = createGalaxyData(BASE_OPTS).data;
  const identity: TemperatureGradient = () => 1;
  const gradiented = createGalaxyData({ ...BASE_OPTS, temperatureGradient: identity }).data;
  for (let i = 0; i < reference.temps.length; i++) {
    assert.equal(gradiented.temps[i], reference.temps[i], `temps[${i}] drift on identity`);
  }
});

test('same (seed, gradient) → byte-identical temps', () => {
  const gradient: TemperatureGradient = (t) => 0.5 + t;
  const a = createGalaxyData({ ...BASE_OPTS, temperatureGradient: gradient }).data;
  const b = createGalaxyData({ ...BASE_OPTS, temperatureGradient: gradient }).data;
  for (let i = 0; i < a.temps.length; i++) {
    assert.equal(a.temps[i], b.temps[i], `temps[${i}] drift between runs`);
  }
});

test('zero gradient collapses the population to the cool M/K branch', () => {
  // gradient(r) = 0 → armBias clamps to 0 → sampleTemperature gives M-dominant.
  // M range tops at 3700 K and K at 5200 K; cumM at bias=0 is 80%, cumK reaches 92%.
  const cold: TemperatureGradient = () => 0;
  const { data } = createGalaxyData({ ...BASE_OPTS, temperatureGradient: cold });
  let coolCount = 0;
  for (let i = 0; i < data.temps.length; i++) {
    if (data.temps[i] < 5200) coolCount++;
  }
  const ratio = coolCount / data.temps.length;
  assert.ok(ratio > 0.85, `expected >85% M/K stars under zero gradient, got ${(ratio * 100).toFixed(1)}%`);
});

test('hot gradient shifts the mean temperature upward vs baseline', () => {
  const baseline = createGalaxyData(BASE_OPTS).data;
  const hot: TemperatureGradient = () => 2;
  const hotter = createGalaxyData({ ...BASE_OPTS, temperatureGradient: hot }).data;
  const baselineMean = meanTemp(baseline.temps);
  const hotMean = meanTemp(hotter.temps);
  assert.ok(
    hotMean > baselineMean,
    `expected hot gradient to raise mean temp, got baseline=${baselineMean.toFixed(0)} hot=${hotMean.toFixed(0)}`,
  );
});

test('monotonic radial gradient pushes outer stars hotter than inner stars', () => {
  // gradient(t) = 4*t → centre suppressed (armBias→0), edge boosted (armBias→1).
  const outward: TemperatureGradient = (t) => 4 * t;
  const { data, opts } = createGalaxyData({ ...BASE_OPTS, temperatureGradient: outward });
  const inner: number[] = [];
  const outer: number[] = [];
  for (let i = 0; i < data.count; i++) {
    const x = data.positions[i * 3];
    const z = data.positions[i * 3 + 2];
    const r = Math.sqrt(x * x + z * z) / opts.radius;
    if (r < 0.25) inner.push(data.temps[i]);
    else if (r > 0.65) outer.push(data.temps[i]);
  }
  assert.ok(inner.length > 0 && outer.length > 0, 'sample buckets empty — adjust thresholds');
  const innerMean = inner.reduce((a, b) => a + b, 0) / inner.length;
  const outerMean = outer.reduce((a, b) => a + b, 0) / outer.length;
  assert.ok(
    outerMean > innerMean,
    `expected outer mean > inner mean, got inner=${innerMean.toFixed(0)} outer=${outerMean.toFixed(0)}`,
  );
});
