import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

globalThis.window = globalThis;
await import('../nuran-friends.js');

test('Nuran Friends covers every planned Core, Sentence, and Learn word exactly once', async () => {
  const plan = JSON.parse(await readFile('../design-intake/symbol-redesign/symbol-plan.json', 'utf8'));
  const planned = plan.conceptGroups
    .flatMap(group => Object.keys(group.concepts))
    .map(id => id.replace(/^(core|seed)-/, ''));
  assert.equal(planned.length, 120);
  assert.equal(new Set(planned).size, 120);
  assert.deepEqual(new Set(NuranFriends.keys), new Set(planned));
});

test('each Nuran Friends asset is a stable original SVG without an old-art fallback', () => {
  for (const key of NuranFriends.keys) {
    const art = NuranFriends.html({ label: key, symbolKey: key });
    assert.match(art, new RegExp(`data-nuran-friend="${key}"`));
    assert.doesNotMatch(art, /mulberry|data-original|symbol-mulberry/i);
  }
});
