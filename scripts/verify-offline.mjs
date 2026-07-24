import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const path = resolve(root, '.' + relative);
    if (!path.startsWith(root)) throw new Error('invalid path');
    response.writeHead(200, {
      'content-type': mime[extname(path)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', accept);
});

const browser = await webkit.launch();
const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
const page = await context.newPage();
let serverStopped = false;
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('service worker has no active worker');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  const cacheEvidence = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open('nuran-v25');
    const keys = await cache.keys();
    return {
      names,
      count: keys.length,
      hasHelp: !!(await cache.match('./arasaac/help.png')),
      hasManual: !!(await cache.match('./nuran-user-manual.pdf')),
      hasRegistry: !!(await cache.match('./nuran-arasaac.js')),
    };
  });
  assert.deepEqual(cacheEvidence.names, ['nuran-v25']);
  // The verifier reports 152 unique files because './' and './index.html' are
  // the same file; Cache Storage correctly keeps both request URLs.
  assert.equal(cacheEvidence.count, 153);
  assert.equal(cacheEvidence.hasHelp, true);
  assert.equal(cacheEvidence.hasManual, true);
  assert.equal(cacheEvidence.hasRegistry, true);

  // Stop the actual origin instead of relying on WebKit's synthetic offline
  // toggle, which can terminate an in-flight reload before the worker answers.
  await new Promise(resolveClose => server.close(resolveClose));
  serverStopped = true;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Quick setup/ }).waitFor();
  const offlineAsset = await page.evaluate(async () => {
    const response = await fetch('arasaac/help.png');
    return { ok: response.ok, type: response.headers.get('content-type'), bytes: (await response.blob()).size };
  });
  assert.equal(offlineAsset.ok, true);
  assert.match(offlineAsset.type, /image\/png/);
  assert.ok(offlineAsset.bytes > 1000);
  console.log(`PASS offline/PWA: nuran-v25 controls ${cacheEvidence.count} cached requests (152 unique files); help picture served offline (${offlineAsset.bytes} bytes).`);
} finally {
  await context.close();
  await browser.close();
  if (!serverStopped) await new Promise(resolveClose => server.close(resolveClose));
}
