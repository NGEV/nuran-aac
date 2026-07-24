import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../nuran-real-photos.js');
await import('../core/symbol-registry.js');

test('best available uses caregiver photos before the bundled visual library', () => {
  const html = NuranSymbols.html(
    { label: 'water', symbolKey: 'water' },
    { style: 'best', photoHTML: '<img data-family-photo>' },
  );
  assert.equal(html, '<img data-family-photo>');
  assert.equal(NuranSymbols.source({ label: 'water' }, { style: 'best', photoHTML: 'photo' }), 'photo');
});

test('reviewed real photos and text fallbacks resolve through one registry', () => {
  assert.match(NuranSymbols.html({ label: 'water', symbolKey: 'water' }, { style: 'best' }), /data-nuran-real-photo="water"/);
  assert.match(NuranSymbols.html({ label: 'Talk', symbolKey: '_talk' }, { style: 'best' }), /class="nuran-letter-tile"/);
  assert.match(NuranSymbols.html({ label: 'People', symbolKey: '_people' }, { style: 'best' }), /class="nuran-letter-tile"/);
  assert.equal(NuranSymbols.source({ label: 'water', symbolKey: 'water' }, { style: 'best' }), 'real-photo');
});

test('unknown visual keys receive a neutral letter tile instead of artwork', () => {
  assert.match(NuranSymbols.html({ label: 'custom', symbolKey: '_custom' }, { style: 'best' }), /class="nuran-letter-tile"/);
  assert.equal(NuranSymbols.source({ label: 'custom', symbolKey: '_custom' }, { style: 'best' }), 'letter');
});
