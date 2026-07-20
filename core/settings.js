/* Nuran AAC — one settings schema for defaults, validation, and future migrations.
   This module has no DOM or storage dependency and can be tested in isolation. */

(function (root) {
  'use strict';

  const defaults = Object.freeze({
    speechRate: 0.55,
    soundOn: true,
    wordOnly: false,
    sentenceBar: true,
    keyboard: false,
    helpEnabled: false,
    celebration: 'star',
    celebrationLevel: 'cheerful',
    pictureStyle: 'photos',
    playNudge: 'off',
    gamesHidden: [],
    contentLang: 'en',
    motionLevel: 'none',
    voicePitch: 1.0,
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

  function normalize(input) {
    const out = Object.assign({}, defaults, input || {});
    out.speechRate = numberValue(out.speechRate, 0.35, 1.2, defaults.speechRate);
    out.voicePitch = numberValue(out.voicePitch, 0.5, 1.5, defaults.voicePitch);
    out.density = enumValue(Number(out.density), [4, 6, 9, 12], defaults.density);
    out.backupReminderDays = enumValue(Number(out.backupReminderDays), [3, 7, 14, 30], defaults.backupReminderDays);
    out.celebration = enumValue(out.celebration, ['star', 'rainbow', 'balloons', 'check'], defaults.celebration);
    out.celebrationLevel = enumValue(out.celebrationLevel, ['quiet', 'cheerful', 'festive'], defaults.celebrationLevel);
    out.pictureStyle = enumValue(out.pictureStyle, ['photos', 'symbols', 'mulberry'], defaults.pictureStyle);
    out.playNudge = enumValue(String(out.playNudge), ['off', '15', '20', '30', '45'], defaults.playNudge);
    out.contentLang = enumValue(out.contentLang, ['en', 'ar', 'so'], defaults.contentLang);
    out.motionLevel = enumValue(out.motionLevel, ['none', 'gentle', 'full'], defaults.motionLevel);
    out.talkAccessMode = enumValue(out.talkAccessMode, ['button', 'dock', 'off'], defaults.talkAccessMode);
    out.gamesHidden = stringIds(out.gamesHidden, 20);
    out.pinned = stringIds(out.pinned, 12);
    out.talkDockWordIds = stringIds(out.talkDockWordIds, 3);
    out.soundOn = boolValue(out.soundOn, defaults.soundOn);
    out.wordOnly = boolValue(out.wordOnly, defaults.wordOnly);
    out.sentenceBar = boolValue(out.sentenceBar, defaults.sentenceBar);
    out.keyboard = boolValue(out.keyboard, defaults.keyboard);
    out.helpEnabled = boolValue(out.helpEnabled, defaults.helpEnabled);
    out.firstRunDone = boolValue(out.firstRunDone, defaults.firstRunDone);
    out.learnTalkBridge = boolValue(out.learnTalkBridge, defaults.learnTalkBridge);
    return out;
  }

  root.NuranSettings = Object.freeze({ defaults, normalize });
})(typeof window !== 'undefined' ? window : globalThis);
