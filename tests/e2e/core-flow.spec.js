import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('first-run actions remain visible in the initial viewport', async ({ page }) => {
  const quick = page.getByRole('button', { name: /Quick setup/ });
  await expect(quick).toBeVisible();
  const box = await quick.boundingBox();
  const viewport = page.viewportSize();
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  const logo = await page.locator('.welcome-logo svg').boundingBox();
  expect(logo.height).toBeLessThanOrEqual(160);
});

test('Talk Anytime is present by default on Learn', async ({ page }) => {
  await page.getByRole('button', { name: /Quick setup/ }).click();
  await page.getByRole('button', { name: 'Learn' }).click();
  await expect(page.getByRole('button', { name: 'Talk' })).toBeVisible();
});
