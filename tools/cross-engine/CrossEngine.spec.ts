import { test, expect } from '@playwright/test';

const expected = {
  positions: '499932ba',
  colors:    'd02e9caf',
  sizes:     '02f4f232',
};

declare global {
  interface Window {
    __crossEngineHashes?: typeof expected;
  }
}

test('determinism harness produces the reference hashes', async ({ page }) => {
  await page.goto('/tools/cross-engine/page.html');
  await page.waitForFunction(() => window.__crossEngineHashes !== undefined);
  const hashes = await page.evaluate(() => window.__crossEngineHashes);
  expect(hashes).toEqual(expected);
});
