import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detSin, detCos, detLog, detExp, detPow } from './DetMath.js';

const TOL = 1e-12;

test('detSin matches Math.sin within 1e-12 across [-2π, 2π]', () => {
  for (let x = -7; x <= 7; x += 0.0137) {
    const diff = Math.abs(detSin(x) - Math.sin(x));
    assert.ok(diff < TOL, `detSin(${x}) drift = ${diff}`);
  }
});

test('detCos matches Math.cos within 1e-12 across [-2π, 2π]', () => {
  for (let x = -7; x <= 7; x += 0.0137) {
    const diff = Math.abs(detCos(x) - Math.cos(x));
    assert.ok(diff < TOL, `detCos(${x}) drift = ${diff}`);
  }
});

test('Pythagorean identity holds for arbitrary angles', () => {
  for (let x = -50; x <= 50; x += 0.317) {
    const s = detSin(x), c = detCos(x);
    assert.ok(Math.abs(s * s + c * c - 1) < TOL, `sin²+cos² drift at ${x}`);
  }
});

test('detLog matches Math.log within 1e-12 across (0, 1000]', () => {
  for (let x = 1e-6; x <= 1000; x *= 1.27) {
    const diff = Math.abs(detLog(x) - Math.log(x));
    assert.ok(diff < TOL, `detLog(${x}) drift = ${diff}`);
  }
});

test('detLog(1) is exactly 0', () => {
  assert.equal(detLog(1), 0);
});

test('detExp matches Math.exp within 1e-12 relative across [-30, 30]', () => {
  for (let x = -30; x <= 30; x += 0.317) {
    const expected = Math.exp(x);
    const got = detExp(x);
    const rel = Math.abs(got - expected) / expected;
    assert.ok(rel < TOL, `detExp(${x}) rel drift = ${rel}`);
  }
});

test('detExp(0) is exactly 1', () => {
  assert.equal(detExp(0), 1);
});

test('detExp ∘ detLog round-trips within 1e-11', () => {
  for (let x = 0.001; x <= 1000; x *= 1.27) {
    const back = detExp(detLog(x));
    const rel = Math.abs(back - x) / x;
    assert.ok(rel < 1e-11, `roundtrip ${x} → ${back}`);
  }
});

test('detPow matches Math.pow for the cases used by the galaxy pipeline', () => {
  const cases: [number, number][] = [
    [0.5, 0.7], [0.001, 0.65], [0.999, 0.7], [0.42, 0.4], [3.0, 0.22],
    [1.5, -0.1332047592], [2.4, -0.0755148492], [240, -0.0755148492],
  ];
  for (const [x, y] of cases) {
    const expected = Math.pow(x, y);
    const got = detPow(x, y);
    const rel = Math.abs(got - expected) / Math.abs(expected);
    assert.ok(rel < 1e-11, `detPow(${x}, ${y}) rel drift = ${rel}`);
  }
});

test('detPow handles edge cases (y=0, x=0, x=1)', () => {
  assert.equal(detPow(42, 0), 1);
  assert.equal(detPow(0, 0.7), 0);
  assert.equal(detPow(1, 1234), 1);
});
