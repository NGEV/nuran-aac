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
  const logo = await page.locator('.welcome-logo svg, .welcome-logo img').boundingBox();
  expect(logo.height).toBeLessThanOrEqual(160);
});

test('Talk Anytime is present by default on Learn', async ({ page }) => {
  await page.getByRole('button', { name: /Quick setup/ }).click();
  await expect(page.locator('.home-grid img.symbol-mulberry')).toHaveCount(4);
  await page.getByRole('button', { name: 'Learn' }).click();
  await expect(page.getByRole('button', { name: 'Talk' })).toBeVisible();
});

test('Sentence Words exposes essential grammar on its first page', async ({ page }) => {
  await page.getByRole('button', { name: /Quick setup/ }).click();
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  await page.getByRole('button', { name: 'Sentence Words', exact: true }).click();
  await expect(page.locator('[data-word] .lbl')).toHaveText(['is', 'am', 'are', 'a']);
});

test('full setup exposes an actual voice picker and integrated picture library', async ({ page }) => {
  await page.getByRole('button', { name: /Choose settings/ }).click();
  await expect(page.getByRole('heading', { name: 'Setup 1 of 4 — Voice' })).toBeVisible();
  await expect(page.locator('#wz-device-voice option[value="auto"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Setup 2 of 4 — Pictures' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Best available/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mulberry first/ })).toBeVisible();
});
