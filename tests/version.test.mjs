import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('version.js exposes an immutable semantic product version', async () => {
  const source = await readFile(new URL('../version.js', import.meta.url), 'utf8');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.NuranVersion.version, '3.1.1');
  assert.equal(context.NuranVersion.channel, 'stable');
  assert.equal(Object.isFrozen(context.NuranVersion), true);
});
