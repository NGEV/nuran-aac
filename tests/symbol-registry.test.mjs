import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../nuran-friends.js');
await import('../core/symbol-registry.js');

test('best available uses caregiver photos before library artwork', () => {
  const html = NuranSymbols.html(
    { label: 'water', symbolKey: 'water' },
    { style: 'best', photoHTML: '<img data-family-photo>' },
  );
  assert.equal(html, '<img data-family-photo>');
  assert.equal(NuranSymbols.source({ label: 'water' }, { style: 'best', photoHTML: 'photo' }), 'photo');
});

test('Nuran Friends resolves words and visible app roles through one registry', () => {
  assert.match(NuranSymbols.html({ label: 'water', symbolKey: 'water' }, { style: 'best' }), /data-nuran-friend="water"/);
  assert.match(NuranSymbols.html({ label: 'Talk', symbolKey: '_talk' }, { style: 'best' }), /data-nuran-friend="hello"/);
  assert.match(NuranSymbols.html({ label: 'People', symbolKey: '_people' }, { style: 'best' }), /data-nuran-friend="hug"/);
  assert.equal(NuranSymbols.source({ label: 'water', symbolKey: 'water' }, { style: 'best' }), 'nuran-friends');
});

test('unknown visual keys receive a neutral letter tile instead of old artwork', () => {
  assert.match(NuranSymbols.html({ label: 'custom', symbolKey: '_custom' }, { style: 'best' }), /data-nuran-friend="letter"/);
  assert.equal(NuranSymbols.source({ label: 'custom', symbolKey: '_custom' }, { style: 'best' }), 'letter');
});
