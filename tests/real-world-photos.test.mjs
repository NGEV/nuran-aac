import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

globalThis.window = globalThis;
await import('../nuran-real-photos.js');
await import('../nuran-arasaac.js');

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

test('every seeded visual has a curated ARASAAC picture and no letter fallback', () => {
  assert.equal(NuranArasaac.keys.length, 120);
  for (const key of NuranRealPhotos.keys) {
    const art = NuranArasaac.html({ label: key, symbolKey: key });
    assert.match(art, new RegExp(`data-nuran-arasaac="${key}"`));
    assert.match(art, new RegExp(`src="arasaac/${key}\\.png"`));
    assert.doesNotMatch(art, /nuran-letter-tile|<svg|nuran-friend|stick.figure/i);
  }
});

test('the shipping runtime includes exact ARASAAC provenance and both visual credit notices', async () => {
  const [resolver, index, app, photoCredits, arasaacCredits] = await Promise.all([
    readFile('nuran-real-photos.js', 'utf8'),
    readFile('index.html', 'utf8'),
    readFile('app.js', 'utf8'),
    readFile('PHOTO_CREDITS.md', 'utf8'),
    readFile('ARASAAC_CREDITS.md', 'utf8'),
  ]);
  assert.doesNotMatch(resolver, /<svg|friend-person|function person\(/i);
  assert.doesNotMatch(app, /function mascot\(|hub-mascot|Sprout/i);
  assert.match(index, /nuran-real-photos\.js/);
  assert.match(index, /nuran-arasaac\.js/);
  assert.doesNotMatch(index, /nuran-friends\.js/);
  await assert.rejects(access('nuran-friends.js'));
  assert.match(photoCredits, /commons\.wikimedia\.org/);
  assert.match(arasaacCredits, /Government of Aragón/);
  assert.match(arasaacCredits, /CC BY-NC-SA 4\.0/);
  assert.match(arasaacCredits, /NuranArasaac\.ids/);
  assert.match(arasaacCredits, /NuranArasaac\.hashes/);
  for (const key of NuranRealPhotos.photoKeys) {
    assert.match(photoCredits, new RegExp(`\\| ${key} \\|`));
    await access(`real-photos/${key}.png`);
  }
  assert.equal(Object.keys(NuranArasaac.ids).length, 120);
  assert.equal(Object.keys(NuranArasaac.hashes).length, 120);
  for (const key of NuranArasaac.keys) {
    assert(Number.isInteger(NuranArasaac.ids[key]) && NuranArasaac.ids[key] > 0, key);
    const bytes = await readFile(NuranArasaac.assets[key]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), NuranArasaac.hashes[key], key);
  }
});
