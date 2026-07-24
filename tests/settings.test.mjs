import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../core/settings.js');

test('settings default to a persistent Talk button', () => {
  const settings = NuranSettings.normalize({});
  assert.equal(settings.talkAccessMode, 'button');
  assert.equal(settings.learnTalkBridge, true);
  assert.equal(settings.pictureStyle, 'best');
  assert.equal(settings.voiceURI, 'auto');
});

test('curriculum settings default to auto stage and are validated', () => {
  const d = NuranSettings.normalize({});
  assert.equal(d.curriculumStage, 'auto');
  assert.equal(d.learnTodayCount, 3);
  assert.equal(d.unlockCards, true);
  const bad = NuranSettings.normalize({ curriculumStage: 's9', learnTodayCount: 7, unlockCards: 'nope' });
  assert.equal(bad.curriculumStage, 'auto'); // invalid stage falls back
  assert.equal(bad.learnTodayCount, 3);      // out-of-set count falls back
  assert.equal(bad.unlockCards, true);       // non-boolean falls back
});

test('settings reject invalid values and bound custom dock slots', () => {
  const settings = NuranSettings.normalize({
    talkAccessMode: 'floating-magic',
    talkDockWordIds: ['one', 'one', 'two', 'three', 'four'],
    speechRate: 99,
    density: 5,
    pictureStyle: 'photos',
    voiceURI: 42,
  });
  assert.equal(settings.talkAccessMode, 'button');
  assert.deepEqual(settings.talkDockWordIds, ['one', 'two', 'three']);
  assert.equal(settings.speechRate, 1.2);
  assert.equal(settings.density, 4);
  assert.equal(settings.pictureStyle, 'best');
  assert.equal(settings.voiceURI, 'auto');
});

test('daily language rail is stable, bounded, and caregiver-switchable', () => {
  const defaults = NuranSettings.normalize({});
  assert.equal(defaults.dailyLanguageRail, true);
  assert.deepEqual(defaults.dailyLanguageWordIds.slice(0, 4), ['core-help', 'core-more', 'core-stop', 'core-yes']);
  const custom = NuranSettings.normalize({ dailyLanguageRail: false, dailyLanguageWordIds: ['one', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'] });
  assert.equal(custom.dailyLanguageRail, false);
  assert.equal(custom.dailyLanguageWordIds.length, 12);
  assert.deepEqual(custom.dailyLanguageWordIds.slice(0, 3), ['one', 'two', 'three']);
});
