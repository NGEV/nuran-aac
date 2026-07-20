import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sw = await readFile(resolve(root, 'sw.js'), 'utf8');
const shellMatch = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellMatch) throw new Error('Could not find service-worker SHELL manifest');
const assets = [...shellMatch[1].matchAll(/'\.\/(.*?)'/g)].map(m => m[1] || 'index.html');
const missing = [];
for (const asset of assets) {
  const path = asset === '' ? 'index.html' : asset;
  try { await access(resolve(root, path)); } catch { missing.push(path); }
}
if (missing.length) throw new Error('Missing precache assets:\n' + missing.join('\n'));
console.log(`Verified ${assets.length} service-worker assets.`);
