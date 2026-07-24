/* Nuran AAC — curriculum derivation engine (Phase 3, Slice C2).

   The "learn engine." Pure functions over the append-only `progressLog`. No DOM, no
   storage, no network, no randomness — every value is DERIVED at call time and nothing
   here is persisted. This is the layer that decides WHAT the one existing game engine
   (`screens.learngame`) should present next; it never renders anything itself.

   The mastery math is specified in design-intake/curriculum/MASTER-PLAN.md §1.3. The
   tunable constants live here and ONLY here, so a practitioner can adjust them in one
   place (they are practitioner-guidance starting points, not lab-validated — see §5).

   Design decisions worth knowing before editing:
   - Only *learning* events feed the math. `play` and `focus-segment` events must never
     affect buckets, stages, or review (MASTER-PLAN Claude cross-review annotation).
   - Legacy learngame modes map to skills: match-wp→find, match-ww→read, match-cc→match.
     New activity types follow a `<skill>-*` prefix convention (find-big, read-word, …).
   - Single-learner assumption: `progressLog` has no child id and none is added here. */

(function (root) {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;

  // ---- Tunable constants (MASTER-PLAN §1.3). One place, on purpose. ----
  const MASTERY_WINDOW = 10;       // most recent attempts per word/skill considered
  const SOLID_ACCURACY = 0.8;      // ≥80% correct within the window
  const SOLID_UNASSISTED = 3;      // ≥3 unassisted correct in the window
  const SOLID_DISTINCT_DAYS = 2;   // those unassisted corrects span ≥2 distinct days
  const REVIEW_INTERVALS = [3 * DAY, 7 * DAY, 14 * DAY]; // Leitner-lite spacing ladder
  const SESSION_GAP = 20 * 60 * 1000;  // >20 min idle starts a new "session"
  const SESSIONS_FOR_ACCURACY = 3;     // stage gate reads the last N sessions at a skill
  const STAGE_SOLID_WORDS = 10;        // distinct solid words needed to pass a stage
  const STAGE_ACCURACY = 0.8;          // rolling unassisted accuracy needed to pass
  const REGRESSION_LOW = 0.5;          // <50% over last 2 sessions ⇒ kinder review mix
  const S0_ACTIVITIES = 3;             // distinct Explore completions…
  const S0_DISTINCT_DAYS = 2;          // …over ≥2 days to leave the demand-free floor
  const SESSION_ROUNDS = 8;            // rounds per session
  const PRACTICE_SHARE = 0.7;          // ~70% growing+due-solid, ~30% new-frontier
  const MIN_POOL = 4;                  // below this at a stage, borrow one stage down

  const STAGE_ORDER = ['s0', 's1', 's2', 's3', 's4a', 's4b'];
  const STAGE_SKILL = { s0: 'explore', s1: 'match', s2: 'find', s3: 'say', s4a: 'read', s4b: 'build' };
  const SKILL_STAGE = { explore: 's0', match: 's1', find: 's2', say: 's3', read: 's4a', build: 's4b' };
  const SKILLS = ['explore', 'match', 'find', 'say', 'read', 'build'];

  // Legacy learngame modes are the two-letter exceptions to the prefix convention.
  const LEGACY_SKILL = { 'match-wp': 'find', 'match-ww': 'read', 'match-cc': 'match' };
  // Non-learning event types that must never influence the curriculum math.
  const NON_LEARNING = new Set(['play', 'focus-segment', 'focus', 'tap']);

  // ---- small pure helpers ----
  const uniq = (arr) => [...new Set(arr)];
  const take = (arr, n) => arr.slice(0, Math.max(0, n));
  const dayKey = (ts) => Math.floor(ts / DAY);

  function skillForType(type) {
    if (!type || NON_LEARNING.has(type)) return null;
    if (LEGACY_SKILL[type]) return LEGACY_SKILL[type];
    const prefix = String(type).split('-')[0];
    return SKILLS.includes(prefix) ? prefix : null;
  }

  // Learning events only, normalized (skill + stable key) and sorted oldest→newest.
  function learningEvents(events) {
    return (events || [])
      .filter(e => e && skillForType(e.type))
      .map(e => ({
        ts: Number(e.ts) || 0,
        skill: skillForType(e.type),
        key: e.wordId != null ? e.wordId : e.word,
        correct: e.correct === true,
        assisted: e.assisted === true,
      }))
      .filter(e => e.key != null && e.key !== '')
      .sort((a, b) => a.ts - b.ts);
  }

  // Group a flat, sorted event list into sessions separated by idle gaps.
  function sessionize(evts) {
    const sessions = [];
    let cur = null;
    for (const e of evts) {
      if (!cur || (e.ts - cur.lastTs) > SESSION_GAP) {
        cur = { events: [], lastTs: e.ts };
        sessions.push(cur);
      }
      cur.events.push(e);
      cur.lastTs = e.ts;
    }
    return sessions;
  }

  // Unassisted accuracy over a set of events; null when there is no honest signal.
  function unassistedAccuracy(evts) {
    const un = evts.filter(e => !e.assisted);
    if (!un.length) return null;
    return un.filter(e => e.correct).length / un.length;
  }

  // Replay the Leitner-lite ladder for one word's history at one skill.
  function reviewSchedule(wordEvents) {
    let rung = 0;
    let dueAt = null;
    let lastUnassistedCorrect = null;
    for (const e of wordEvents) {
      if (!e.assisted && e.correct) lastUnassistedCorrect = e.ts;
      if (dueAt == null) {
        if (!e.assisted && e.correct) { rung = 0; dueAt = e.ts + REVIEW_INTERVALS[0]; }
        continue;
      }
      if (e.ts >= dueAt) { // answered while due
        rung = e.correct ? Math.min(rung + 1, REVIEW_INTERVALS.length - 1)
                         : Math.max(rung - 1, 0);
        dueAt = e.ts + REVIEW_INTERVALS[rung];
      }
    }
    return { dueAt, lastUnassistedCorrect };
  }

  // Per-word / per-skill mastery buckets + spaced-review scheduling.
  function mastery(events, now) {
    now = now || Date.now();
    const evts = learningEvents(events);
    const groups = new Map();
    for (const e of evts) {
      const k = e.skill + '|' + e.key;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }

    const records = [];
    const bySkill = {};
    for (const s of SKILLS) bySkill[s] = { solid: [], growing: [], new: [] };

    for (const [k, all] of groups) {
      const sep = k.indexOf('|');
      const skill = k.slice(0, sep);
      const key = k.slice(sep + 1);

      if (skill === 'explore') {
        // Explore is demand-free (no correctness). Tracked only for the S0 gate.
        records.push({
          key, skill, bucket: null, attempts: all.length,
          distinctDays: new Set(all.map(e => dayKey(e.ts))).size,
          reviewDue: null, due: false,
        });
        continue;
      }

      const window = all.slice(-MASTERY_WINDOW);
      const accuracy = window.length ? window.filter(e => e.correct).length / window.length : 0;
      const winUnassistedCorrect = window.filter(e => !e.assisted && e.correct);
      const distinctDays = new Set(winUnassistedCorrect.map(e => dayKey(e.ts))).size;

      let bucket;
      if (accuracy >= SOLID_ACCURACY && winUnassistedCorrect.length >= SOLID_UNASSISTED
          && distinctDays >= SOLID_DISTINCT_DAYS) {
        bucket = 'solid';
      } else if (all.some(e => !e.assisted && e.correct)) {
        bucket = 'growing';
      } else {
        bucket = 'new';
      }

      const { dueAt, lastUnassistedCorrect } = reviewSchedule(all);
      const due = bucket === 'solid' && dueAt != null && now >= dueAt;
      records.push({
        key, skill, bucket, attempts: all.length, accuracy,
        unassistedCorrect: winUnassistedCorrect.length, distinctDays,
        reviewDue: dueAt, lastUnassistedCorrect, due,
      });
      bySkill[skill][bucket].push(key);
    }

    const solidCount = {};
    for (const s of SKILLS) solidCount[s] = bySkill[s].solid.length;

    return {
      now, records, bySkill, solidCount,
      get(skill, key) { return records.find(r => r.skill === skill && r.key === key) || null; },
      dueWords(skill) { return records.filter(r => r.skill === skill && r.due).map(r => r.key); },
      attemptedKeys(skill) { return new Set(records.filter(r => r.skill === skill).map(r => r.key)); },
    };
  }

  // ---- stage placement ----
  function sessionsAtSkill(events, skill) {
    return sessionize(learningEvents(events).filter(e => e.skill === skill));
  }

  function rollingAccuracy(events, skill, nSessions) {
    const last = sessionsAtSkill(events, skill).slice(-nSessions);
    return unassistedAccuracy(last.flatMap(s => s.events));
  }

  function s0Passed(events) {
    const explore = learningEvents(events).filter(e => e.skill === 'explore');
    const days = new Set(explore.map(e => dayKey(e.ts)));
    return explore.length >= S0_ACTIVITIES && days.size >= S0_DISTINCT_DAYS;
  }

  function skillMastered(events, m, skill) {
    if (m.solidCount[skill] < STAGE_SOLID_WORDS) return false;
    const acc = rollingAccuracy(events, skill, SESSIONS_FOR_ACCURACY);
    return acc != null && acc >= STAGE_ACCURACY;
  }

  // passed / unlocked / frontier stages, before the one-per-day clamp.
  function rawStages(events, m) {
    const passed = [];
    if (s0Passed(events)) passed.push('s0');
    if (passed.includes('s0') && skillMastered(events, m, 'match')) passed.push('s1');
    if (passed.includes('s1') && skillMastered(events, m, 'find')) passed.push('s2');
    if (passed.includes('s2') && skillMastered(events, m, 'say')) passed.push('s3');
    if (passed.includes('s3')) { // parallel Read/Build tracks unlock together
      if (skillMastered(events, m, 'read')) passed.push('s4a');
      if (skillMastered(events, m, 'build')) passed.push('s4b');
    }

    const unlocked = ['s0'];
    if (passed.includes('s0')) unlocked.push('s1');
    if (passed.includes('s1')) unlocked.push('s2');
    if (passed.includes('s2')) unlocked.push('s3');
    if (passed.includes('s3')) unlocked.push('s4a', 's4b');
    const frontiers = unlocked.filter(s => !passed.includes(s));
    return { passed, unlocked, frontiers };
  }

  function primaryFrontier(frontiers) {
    if (!frontiers.length) return 's4b'; // whole ladder mastered
    return frontiers.slice().sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))[0];
  }

  // Auto stage with the "never jump more than one stage per day" clamp.
  function autoStage(events, m, now) {
    now = now || (m && m.now) || Date.now();
    const todayIdx = STAGE_ORDER.indexOf(primaryFrontier(rawStages(events, m).frontiers));
    const past = (events || []).filter(e => (Number(e.ts) || 0) < (now - DAY));
    const pastIdx = STAGE_ORDER.indexOf(
      primaryFrontier(rawStages(past, mastery(past, now - DAY)).frontiers));
    return STAGE_ORDER[Math.max(0, Math.min(todayIdx, pastIdx + 1))];
  }

  function stageFor(events, settings, now) {
    settings = settings || {};
    now = now || Date.now();
    const m = mastery(events, now);
    const stages = rawStages(events, m);
    const auto = autoStage(events, m, now);
    const pinned = (settings.curriculumStage && settings.curriculumStage !== 'auto'
      && STAGE_ORDER.includes(settings.curriculumStage)) ? settings.curriculumStage : null;
    const summary = {};
    for (const s of SKILLS) {
      summary[s] = {
        solid: m.bySkill[s].solid.length,
        growing: m.bySkill[s].growing.length,
        started: m.bySkill[s].new.length,
      };
    }
    return {
      auto, pinned, effective: pinned || auto,
      frontiers: stages.frontiers, unlocked: stages.unlocked, passed: stages.passed,
      solidCount: m.solidCount, summary,
    };
  }

  function stageBelow(stage) {
    if (stage === 's4a' || stage === 's4b') return 's3';
    const i = STAGE_ORDER.indexOf(stage);
    return i > 0 ? STAGE_ORDER[i - 1] : null;
  }

  // Snapshot regression check: last-2-session unassisted accuracy below the floor.
  // (The plan's "until two consecutive sessions ≥70%" is stateful; a derived snapshot
  // returns to false on its own once accuracy recovers — same effect, nothing stored.)
  function regressionActive(events, stage, now) {
    const sessions = sessionsAtSkill(events, STAGE_SKILL[stage]);
    if (!sessions.length) return false;
    const acc = unassistedAccuracy(sessions.slice(-2).flatMap(s => s.events));
    return acc != null && acc < REGRESSION_LOW;
  }

  // Build one session's ordered word list (≈70/30 practice/frontier, borrow-down,
  // regression-aware). Deterministic — the consuming screen may shuffle for variety.
  function mixSession(events, options) {
    options = options || {};
    const now = options.now || Date.now();
    const stage = options.stage;
    const rounds = options.rounds || SESSION_ROUNDS;
    const wordIds = (options.words || []).map(w => (w && w.id != null) ? w.id : w);
    const skill = STAGE_SKILL[stage];
    const m = mastery(events, now);

    const practiceFor = (sk) => uniq([
      ...(m.bySkill[sk] ? m.bySkill[sk].growing : []),
      ...m.records.filter(r => r.skill === sk && r.due).map(r => r.key),
    ]);
    const frontierFor = (sk) => {
      const attempted = m.attemptedKeys(sk);
      const trulyNew = wordIds.filter(id => !attempted.has(id));
      const started = m.bySkill[sk] ? m.bySkill[sk].new : [];
      return uniq([...trulyNew, ...started]);
    };

    const regress = regressionActive(events, stage, now);
    const below = stageBelow(stage);

    let practicePool, frontierPool;
    if (regress && below) {
      // Kinder mix: previous-stage material carries the session, frontier is a light touch.
      practicePool = uniq([
        ...(m.bySkill[STAGE_SKILL[below]] ? m.bySkill[STAGE_SKILL[below]].growing : []),
        ...(m.bySkill[STAGE_SKILL[below]] ? m.bySkill[STAGE_SKILL[below]].solid : []),
        ...practiceFor(STAGE_SKILL[below]),
      ]);
      frontierPool = uniq([...practiceFor(skill), ...frontierFor(skill)]);
    } else {
      practicePool = practiceFor(skill);
      frontierPool = frontierFor(skill);
      // Borrow one stage down if this stage cannot fill a session on its own.
      if ((practicePool.length + frontierPool.length) < MIN_POOL && below) {
        practicePool = uniq([...practicePool, ...practiceFor(STAGE_SKILL[below])]);
        frontierPool = uniq([...frontierPool, ...frontierFor(STAGE_SKILL[below])]);
      }
    }

    const practiceCount = Math.round(rounds * PRACTICE_SHARE);
    let picked = uniq([
      ...take(practicePool, practiceCount),
      ...take(frontierPool, rounds - practiceCount),
    ]);
    // Never a dead end: top up from any available material so a session always builds.
    for (const id of uniq([...practicePool, ...frontierPool, ...wordIds])) {
      if (picked.length >= rounds) break;
      if (!picked.includes(id)) picked.push(id);
    }
    return picked.slice(0, rounds);
  }

  root.NuranCurriculum = Object.freeze({
    STAGE_ORDER, STAGE_SKILL, SKILL_STAGE, SKILLS,
    constants: Object.freeze({
      MASTERY_WINDOW, SOLID_ACCURACY, SOLID_UNASSISTED, SOLID_DISTINCT_DAYS,
      REVIEW_INTERVALS: REVIEW_INTERVALS.slice(), SESSION_GAP, SESSIONS_FOR_ACCURACY,
      STAGE_SOLID_WORDS, STAGE_ACCURACY, REGRESSION_LOW, S0_ACTIVITIES, S0_DISTINCT_DAYS,
      SESSION_ROUNDS, PRACTICE_SHARE, MIN_POOL, DAY,
    }),
    skillForType, mastery, stageFor, mixSession, regressionActive, stageBelow,
  });
})(typeof window !== 'undefined' ? window : globalThis);
