import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', { value: { storage: {} }, configurable: true });
await import('../db.js');

test('complete backup contains learning history and visual scenes', async () => {
  await DB.open();
  await DB.put('vocabulary', { id: 'word-water', label: 'water', deleted: false });
  await DB.put('visualScenes', { id: 'scene-one', title: 'Breakfast', wordIds: ['word-water'], deleted: false });
  await DB.logProgress({ type: 'match-wp', wordId: 'word-water', word: 'water', correct: true });

  const backup = JSON.parse(await DB.exportJSON());
  assert.equal(backup.data.progressLog.length, 1);
  assert.equal(backup.data.visualScenes.length, 1);
  assert.equal(DB.meta.allDataStores.includes('progressLog'), true);
  assert.equal(DB.meta.limits.progress, 20000);
});

test('restore round-trip preserves progress and older backups clear newer stores', async () => {
  const backup = JSON.parse(await DB.exportJSON());
  await DB.logProgress({ type: 'match-wp', wordId: 'word-water', word: 'water', correct: false });
  await DB.restoreFromBackup(backup);
  assert.equal((await DB.all('progressLog')).length, 1);

  const oldBackup = structuredClone(backup);
  delete oldBackup.data.progressLog;
  delete oldBackup.data.visualScenes;
  await DB.restoreFromBackup(oldBackup);
  assert.equal((await DB.all('progressLog')).length, 0);
  assert.equal((await DB.all('visualScenes')).length, 0);
});

test('progressEvents returns newest matching rows within its bound', async () => {
  await DB.logProgress({ ts: 100, type: 'alpha', word: 'old' });
  await DB.logProgress({ ts: 200, type: 'alpha', word: 'new' });
  await DB.logProgress({ ts: 300, type: 'beta', word: 'other' });
  const rows = await DB.progressEvents({ type: 'alpha', limit: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].word, 'new');
});

test('older snapshot restore clears stores introduced later', async () => {
  await DB.put('visualScenes', { id: 'scene-stale', title: 'Stale scene', deleted: false });
  await DB.logProgress({ type: 'stale-progress', word: 'stale' });
  await DB.put('snapshots', {
    id: 999001,
    type: 'hourly',
    ts: Date.now(),
    data: { vocabulary: [], categories: [], people: [], settings: [], history: [] },
  });
  await DB.restoreFromSnapshot(999001);
  assert.equal((await DB.all('visualScenes')).length, 0);
  assert.equal((await DB.all('progressLog')).length, 0);
});
