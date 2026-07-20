import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../core/settings.js');

test('settings default to a persistent Talk button', () => {
  const settings = NuranSettings.normalize({});
  assert.equal(settings.talkAccessMode, 'button');
  assert.equal(settings.learnTalkBridge, true);
});

test('settings reject invalid values and bound custom dock slots', () => {
  const settings = NuranSettings.normalize({
    talkAccessMode: 'floating-magic',
    talkDockWordIds: ['one', 'one', 'two', 'three', 'four'],
    speechRate: 99,
    density: 5,
  });
  assert.equal(settings.talkAccessMode, 'button');
  assert.deepEqual(settings.talkDockWordIds, ['one', 'two', 'three']);
  assert.equal(settings.speechRate, 1.2);
  assert.equal(settings.density, 4);
});
