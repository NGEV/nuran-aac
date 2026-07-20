import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';
import axe from 'axe-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const captureDir = process.env.NURAN_SCREENSHOT_DIR ? resolve(process.env.NURAN_SCREENSHOT_DIR) : null;
if (captureDir) await mkdir(captureDir, { recursive: true });
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const path = resolve(root, '.' + relative);
    if (!path.startsWith(root)) throw new Error('invalid path');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});

const port = server.address().port;
const browser = await webkit.launch();
const viewports = [
  { name: 'iPad landscape', width: 1280, height: 720 },
  { name: 'iPad portrait', width: 768, height: 1024 },
];

async function openCaregiver(page) {
  await page.getByRole('button', { name: /Caregiver: press and hold/ }).scrollIntoViewIfNeeded();
  const gate = page.getByRole('button', { name: /Caregiver: press and hold/ });
  const box = await gate.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2700);
  await page.mouse.up();
  await page.getByRole('heading', { name: 'Caregiver area' }).waitFor();
}

async function capture(page, name, fullPage = false) {
  if (!captureDir) return;
  await page.screenshot({ path: resolve(captureDir, name + '.png'), fullPage });
}

async function checkAccessibility(page, state) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(() => axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  }));
  const failures = result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`);
  assert.deepEqual(failures, [], `${state}: accessibility violations:\n${failures.join('\n')}`);
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });

    const quick = page.getByRole('button', { name: /Quick setup/ });
    await quick.waitFor({ state: 'visible' });
    const quickBox = await quick.boundingBox();
    const logoBox = await page.locator('.welcome-logo svg').boundingBox();
    assert.ok(quickBox && quickBox.y + quickBox.height <= viewport.height,
      `${viewport.name}: Quick Setup is below the initial viewport`);
    assert.ok(logoBox && logoBox.height <= 160, `${viewport.name}: welcome logo exceeds 160px`);
    await checkAccessibility(page, `${viewport.name} welcome`);
    await capture(page, viewport.name === 'iPad landscape' ? '01-welcome-landscape' : '08-welcome-portrait');

    await quick.click();
    await page.getByRole('button', { name: 'Learn' }).click();
    await page.getByRole('button', { name: 'Talk', exact: true }).waitFor({ state: 'visible' });
    await checkAccessibility(page, `${viewport.name} Learn`);
    await capture(page, viewport.name === 'iPad landscape' ? '02-learn-talk-anytime' : '09-learn-portrait');

    if (viewport.name === 'iPad landscape') {
      // Caregiver Today and grouped Settings are reachable and render without errors.
      await page.getByRole('button', { name: /Home/ }).click();
      const keyboardGate = page.getByRole('button', { name: /Caregiver: press and hold/ });
      await keyboardGate.focus();
      await keyboardGate.press('Enter');
      // Keyboard/switch activation must NOT open the gate directly: a caregiver
      // confirm dialog appears first (owner decision 2026-07-19, review finding C1-1).
      await page.getByRole('heading', { name: 'Caregiver check' }).waitFor();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('heading', { name: 'Caregiver area' }).waitFor();
      const lockButton = page.getByRole('button', { name: /Lock device to this app/ });
      await lockButton.focus();
      await lockButton.press('Enter');
      assert.equal(await page.locator('#modal-wrap').getAttribute('aria-hidden'), 'false');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#modal-wrap').getAttribute('aria-hidden'), 'true');
      assert.equal(await lockButton.evaluate(el => document.activeElement === el), true, 'Modal did not return focus');
      await page.getByRole('button', { name: /Today/ }).click();
      await page.getByRole('heading', { name: 'Visual Routine trial' }).waitFor();
      await checkAccessibility(page, 'Caregiver Today');
      await capture(page, '03-caregiver-today');

      // The Personal voices empty state must open the Add-a-word form, not the
      // empty Words & groups list (review finding C2-1).
      const personalVoices = page.getByRole('heading', { name: 'Personal voices' }).locator('..');
      await personalVoices.getByRole('button', { name: 'Add a word', exact: true }).click();
      await page.getByRole('heading', { name: 'Add a word', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await page.getByRole('heading', { name: 'Caregiver area' }).waitFor();
      await page.getByRole('button', { name: /Settings/ }).click();
      await page.getByRole('heading', { name: /Talk & access/ }).waitFor();
      await page.getByRole('heading', { name: /Motion & celebrations/ }).waitFor();
      await checkAccessibility(page, 'Caregiver Settings');
      await capture(page, '04-grouped-settings', true);

      // Custom dock and fully-off mode are both caregiver choices.
      await page.locator('#s-talk-access').selectOption('dock');
      await page.locator('#s-dock-editor').waitFor({ state: 'visible' });
      const dockSlots = page.locator('.s-dock-word');
      const firstDockValue = await dockSlots.nth(0).inputValue();
      const secondDockValue = await dockSlots.nth(1).inputValue();
      const storedDockBefore = await page.evaluate(() => DB.getSetting('talkDockWordIds', []));
      await dockSlots.nth(1).selectOption(firstDockValue);
      await page.getByText('That word is already in the dock.', { exact: true }).waitFor();
      assert.equal(await dockSlots.nth(1).inputValue(), secondDockValue,
        `${viewport.name}: duplicate dock choice did not restore the prior slot`);
      assert.deepEqual(await page.evaluate(() => DB.getSetting('talkDockWordIds', [])), storedDockBefore,
        `${viewport.name}: duplicate dock choice changed persisted slots`);
      await page.getByRole('button', { name: /Home/ }).click();
      await page.getByRole('button', { name: 'Learn' }).click();
      await page.getByRole('navigation', { name: 'Talk anytime' }).waitFor();
      await capture(page, '05-custom-talk-dock');
      await page.getByRole('button', { name: /Home/ }).click();
      await openCaregiver(page);
      await page.getByRole('button', { name: /Settings/ }).click();
      await page.locator('#s-talk-access').selectOption('off');
      await page.getByRole('button', { name: /Home/ }).click();
      await page.getByRole('button', { name: 'Learn' }).click();
      assert.equal(await page.locator('.btn-talk, .talk-dock').count(), 0, 'Talk Anytime off mode still rendered a control');

      // Restore the selected default, then create the one-scene family-photo trial.
      await page.getByRole('button', { name: /Home/ }).click();
      await openCaregiver(page);
      await page.getByRole('button', { name: /Settings/ }).click();
      await page.locator('#s-talk-access').selectOption('button');
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await page.getByRole('button', { name: /Visual Routine/ }).click();
      await page.locator('#vs-title').fill('Breakfast');
      await page.locator('#vs-photo').setInputFiles(resolve(root, 'icon-512.png'));
      await page.locator('#vs-photo-status').filter({ hasText: 'Photo ready' }).waitFor();
      await page.getByRole('button', { name: 'Save visual routine' }).click();
      try {
      await page.getByRole('heading', { name: 'Breakfast' }).waitFor({ timeout: 5000 });
      } catch {
        const dbErrors = await page.evaluate(() => DB.all('errorLog'));
        const sceneCount = await page.evaluate(async () => (await DB.all('visualScenes')).length);
        throw new Error(`Visual scene did not open (stored scenes: ${sceneCount}). Page: ${(await page.locator('body').innerText()).slice(0, 500)} Errors: ${errors.join('; ')} DB log: ${JSON.stringify(dbErrors)}`);
      }
      assert.equal(await page.locator('[data-scene-word]').count(), 4);
      await checkAccessibility(page, 'Visual Routine');
      await capture(page, '06-visual-routine');

      // A completed Learn session offers the optional bridge into the real Talk board.
      await page.getByRole('button', { name: /Home/ }).click();
      await page.getByRole('button', { name: 'Learn' }).click();
      await page.getByRole('button', { name: 'Match Pictures' }).click();
      let practicedWord = null;
      let practicedWordId = null;
      for (let round = 1; round <= 8; round++) {
        await page.locator('.pager .count').filter({ hasText: `${round} of 8` }).waitFor();
        const word = (await page.locator('.mg-word').innerText()).trim();
        const answer = page.locator(`[data-opt][aria-label="${word.replaceAll('"', '\\"')}"]`);
        const answerId = await answer.getAttribute('data-opt');
        if (round === 1) {
          practicedWord = word;
          practicedWordId = answerId;
          await answer.click();
          // Remove the first target from later rounds so the final target must
          // differ. The first answer remains the session's only unassisted word.
          await page.evaluate(id => DB.softDelete('vocabulary', id), practicedWordId);
        } else {
          const wrong = page.locator(`[data-opt]:not([data-opt="${answerId}"])`).first();
          await wrong.click();
          await wrong.click();
          await answer.click();
        }
        await page.locator('.cele-overlay').click();
      }
      const bridge = page.getByRole('button', { name: /Use .* in Talk/ });
      await bridge.waitFor();
      assert.equal((await bridge.innerText()).trim(), `Use ${practicedWord} in Talk`,
        `${viewport.name}: bridge did not select the session's most-practiced unassisted word`);
      await page.evaluate(id => DB.restoreDeleted('vocabulary', id), practicedWordId);
      await bridge.click();
      await page.locator('.bridge-highlight').waitFor();
      await checkAccessibility(page, 'Learn-to-Talk bridge');
      await capture(page, '07-learn-to-talk');
    }
    assert.deepEqual(errors, [], `${viewport.name}: browser errors: ${errors.join('; ')}`);
    await context.close();
    console.log(`PASS ${viewport.name}: onboarding viewport + Talk Anytime`);
  }
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
