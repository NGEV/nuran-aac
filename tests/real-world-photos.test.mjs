import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

globalThis.window = globalThis;
await import('../nuran-real-photos.js');

test('the real-world resolver covers every planned Core, Sentence, and Learn word exactly once', async () => {
  const seed = await readFile('seed.js', 'utf8');
  const sourceWordIds = (name, symbolIndex) => {
    const block = seed.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n  \\];`));
    assert(block, `Cannot find ${name} in seed.js`);
    return [...block[1].matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*(?:,\s*'([^']+)')?\s*\]/g)]
      .map(tuple => tuple[symbolIndex]);
  };
  const planned = [
    ...sourceWordIds('CORE_WORDS', 2),
    ...sourceWordIds('SENTENCE_WORDS', 2),
    ...sourceWordIds('LEARNING_WORDS', 3),
  ];
  assert.equal(planned.length, 120);
  assert.equal(new Set(planned).size, 120);
  assert.deepEqual(new Set(NuranRealPhotos.keys), new Set(planned));
});

test('every visual resolves to a real photo or plain text, never a generated figure', () => {
  for (const key of NuranRealPhotos.keys) {
    const art = NuranRealPhotos.html({ label: key, symbolKey: key });
    assert.doesNotMatch(art, /<svg|nuran-friend|friend-person|stick.figure|cartoon/i);
    if (NuranRealPhotos.photoKeys.includes(key)) {
      assert.match(art, new RegExp(`data-nuran-real-photo="${key}"`));
      assert.match(art, /src="real-photos\/.+\.png"/);
    } else {
      assert.match(art, /class="nuran-letter-tile"/);
    }
  }
});

test('the shipping runtime has no retired figure renderer and every bundled photo has a credit notice', async () => {
  const [resolver, index, app, credits] = await Promise.all([
    readFile('nuran-real-photos.js', 'utf8'),
    readFile('index.html', 'utf8'),
    readFile('app.js', 'utf8'),
    readFile('PHOTO_CREDITS.md', 'utf8'),
  ]);
  assert.doesNotMatch(resolver, /<svg|friend-person|function person\(/i);
  assert.doesNotMatch(app, /function mascot\(|hub-mascot|Sprout/i);
  assert.match(index, /nuran-real-photos\.js/);
  assert.doesNotMatch(index, /nuran-friends\.js/);
  await assert.rejects(access('nuran-friends.js'));
  assert.match(credits, /commons\.wikimedia\.org/);
  for (const key of NuranRealPhotos.photoKeys) {
    assert.match(credits, new RegExp(`\\| ${key} \\|`));
    await access(`real-photos/${key}.png`);
  }
});
