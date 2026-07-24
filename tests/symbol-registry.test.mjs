import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../nuran-real-photos.js');
await import('../nuran-arasaac.js');
await import('../core/symbol-registry.js');

test('best available uses caregiver photos before the bundled visual library', () => {
  const html = NuranSymbols.html(
    { label: 'water', symbolKey: 'water' },
    { style: 'best', photoHTML: '<img data-family-photo>' },
  );
  assert.equal(html, '<img data-family-photo>');
  assert.equal(NuranSymbols.source({ label: 'water' }, { style: 'best', photoHTML: 'photo' }), 'photo');
});

test('reviewed real photos and complete ARASAAC fallbacks resolve through one registry', () => {
  assert.match(NuranSymbols.html({ label: 'water', symbolKey: 'water' }, { style: 'best' }), /data-nuran-real-photo="water"/);
  assert.match(NuranSymbols.html({ label: 'Talk', symbolKey: '_talk' }, { style: 'best' }), /data-nuran-arasaac="hello"/);
  assert.match(NuranSymbols.html({ label: 'People', symbolKey: '_people' }, { style: 'best' }), /data-nuran-arasaac="hug"/);
  assert.equal(NuranSymbols.source({ label: 'water', symbolKey: 'water' }, { style: 'best' }), 'real-photo');
  assert.equal(NuranSymbols.source({ label: 'help', symbolKey: 'help' }, { style: 'best' }), 'arasaac');
  assert.match(
    NuranSymbols.html({ label: 'water', symbolKey: 'water' }, { preferRealPhotos: false }),
    /data-nuran-arasaac="water"/
  );
});

test('Words only is the only seeded-word path to a text tile', () => {
  for (const key of NuranArasaac.keys) {
    const pictured = NuranSymbols.html({ label: key, symbolKey: key }, { style: 'best' });
    assert.doesNotMatch(pictured, /nuran-word-tile/, `${key} unexpectedly fell back to text`);
    assert.match(pictured, /data-nuran-(?:real-photo|arasaac)=/);
  }
  assert.match(
    NuranSymbols.html({ label: 'help', symbolKey: 'help' }, { wordOnly: true }),
    /class="nuran-word-tile"/
  );
  assert.equal(NuranSymbols.source({ label: 'help' }, { wordOnly: true }), 'text');
});

test('unknown visual keys receive their readable full-word label, never one letter', () => {
  const html = NuranSymbols.html({ label: 'custom word', symbolKey: '_custom' }, { style: 'best' });
  assert.match(html, /class="nuran-word-tile"/);
  assert.match(html, />custom word</);
  assert.doesNotMatch(html, /nuran-letter-tile|>C</);
  assert.equal(NuranSymbols.source({ label: 'custom word', symbolKey: '_custom' }, { style: 'best' }), 'word-label');
});
