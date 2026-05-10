import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIGHT_YEARS_PER_CUBE,
  lightYearsPerUnit,
  worldUnitsToLightYears,
} from './Astronomy.js';

test('one cube spans LIGHT_YEARS_PER_CUBE whatever the world-unit cube size', () => {
  for (const cubeSize of [1, 2, 4, 5]) {
    const span = worldUnitsToLightYears(cubeSize, cubeSize);
    assert.equal(span, LIGHT_YEARS_PER_CUBE);
  }
});

test('lightYearsPerUnit scales inversely with cubeSize', () => {
  assert.equal(lightYearsPerUnit(1), 50);
  assert.equal(lightYearsPerUnit(2), 25);
  assert.equal(lightYearsPerUnit(5), 10);
});

test('worldUnitsToLightYears is linear in distance', () => {
  assert.equal(worldUnitsToLightYears(2, 0), 0);
  assert.equal(worldUnitsToLightYears(2, 1), 25);
  assert.equal(worldUnitsToLightYears(2, 4), 100);
});
