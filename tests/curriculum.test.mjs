import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../core/curriculum.js');

const C = NuranCurriculum;
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0); // fixed clock so every derivation is deterministic
// `d` days before NOW, plus an optional minute offset within that day.
const at = (days, min = 0) => NOW - days * DAY + min * 60000;
const evt = (ts, type, wordId, correct, assisted) => ({ ts, type, wordId, correct, assisted });

// A word that qualifies as `solid` at a skill: 3 unassisted correct spread over 2 days.
function solidWord(wordId, type, dayA, dayB, offset = 0) {
  return [
    evt(at(dayA, offset), type, wordId, true, false),
    evt(at(dayA, offset + 2), type, wordId, true, false),
    evt(at(dayB, offset), type, wordId, true, false),
  ];
}
// s0 gate: 3 Explore completions across 2 distinct days.
const exploreOverTwoDays = (dayA, dayB) => [
  evt(at(dayA), 'explore-big', 'more', true, false),
  evt(at(dayA, 3), 'explore-big', 'go', true, false),
  evt(at(dayB), 'explore-big', 'stop', true, false),
];

test('skillForType maps legacy modes, prefixes, and excludes non-learning events', () => {
  assert.equal(C.skillForType('match-wp'), 'find');
  assert.equal(C.skillForType('match-ww'), 'read');
  assert.equal(C.skillForType('match-cc'), 'match');
  assert.equal(C.skillForType('find-big'), 'find');
  assert.equal(C.skillForType('read-word'), 'read');
  assert.equal(C.skillForType('build-copy'), 'build');
  assert.equal(C.skillForType('explore-big'), 'explore');
  assert.equal(C.skillForType('play'), null);
  assert.equal(C.skillForType('focus-segment'), null);
  assert.equal(C.skillForType(undefined), null);
});

test('a brand-new learner starts at Explore (s0)', () => {
  const s = C.stageFor([], {}, NOW);
  assert.equal(s.auto, 's0');
  assert.equal(s.effective, 's0');
  assert.deepEqual(s.passed, []);
});

test('mastery buckets: solid, growing, and new are classified correctly', () => {
  const events = [
    ...solidWord('w-solid', 'match-cc', 3, 2),
    // growing: one unassisted correct, then a miss — not solid, but has a real win
    evt(at(3), 'match-cc', 'w-grow', true, false),
    evt(at(2), 'match-cc', 'w-grow', false, false),
    // new: only an assisted correct — teaching, not evidence
    evt(at(3), 'match-cc', 'w-new', true, true),
  ];
  const m = C.mastery(events, NOW);
  assert.equal(m.get('match', 'w-solid').bucket, 'solid');
  assert.equal(m.get('match', 'w-grow').bucket, 'growing');
  assert.equal(m.get('match', 'w-new').bucket, 'new');
});

test('play and focus events never create mastery records', () => {
  const events = [
    evt(at(1), 'play', 'balloons', true, false),
    evt(at(1), 'focus-segment', 'x', true, false),
    evt(at(1), 'match-cc', 'real', true, false),
  ];
  const m = C.mastery(events, NOW);
  assert.equal(m.records.length, 1);
  assert.equal(m.records[0].key, 'real');
});

test('a solid word past its review interval becomes due', () => {
  const events = solidWord('rev1', 'match-cc', 20, 18); // last correct ~18 days ago
  const rec = C.mastery(events, NOW).get('match', 'rev1');
  assert.equal(rec.bucket, 'solid');
  assert.equal(rec.due, true);
});

test('deep history places the learner at the next stage frontier', () => {
  const events = [
    ...exploreOverTwoDays(6, 5),
    ...Array.from({ length: 10 }, (_, i) => solidWord('m' + i, 'match-cc', 4, 3, i)).flat(),
  ];
  const s = C.stageFor(events, {}, NOW);
  assert.equal(s.solidCount.match, 10);
  assert.ok(s.passed.includes('s0'));
  assert.ok(s.passed.includes('s1'));
  assert.equal(s.auto, 's2');
});

test('a pinned caregiver stage overrides auto but still reports auto', () => {
  const events = exploreOverTwoDays(4, 3);
  const s = C.stageFor(events, { curriculumStage: 's4a' }, NOW);
  assert.equal(s.pinned, 's4a');
  assert.equal(s.effective, 's4a');
  assert.equal(typeof s.auto, 'string'); // auto still computed for "what auto would pick"
});

test('the one-stage-per-day clamp suppresses a two-stage jump', () => {
  // Explore only reaches its 2nd day *today* (so s0 was NOT passed as of yesterday),
  // while 10 match words were already solid in the deep past. Raw today = s2, but
  // yesterday the gate math was still at s0, so auto is held to one step: s1.
  const events = [
    evt(at(3), 'explore-big', 'more', true, false),
    evt(at(3, 3), 'explore-big', 'go', true, false),
    evt(at(0), 'explore-big', 'stop', true, false), // the qualifying 2nd day is today
    ...Array.from({ length: 10 }, (_, i) => solidWord('m' + i, 'match-cc', 8, 7, i)).flat(),
  ];
  const s = C.stageFor(events, {}, NOW);
  assert.ok(s.frontiers.includes('s2')); // raw math today would open s2
  assert.equal(s.auto, 's1');            // …but the clamp permits only one step
});

test('mixSession returns a full session, prefers practice words, and never dead-ends', () => {
  const events = [
    ...exploreOverTwoDays(6, 5),
    // three growing "find" words (one real win each, no second day → not solid)
    evt(at(3), 'match-wp', 'g0', true, false),
    evt(at(3), 'match-wp', 'g1', true, false),
    evt(at(3), 'match-wp', 'g2', true, false),
  ];
  const words = Array.from({ length: 8 }, (_, i) => ({ id: 'w' + i }));
  const mix = C.mixSession(events, { stage: 's2', words, rounds: 8, now: NOW });
  assert.equal(mix.length, 8);
  assert.equal(new Set(mix).size, 8); // no duplicates
  for (const g of ['g0', 'g1', 'g2']) assert.ok(mix.includes(g)); // practice prioritized
  assert.ok(mix.some(id => id.startsWith('w'))); // frontier words included too
  assert.ok(!mix.includes('balloons')); // non-learning never leaks in
});

test('mixSession borrows one stage down when a stage cannot fill a session', () => {
  // At s2 with no find data at all, but plenty of match material below it.
  const events = [
    ...exploreOverTwoDays(6, 5),
    ...Array.from({ length: 5 }, (_, i) => solidWord('m' + i, 'match-cc', 20, 19, i)).flat(),
  ];
  const mix = C.mixSession(events, { stage: 's2', words: [], rounds: 8, now: NOW });
  assert.ok(mix.length >= 4); // a session is still buildable by borrowing down
});

test('regressionActive flips on when recent unassisted accuracy collapses', () => {
  const bad = [
    // two recent sessions, mostly wrong
    evt(at(1), 'match-wp', 'a', false, false),
    evt(at(1, 1), 'match-wp', 'b', false, false),
    evt(at(1, 2), 'match-wp', 'c', true, false),
    evt(at(0), 'match-wp', 'a', false, false),
    evt(at(0, 1), 'match-wp', 'b', false, false),
    evt(at(0, 2), 'match-wp', 'c', false, false),
  ];
  assert.equal(C.regressionActive(bad, 's2', NOW), true);

  const good = [
    evt(at(1), 'match-wp', 'a', true, false),
    evt(at(1, 1), 'match-wp', 'b', true, false),
    evt(at(0), 'match-wp', 'a', true, false),
    evt(at(0, 1), 'match-wp', 'b', true, false),
  ];
  assert.equal(C.regressionActive(good, 's2', NOW), false);
});
