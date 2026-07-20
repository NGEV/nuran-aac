import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.MulberryMap = {
  hello: 'mulberry/hello.svg',
  hug: 'mulberry/hug.svg',
  water: 'mulberry/water.svg',
};
globalThis.Symbols = {
  has: key => ['_talk', '_people', 'water', 'yes'].includes(key),
  get: key => `<svg data-original="${key}"></svg>`,
  letterTile: label => `<svg data-letter="${label}"></svg>`,
};
await import('../core/symbol-registry.js');

test('best available uses caregiver photos before library artwork', () => {
  const html = NuranSymbols.html(
    { label: 'water', symbolKey: 'water' },
    { style: 'best', photoHTML: '<img data-family-photo>' },
  );
  assert.equal(html, '<img data-family-photo>');
  assert.equal(NuranSymbols.source({ label: 'water' }, { style: 'best', photoHTML: 'photo' }), 'photo');
});

test('Mulberry resolves words and visible app roles through one registry', () => {
  assert.match(NuranSymbols.html({ label: 'water', symbolKey: 'water' }, { style: 'best' }), /mulberry\/water\.svg/);
  assert.match(NuranSymbols.html({ label: 'Talk', symbolKey: '_talk' }, { style: 'best' }), /mulberry\/hello\.svg/);
  assert.match(NuranSymbols.html({ label: 'People', symbolKey: '_people' }, { style: 'best' }), /mulberry\/hug\.svg/);
});

test('complete original symbols remain a deterministic fallback and explicit mode', () => {
  assert.match(NuranSymbols.html({ label: 'yes', symbolKey: 'yes' }, { style: 'best' }), /data-original="yes"/);
  assert.match(NuranSymbols.html({ label: 'water', symbolKey: 'water' }, { style: 'symbols' }), /data-original="water"/);
});
