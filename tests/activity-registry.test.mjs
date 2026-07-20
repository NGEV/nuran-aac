import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../core/activity-registry.js');
await import('../features/activity-catalog.js');

test('catalog exposes Learn and Play from one registry', () => {
  assert.equal(NuranActivities.list({ family: 'learn' }).length, 3);
  assert.equal(NuranActivities.list({ family: 'play', context: { motionLevel: 'full' } }).length, 6);
});

test('motion eligibility is enforced by the registry', () => {
  const none = NuranActivities.list({ family: 'play', context: { motionLevel: 'none' } }).map(a => a.id);
  assert.equal(none.includes('floats'), false);
  assert.equal(none.includes('blocks'), false);
  assert.equal(none.includes('paint'), true);
});

test('duplicate activity ids are rejected', () => {
  assert.throws(() => NuranActivities.register({ id: 'paint', family: 'play', route: 'paint' }), /duplicate activity/);
});
