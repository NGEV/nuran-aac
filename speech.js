/* Nuran AAC — speech and audio.
   Fallback order (spec 5.4): caregiver recording → bundled/core recording →
   speech synthesis at a slow therapeutic rate → silent visual display.
   Never fail hard. iOS Safari quirks handled: voices load async, first
   utterance is primed from a user gesture. */

(function () {
  'use strict';

  let voices = [];
  let primed = false;
  let currentAudio = null;
  let audioCtx = null;
  let helpTimer = null;
  const voiceListeners = new Set();

  const voiceId = (voice) => voice ? (voice.voiceURI || voice.name || '') : '';
  const languageBase = (lang) => String(lang || 'en-US').split(/[-_]/)[0].toLowerCase();

  function voiceScore(voice, requestedLanguage) {
    const name = String(voice.name || '');
    const uri = String(voice.voiceURI || '');
    const requested = String(requestedLanguage || 'en-US').toLowerCase();
    const lang = String(voice.lang || '').toLowerCase();
    let score = 0;
    if (lang === requested) score += 80;
    else if (languageBase(lang) === languageBase(requested)) score += 50;
    if (voice.localService) score += 60; // Nuran must keep speaking offline.
    if (voice.default) score += 8;
    if (/premium|enhanced|neural|natural|siri/i.test(name + ' ' + uri)) score += 45;
    // Modern Apple voices often do not expose their quality tier through Web Speech.
    if (/\b(ava|zoe|nathan|samantha|evan|allison|susan|tom)\b/i.test(name)) score += 18;
    if (/compact|novelty|bells|bad news|bubbles|cellos|good news|organ|whisper|zarvox/i.test(name)) score -= 100;
    return score;
  }

  function loadVoices() {
    const before = voices.map(voiceId).join('|');
    try {
      voices = window.speechSynthesis ? (speechSynthesis.getVoices() || []) : [];
    } catch (e) { voices = []; }
    const after = voices.map(voiceId).join('|');
    if (before !== after) voiceListeners.forEach(listener => { try { listener(); } catch (e) { /* ignore UI listener */ } });
  }
  if (window.speechSynthesis) {
    loadVoices();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', loadVoices);
    else speechSynthesis.onvoiceschanged = loadVoices;
  }

  function availableVoices(language) {
    if (!voices.length) loadVoices();
    const requested = language || 'en-US';
    const base = languageBase(requested);
    const matching = voices.filter(voice => languageBase(voice.lang) === base);
    const offline = matching.filter(voice => voice.localService);
    const candidates = offline.length ? offline : matching;
    return [...candidates].sort((a, b) =>
      voiceScore(b, requested) - voiceScore(a, requested)
      || String(a.name || '').localeCompare(String(b.name || '')));
  }

  function pickVoice(language, preferredURI) {
    const candidates = availableVoices(language);
    const preferred = String(preferredURI || 'auto');
    if (preferred !== 'auto') {
      const selected = candidates.find(voice => voiceId(voice) === preferred || voice.name === preferred);
      if (selected) return selected;
    }
    return candidates[0] || null;
  }

  function applyVoice(utterance, item, options) {
    const o = options || {};
    const lang = o.lang || item.lang || 'en-US';
    const preference = o.voiceURI
      || (window.NuranVoice && window.NuranVoice.voiceURI)
      || 'auto';
    const voice = pickVoice(lang, preference);
    if (!voice && languageBase(lang) === 'so') return false;
    utterance.lang = voice ? voice.lang : lang;
    if (voice) utterance.voice = voice;
    return true;
  }

  const Speech = {
    /* Call from the first user gesture: unlocks synthesis on iOS Safari. */
    prime() {
      if (primed || !window.speechSynthesis) return;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        speechSynthesis.speak(u);
        loadVoices();
        primed = true;
      } catch (e) { /* fine */ }
    },

    synthAvailable() {
      return !!window.speechSynthesis;
    },

    availableVoices(language) {
      return availableVoices(language || 'en-US');
    },

    bestVoice(language) {
      return pickVoice(language || 'en-US', 'auto');
    },

    selectedVoice(language, preferredURI) {
      return pickVoice(language || 'en-US', preferredURI || 'auto');
    },

    refreshVoices() {
      loadVoices();
    },

    onVoicesChanged(listener) {
      if (typeof listener !== 'function') return () => {};
      voiceListeners.add(listener);
      return () => voiceListeners.delete(listener);
    },

    /* Speak an item. Resolves true if any audio was produced, false if silent fallback. */
    async speakItem(item, opts) {
      const o = opts || {};
      const soundOn = o.soundOn !== false;
      if (!soundOn) return false;

      // 1. caregiver recording stored on the item
      if (item.audioBlob instanceof Blob) {
        const ok = await Speech.playBlob(item.audioBlob).catch(() => false);
        if (ok) return true;
        DB.logError('recorded audio failed for "' + item.label + '", falling back to synthesis');
      }
      // 2. bundled core recording (same mechanism: a blob shipped in seed data, if present)
      if (item.coreAudioBlob instanceof Blob) {
        const ok = await Speech.playBlob(item.coreAudioBlob).catch(() => false);
        if (ok) return true;
      }
      // 3. synthesis at slow rate (optionally in another language)
      if (window.speechSynthesis) {
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(item.speakAs || item.label);
          u.rate = Math.min(10, Math.max(0.1, o.rate || 0.55));
          u.pitch = (window.NuranVoice && window.NuranVoice.pitch) || 1;
          if (!applyVoice(u, item, o)) return false;
          speechSynthesis.speak(u);
          return true;
        } catch (e) { DB.logError('synthesis failed: ' + e.message); }
      }
      // 4. silent visual display — caller shows the calm highlight regardless
      return false;
    },

    /* Resolves when playback ENDS (needed for word-by-word sentence speech). */
    playBlob(blob) {
      return new Promise((resolve, reject) => {
        try {
          if (currentAudio) { currentAudio.pause(); currentAudio = null; }
          const url = URL.createObjectURL(blob);
          const a = new Audio(url);
          currentAudio = a;
          a.onended = () => { URL.revokeObjectURL(url); resolve(true); };
          a.onerror = () => { URL.revokeObjectURL(url); reject(new Error('audio playback failed')); };
          a.play().catch(reject);
        } catch (e) { reject(e); }
      });
    },

    /* Speak one item and wait until it finishes. Same fallback order as speakItem. */
    speakItemAwait(item, opts) {
      const o = opts || {};
      if (o.soundOn === false) return Promise.resolve(false);
      if (item.audioBlob instanceof Blob) {
        return Speech.playBlob(item.audioBlob).catch(() => Speech._synthAwait(item, o));
      }
      return Speech._synthAwait(item, o);
    },

    _synthAwait(item, o) {
      return new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve(false);
        try {
          const u = new SpeechSynthesisUtterance(item.speakAs || item.label);
          u.rate = Math.min(10, Math.max(0.1, o.rate || 0.55));
          u.pitch = (window.NuranVoice && window.NuranVoice.pitch) || 1;
          if (!applyVoice(u, item, o)) return resolve(false);
          const done = () => resolve(true);
          u.onend = done;
          u.onerror = done;
          setTimeout(done, 8000); // safety: never hang the sentence
          speechSynthesis.speak(u);
        } catch (e) { resolve(false); }
      });
    },

    /* Speak a built sentence word by word (recordings and synthesis mix freely). */
    async speakSequence(items, opts) {
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* fine */ }
      for (const it of items) {
        await Speech.speakItemAwait(it, opts);
      }
    },

    /* ---------- Caregiver recorder (MediaRecorder) ---------- */
    recorderSupported() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    },

    async startRecording() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', '']
        .find(m => !m || (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start();
      return {
        stop() {
          return new Promise((resolve) => {
            rec.onstop = () => {
              stream.getTracks().forEach(t => t.stop());
              resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
            };
            rec.stop();
          });
        },
      };
    },

    /* Balloon pop: a quick, satisfying descending blip. */
    pop() {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } catch (e) { /* fine */ }
    },

    /* Single soft tone (piano keys). */
    tone(freq) {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
      } catch (e) { /* silence is fine */ }
    },

    /* Celebration chime; melody length scales with the caregiver's energy setting. */
    chime(level) {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const melodies = {
          quiet:    [[523.25, 0], [659.25, 0.18]],
          cheerful: [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.5]],
          festive:  [[523.25, 0], [659.25, 0.14], [783.99, 0.28], [659.25, 0.42], [783.99, 0.56], [1046.5, 0.72]],
        };
        (melodies[level] || melodies.cheerful).forEach(([f, off]) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0.0001, now + off);
          gain.gain.exponentialRampToValueAtTime(0.20, now + off + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.35);
          osc.connect(gain).connect(audioCtx.destination);
          osc.start(now + off);
          osc.stop(now + off + 0.4);
        });
      } catch (e) { /* silence is fine */ }
    },

    /* ---------- Help alert sound (spec 6.4): loud, distinct, no network.
       Generated with WebAudio so nothing needs to be bundled or loaded. ---------- */
    startHelpAlarm() {
      Speech.stopHelpAlarm();
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const ring = () => {
          const now = audioCtx.currentTime;
          [0, 0.35].forEach((offset, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = i === 0 ? 880 : 660;
            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.6, now + offset + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.35);
          });
        };
        ring();
        helpTimer = setInterval(ring, 1600);
      } catch (e) { DB.logError('help alarm audio failed: ' + e.message); }
    },

    stopHelpAlarm() {
      if (helpTimer) { clearInterval(helpTimer); helpTimer = null; }
    },
  };

  window.Speech = Speech;
})();
