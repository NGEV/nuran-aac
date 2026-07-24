/* Nuran AAC — one settings schema for defaults, validation, and future migrations.
   This module has no DOM or storage dependency and can be tested in isolation. */

(function (root) {
  'use strict';

  const defaults = Object.freeze({
    speechRate: 0.55,
    soundOn: true,
    wordOnly: false,
    pictureDisplay: 'together',
    preferRealPhotos: true,
    sentenceBar: true,
    keyboard: false,
    helpEnabled: false,
    celebration: 'star',
    celebrationLevel: 'cheerful',
    pictureStyle: 'best',
    playNudge: 'off',
    gamesHidden: [],
    contentLang: 'en',
    motionLevel: 'none',
    voicePitch: 1.0,
    voiceURI: 'auto',
    pinned: ['seed-bathroom'],
    mode: 'core',
    density: 4,
    backupReminderDays: 7,
    lastBackupAt: null,
    lastReminderAt: null,
    firstRunDone: false,

    // Talk Anytime: default single button, optional Talk + three-word dock, or off.
    talkAccessMode: 'button',
    talkDockWordIds: ['core-help', 'core-stop', 'seed-bathroom'],
    learnTalkBridge: true,

    // A stable, caregiver-owned language rail on every Talk screen. The order
    // never changes automatically, so a child can build a dependable route.
    dailyLanguageRail: true,
    dailyLanguageWordIds: ['core-help', 'core-more', 'core-stop', 'core-yes', 'core-no', 'core-i', 'core-want', 'seed-bathroom'],

    // Lifetime count of correct Learn-game answers. Only ever grows; never a
    // streak, goal, or comparison — a simple, private, always-positive tally
    // shown to the child as a growing sticker collection.
    stickersEarned: 0,

    // Progressive curriculum (Phase 3). `curriculumStage` is 'auto' (the engine
    // derives the child's stage from her own progress) or a caregiver-pinned
    // stage s0–s4b. learnTodayCount is how many suggested activities the Learn
    // "Today" row offers; unlockCards toggles the calm "a new game opened" note.
    curriculumStage: 'auto',
    learnTodayCount: 3,
    unlockCards: true,
  });

  const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const boolValue = (value, fallback) => typeof value === 'boolean' ? value : fallback;
  const numberValue = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const stringIds = (value, max) => Array.isArray(value)
    ? [...new Set(value.filter(v => typeof v === 'string' && v.length <= 100))].slice(0, max)
    : [];
  const shortString = (value, fallback, max) => typeof value === 'string' && value.length <= max
    ? value : fallback;

  function normalize(input) {
    const out = Object.assign({}, defaults, input || {});
    out.speechRate = numberValue(out.speechRate, 0.35, 1.2, defaults.speechRate);
    out.voicePitch = numberValue(out.voicePitch, 0.5, 1.5, defaults.voicePitch);
    out.density = enumValue(Number(out.density), [4, 6, 9, 12], defaults.density);
    out.backupReminderDays = enumValue(Number(out.backupReminderDays), [3, 7, 14, 30], defaults.backupReminderDays);
    out.celebration = enumValue(out.celebration, ['star', 'rainbow', 'balloons', 'check'], defaults.celebration);
    out.celebrationLevel = enumValue(out.celebrationLevel, ['quiet', 'cheerful', 'festive'], defaults.celebrationLevel);
    // Old visual-mode values all migrate to the complete visual contract:
    // caregiver photo → reviewed real photograph → curated ARASAAC pictogram.
    out.pictureStyle = 'best';
    out.voiceURI = shortString(out.voiceURI, defaults.voiceURI, 300);
    out.playNudge = enumValue(String(out.playNudge), ['off', '15', '20', '30', '45'], defaults.playNudge);
    out.contentLang = enumValue(out.contentLang, ['en', 'ar', 'so'], defaults.contentLang);
    out.motionLevel = enumValue(out.motionLevel, ['none', 'gentle', 'full'], defaults.motionLevel);
    out.talkAccessMode = enumValue(out.talkAccessMode, ['button', 'dock', 'off'], defaults.talkAccessMode);
    out.gamesHidden = stringIds(out.gamesHidden, 20);
    out.pinned = stringIds(out.pinned, 12);
    out.talkDockWordIds = stringIds(out.talkDockWordIds, 3);
    out.dailyLanguageRail = boolValue(out.dailyLanguageRail, defaults.dailyLanguageRail);
    out.dailyLanguageWordIds = stringIds(out.dailyLanguageWordIds, 12);
    out.soundOn = boolValue(out.soundOn, defaults.soundOn);
    const legacyWordOnly = boolValue(out.wordOnly, defaults.wordOnly);
    const hasPictureDisplay = !!(input && Object.prototype.hasOwnProperty.call(input, 'pictureDisplay'));
    out.pictureDisplay = hasPictureDisplay
      ? enumValue(out.pictureDisplay, ['together', 'big', 'words'], defaults.pictureDisplay)
      : (legacyWordOnly ? 'words' : defaults.pictureDisplay);
    out.wordOnly = out.pictureDisplay === 'words';
    out.preferRealPhotos = boolValue(out.preferRealPhotos, defaults.preferRealPhotos);
    out.sentenceBar = boolValue(out.sentenceBar, defaults.sentenceBar);
    out.keyboard = boolValue(out.keyboard, defaults.keyboard);
    out.helpEnabled = boolValue(out.helpEnabled, defaults.helpEnabled);
    out.firstRunDone = boolValue(out.firstRunDone, defaults.firstRunDone);
    out.learnTalkBridge = boolValue(out.learnTalkBridge, defaults.learnTalkBridge);
    out.stickersEarned = Math.max(0, Math.floor(numberValue(out.stickersEarned, 0, 999999, defaults.stickersEarned)));
    out.curriculumStage = enumValue(out.curriculumStage, ['auto', 's0', 's1', 's2', 's3', 's4a', 's4b'], defaults.curriculumStage);
    out.learnTodayCount = enumValue(Number(out.learnTodayCount), [2, 3, 4], defaults.learnTodayCount);
    out.unlockCards = boolValue(out.unlockCards, defaults.unlockCards);
    return out;
  }

  root.NuranSettings = Object.freeze({ defaults, normalize });
})(typeof window !== 'undefined' ? window : globalThis);
