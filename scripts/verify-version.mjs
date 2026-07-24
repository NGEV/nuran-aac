import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [versionSource, packageSource, index, serviceWorker, changelog] = await Promise.all([
  readFile(resolve(root, 'version.js'), 'utf8'),
  readFile(resolve(root, 'package.json'), 'utf8'),
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'sw.js'), 'utf8'),
  readFile(resolve(root, 'CHANGELOG.md'), 'utf8'),
]);

const runtimeMatch = versionSource.match(/version:\s*'([^']+)'/);
assert.ok(runtimeMatch, 'version.js must expose a version');
const version = runtimeMatch[1];
assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/, 'runtime version must be valid SemVer');
assert.equal(JSON.parse(packageSource).version, version, 'package.json must match version.js');
assert.match(index, /<script src="version\.js"><\/script>[\s\S]*<script src="app\.js"><\/script>/, 'version.js must load before app.js');
assert.match(serviceWorker, /importScripts\('\.\/version\.js', '\.\/nuran-arasaac\.js'\)/, 'service worker must load version.js');
assert.match(serviceWorker, /const CACHE_VERSION = `nuran-\$\{self\.NuranVersion\.version\}`/, 'cache name must derive from product version');
assert.ok(changelog.includes(`## [${version}]`), `CHANGELOG.md must include ${version}`);

console.log(`Verified release version ${version} across runtime, package, service worker, and changelog.`);
