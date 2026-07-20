/* Nuran AAC — application screens and behavior.
   Design rules enforced here (spec Section 4):
   - every target ≥ 44px, generous spacing, no hover/drag/multi-touch for core actions
   - 3-5 choices per screen by default, one primary action per screen
   - calm static feedback by default; caregiver-gated motion; all sound toggleable
   - persistent, predictable navigation with an always-available way back */

(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => $('#app');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let settings = {};
  let currentScreen = 'home';
  let renderToken = 0;
  let modalReturnFocus = null;
  let modalOnDismiss = null;
  let routeCleanups = [];
  /* Object-URL lifecycle: screen HTML is built BEFORE screen() runs, so URLs
     created during that build must not be revoked by the same render. New URLs
     collect in pendingURLs; releaseURLs() revokes the previous screen's URLs
     and promotes the pending ones. */
  let objectURLs = [];
  let pendingURLs = [];
  const GATE_HOLD_MS = 2500;

  function trackURL(u) { pendingURLs.push(u); return u; }
  function releaseURLs() {
    objectURLs.forEach(u => URL.revokeObjectURL(u));
    objectURLs = pendingURLs;
    pendingURLs = [];
  }

  async function loadSettings() {
    const rows = await DB.all('settings');
    const stored = {};
    rows.forEach(r => { stored[r.key] = r.value; });
    settings = window.NuranSettings.normalize(Object.assign({}, Seed.DEFAULT_SETTINGS, stored));
    syncVoiceSettings();
  }
  async function setSetting(key, value) {
    settings[key] = value;
    await DB.setSetting(key, value);
    if (key === 'voicePitch' || key === 'voiceURI') syncVoiceSettings();
  }

  function syncVoiceSettings() {
    window.NuranVoice = {
      pitch: Number(settings.voicePitch) || 1,
      voiceURI: settings.voiceURI || 'auto',
    };
  }

  /* ---------- Tiny UI helpers ---------- */

  function screen(html) {
    routeCleanups.splice(0).forEach(fn => { try { fn(); } catch (e) { DB.logError('screen cleanup failed: ' + e.message); } });
    if (window.NuranActivities) window.NuranActivities.unmount();
    releaseURLs();
    app().innerHTML = html;
    window.scrollTo(0, 0);
    const token = ++renderToken;
    if (settings.talkAccessMode === 'dock' && childRoute(currentScreen)) renderTalkDock(token);
  }

  function onScreenCleanup(fn) {
    if (typeof fn === 'function') routeCleanups.push(fn);
  }

  const L = (n) => (window.Lucide && window.Lucide[n]) ? `<span class="li">${window.Lucide[n]}</span>` : '';

  function topbar(title, backScreen) {
    const talkButton = settings.talkAccessMode === 'button' && childRoute(currentScreen) && currentScreen !== 'talk'
      ? `<button class="btn-talk" data-nav="talk">${L('message-circle')} Talk</button>` : '';
    return `<div class="topbar">
      ${backScreen ? `<button class="btn-back" data-nav="${backScreen}">${L('arrow-left') || '&#8592;'} Back</button>` : '<span class="spacer"></span>'}
      <h1>${esc(title)}</h1>
      ${talkButton}
      <button class="btn-home" data-nav="home">${L('house')} Home</button>
    </div>`;
  }

  function bindNav(root) {
    (root || app()).querySelectorAll('[data-nav]').forEach(b => {
      b.addEventListener('click', () => go(b.dataset.nav));
    });
  }

  /* Press-and-hold (caregiver gate, spec 3.6). Light by design, never a lockout. */
  function longPress(btn, onDone, ms) {
    const hold = ms || GATE_HOLD_MS;
    let timer = null, bar = btn.querySelector('.gate-progress');
    if (!bar) {
      bar = document.createElement('span');
      bar.className = 'gate-progress';
      btn.appendChild(bar);
    }
    let start = 0, raf = 0;
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - start) / hold) * 100);
      bar.style.width = pct + '%';
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    const begin = (e) => {
      e.preventDefault();
      start = Date.now();
      tick();
      timer = setTimeout(() => { cancel(); onDone(); }, hold);
    };
    const cancel = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      cancelAnimationFrame(raf);
      bar.style.width = '0%';
    };
    btn.addEventListener('pointerdown', begin);
    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
    // Keyboard/switch activation has no sustained pointer event. It stays available
    // but deliberate: a confirm step replaces the hold (owner decision 2026-07-19),
    // so a child using switch access or VoiceOver cannot trigger this in one activation.
    btn.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      confirmModal('Caregiver check', '<p>This control is normally held down on purpose. Continue?</p>', 'Continue')
        .then(ok => { if (ok) onDone(); });
    });
  }

  function showModal(html, onDismiss) {
    modalReturnFocus = document.activeElement;
    modalOnDismiss = typeof onDismiss === 'function' ? onDismiss : null;
    $('#modal').innerHTML = html;
    const heading = $('#modal').querySelector('h3');
    if (heading) { heading.id = 'modal-title'; $('#modal').setAttribute('aria-labelledby', 'modal-title'); }
    else $('#modal').removeAttribute('aria-labelledby');
    $('#modal-wrap').classList.add('active');
    $('#modal-wrap').setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      const first = $('#modal').querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (first || $('#modal')).focus();
    });
  }
  function closeModal() {
    $('#modal-wrap').classList.remove('active');
    $('#modal-wrap').setAttribute('aria-hidden', 'true');
    $('#modal').innerHTML = '';
    if (modalReturnFocus && document.contains(modalReturnFocus)) modalReturnFocus.focus();
    modalReturnFocus = null;
    modalOnDismiss = null;
  }
  document.addEventListener('keydown', (e) => {
    if (!$('#modal-wrap').classList.contains('active')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      const onDismiss = modalOnDismiss;
      closeModal();
      if (onDismiss) onDismiss();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = [...$('#modal').querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && !el.hidden);
    if (!focusable.length) { e.preventDefault(); $('#modal').focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  function confirmModal(title, body, confirmLabel) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (answer) => { if (!settled) { settled = true; resolve(answer); } };
      showModal(`<h3>${esc(title)}</h3><div>${body}</div>
        <div class="actions">
          <button id="m-cancel" class="btn-big">Cancel</button>
          <button id="m-ok" class="btn-primary btn-big">${esc(confirmLabel || 'Yes')}</button>
        </div>`, () => finish(false));
      $('#m-cancel').onclick = () => { closeModal(); finish(false); };
      $('#m-ok').onclick = () => { closeModal(); finish(true); };
    });
  }

  function symbolHTML(item) {
    let photoHTML = '';
    if (item.imageBlob instanceof Blob) {
      photoHTML = `<img class="symbol-img symbol-photo" src="${trackURL(URL.createObjectURL(item.imageBlob))}" alt="">`;
    } else if (item.photoBlob instanceof Blob) {
      photoHTML = `<img class="symbol-img symbol-photo" src="${trackURL(URL.createObjectURL(item.photoBlob))}" alt="">`;
    }
    return window.NuranSymbols.html(item, { style: settings.pictureStyle, photoHTML });
  }

  function visualSymbol(label, symbolKey, style) {
    return window.NuranSymbols.html({ label, symbolKey }, { style: style || settings.pictureStyle });
  }

  async function speakAndFeedback(btn, item) {
    Speech.prime();
    btn.classList.add('speaking');
    setTimeout(() => btn.classList.remove('speaking'), 450); // calm static change, no motion
    const live = $('#status-live');
    if (live) live.textContent = 'Speaking ' + (item.label || item.name || 'item');
    DB.logTap(item.id, item.label || item.name);
    await Speech.speakItem(item, { rate: settings.speechRate, soundOn: settings.soundOn });
  }

  /* Resize caregiver photos so storage stays healthy (spec 6.1.5 prevention) */
  function fileToResizedBlob(file, maxDim) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, (maxDim || 600) / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error('image processing failed')), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image could not be read')); };
      img.src = url;
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('image could not be encoded'));
      reader.readAsDataURL(blob);
    });
  }

  /* ---------- Router ---------- */

  const screens = {};
  const CHILD_ROUTES = new Set([
    'people', 'learn', 'learngame', 'learnbreak', 'play', 'paint', 'piano', 'pop',
    'memory', 'floats', 'blocks', 'keyboard', 'visualscene',
  ]);

  function childRoute(name) { return CHILD_ROUTES.has(name); }

  function dockSymbolHTML(word) {
    return symbolHTML(word);
  }

  async function renderTalkDock(token) {
    const ids = Array.isArray(settings.talkDockWordIds) ? settings.talkDockWordIds.slice(0, 3) : [];
    const allWords = await DB.allActive('vocabulary').catch(() => []);
    if (token !== renderToken || currentScreen === 'talk' || !childRoute(currentScreen)) return;
    const words = ids.map(id => allWords.find(w => w.id === id)).filter(Boolean);
    const wrap = document.createElement('nav');
    wrap.className = 'talk-dock';
    wrap.setAttribute('aria-label', 'Talk anytime');
    wrap.innerHTML = `<button class="talk-dock-main" data-dock-talk>${L('message-circle')}<span>Talk</span></button>
      ${words.map(w => `<button class="talk-dock-word tok-${esc(w.colorToken || 'neutral')}" data-dock-word="${esc(w.id)}">
        <span class="dock-sym">${dockSymbolHTML(w)}</span><span>${esc(w.label)}</span></button>`).join('')}`;
    app().appendChild(wrap);
    wrap.querySelector('[data-dock-talk]').onclick = () => go('talk');
    wrap.querySelectorAll('[data-dock-word]').forEach(btn => {
      btn.onclick = () => {
        const word = allWords.find(w => w.id === btn.dataset.dockWord);
        if (word) speakAndFeedback(btn, word);
      };
    });
  }

  function go(name, params) {
    currentScreen = name;
    (screens[name] || screens.home)(params || {});
  }

  /* ---------- Home (spec 4.6: very few, very large) ---------- */

  screens.home = function () {
    const help = settings.helpEnabled === true; // caregiver opt-in (v2 design)
    screen(`
      <div id="help-banner"></div>
      <div class="screen">
        <div class="home-grid home-v2">
          <button class="home-btn talk hero" id="h-talk">${visualSymbol('Talk', '_talk')}<span>Talk</span></button>
          <button class="home-btn people" id="h-people">${visualSymbol('People', '_people')}<span>People</span></button>
          <button class="home-btn learn" id="h-learn">${visualSymbol('Learn', '_learn')}<span>Learn</span></button>
          <button class="home-btn playfun ${help ? '' : 'wide'}" id="h-play">${visualSymbol('Play', '_paint')}<span>Play</span></button>
          ${help ? `<button class="home-btn helpme" id="h-help">${visualSymbol('Help', '_help')}<span>Help</span></button>` : ''}
        </div>
        <div class="home-footer">
          <button class="gate-btn" id="h-gate">Caregiver: press and hold</button>
        </div>
      </div>`);
    $('#h-talk').onclick = () => { Speech.prime(); go('talk'); };
    $('#h-people').onclick = () => { Speech.prime(); go('people'); };
    $('#h-learn').onclick = () => { Speech.prime(); go('learn'); };
    $('#h-play').onclick = () => { Speech.prime(); go('play'); };
    if (help) $('#h-help').onclick = () => triggerHelp();
    longPress($('#h-gate'), () => go('caregiver'));
    refreshHelpBanner();
  };

  /* ---------- Help alert (spec 6.4, offline on-device) ---------- */

  let helpActive = false;
  function triggerHelp() {
    helpActive = true;
    DB.logError('HELP button pressed');
    const ov = $('#help-overlay');
    ov.classList.add('active');
    Speech.startHelpAlarm(); // Help may sound even if the general sound toggle is off (spec 6.4)
    const dismiss = $('#help-dismiss');
    const fresh = dismiss.cloneNode(true);
    dismiss.replaceWith(fresh);
    longPress(fresh, () => {
      Speech.stopHelpAlarm();
      ov.classList.remove('active');
      // persistent banner until a caregiver clears it
      sessionStorage.setItem('helpBanner', String(Date.now()));
      refreshHelpBanner();
    });
  }
  function refreshHelpBanner() {
    const b = $('#help-banner');
    if (!b) return;
    const ts = sessionStorage.getItem('helpBanner');
    if (ts) { // sessionStorage alone: the record must survive an app reload
      b.classList.add('active');
      b.innerHTML = `Help was pressed at ${new Date(Number(ts)).toLocaleTimeString()}.
        <button id="banner-clear" style="margin-left:10px">Clear</button>`;
      $('#banner-clear').onclick = () => {
        sessionStorage.removeItem('helpBanner');
        helpActive = false;
        b.classList.remove('active');
      };
    } else {
      b.classList.remove('active');
    }
  }

  /* ---------- Talk (three modes, spec 3.1) ---------- */

  /* Symbols for the built-in groups; caregiver-made groups fall back to a letter tile.
     Kept as a map so installs made before symbolKey existed still show symbols. */
  const CAT_SYMBOLS = {
    'cat-core': '_talk', 'cat-food': 'apple', 'cat-body': '_body', 'cat-feelings': 'happy',
    'cat-actions': 'go', 'cat-places': 'home', 'cat-play': 'ball', 'cat-phrases': '_star',
  };
  function catSymbolHTML(c) {
    const key = c.symbolKey || CAT_SYMBOLS[c.id];
    return visualSymbol(c.name, key);
  }

  /* Sentence bar: tapped words collect here so a child can combine them
     ("I want cookie") and speak the whole thought with one tap.
     Persists while moving between groups; only Clear empties it. */
  let sentence = [];
  const SENTENCE_MAX = 8;

  function sentenceChipHTML(it) {
    const mini = symbolHTML(it);
    return `<span class="schip">${mini}${esc(it.label)}</span>`;
  }

  function updateSpeakBar() {
    const line = $('#sb-line');
    if (!line) return;
    line.innerHTML = sentence.length
      ? sentence.map(sentenceChipHTML).join('')
      : '<span class="placeholder">Tap words, then tap here to say them together</span>';
  }

  function speakBarHTML() {
    if (settings.sentenceBar === false) return '';
    return `<div class="speak-bar">
      <button class="speak-line" id="sb-line" aria-label="Say the whole sentence"></button>
      <button class="speak-clear" id="sb-save" aria-label="Hold to save this sentence as a button">Save</button>
      <button class="speak-clear" id="sb-clear" aria-label="Clear the sentence">Clear</button>
    </div>`;
  }

  /* Save the current sentence as a single tile in My Phrases (hold-to-save,
     so a stray tap cannot create tiles). Spoken via synthesis as one line. */
  async function savePhrase() {
    if (sentence.length < 2) return; // single words are already tiles; saves need a real sentence
    const label = sentence.map(s => s.label).join(' ').slice(0, 60);
    const existing = await DB.allActive('vocabulary');
    if (!existing.some(w => w.categoryId === 'cat-phrases' && w.label.toLowerCase() === label.toLowerCase())) {
      await DB.save('vocabulary', {
        id: DB.uid(), label, categoryId: 'cat-phrases', custom: true, phrase: true,
        symbolKey: '_star', colorToken: 'people', sortOrder: Date.now(), deleted: false,
      });
    }
    const btn = $('#sb-save');
    if (btn) { btn.textContent = 'Saved'; setTimeout(() => { if ($('#sb-save')) $('#sb-save').textContent = 'Save'; }, 1600); }
  }

  function bindSpeakBar() {
    const line = $('#sb-line');
    if (!line) return;
    updateSpeakBar();
    let speaking = false;
    line.onclick = async () => {
      if (!sentence.length || speaking) return;
      Speech.prime();
      speaking = true;
      line.classList.add('speaking');
      DB.logTap('sentence', sentence.map(s => s.label).join(' '));
      await Speech.speakSequence(sentence, { rate: settings.speechRate, soundOn: settings.soundOn });
      line.classList.remove('speaking');
      speaking = false;
    };
    $('#sb-clear').onclick = () => { sentence = []; updateSpeakBar(); };
    if ($('#sb-save')) longPress($('#sb-save'), savePhrase, 1500);
  }

  /* Talk: core words open first (fastest communication), and a persistent
     symbol strip of every group — plus People — is always one tap away.
     Modes never gate the child's navigation; they can reach everything independently. */
  screens.talk = async function (params) {
    const allWords = await DB.allActive('vocabulary');
    const cats = (await DB.allActive('categories')).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const visualScene = (await DB.allActive('visualScenes'))[0] || null;
    const usable = cats.filter(c => allWords.some(w => w.categoryId === c.id)); // no empty dead ends
    const cat = cats.find(c => c.id === (params.categoryId || 'cat-core')) || usable[0]
      || { id: 'none', name: 'Talk', colorToken: 'neutral' };
    const words = allWords
      .filter(w => w.categoryId === cat.id)
      .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt));
    const per = Number(settings.density) || 4;
    const pages = Math.max(1, Math.ceil(words.length / per));
    const highlightIndex = params.highlightId ? words.findIndex(w => w.id === params.highlightId) : -1;
    const requestedPage = params.page != null ? Number(params.page) : (highlightIndex >= 0 ? Math.floor(highlightIndex / per) : 0);
    const page = Math.min(Math.max(0, requestedPage || 0), pages - 1);
    const slice = words.slice(page * per, page * per + per);
    const wordOnly = !!settings.wordOnly;
    const dClass = per <= 4 ? 'd4' : per <= 6 ? 'd6' : per <= 9 ? 'd9' : 'd12';

    const strip = `<div class="group-strip" role="navigation" aria-label="word groups">
      ${usable.map(c => `<button class="group-chip tok-${esc(c.colorToken)} ${c.id === cat.id ? 'current' : ''}"
          data-goto="${esc(c.id)}" ${c.id === cat.id ? 'aria-current="true"' : ''}>
          <span class="gsym">${catSymbolHTML(c)}</span><span class="glbl">${esc(c.name)}</span>
        </button>`).join('')}
      <button class="group-chip tok-people" data-goto="__people">
        <span class="gsym">${visualSymbol('People', '_people')}</span><span class="glbl">People</span>
      </button>
      ${visualScene ? `<button class="group-chip tok-place" data-goto="__scene" aria-label="${esc(visualScene.title)}">
        <span class="gsym">${visualSymbol('Home', 'home')}</span><span class="glbl">${esc(visualScene.title.length > 14 ? visualScene.title.slice(0, 13) + '…' : visualScene.title)}</span>
      </button>` : ''}
      ${settings.keyboard ? `<button class="group-chip tok-neutral" data-goto="__keyboard">
        <span class="gsym">${window.NuranSymbols.html({ label: 'A' }, { style: 'symbols' })}</span><span class="glbl">Keyboard</span>
      </button>` : ''}
    </div>`;

    /* Pinned row: caregiver-chosen words (Bathroom by default) visible on every Talk page */
    const pinnedIds = Array.isArray(settings.pinned) ? settings.pinned : [];
    const pinnedWords = pinnedIds.map(id => allWords.find(w => w.id === id)).filter(Boolean);
    const pinnedRow = pinnedWords.length ? `<div class="pinned-row">
      ${pinnedWords.map(w => `<button class="pin-tile tok-${esc(w.colorToken || 'describe')}" data-pword="${esc(w.id)}">
        <span class="psym">${symbolHTML(w)}</span><span class="plbl">${esc(w.label)}</span></button>`).join('')}
    </div>` : '';

    screen(`${topbar(cat.name || 'Talk', null)}
      <div class="screen">
        ${speakBarHTML()}
        ${strip}
        ${(!allWords.some(w => w.categoryId === 'cat-phrases') && settings.sentenceBar !== false)
          ? '<div class="hint">Tip: hold the Save button to turn a sentence into a button of its own.</div>' : ''}
        ${pinnedRow}
        <div class="tile-grid ${dClass}">
          ${slice.map(w => `
            <button class="tile ${wordOnly ? 'word-only' : ''} ${w.id === params.highlightId ? 'bridge-highlight' : ''} tok-${esc(w.colorToken || cat.colorToken)}" data-word="${esc(w.id)}">
              ${wordOnly ? '' : `<span class="sym">${symbolHTML(w)}</span>`}
              <span class="lbl">${esc(w.label)}</span>
            </button>`).join('') ||
            '<div class="notice">No words here yet. A caregiver can add some in the caregiver area.</div>'}
        </div>
        ${pages > 1 ? `<div class="pager">
          <button id="pg-prev" aria-label="Previous words" ${page === 0 ? 'disabled' : ''}>&#8592;</button>
          <span class="count">${page + 1} of ${pages}</span>
          <button id="pg-next" aria-label="More words" ${page >= pages - 1 ? 'disabled' : ''}>More &#8594;</button>
        </div>` : ''}
      </div>`);
    bindNav();
    app().querySelectorAll('[data-goto]').forEach(b => {
      b.onclick = () => b.dataset.goto === '__people' ? go('people')
        : b.dataset.goto === '__scene' ? go('visualscene')
        : b.dataset.goto === '__keyboard' ? go('keyboard')
        : go('talk', { categoryId: b.dataset.goto });
    });
    bindSpeakBar();
    app().querySelectorAll('[data-pword]').forEach(b => {
      b.onclick = () => {
        const w = allWords.find(x => x.id === b.dataset.pword);
        if (!w) return;
        speakAndFeedback(b, w);
        if (settings.sentenceBar !== false && sentence.length < SENTENCE_MAX) {
          sentence.push({ id: w.id, label: w.label, speakAs: w.speakAs, symbolKey: w.symbolKey, imageBlob: w.imageBlob, audioBlob: w.audioBlob });
          updateSpeakBar();
        }
      };
    });
    const byId = Object.fromEntries(slice.map(w => [w.id, w]));
    app().querySelectorAll('[data-word]').forEach(b => {
      b.onclick = () => {
        const w = byId[b.dataset.word];
        speakAndFeedback(b, w);
        if (settings.sentenceBar !== false && sentence.length < SENTENCE_MAX) {
          sentence.push({ id: w.id, label: w.label, speakAs: w.speakAs, symbolKey: w.symbolKey, imageBlob: w.imageBlob, audioBlob: w.audioBlob });
          updateSpeakBar();
        }
      };
    });
    const highlighted = app().querySelector('.bridge-highlight');
    if (highlighted) {
      const live = $('#status-live');
      if (live) live.textContent = highlighted.textContent.trim() + ' is ready in Talk';
      requestAnimationFrame(() => highlighted.focus({ preventScroll: true }));
    }
    if (pages > 1) {
      const nav = (d) => go('talk', { categoryId: cat.id, page: page + d });
      if ($('#pg-prev')) $('#pg-prev').onclick = () => nav(-1);
      if ($('#pg-next')) $('#pg-next').onclick = () => nav(1);
    }
  };

  /* ---------- Learn: word-to-picture matching (v2.0).
     PECS-style receptive matching. Adaptive: starts at 2 choices, grows to 4
     with a streak (ZPD/scaffolding). Wrong answers dim quietly — no punishment.
     Celebrations stay static unless the caregiver selects Festive and permits motion. ---------- */

  let mg = null;

  const GAME_COLORS = [
    ['red', '#C97B7B'], ['blue', '#7D9CB0'], ['green', '#82A077'], ['yellow', '#C9B878'],
    ['purple', '#9384B5'], ['orange', '#C9986B'], ['pink', '#C98BA6'], ['brown', '#9A7B5F'],
  ];

  function celeKey() {
    return 'cele_' + (['star', 'rainbow', 'balloons', 'check'].includes(settings.celebration) ? settings.celebration : 'star');
  }

  /* Celebration with caregiver-tunable intensity:
     quiet = small card + two notes; cheerful (default) = big card + melody;
     festive = adds gentle floating stars (motion is OPT-IN only, per sensory rules). */
  function showCelebration(word, onNext) {
    let level = ['quiet', 'cheerful', 'festive'].includes(settings.celebrationLevel) ? settings.celebrationLevel : 'cheerful';
    if (level === 'festive' && settings.motionLevel === 'none') level = 'cheerful'; // motion gate
    const ov = document.createElement('div');
    ov.className = 'cele-overlay cele-' + level;
    const floaters = level === 'festive'
      ? `<span class="cele-float f1">${visualSymbol('Star', '_star')}</span>
         <span class="cele-float f2">${visualSymbol('Star', '_star')}</span>
         <span class="cele-float f3">${visualSymbol('Star', '_star')}</span>` : '';
    ov.innerHTML = `${floaters}<div class="cele-card">
      <span class="cs">${visualSymbol(settings.celebration, celeKey())}</span>
      <span class="cele-word">${esc(word.label)}</span>
    </div>`;
    document.body.appendChild(ov);
    if (settings.soundOn) Speech.chime(level);
    Speech.speakItem(word, { rate: settings.speechRate, soundOn: settings.soundOn });
    let completed = false;
    let timerId = null;
    const done = () => {
      if (completed) return;
      completed = true;
      if (timerId) clearTimeout(timerId);
      if (ov.parentNode) ov.remove();
      onNext();
    };
    ov.onclick = done;
    timerId = setTimeout(done, level === 'quiet' ? 1600 : 2200);
  }

  /* ---------- Learn hub: three matching games, one familiar engine ---------- */

  screens.learn = async function () {
    mg = null;
    const activities = window.NuranActivities.list({ family: 'learn', context: settings });
    screen(`${topbar('Learn', null)}
      <div class="screen">
        <div class="tile-grid d6">
          ${activities.map(a => `<button class="tile tok-${esc(a.token)}" data-activity="${esc(a.id)}">
            <span class="sym">${visualSymbol(a.label, a.symbolKey)}</span><span class="lbl">${esc(a.label)}</span></button>`).join('')}
          ${settings.contentLang && settings.contentLang !== 'en' ? `
          <button class="tile tok-people" data-langgame="${esc(settings.contentLang)}">
            <span class="sym">${visualSymbol('Talk', '_talk')}</span><span class="lbl">${settings.contentLang === 'ar' ? 'Arabic' : 'Somali'} words</span></button>` : ''}
        </div>
        <div class="hint" style="text-align:center">Games start easy and grow with your child. Wrong taps never scold — after two tries, the answer gently shows itself.</div>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-activity]').forEach(b => {
      b.onclick = () => {
        const activity = window.NuranActivities.get(b.dataset.activity);
        if (!activity) return;
        Speech.prime();
        go(activity.route, Object.assign({}, activity.params));
      };
    });
    const lg = app().querySelector('[data-langgame]');
    if (lg) lg.onclick = () => { Speech.prime(); go('learngame', { mode: 'wp', lang: lg.dataset.langgame }); };
  };

  /* ---------- Translate & record: caregiver builds another language, word by word.
     Family recordings take priority because device Somali synthesis and pronunciation vary. ---------- */

  screens.langwords = async function (params) {
    const lang = ['ar', 'so'].includes(params.lang) ? params.lang : (settings.contentLang !== 'en' ? settings.contentLang : 'so');
    const words = (await DB.allActive('vocabulary')).filter(w => !w.phrase).sort((a, b) => a.label.localeCompare(b.label));
    const byId = Object.fromEntries(words.map(w => [w.id, w]));
    const done = words.filter(w => w.translations && w.translations[lang] && (w.translations[lang].label || w.translations[lang].audioBlob)).length;
    screen(`${topbar('Translate & record', 'caregiver')}
      <div class="screen">
        <div class="row" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <select id="lw-lang" style="max-width:220px">
            <option value="so" ${lang === 'so' ? 'selected' : ''}>Somali</option>
            <option value="ar" ${lang === 'ar' ? 'selected' : ''}>Arabic</option>
          </select>
          <span class="hint">${done} of ${words.length} words have ${LANG_NAMES[lang]} so far. Type the word, or record your voice, or both.</span>
        </div>
        <div class="list-rows">
          ${words.map(w => {
            const t = (w.translations && w.translations[lang]) || {};
            return `<div class="list-row">
              <div style="min-width:110px"><b>${esc(w.label)}</b></div>
              <input class="lw-in" data-lw="${esc(w.id)}" value="${esc(t.label || '')}" placeholder="${esc(LANG_NAMES[lang])}…" ${lang === 'ar' ? 'dir="rtl"' : ''}>
              <button data-lwrec="${esc(w.id)}" aria-label="record">${L('mic') || '🎙'}</button>
              <button data-lwplay="${esc(w.id)}" aria-label="play" ${t.audioBlob ? '' : 'disabled'}>${L('play') || '&#9654;'}</button>
            </div>`;
          }).join('')}
        </div>
      </div>`);
    bindNav();
    $('#lw-lang').onchange = (e) => go('langwords', { lang: e.target.value });
    const saveT = async (w, patch) => {
      w.translations = w.translations || {};
      w.translations[lang] = Object.assign(w.translations[lang] || {}, patch);
      await DB.save('vocabulary', w);
    };
    app().querySelectorAll('.lw-in').forEach(inp => {
      inp.addEventListener('change', () => saveT(byId[inp.dataset.lw], { label: inp.value.trim() }));
    });
    let activeRec = null;
    app().querySelectorAll('[data-lwrec]').forEach(b => {
      b.onclick = async () => {
        if (activeRec && activeRec.btn === b) {
          const blob = await activeRec.rec.stop();
          await saveT(byId[b.dataset.lwrec], { audioBlob: blob });
          activeRec = null;
          go('langwords', { lang });
          return;
        }
        if (activeRec) return;
        if (!Speech.recorderSupported()) { toast('Recording is not available on this device.'); return; }
        try {
          const rec = await Speech.startRecording();
          activeRec = { rec, btn: b };
          b.innerHTML = L('square') || '■';
        } catch (e) { toast('Microphone could not start. Check permissions.'); }
      };
    });
    app().querySelectorAll('[data-lwplay]').forEach(b => {
      b.onclick = () => {
        const w = byId[b.dataset.lwplay];
        const t = w.translations && w.translations[lang];
        if (t && t.audioBlob) Speech.playBlob(t.audioBlob).catch(() => {});
      };
    });
  };

  const LANG_TAGS = { ar: 'ar-SA', so: 'so' };
  const LANG_NAMES = { ar: 'Arabic', so: 'Somali' };

  screens.learngame = async function (params) {
    const mode = ['wp', 'ww', 'cc'].includes(params.mode) ? params.mode : 'wp';
    const lang = ['ar', 'so'].includes(params.lang) ? params.lang : null;
    if (!mg || mg.mode !== mode || mg.lang !== lang) {
      mg = { mode, lang, round: 1, total: breakActive ? 6 : 8, choices: 2, streak: 0, counts: {} };
    }
    mg.misses = 0;
    const tLabel = (w) => (lang && w.translations && w.translations[lang] && w.translations[lang].label) ? w.translations[lang].label : w.label;
    const tAudio = (w) => (lang && w.translations && w.translations[lang]) ? w.translations[lang].audioBlob : w.audioBlob;

    let pool, target, opts;
    if (mode === 'cc') {
      pool = GAME_COLORS.map(([name, hex]) => ({ id: 'c-' + name, label: name, hex }));
    } else {
      let words = (await DB.allActive('vocabulary'))
        .filter(w => !w.phrase && (window.NuranSymbols.has(w) || w.imageBlob instanceof Blob));
      if (lang) {
        words = words.filter(w => w.translations && w.translations[lang] &&
          (w.translations[lang].label || w.translations[lang].audioBlob instanceof Blob));
      }
      if (words.length < 4) {
        screen(`${topbar('Learn', 'learn')}<div class="screen">
          <div class="notice">${lang
            ? 'No ' + LANG_NAMES[lang] + ' words yet. A caregiver can add them in Translate &amp; record — each word needs a written translation or a recording.'
            : 'Learning games need a few words with pictures first.'}</div></div>`);
        bindNav();
        return;
      }
      pool = words;
    }
    pool = [...pool];
    target = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    opts = [target];
    while (opts.length < mg.choices && pool.length) {
      opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    const optHTML = (w) => {
      if (mode === 'cc') return `<span class="mg-swatch" style="background:${w.hex}"></span>`;
      if (mode === 'ww') return `<span class="lbl mg-text">${esc(tLabel(w))}</span>`;
      return `<span class="sym">${symbolHTML(w)}</span>`;
    };
    const promptHTML = mode === 'cc'
      ? `<span class="mg-find">Find:</span> <span class="mg-swatch mg-swatch-sm" style="background:${target.hex}"></span> <span class="mg-word">${esc(target.label)}</span>`
      : `<span class="mg-find">Find:</span> <span class="mg-word">${esc(tLabel(target))}</span>${lang ? ` <span class="hint">(${esc(target.label)})</span>` : ''}`;

    screen(`${topbar('Learn', 'learn')}
      <div class="screen">
        <button class="mg-prompt" id="mg-say" aria-label="Hear it again">${promptHTML}</button>
        <div class="tile-grid ${opts.length <= 2 ? 'd4' : 'd6'} mg-grid">
          ${opts.map(w => `<button class="tile mg-tile" data-opt="${esc(w.id)}" aria-label="${esc(w.label)}">${optHTML(w)}</button>`).join('')}
        </div>
        <div class="pager"><span class="count">${mg.round} of ${mg.total}</span></div>
      </div>`);
    bindNav();
    const speakTarget = () => Speech.speakItem(
      { label: tLabel(target), speakAs: lang ? null : target.speakAs, audioBlob: tAudio ? tAudio(target) : target.audioBlob },
      { rate: settings.speechRate, soundOn: settings.soundOn, lang: lang ? LANG_TAGS[lang] : undefined });
    $('#mg-say').onclick = speakTarget;
    speakTarget();

    app().querySelectorAll('[data-opt]').forEach(b => {
      b.onclick = () => {
        const right = b.dataset.opt === target.id;
        DB.logProgress({ type: 'match-' + mode, wordId: target.id, word: target.label, correct: right, choices: opts.length, assisted: mg.misses >= 2 });
        if (!right) {
          mg.streak = 0;
          mg.misses++;
          b.classList.add('mg-dim');
          if (mg.misses >= 2) {
            // Errorless assist: fade every wrong option so the answer shows itself
            app().querySelectorAll('[data-opt]').forEach(o => {
              if (o.dataset.opt !== target.id) o.classList.add('mg-dim');
            });
            speakTarget();
          }
          return;
        }
        mg.streak++;
        if (mg.streak % 3 === 0 && mg.choices < 4) mg.choices++;
        // Track per-session unassisted practice so the Talk bridge offers the
        // MOST-practiced word of the session, not merely the final round's word.
        if (mode !== 'cc' && mg.misses < 2) {
          const c = mg.counts[target.id] || { id: target.id, label: target.label, categoryId: target.categoryId, n: 0 };
          c.n++;
          mg.counts[target.id] = c;
        }
        const finished = mg.round >= mg.total;
        showCelebration({ label: tLabel(target), audioBlob: tAudio ? tAudio(target) : null, lang: lang ? LANG_TAGS[lang] : undefined }, () => {
          if (finished) {
            const backToPlay = breakActive;
            const practiced = Object.values(mg.counts).sort((a, b) => b.n - a.n)[0] || null;
            const bridgeWord = settings.learnTalkBridge !== false && !backToPlay && !lang && mode !== 'cc'
              ? (practiced || { id: target.id, label: target.label, categoryId: target.categoryId }) : null;
            mg = null;
            if (backToPlay) { breakActive = false; playSec = 0; nudgeWarned = false; }
            screen(`${topbar('Learn', 'learn')}
              <div class="screen" style="justify-content:center;align-items:center;gap:20px">
                <span class="cs-done">${visualSymbol(settings.celebration, celeKey())}</span>
                <div class="cele-word">${backToPlay ? 'Games are back!' : 'All done!'}</div>
                <div class="row" style="display:flex;gap:14px">
                  ${backToPlay ? '<button class="btn-primary btn-big" data-nav="play">Back to games</button>' : `
                  ${bridgeWord ? `<button class="btn-primary btn-big" id="learn-use-talk">Use ${esc(bridgeWord.label)} in Talk</button>` : ''}
                  <button class="${bridgeWord ? '' : 'btn-primary'} btn-big" data-game-again="${mode}">Play again</button>
                  <button class="btn-big" data-nav="learn">More games</button>
                  <button class="btn-big" data-nav="home">Home</button>`}
                </div>
              </div>`);
            bindNav();
            const again = app().querySelector('[data-game-again]');
            if (again) again.onclick = () => go('learngame', { mode, lang });
            if ($('#learn-use-talk')) $('#learn-use-talk').onclick = () => go('talk', {
              categoryId: bridgeWord.categoryId, highlightId: bridgeWord.id,
            });
          } else {
            mg.round++;
            go('learngame', { mode, lang });
          }
        });
      };
    });
  };

  /* ---------- Play: fun, non-educational games ----------
     Caregivers can hide any game (Settings). A caregiver-set play limit
     triggers a First/Then learning break with advance warning and a visible
     countdown (Dettmer et al. 2000; visual-timer transition practice). */

  const PLAY_SCREENS = ['play', 'paint', 'piano', 'pop', 'memory', 'floats', 'blocks'];
  let playSec = 0, nudgeWarned = false, breakActive = false;

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  function nudgeTick() {
    const lim = Number(settings.playNudge);
    if (!lim || isNaN(lim)) { playSec = 0; nudgeWarned = false; return; }
    if (!PLAY_SCREENS.includes(currentScreen) || document.visibilityState !== 'visible') return;
    playSec += 15;
    const limS = lim * 60;
    if (!nudgeWarned && playSec >= limS - 120) {
      nudgeWarned = true;
      toast('Soon: a little learning, then games come back');
    }
    if (playSec >= limS) {
      playSec = 0; nudgeWarned = false; breakActive = true;
      go('learnbreak');
    }
  }

  function balloonSVG(hex) {
    return `<svg viewBox="0 0 96 96" aria-hidden="true"><ellipse cx="48" cy="38" rx="25" ry="31" fill="${hex}" stroke="#4a5a66" stroke-width="4"/><path d="M 44 69 L 52 69 L 48 76 Z" fill="${hex}" stroke="#4a5a66" stroke-width="3"/><path d="M 48 76 Q 44 84 48 92" stroke="#4a5a66" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  }

  screens.play = function () {
    const hidden = Array.isArray(settings.gamesHidden) ? settings.gamesHidden : [];
    const activities = window.NuranActivities.list({ family: 'play', context: settings })
      .filter(a => !hidden.includes(a.id));
    const iconFor = (activity) => activity.icon === 'balloon-pink' ? balloonSVG('#C98BA6')
      : activity.icon === 'balloon-blue' ? balloonSVG('#7D9CB0')
      : visualSymbol(activity.label, activity.symbolKey);
    screen(`${topbar('Play', null)}
      <div class="screen">
        ${activities.length ? `<div class="tile-grid d6">
          ${activities.map(a => `<button class="tile tok-${esc(a.token)}" data-activity="${esc(a.id)}">
            <span class="sym">${iconFor(a)}</span><span class="lbl">${esc(a.label)}</span></button>`).join('')}
        </div>` : '<div class="notice">The games are resting right now. A caregiver can wake them up in Settings.</div>'}
      </div>`);
    bindNav();
    app().querySelectorAll('[data-activity]').forEach(b => {
      b.onclick = () => {
        const activity = window.NuranActivities.get(b.dataset.activity);
        if (!activity) return;
        Speech.prime();
        go(activity.route, Object.assign({}, activity.params));
      };
    });
  };

  /* Balloons: tap to pop. Classic cause-and-effect joy. */
  let popState = null;
  screens.pop = function () {
    if (!popState || popState.every(b => b.popped)) {
      popState = Array.from({ length: 8 }, () => ({
        color: GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)][1], popped: false,
      }));
    }
    screen(`${topbar('Balloons', 'play')}
      <div class="screen">
        <div class="tile-grid d12 pop-grid">
          ${popState.map((b, i) => `<button class="tile pop-tile" data-b="${i}" aria-label="balloon">
            ${b.popped ? `<span class="sym pop-burst">${visualSymbol('Star', '_star')}</span>` : `<span class="sym">${balloonSVG(b.color)}</span>`}
          </button>`).join('')}
        </div>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-b]').forEach(btn => {
      btn.onclick = () => {
        const b = popState[Number(btn.dataset.b)];
        if (b.popped) return;
        b.popped = true;
        if (settings.soundOn) Speech.pop();
        if (popState.every(x => x.popped)) {
          setTimeout(() => { popState = null; go('pop'); }, 700);
        } else {
          go('pop');
        }
      };
    });
  };

  /* Memory: classic pairs. Gently challenging, uses the child's own word pictures. */
  let mem = null;
  screens.memory = async function () {
    if (!mem) {
      const words = (await DB.allActive('vocabulary')).filter(w => window.NuranSymbols.has(w) && !w.phrase);
      const pool = [...words], picks = [];
      while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      const cards = [];
      picks.forEach(w => { cards.push({ w }, { w }); });
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      mem = { cards, up: [], matched: new Set(), busy: false };
    }
    const shown = (i) => mem.matched.has(i) || mem.up.includes(i);
    screen(`${topbar('Memory', 'play')}
      <div class="screen">
        <div class="tile-grid d6">
          ${mem.cards.map((c, i) => `<button class="tile mem-card ${shown(i) ? '' : 'mem-back'}" data-c="${i}" aria-label="card">
            ${shown(i) ? `<span class="sym">${symbolHTML(c.w)}</span>` : '<span class="mem-q">?</span>'}
          </button>`).join('')}
        </div>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-c]').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.c);
        if (mem.busy || shown(i)) return;
        mem.up.push(i);
        if (mem.up.length === 2) {
          const [a, b] = mem.up;
          if (mem.cards[a].w.id === mem.cards[b].w.id) {
            mem.matched.add(a); mem.matched.add(b); mem.up = [];
            DB.logProgress({ type: 'memory', word: mem.cards[a].w.label, correct: true });
            if (settings.soundOn) Speech.chime('quiet');
            if (mem.matched.size === mem.cards.length) {
              const label = 'You did it!';
              showCelebration({ label }, () => { mem = null; go('memory'); });
              return;
            }
          } else {
            mem.busy = true;
            go('memory');
            setTimeout(() => { mem.up = []; mem.busy = false; go('memory'); }, 950);
            return;
          }
        }
        go('memory');
      };
    });
  };

  /* Sky Pop: balloons drift upward; tap to pop. Motion-level gated. */
  screens.floats = function () {
    screen(`${topbar('Sky Pop', 'play')}
      <div class="screen"><canvas id="fl-canvas"></canvas></div>`);
    bindNav();
    const canvas = $('#fl-canvas');
    canvas.width = canvas.parentElement.clientWidth - 4;
    canvas.height = Math.max(360, window.innerHeight - canvas.getBoundingClientRect().top - 30 - (settings.talkAccessMode === 'dock' ? 96 : 0));
    const ctx = canvas.getContext('2d');
    const speed = settings.motionLevel === 'full' ? 1.6 : 0.8;
    const mk = () => ({ x: 30 + Math.random() * (canvas.width - 60), y: canvas.height + 40,
      r: 26 + Math.random() * 14, c: GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)][1] });
    let items = Array.from({ length: 6 }, () => Object.assign(mk(), { y: Math.random() * canvas.height }));
    const draw = () => {
      if (currentScreen !== 'floats') return;
      ctx.fillStyle = '#FFFDF8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      items.forEach(b => {
        b.y -= speed;
        if (b.y < -50) Object.assign(b, mk());
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.8, b.r, 0, 0, Math.PI * 2);
        ctx.fillStyle = b.c; ctx.fill(); ctx.strokeStyle = '#4a5a66'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.quadraticCurveTo(b.x - 4, b.y + b.r + 14, b.x, b.y + b.r + 26); ctx.stroke();
      });
      requestAnimationFrame(draw);
    };
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      items.forEach(b => {
        if (Math.hypot(b.x - x, b.y - y) < b.r + 18) {
          if (settings.soundOn) Speech.pop();
          Object.assign(b, mk());
        }
      });
    });
    requestAnimationFrame(draw);
  };

  /* Blocks: a gentle falling-blocks classic. Tap left/right to steer, middle to drop. */
  screens.blocks = function () {
    screen(`${topbar('Blocks', 'play')}
      <div class="screen"><canvas id="bl-canvas"></canvas>
      <div class="hint" style="text-align:center">Tap the sides to steer. Tap the middle to drop.</div></div>`);
    bindNav();
    const canvas = $('#bl-canvas');
    const COLS = 6, ROWS = 10;
    const availW = canvas.parentElement.clientWidth - 4;
    const availH = Math.max(320, window.innerHeight - canvas.getBoundingClientRect().top - 70 - (settings.talkAccessMode === 'dock' ? 96 : 0));
    const cell = Math.floor(Math.min(availW / COLS, availH / ROWS));
    canvas.width = cell * COLS; canvas.height = cell * ROWS;
    canvas.style.margin = '0 auto';
    const ctx = canvas.getContext('2d');
    let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const SHAPES = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]]];
    let piece = null, timer = null;
    const speed = settings.motionLevel === 'full' ? 550 : 750;
    const newPiece = () => {
      piece = { cells: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        x: 2, y: 0, c: GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)][1] };
      if (collides(piece.x, piece.y)) { // stack reached the top: gentle reset
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        if (settings.soundOn) Speech.chime('quiet');
      }
    };
    const collides = (px, py) => piece.cells.some(([dx, dy]) => {
      const x = px + dx, y = py + dy;
      return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && grid[y][x]);
    });
    const lock = () => {
      piece.cells.forEach(([dx, dy]) => { if (piece.y + dy >= 0) grid[piece.y + dy][piece.x + dx] = piece.c; });
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every(Boolean)) {
          grid.splice(r, 1); grid.unshift(Array(COLS).fill(null));
          if (settings.soundOn) Speech.chime('cheerful');
          r++;
        }
      }
      newPiece();
    };
    const step = () => { if (!collides(piece.x, piece.y + 1)) piece.y++; else lock(); };
    const draw = () => {
      ctx.fillStyle = '#FFFDF8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#EFECE5';
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) { ctx.fillStyle = grid[r][c]; ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4); }
        else ctx.strokeRect(c * cell, r * cell, cell, cell);
      }
      if (piece) {
        ctx.fillStyle = piece.c;
        piece.cells.forEach(([dx, dy]) => ctx.fillRect((piece.x + dx) * cell + 2, (piece.y + dy) * cell + 2, cell - 4, cell - 4));
      }
    };
    newPiece();
    timer = setInterval(() => {
      if (currentScreen !== 'blocks') { clearInterval(timer); return; }
      step(); draw();
    }, speed);
    draw();
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < canvas.width / 3) { if (!collides(piece.x - 1, piece.y)) piece.x--; }
      else if (x > canvas.width * 2 / 3) { if (!collides(piece.x + 1, piece.y)) piece.x++; }
      else { while (!collides(piece.x, piece.y + 1)) piece.y++; lock(); }
      draw();
    });
  };

  /* First/Then learning break with visible countdown (caregiver-configured). */
  let lbTimer = null;
  screens.learnbreak = function () {
    if (lbTimer) clearInterval(lbTimer);
    let secs = 5 * 60;
    screen(`${topbar('Learning time', null)}
      <div class="screen" style="justify-content:center;align-items:center;gap:18px">
        <div class="ft-row">
          <div class="ft-card"><span class="ft-tag">First</span>${visualSymbol('Learn', '_learn')}<span class="lbl">One quick game</span></div>
          <div class="ft-card then"><span class="ft-tag">Then</span>${visualSymbol('Play', '_paint')}<span class="lbl">Games come back</span></div>
        </div>
        <div class="cele-word" id="lb-timer">5:00</div>
        <div class="hint">Games come back when the timer ends — or right after one quick learning game.</div>
        <button class="btn-primary btn-big" id="lb-start">Start</button>
      </div>`);
    bindNav();
    lbTimer = setInterval(() => {
      if (currentScreen !== 'learnbreak') { clearInterval(lbTimer); return; }
      secs--;
      const el = $('#lb-timer');
      if (el) el.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      if (secs <= 0) { clearInterval(lbTimer); breakActive = false; go('play'); }
    }, 1000);
    $('#lb-start').onclick = () => { clearInterval(lbTimer); mg = null; go('learngame', { mode: 'wp' }); };
  };

  screens.paint = function () {
    screen(`${topbar('Paint', 'play')}
      <div class="screen">
        <div class="paint-bar">
          ${GAME_COLORS.map(([name, hex], i) => `<button class="paint-chip ${i === 0 ? 'current' : ''}" data-color="${hex}" aria-label="${esc(name)}" style="background:${hex}"></button>`).join('')}
          <button class="paint-chip paint-eraser" data-color="__erase" aria-label="Eraser"></button>
          <button id="paint-clear" class="speak-clear" style="min-height:52px">Clear</button>
        </div>
        <canvas id="paint-canvas"></canvas>
      </div>`);
    bindNav();
    const canvas = $('#paint-canvas');
    const wrap = canvas.parentElement;
    canvas.width = wrap.clientWidth - 4;
    canvas.height = Math.max(320, window.innerHeight - canvas.getBoundingClientRect().top - 30 - (settings.talkAccessMode === 'dock' ? 96 : 0));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let color = GAME_COLORS[0][1];
    let drawing = false;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener('pointerdown', (e) => {
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.strokeStyle = color === '__erase' ? '#FFFDF8' : color;
      ctx.lineWidth = color === '__erase' ? 34 : 14;
      ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const [x, y] = pos(e);
      ctx.lineTo(x, y); ctx.stroke();
    });
    canvas.addEventListener('pointerup', () => { drawing = false; });
    app().querySelectorAll('[data-color]').forEach(b => {
      b.onclick = () => {
        color = b.dataset.color;
        app().querySelectorAll('.paint-chip').forEach(c => c.classList.remove('current'));
        b.classList.add('current');
      };
    });
    $('#paint-clear').onclick = () => { ctx.fillStyle = '#FFFDF8'; ctx.fillRect(0, 0, canvas.width, canvas.height); };
  };

  screens.piano = function () {
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    screen(`${topbar('Music', 'play')}
      <div class="screen">
        <div class="piano-row">
          ${notes.map((f, i) => `<button class="piano-key" data-note="${f}" aria-label="Note ${i + 1}"
            style="background:${GAME_COLORS[i][1]}22;border-color:${GAME_COLORS[i][1]}"></button>`).join('')}
        </div>
        <div class="hint" style="text-align:center">Tap the keys to make music.</div>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-note]').forEach(b => {
      b.addEventListener('pointerdown', () => {
        if (settings.soundOn) Speech.tone(Number(b.dataset.note));
        b.classList.add('pressed');
        setTimeout(() => b.classList.remove('pressed'), 250);
      });
    });
  };

  /* ---------- Type-to-speak keyboard (literacy bridge; caregiver enables in Settings) ---------- */

  let kbText = '';

  screens.keyboard = async function () {
    if (!settings.keyboard) return go('talk');
    const rows = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ'];
    screen(`${topbar('Keyboard', null)}
      <div class="screen">
        <div class="group-strip">
          <button class="group-chip tok-action" data-nav="talk">
            <span class="gsym">${visualSymbol('Talk', '_talk')}</span><span class="glbl">Back to words</span></button>
        </div>
        <div class="speak-bar">
          <button class="speak-line kb-display" id="kb-line" aria-label="Say what is typed"></button>
          <button class="speak-clear" id="kb-speak" aria-label="Speak">Speak</button>
          <button class="speak-clear" id="kb-clear" aria-label="Clear">Clear</button>
        </div>
        <div class="kb-rows">
          ${rows.map(r => `<div class="kb-row">${[...r].map(ch =>
            `<button class="kb-key" data-key="${ch}">${ch}</button>`).join('')}</div>`).join('')}
          <div class="kb-row">
            <button class="kb-key kb-wide" data-key=" " aria-label="Space">space</button>
            <button class="kb-key" data-key="⌫" aria-label="Delete one letter">&#9003;</button>
          </div>
        </div>
      </div>`);
    bindNav();
    const line = $('#kb-line');
    const refresh = () => {
      line.innerHTML = kbText
        ? `<span class="kb-text">${esc(kbText)}</span>`
        : '<span class="placeholder">Tap letters, then tap Speak</span>';
    };
    refresh();
    app().querySelectorAll('.kb-key').forEach(k => {
      k.onclick = () => {
        const key = k.dataset.key;
        if (key === '⌫') kbText = kbText.slice(0, -1);
        else if (kbText.length < 80) kbText += key === ' ' ? ' ' : key.toLowerCase();
        refresh();
      };
    });
    const speakTyped = async () => {
      const text = kbText.trim();
      if (!text) return;
      Speech.prime();
      line.classList.add('speaking');
      DB.logTap('keyboard', text);
      await Speech.speakItem({ label: text }, { rate: settings.speechRate, soundOn: settings.soundOn });
      setTimeout(() => line.classList.remove('speaking'), 450);
    };
    $('#kb-speak').onclick = speakTyped;
    line.onclick = speakTyped;
    $('#kb-clear').onclick = () => { kbText = ''; refresh(); };
  };

  /* ---------- People (spec 3.3, visual scene style) ---------- */

  screens.people = async function () {
    const people = (await DB.allActive('people')).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    screen(`${topbar('People', 'home')}
      <div class="screen">
        ${speakBarHTML()}
        <div class="group-strip"><button class="group-chip tok-action" data-nav="talk">
          <span class="gsym">${visualSymbol('Talk', '_talk')}</span><span class="glbl">Back to words</span></button></div>
        <div class="tile-grid d4">
          ${people.map(p => `
            <button class="tile person tok-people" data-person="${esc(p.id)}">
              <span class="sym">${symbolHTML(p)}</span>
              <span class="lbl">${esc(p.name)}</span>
            </button>`).join('') ||
            `<div class="notice" style="text-align:center">${visualSymbol('People', '_people')}<br>
             The family belongs here. A caregiver can add photos and voices in a minute — hold the Caregiver button on the home screen, then tap People.</div>`}
        </div>
      </div>`);
    bindNav();
    bindSpeakBar();
    const byId = Object.fromEntries(people.map(p => [p.id, p]));
    app().querySelectorAll('[data-person]').forEach(b => {
      b.onclick = () => {
        const p = byId[b.dataset.person];
        speakAndFeedback(b, Object.assign({ label: p.name }, p));
        if (settings.sentenceBar !== false && sentence.length < SENTENCE_MAX) {
          sentence.push({ id: p.id, label: p.name, imageBlob: p.photoBlob, audioBlob: p.audioBlob });
          updateSpeakBar();
        }
      };
    });
  };

  /* ---------- Onboarding wizard (first run; re-runnable from caregiver area) ---------- */

  const VOICE_PRESETS = [
    ['warm', 'Warm & slow', 0.45, 1.25, 'Higher, gentle, and unhurried'],
    ['clear', 'Clear & friendly', 0.55, 1.0, 'Slow and plain — a good fit for school age'],
    ['calm', 'Calm & steady', 0.5, 0.85, 'Lower and even — often preferred by older kids and young adults'],
  ];

  const voiceId = (voice) => voice ? (voice.voiceURI || voice.name || '') : '';

  function deviceVoiceOptions(selectedURI) {
    const selected = selectedURI || 'auto';
    const voices = Speech.availableVoices('en-US');
    const best = Speech.bestVoice('en-US');
    const automaticLabel = best
      ? `Automatic — ${best.name} (best available)`
      : 'Automatic — best available on this device';
    const known = voices.some(voice => voiceId(voice) === selected);
    return `<option value="auto">${esc(automaticLabel)}</option>
      ${selected !== 'auto' && !known ? `<option value="${esc(selected)}" selected>Saved voice unavailable — using automatic</option>` : ''}
      ${voices.map(voice => `<option value="${esc(voiceId(voice))}" ${voiceId(voice) === selected ? 'selected' : ''}>${esc(voice.name)} — ${esc(voice.lang || 'English')}${voice.localService ? ' · offline' : ''}</option>`).join('')}`;
  }

  function bindDeviceVoiceSelect(select, preview) {
    if (!select) return;
    const refresh = () => {
      const focused = document.activeElement === select;
      select.innerHTML = deviceVoiceOptions(settings.voiceURI);
      select.value = settings.voiceURI || 'auto';
      if (!select.value) select.value = 'auto';
      if (focused) select.focus();
    };
    refresh();
    const stopListening = Speech.onVoicesChanged(refresh);
    onScreenCleanup(stopListening);
    Speech.refreshVoices();
    select.onchange = async () => {
      await setSetting('voiceURI', select.value || 'auto');
      if (preview) {
        Speech.prime();
        Speech.speakItem({ label: 'Hello! I want more water, please.' }, {
          rate: settings.speechRate, soundOn: true, voiceURI: settings.voiceURI,
        });
      }
    };
  }

  screens.welcome = function () {
    screen(`<div class="screen welcome-screen">
      <div class="welcome-brand">
        <div class="welcome-logo">${visualSymbol('Talk', '_talk')}</div>
        <div class="welcome-kicker">Private · offline · family-led</div>
        <h2>Welcome to Nuran</h2>
        <p class="welcome-copy">A welcoming place to communicate, learn, and play—shaped around your child.</p>
      </div>
      <div class="welcome-setup">
        <p>One minute of setup chooses the best available pictures and voice. Caregivers can change every choice later.</p>
        <button class="btn-primary btn-big" id="wz-quick">${settings.firstRunDone ? 'Reset to best defaults — replaces current voice, pictures, motion, and celebration choices' : 'Quick setup — best available voice and pictures, done in one tap'}</button>
        <button class="btn-big" id="wz-custom">Choose settings — voice, pictures, motion, and celebrations</button>
        <p class="welcome-privacy">No account, ads, analytics, or cloud upload.</p>
      </div>
    </div>`);
    $('#wz-quick').onclick = async () => {
      await setSetting('speechRate', 0.55);
      await setSetting('voicePitch', 1.0);
      await setSetting('voiceURI', 'auto');
      await setSetting('motionLevel', 'none');
      await setSetting('celebrationLevel', 'cheerful');
      await setSetting('pictureStyle', 'best');
      await setSetting('firstRunDone', true);
      go('home');
    };
    $('#wz-custom').onclick = () => go('wizvoice');
  };

  screens.wizmotion = function () {
    screen(`${topbar('Setup 3 of 4 — Movement', null)}
      <div class="screen" style="max-width:680px;margin:0 auto">
        <p>How much should things move on screen? Many autistic children find motion overwhelming; some enjoy it. Watch each demo:</p>
        <div class="wz-opts">
          ${[['none', 'Still', 'Moving games stay hidden'], ['gentle', 'Gentle', 'Soft, slow drifting'], ['full', 'Playful', 'Lively bounces']].map(([v, n, d]) => `
            <button class="wz-card ${settings.motionLevel === v ? 'current' : ''}" data-mo="${v}">
              <span class="wz-demo demo-${v}">${visualSymbol('Star', '_star')}</span>
              <b>${n}</b><span class="hint">${d}</span>
            </button>`).join('')}
        </div>
        <button class="btn-primary btn-big" data-nav="wizcele">Next</button>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-mo]').forEach(b => {
      b.onclick = async () => {
        await setSetting('motionLevel', b.dataset.mo);
        app().querySelectorAll('.wz-card').forEach(c => c.classList.remove('current'));
        b.classList.add('current');
      };
    });
  };

  screens.wizcele = function () {
    screen(`${topbar('Setup 4 of 4 — Celebrations', null)}
      <div class="screen" style="max-width:680px;margin:0 auto">
        <p>When a game answer is right, how big should the cheer be?</p>
        <div class="wz-opts">
          ${[['quiet', 'Quiet'], ['cheerful', 'Cheerful'], ['festive', 'Festive']].map(([v, n]) => `
            <button class="wz-card ${settings.celebrationLevel === v ? 'current' : ''}" data-ce="${v}"><b>${n}</b></button>`).join('')}
        </div>
        <div class="row" style="display:flex;gap:12px;align-items:center">
          <span>Picture:</span>
          ${['star', 'rainbow', 'balloons', 'check'].map(v => `
            <button class="wz-mini ${settings.celebration === v ? 'current' : ''}" data-cg="${v}">${visualSymbol(v, 'cele_' + v)}</button>`).join('')}
        </div>
        <button class="btn-big" id="wz-prev">Try it</button>
        <button class="btn-primary btn-big" id="wz-done">Finish</button>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-ce]').forEach(b => { b.onclick = async () => {
      await setSetting('celebrationLevel', b.dataset.ce);
      app().querySelectorAll('[data-ce]').forEach(c => c.classList.remove('current'));
      b.classList.add('current');
    }; });
    app().querySelectorAll('[data-cg]').forEach(b => { b.onclick = async () => {
      await setSetting('celebration', b.dataset.cg);
      app().querySelectorAll('[data-cg]').forEach(c => c.classList.remove('current'));
      b.classList.add('current');
    }; });
    $('#wz-prev').onclick = () => { Speech.prime(); showCelebration({ label: 'wonderful' }, () => {}); };
    $('#wz-done').onclick = async () => {
      await setSetting('firstRunDone', true);
      go('home');
    };
  };

  screens.wizvoice = function () {
    screen(`${topbar('Setup 1 of 4 — Voice', null)}
      <div class="screen" style="max-width:680px;margin:0 auto">
        <p>Choose an actual voice installed on this device. Automatic selects the strongest offline English voice Nuran can identify.</p>
        <label><b>Device voice</b>
          <select id="wz-device-voice"></select>
        </label>
        <p>Then pick its speaking style. Tap each style to hear it:</p>
        <div class="wz-opts wz-col">
          ${VOICE_PRESETS.map(([v, n, r, p, d]) => `
            <button class="wz-card wide ${Math.abs(settings.speechRate - r) < 0.01 && Math.abs(settings.voicePitch - p) < 0.01 ? 'current' : ''}" data-vp="${v}" data-r="${r}" data-p="${p}">
              <b>${n}</b><span class="hint">${d}</span>
            </button>`).join('')}
        </div>
        <div class="hint">Voice names depend on the device. Family recordings always take priority.</div>
        <button class="btn-primary btn-big" data-nav="wizpictures">Next</button>
      </div>`);
    bindNav();
    bindDeviceVoiceSelect($('#wz-device-voice'), true);
    app().querySelectorAll('[data-vp]').forEach(b => {
      b.onclick = async () => {
        await setSetting('speechRate', Number(b.dataset.r));
        await setSetting('voicePitch', Number(b.dataset.p));
        app().querySelectorAll('.wz-card').forEach(c => c.classList.remove('current'));
        b.classList.add('current');
        Speech.prime();
        Speech.speakItem({ label: 'Hello! I want more water, please.' }, {
          rate: Number(b.dataset.r), soundOn: true, voiceURI: settings.voiceURI,
        });
      };
    });
  };

  screens.wizpictures = function () {
    const choices = [
      ['best', 'Best available', 'Family photos when added, then Mulberry, then the complete Nuran set'],
      ['mulberry', 'Mulberry first', 'Use the professional AAC set wherever it has the concept'],
      ['symbols', 'Original Nuran symbols', 'Use the complete calm line-art set throughout'],
    ];
    screen(`${topbar('Setup 2 of 4 — Pictures', null)}
      <div class="screen" style="max-width:760px;margin:0 auto">
        <p>Pictures are always paired with words. Best available is recommended and never leaves a blank tile.</p>
        <div class="wz-opts">
          ${choices.map(([value, name, description]) => `
            <button class="wz-card ${settings.pictureStyle === value ? 'current' : ''}" data-picture-style="${value}">
              <span class="picture-preview">
                ${visualSymbol('water', 'water', value)}${visualSymbol('help', 'help', value)}${visualSymbol('play', 'play', value)}
              </span>
              <b>${name}</b><span class="hint">${description}</span>
            </button>`).join('')}
        </div>
        <button class="btn-primary btn-big" data-nav="wizmotion">Next</button>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-picture-style]').forEach(button => {
      button.onclick = async () => {
        await setSetting('pictureStyle', button.dataset.pictureStyle);
        app().querySelectorAll('[data-picture-style]').forEach(card => card.classList.remove('current'));
        button.classList.add('current');
      };
    });
  };

  /* ---------- Caregiver area ---------- */

  screens.caregiver = async function () {
    await loadSettings();
    const days = Number(settings.backupReminderDays) || 7;
    const last = settings.lastBackupAt;
    const due = !last || (Date.now() - last) > days * 24 * 3600 * 1000;
    screen(`${topbar('Caregiver area', 'home')}
      <div class="screen">
        ${due ? `<div class="notice warn">It has been a while since the last backup.
          A backup keeps everything safe if the iPad is lost or cleared.
          <button data-nav="backup" style="margin-left:8px">Back up now</button></div>` : ''}
        <div class="menu-list">
          <button class="menu-item menu-featured" data-nav="today"><b>${L('sun')}Today</b><span>Backup health, recent words, and useful next actions</span></button>
          <button class="menu-item" data-nav="addword"><b>${L('circle-plus')}Add a word</b><span>New word with photo and speech</span></button>
          <button class="menu-item" data-nav="managewords"><b>${L('list')}Words &amp; groups</b><span>Edit, move, or remove words</span></button>
          <button class="menu-item" data-nav="managepeople"><b>${L('users')}People</b><span>Add family photos and names</span></button>
          <button class="menu-item" data-nav="settingsview"><b>${L('settings')}Settings</b><span>Talk access, voice, motion, layout</span></button>
          <button class="menu-item" data-nav="visualsceneedit"><b>${L('image')}Visual Routine</b><span>Create one family-photo communication scene</span></button>
          <button class="menu-item" data-nav="backup"><b>${L('cloud-upload')}Back up</b><span>Save a copy off this iPad</span></button>
          <button class="menu-item" data-nav="restore"><b>${L('download')}Restore</b><span>Bring data back from a backup</span></button>
          <button class="menu-item" data-nav="recover"><b>${L('undo-2')}Recover deleted</b><span>Bring back items removed in the app</span></button>
          <button class="menu-item" data-nav="progress"><b>${L('chart-line')}Progress</b><span>Words used most, gently tracked</span></button>
          <button class="menu-item" data-nav="langwords"><b>${L('languages')}Translate &amp; record</b><span>Add another language, word by word</span></button>
          <button class="menu-item" data-nav="devicecheck"><b>${L('clipboard-check')}Device check</b><span>Make sure everything works</span></button>
          <button class="menu-item" data-nav="storageview"><b>${L('hard-drive')}Storage</b><span>Space used on this iPad</span></button>
          <button class="menu-item" id="cg-lock"><b>${L('lock')}Lock device to this app</b><span>Keep the device inside Nuran</span></button>
          <button class="menu-item" data-nav="welcome"><b>${L('wand-sparkles')}Setup wizard</b><span>Motion, celebrations, and voice, with demos</span></button>
        </div>
      </div>`);
    bindNav();
    $('#cg-lock').onclick = () => showModal(`<h3>Lock the device to Nuran</h3>
      <p>Both systems have a built-in child lock that keeps the device inside one app:</p>
      <p><b>iPad / iPhone (Guided Access):</b> Settings &#8594; Accessibility &#8594; Guided Access &#8594; turn on and set a passcode. Then open Nuran and triple-click the side (or home) button to lock in. Triple-click and enter the passcode to leave.</p>
      <p><b>Android (App pinning):</b> Settings &#8594; Security &#8594; App pinning &#8594; turn on. Open Nuran, open Recents, tap the app icon, choose Pin.</p>
      <div class="actions"><button id="m-ok2" class="btn-primary">Got it</button></div>`) || ($('#m-ok2').onclick = closeModal);
  };

  /* ---------- Caregiver Today: health and next actions, not analytics ---------- */

  screens.today = async function () {
    await loadSettings();
    const [history, words, people, scenes, progress] = await Promise.all([
      DB.all('history'), DB.allActive('vocabulary'), DB.allActive('people'),
      DB.allActive('visualScenes'), DB.progressEvents({ limit: 500 }),
    ]);
    const recentCutoff = Date.now() - 14 * 24 * 3600 * 1000;
    const counts = new Map();
    history.filter(h => h.ts >= recentCutoff).forEach(h => {
      const key = h.wordId || h.label;
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    const recent = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key]) => {
      const word = words.find(w => w.id === key);
      return word ? word.label : (history.find(h => (h.wordId || h.label) === key) || {}).label;
    }).filter(Boolean);
    const customWords = words.filter(w => w.custom);
    const missingVoice = customWords.filter(w => !(w.audioBlob instanceof Blob)).length;
    const lastBackup = settings.lastBackupAt ? new Date(settings.lastBackupAt) : null;
    const backupDue = !lastBackup || (Date.now() - lastBackup.getTime()) > (Number(settings.backupReminderDays) || 7) * 86400000;

    screen(`${topbar('Today', 'caregiver')}
      <div class="screen today-grid">
        <section class="today-card today-backup ${backupDue ? 'needs-action' : ''}">
          <h2>${L(backupDue ? 'triangle-alert' : 'shield-check')} Backup</h2>
          <p>${lastBackup ? `Last saved ${lastBackup.toLocaleDateString()} at ${lastBackup.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : 'No off-device backup has been made yet.'}</p>
          <button class="${backupDue ? 'btn-primary' : ''}" data-nav="backup">${backupDue ? 'Back up now' : 'View backup'}</button>
        </section>
        <section class="today-card today-recent">
          <h2>${L('message-circle')} Words heard recently</h2>
          <p>${recent.length ? recent.map(esc).join(' · ') : 'Use Talk normally and recent words will appear here.'}</p>
          <button data-nav="progress">Open Progress</button>
        </section>
        <section class="today-card today-voices">
          <h2>${L('mic')} Personal voices</h2>
          <p>${customWords.length ? `${customWords.length - missingVoice} of ${customWords.length} custom words have a family recording.` : 'Add the first personal word and family recording.'}</p>
          <button data-nav="${customWords.length && missingVoice ? 'managewords' : 'addword'}">${customWords.length && missingVoice ? 'Open words &amp; groups' : 'Add a word'}</button>
        </section>
        <section class="today-card today-routine">
          <h2>${L('image')} Visual Routine trial</h2>
          <p>${scenes.length ? `“${esc(scenes[0].title)}” is ready in Talk.` : 'Create one photo scene with up to four familiar words.'}</p>
          <button class="${scenes.length ? '' : 'btn-primary'}" data-nav="${scenes.length ? 'visualscene' : 'visualsceneedit'}">${scenes.length ? 'Open scene' : 'Create the scene'}</button>
        </section>
        <section class="today-card today-learning today-wide">
          <h2>${L('sprout')} Learning</h2>
          <p>${progress.length ? `${progress.length} learning moments are safely stored in the current progress window.` : 'No learning moments recorded yet. Start with one short, familiar game.'}</p>
          <div class="today-actions"><button data-nav="learn">Open Learn</button><button data-nav="settingsview">Review settings</button></div>
        </section>
      </div>`);
    bindNav();
  };

  /* ---------- One-scene Visual Routine trial ---------- */

  screens.visualsceneedit = async function () {
    const existing = (await DB.allActive('visualScenes'))[0] || null;
    const words = (await DB.allActive('vocabulary')).filter(w => !w.phrase)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    let imageDataURL = existing && existing.imageDataURL || null;
    if (!imageDataURL && existing && existing.imageBlob instanceof Blob) {
      imageDataURL = await blobToDataURL(existing.imageBlob);
    }
    const selected = existing && Array.isArray(existing.wordIds) ? existing.wordIds.slice(0, 4) :
      ['seed-water', 'seed-bathroom', 'core-more', 'core-help'].filter(id => words.some(w => w.id === id));
    for (const w of words) { // fill remaining slots without duplicating already-chosen words
      if (selected.length >= 4) break;
      if (!selected.includes(w.id)) selected.push(w.id);
    }
    const optionHTML = (chosen) => words.map(w => `<option value="${esc(w.id)}" ${w.id === chosen ? 'selected' : ''}>${esc(w.label)}</option>`).join('');
    const preview = imageDataURL ? `<img class="scene-edit-preview" src="${esc(imageDataURL)}" alt="Current routine scene photo">` : '';

    screen(`${topbar('Visual Routine trial', 'caregiver')}
      <div class="screen"><div class="form scene-form">
        <div class="notice">This trial creates one family-owned photo scene. It stays on this device and is included in backups.</div>
        <label>Scene name
          <input id="vs-title" maxlength="40" value="${esc(existing && existing.title || '')}" placeholder="For example: Breakfast">
        </label>
        <label>Family photo
          <input id="vs-photo" type="file" accept="image/*">
        </label>
        <div id="vs-photo-status" class="hint">${imageDataURL ? 'A photo is ready. Choose another to replace it.' : 'Choose a photo of one familiar routine or place.'}</div>
        ${preview}
        <fieldset class="settings-section">
          <legend>Four large communication areas</legend>
          <div class="hint">Match each screen corner to a useful word. The first trial keeps positions fixed so they stay predictable.</div>
          ${['Top left', 'Top right', 'Bottom left', 'Bottom right'].map((label, i) => `<label>${label}
            <select class="vs-word" data-slot="${i}">${optionHTML(selected[i])}</select></label>`).join('')}
        </fieldset>
        <div class="row">
          <button id="vs-save" class="btn-primary btn-big">Save visual routine</button>
          ${existing ? '<button id="vs-remove" class="btn-danger">Remove scene</button>' : ''}
        </div>
        <div id="vs-msg"></div>
      </div></div>`);
    bindNav();
    $('#vs-photo').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        imageDataURL = await blobToDataURL(await fileToResizedBlob(file, 1200));
        $('#vs-photo-status').textContent = 'Photo ready. It will be saved only when you tap Save.';
      } catch (err) {
        $('#vs-msg').innerHTML = '<div class="notice warn">That photo could not be prepared. Please choose another.</div>';
      }
    };
    $('#vs-save').onclick = async () => {
      const title = $('#vs-title').value.trim();
      if (!title || !imageDataURL) {
        $('#vs-msg').innerHTML = '<div class="notice warn">Add a scene name and family photo first.</div>';
        return;
      }
      const wordIds = [...app().querySelectorAll('.vs-word')].map(s => s.value).filter(Boolean);
      await DB.save('visualScenes', {
        id: existing ? existing.id : 'visual-scene-primary', title, imageDataURL, wordIds,
        deleted: false, trialVersion: 1,
      });
      go('visualscene');
    };
    if ($('#vs-remove')) $('#vs-remove').onclick = async () => {
      const ok = await confirmModal('Remove this visual routine?', '<p>The scene will be hidden, not permanently erased. It can be recovered from Recover deleted.</p>', 'Remove');
      if (ok) { await DB.softDelete('visualScenes', existing.id); go('today'); }
    };
  };

  screens.visualscene = async function () {
    const scene = (await DB.allActive('visualScenes'))[0];
    if (!scene) { go('visualsceneedit'); return; }
    const allWords = await DB.allActive('vocabulary');
    const words = (scene.wordIds || []).map(id => allWords.find(w => w.id === id)).filter(Boolean).slice(0, 4);
    const sceneSrc = scene.imageDataURL || (scene.imageBlob instanceof Blob ? trackURL(URL.createObjectURL(scene.imageBlob)) : '');
    screen(`${topbar(scene.title, 'talk')}
      <div class="screen visual-scene-screen">
        <div class="visual-scene-frame">
          <img src="${esc(sceneSrc)}" alt="${esc(scene.title)}">
          <div class="visual-hotspots">
            ${words.map((w, i) => `<button class="visual-hotspot slot-${i} tok-${esc(w.colorToken || 'neutral')}" data-scene-word="${esc(w.id)}">${esc(w.label)}</button>`).join('')}
          </div>
        </div>
        <div class="hint" style="text-align:center">Tap a word to say it. Talk remains available above.</div>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-scene-word]').forEach(btn => {
      btn.onclick = () => {
        const word = allWords.find(w => w.id === btn.dataset.sceneWord);
        if (word) speakAndFeedback(btn, word);
      };
    });
  };

  /* ---------- Add / edit word (spec 3.4) ---------- */

  async function wordForm(existing) {
    const cats = (await DB.allActive('categories')).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const draft = existing ? null : await DB.getSetting('draft-addword', null);
    const w = existing || Object.assign({ label: '', categoryId: cats[0] && cats[0].id, imageBlob: null, audioBlob: null }, draft || {});
    let imageBlob = w.imageBlob || null;
    let audioBlob = w.audioBlob || null;

    screen(`${topbar(existing ? 'Edit word' : 'Add a word', existing ? 'managewords' : 'caregiver')}
      <div class="screen"><div class="form">
        <label>Word
          <input id="f-label" maxlength="40" value="${esc(w.label)}" autocomplete="off">
        </label>
        <div id="dup-warn" class="warn-text" style="display:none">This word already exists. You can still save it if you mean a different one.</div>
        <label>Group
          <select id="f-cat">${cats.map(c => `<option value="${esc(c.id)}" ${c.id === w.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        </label>
        <label>Photo (optional)
          <input id="f-photo" type="file" accept="image/*">
        </label>
        <div id="photo-status" class="hint">${imageBlob ? 'A photo is attached. Choosing a new one replaces it.' : 'Without a photo, a simple letter tile is shown.'}</div>
        <div class="row">
          <button id="f-rec" type="button">Record my voice</button>
          <button id="f-rec-play" type="button" style="display:${audioBlob ? 'inline-block' : 'none'}">Play recording</button>
          <button id="f-rec-del" type="button" style="display:${audioBlob ? 'inline-block' : 'none'}">Remove recording</button>
        </div>
        <div class="hint">Without a recording, the iPad speaks the word slowly by itself.</div>
        <div class="row">
          <button id="f-test" type="button">Hear it</button>
          <button id="f-save" class="btn-primary btn-big" type="button">Save word</button>
        </div>
        <div id="f-msg"></div>
      </div></div>`);
    bindNav();

    const saveDraft = async () => {
      if (existing) return;
      await DB.setSetting('draft-addword', {
        label: $('#f-label').value, categoryId: $('#f-cat').value, imageBlob, audioBlob,
      }).catch(() => {});
    };

    $('#f-label').addEventListener('input', async () => {
      saveDraft();
      const val = $('#f-label').value.trim().toLowerCase();
      if (!val) { $('#dup-warn').style.display = 'none'; return; }
      const words = await DB.allActive('vocabulary');
      const dup = words.some(x => x.label.trim().toLowerCase() === val && (!existing || x.id !== existing.id));
      $('#dup-warn').style.display = dup ? 'block' : 'none';
    });
    $('#f-cat').addEventListener('change', saveDraft);

    $('#f-photo').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        imageBlob = await fileToResizedBlob(file, 600);
        $('#photo-status').textContent = 'Photo added.';
        saveDraft();
      } catch (err) {
        $('#photo-status').innerHTML = '<span class="warn-text">That picture could not be used. Try choosing it again, or pick a different one.</span>';
        DB.logError('photo import failed: ' + err.message);
      }
    });

    let recorder = null;
    $('#f-rec').onclick = async () => {
      if (!Speech.recorderSupported()) {
        $('#f-msg').innerHTML = '<div class="notice">Recording is not available on this device, so the iPad will speak the word by itself instead. That works fine.</div>';
        return;
      }
      if (recorder) {
        const blob = await recorder.stop();
        recorder = null;
        audioBlob = blob;
        $('#f-rec').textContent = 'Record my voice';
        $('#f-rec-play').style.display = 'inline-block';
        $('#f-rec-del').style.display = 'inline-block';
        saveDraft();
        return;
      }
      try {
        recorder = await Speech.startRecording();
        $('#f-rec').textContent = 'Stop recording';
      } catch (err) {
        $('#f-msg').innerHTML = '<div class="notice">The microphone could not start. Check that the browser is allowed to use the microphone in iPad Settings.</div>';
        DB.logError('recorder failed: ' + err.message);
      }
    };
    $('#f-rec-play').onclick = () => { if (audioBlob) Speech.playBlob(audioBlob).catch(() => {}); };
    $('#f-rec-del').onclick = () => {
      audioBlob = null;
      $('#f-rec-play').style.display = 'none';
      $('#f-rec-del').style.display = 'none';
      saveDraft();
    };

    $('#f-test').onclick = () => {
      Speech.prime();
      Speech.speakItem({ label: $('#f-label').value || 'hello', audioBlob }, { rate: settings.speechRate, soundOn: true });
    };

    $('#f-save').onclick = async () => {
      const label = $('#f-label').value.trim();
      if (!label) {
        $('#f-msg').innerHTML = '<div class="notice">Please type the word first.</div>';
        return;
      }
      const rec = existing || { id: DB.uid(), core: false, custom: true, deleted: false, sortOrder: Date.now() };
      rec.label = label;
      rec.categoryId = $('#f-cat').value;
      rec.imageBlob = imageBlob;
      rec.audioBlob = audioBlob;
      await DB.save('vocabulary', rec);
      if (!existing) await DB.setSetting('draft-addword', null);
      $('#f-msg').innerHTML = `<div class="notice"><span class="ok-text">Saved.</span> "${esc(label)}" is ready to use.
        <button data-nav="${existing ? 'managewords' : 'addword'}" style="margin-left:8px">${existing ? 'Back to list' : 'Add another'}</button></div>`;
      bindNav($('#f-msg'));
      if (!existing) {
        $('#f-label').value = ''; imageBlob = null; audioBlob = null;
        $('#photo-status').textContent = 'Without a photo, a simple letter tile is shown.';
        $('#f-rec-play').style.display = 'none'; $('#f-rec-del').style.display = 'none';
      }
    };
  }

  screens.addword = () => wordForm(null);

  /* ---------- Manage words & categories ---------- */

  screens.managewords = async function (params) {
    const cats = (await DB.allActive('categories')).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const catId = params.categoryId || (cats[0] && cats[0].id);
    const words = (await DB.allActive('vocabulary'))
      .filter(w => w.categoryId === catId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    screen(`${topbar('Words & groups', 'caregiver')}
      <div class="screen">
        <div class="row" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <select id="mw-cat" style="max-width:300px">
            ${cats.map(c => `<option value="${esc(c.id)}" ${c.id === catId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
          <button id="mw-editcats">Edit groups</button>
        </div>
        <div class="list-rows">
          ${words.map(w => {
            const isPinned = (settings.pinned || []).includes(w.id);
            return `<div class="list-row">
              <span class="thumb">${symbolHTML(w)}</span>
              <div class="grow"><b>${esc(w.label)}</b>${w.core ? ' <span class="hint">(core word)</span>' : ''}${isPinned ? ' <span class="hint">📌 pinned</span>' : ''}</div>
              <button data-pin="${esc(w.id)}">${isPinned ? 'Unpin' : 'Pin'}</button>
              <button data-edit="${esc(w.id)}">Edit</button>
              <button class="btn-danger" data-del="${esc(w.id)}">Remove</button>
            </div>`;
          }).join('') || '<div class="notice">No words in this group.</div>'}
        </div>
      </div>`);
    bindNav();
    $('#mw-cat').onchange = (e) => go('managewords', { categoryId: e.target.value });
    $('#mw-editcats').onclick = () => go('managecats');
    app().querySelectorAll('[data-pin]').forEach(b => {
      b.onclick = async () => {
        const pins = Array.isArray(settings.pinned) ? [...settings.pinned] : [];
        const i = pins.indexOf(b.dataset.pin);
        if (i >= 0) pins.splice(i, 1); else pins.push(b.dataset.pin);
        await setSetting('pinned', pins);
        go('managewords', { categoryId: catId });
      };
    });
    app().querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = async () => wordForm(await DB.get('vocabulary', b.dataset.edit));
    });
    app().querySelectorAll('[data-del]').forEach(b => {
      b.onclick = async () => {
        const w = await DB.get('vocabulary', b.dataset.del);
        const ok = await confirmModal('Remove this word?',
          `<p>"${esc(w.label)}" will be hidden from the app. It is not gone forever — you can bring it back any time from <b>Recover deleted</b>.</p>`, 'Remove');
        if (ok) { await DB.softDelete('vocabulary', w.id); go('managewords', { categoryId: catId }); }
      };
    });
  };

  screens.managecats = async function () {
    const cats = (await DB.allActive('categories')).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    screen(`${topbar('Groups', 'managewords')}
      <div class="screen">
        <div class="list-rows">
          ${cats.map((c, i) => `<div class="list-row">
            <div class="grow"><b>${esc(c.name)}</b></div>
            <button data-up="${esc(c.id)}" ${i === 0 ? 'disabled' : ''}>&#8593;</button>
            <button data-down="${esc(c.id)}" ${i === cats.length - 1 ? 'disabled' : ''}>&#8595;</button>
            <button data-ren="${esc(c.id)}">Rename</button>
            <button class="btn-danger" data-hide="${esc(c.id)}">Hide</button>
          </div>`).join('')}
        </div>
        <div class="form"><div class="row">
          <input id="nc-name" placeholder="New group name" maxlength="30" style="max-width:280px">
          <button id="nc-add" class="btn-primary">Add group</button>
        </div></div>
      </div>`);
    bindNav();
    const reorder = async (id, delta) => {
      const idx = cats.findIndex(c => c.id === id);
      const other = cats[idx + delta];
      if (!other) return;
      const a = cats[idx].sortOrder || idx, b = other.sortOrder || (idx + delta);
      cats[idx].sortOrder = b; other.sortOrder = a;
      await DB.save('categories', cats[idx]); await DB.save('categories', other);
      go('managecats');
    };
    app().querySelectorAll('[data-up]').forEach(b => b.onclick = () => reorder(b.dataset.up, -1));
    app().querySelectorAll('[data-down]').forEach(b => b.onclick = () => reorder(b.dataset.down, 1));
    app().querySelectorAll('[data-ren]').forEach(b => {
      b.onclick = async () => {
        const c = cats.find(x => x.id === b.dataset.ren);
        showModal(`<h3>Rename group</h3><input id="rn-val" value="${esc(c.name)}" maxlength="30">
          <div class="actions"><button id="rn-cancel">Cancel</button><button id="rn-ok" class="btn-primary">Save</button></div>`);
        $('#rn-cancel').onclick = closeModal;
        $('#rn-ok').onclick = async () => {
          const v = $('#rn-val').value.trim();
          if (v) { c.name = v; await DB.save('categories', c); }
          closeModal(); go('managecats');
        };
      };
    });
    app().querySelectorAll('[data-hide]').forEach(b => {
      b.onclick = async () => {
        const c = cats.find(x => x.id === b.dataset.hide);
        const ok = await confirmModal('Hide this group?',
          `<p>"${esc(c.name)}" and its words will be hidden, not deleted. Bring it back any time from <b>Recover deleted</b>.</p>`, 'Hide');
        if (ok) { await DB.softDelete('categories', c.id); go('managecats'); }
      };
    });
    $('#nc-add').onclick = async () => {
      const v = $('#nc-name').value.trim();
      if (!v) return;
      await DB.save('categories', { id: DB.uid(), name: v, colorToken: 'neutral', sortOrder: Date.now(), deleted: false });
      go('managecats');
    };
  };

  /* ---------- People management (spec 3.3) ---------- */

  screens.managepeople = async function () {
    const people = (await DB.allActive('people')).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    screen(`${topbar('People', 'caregiver')}
      <div class="screen">
        <div class="list-rows">
          ${people.map(p => `<div class="list-row">
            <span class="thumb">${symbolHTML(p)}</span>
            <div class="grow"><b>${esc(p.name)}</b> <span class="hint">${esc(p.relationship || '')}</span></div>
            <button data-editp="${esc(p.id)}">Edit</button>
            <button class="btn-danger" data-delp="${esc(p.id)}">Remove</button>
          </div>`).join('') || '<div class="notice">No people yet. Add the family below.</div>'}
        </div>
        <button id="p-add" class="btn-primary btn-big" style="max-width:280px">Add a person</button>
      </div>`);
    bindNav();
    $('#p-add').onclick = () => personForm(null);
    app().querySelectorAll('[data-editp]').forEach(b => {
      b.onclick = async () => personForm(await DB.get('people', b.dataset.editp));
    });
    app().querySelectorAll('[data-delp]').forEach(b => {
      b.onclick = async () => {
        const p = await DB.get('people', b.dataset.delp);
        const ok = await confirmModal('Remove this person?',
          `<p>"${esc(p.name)}" will be hidden, not deleted. Recover any time from <b>Recover deleted</b>.</p>`, 'Remove');
        if (ok) { await DB.softDelete('people', p.id); go('managepeople'); }
      };
    });
  };

  async function personForm(existing) {
    const p = existing || { name: '', relationship: '', photoBlob: null, audioBlob: null };
    let photoBlob = p.photoBlob || null;
    let audioBlob = p.audioBlob || null;
    screen(`${topbar(existing ? 'Edit person' : 'Add a person', 'managepeople')}
      <div class="screen"><div class="form">
        <label>Name <input id="p-name" maxlength="30" value="${esc(p.name)}"></label>
        <label>Who they are (optional) <input id="p-rel" maxlength="30" value="${esc(p.relationship || '')}" placeholder="mom, grandma, brother…"></label>
        <label>Photo <input id="p-photo" type="file" accept="image/*"></label>
        <div id="p-photostatus" class="hint">${photoBlob ? 'A photo is attached.' : 'A real photo of the person works best.'}</div>
        <div class="row">
          <button id="p-rec" type="button">Record their name</button>
          <button id="p-rec-play" type="button" style="display:${audioBlob ? 'inline-block' : 'none'}">Play</button>
        </div>
        <div class="row">
          <button id="p-save" class="btn-primary btn-big" type="button">Save person</button>
        </div>
        <div id="p-msg"></div>
      </div></div>`);
    bindNav();
    $('#p-photo').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try { photoBlob = await fileToResizedBlob(f, 800); $('#p-photostatus').textContent = 'Photo added.'; }
      catch (err) {
        $('#p-photostatus').innerHTML = '<span class="warn-text">That picture could not be used. Please try another one.</span>';
        DB.logError('person photo failed: ' + err.message);
      }
    });
    let recorder = null;
    $('#p-rec').onclick = async () => {
      if (!Speech.recorderSupported()) {
        $('#p-msg').innerHTML = '<div class="notice">Recording is not available; the iPad will speak the name by itself.</div>';
        return;
      }
      if (recorder) {
        audioBlob = await recorder.stop(); recorder = null;
        $('#p-rec').textContent = 'Record their name';
        $('#p-rec-play').style.display = 'inline-block';
        return;
      }
      try { recorder = await Speech.startRecording(); $('#p-rec').textContent = 'Stop recording'; }
      catch (err) {
        $('#p-msg').innerHTML = '<div class="notice">The microphone could not start. Check microphone permission in iPad Settings.</div>';
      }
    };
    $('#p-rec-play').onclick = () => { if (audioBlob) Speech.playBlob(audioBlob).catch(() => {}); };
    $('#p-save').onclick = async () => {
      const name = $('#p-name').value.trim();
      if (!name) { $('#p-msg').innerHTML = '<div class="notice">Please type the name first.</div>'; return; }
      const rec = existing || { id: DB.uid(), deleted: false };
      rec.name = name;
      rec.relationship = $('#p-rel').value.trim();
      rec.photoBlob = photoBlob;
      rec.audioBlob = audioBlob;
      await DB.save('people', rec);
      go('managepeople');
    };
  }

  /* ---------- Settings ---------- */

  screens.settingsview = async function () {
    await loadSettings();
    const words = (await DB.allActive('vocabulary')).filter(w => !w.phrase)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const dockIds = Array.isArray(settings.talkDockWordIds) ? settings.talkDockWordIds : [];
    const wordOptions = (selected) => `<option value="">No quick word</option>${words.map(w =>
      `<option value="${esc(w.id)}" ${w.id === selected ? 'selected' : ''}>${esc(w.label)}</option>`).join('')}`;
    const voiceStyle = Math.abs(settings.speechRate - 0.45) < 0.01 && Math.abs(settings.voicePitch - 1.25) < 0.01 ? 'warm'
      : Math.abs(settings.speechRate - 0.55) < 0.01 && Math.abs(settings.voicePitch - 1) < 0.01 ? 'clear'
      : Math.abs(settings.speechRate - 0.5) < 0.01 && Math.abs(settings.voicePitch - 0.85) < 0.01 ? 'calm' : 'custom';
    const rateChoices = [[0.4, 'Extra slow'], [0.45, 'Very slow (warm style)'], [0.5, 'Calm and slow'], [0.55, 'Slow (recommended)'], [0.8, 'Medium'], [1, 'Normal']];
    const knownRate = rateChoices.some(([rate]) => Math.abs(settings.speechRate - rate) < 0.001);
    const rateOptions = `${knownRate ? '' : `<option value="${settings.speechRate}" selected>Current custom speed (${settings.speechRate.toFixed(2)}×)</option>`}${rateChoices.map(([rate, label]) =>
      `<option value="${rate}" ${Math.abs(settings.speechRate - rate) < 0.001 ? 'selected' : ''}>${label}</option>`).join('')}`;
    const playActivities = window.NuranActivities.list({ family: 'play', context: { motionLevel: 'full' } });
    screen(`${topbar('Settings', 'caregiver')}
      <div class="screen"><div class="settings-layout">
      <section class="settings-section settings-talk">
        <h2>${L('message-circle')} Talk &amp; access</h2>
        <div class="hint">Talk opens with core words. Groups and quick controls keep stable positions.</div>
        <label>Talk Anytime
          <select id="s-talk-access">
            <option value="button" ${settings.talkAccessMode === 'button' ? 'selected' : ''}>Persistent Talk button (default)</option>
            <option value="dock" ${settings.talkAccessMode === 'dock' ? 'selected' : ''}>Custom dock — Talk plus up to 3 quick words</option>
            <option value="off" ${settings.talkAccessMode === 'off' ? 'selected' : ''}>Off — no persistent Talk control</option>
          </select>
        </label>
        <div id="s-dock-editor" class="dock-editor" ${settings.talkAccessMode === 'dock' ? '' : 'hidden'}>
          <div class="hint">Talk always stays first. Choose up to three words; each keeps the same slot.</div>
          ${[0, 1, 2].map(i => `<label>Quick word ${i + 1}<select class="s-dock-word">${wordOptions(dockIds[i])}</select></label>`).join('')}
        </div>
        <label>Sentence bar
          <select id="s-sbar">
            <option value="on" ${settings.sentenceBar !== false ? 'selected' : ''}>Shown — tapped words build a sentence</option>
            <option value="off" ${settings.sentenceBar === false ? 'selected' : ''}>Hidden — words speak one at a time only</option>
          </select>
        </label>
        <label>Help button on the home screen
          <select id="s-help">
            <option value="off" ${!settings.helpEnabled ? 'selected' : ''}>Hidden (default)</option>
            <option value="on" ${settings.helpEnabled ? 'selected' : ''}>Shown — loud alarm to call a caregiver</option>
          </select>
        </label>
        <label>Keyboard (type to speak)
          <select id="s-kb">
            <option value="off" ${!settings.keyboard ? 'selected' : ''}>Hidden — until letters are useful</option>
            <option value="on" ${settings.keyboard ? 'selected' : ''}>Shown in the Talk group strip</option>
          </select>
        </label>
        <label>Talk tiles
          <select id="s-wordonly">
            <option value="no" ${!settings.wordOnly ? 'selected' : ''}>Picture and word together</option>
            <option value="yes" ${settings.wordOnly ? 'selected' : ''}>Word only (reading practice)</option>
          </select>
        </label>
        <label>Buttons per Talk screen
          <select id="s-density">
            ${[4, 6, 9, 12].map(n => `<option value="${n}" ${Number(settings.density) === n ? 'selected' : ''}>${n}${n === 4 ? ' (recommended)' : ''}</option>`).join('')}
          </select>
        </label>
      </section>

      <section class="settings-section settings-voice">
        <h2>${L('volume-2')} Voice &amp; sound</h2>
        <label>Device voice
          <select id="s-device-voice"></select>
        </label>
        <div class="hint">Automatic chooses the strongest offline English voice Nuran can identify. To add choices on iPad, install voices in Settings → Accessibility → Spoken Content → Voices.</div>
        <label>Speaking style
          <select id="s-voice-style">
            <option value="warm" ${voiceStyle === 'warm' ? 'selected' : ''}>Warm &amp; slow</option>
            <option value="clear" ${voiceStyle === 'clear' ? 'selected' : ''}>Clear &amp; friendly</option>
            <option value="calm" ${voiceStyle === 'calm' ? 'selected' : ''}>Calm &amp; steady</option>
            <option value="custom" ${voiceStyle === 'custom' ? 'selected' : ''}>Custom speed and current pitch</option>
          </select>
        </label>
        <div class="hint">Speaking styles adjust the selected voice's speed and pitch; they are not replacement voices. A family recording still takes priority.</div>
        <label>Speaking speed
          <select id="s-rate">
            ${rateOptions}
          </select>
        </label>
        <div class="row"><button id="s-test">Hear a sample</button></div>
        <label>Sound
          <select id="s-sound">
            <option value="on" ${settings.soundOn ? 'selected' : ''}>On</option>
            <option value="off" ${!settings.soundOn ? 'selected' : ''}>Off (quiet mode)</option>
          </select>
        </label>
      </section>

      <section class="settings-section settings-pictures">
        <h2>${L('image')} Pictures &amp; language</h2>
        <label>Pictures on buttons
          <select id="s-pic">
            <option value="best" ${settings.pictureStyle === 'best' ? 'selected' : ''}>Best available — family photos, then Mulberry (default)</option>
            <option value="mulberry" ${settings.pictureStyle === 'mulberry' ? 'selected' : ''}>Mulberry first — professional AAC picture set</option>
            <option value="symbols" ${settings.pictureStyle === 'symbols' ? 'selected' : ''}>Original Nuran symbols — complete calm line-art set</option>
          </select>
        </label>
        <label>Learning language
          <select id="s-clang">
            <option value="en" ${settings.contentLang === 'en' ? 'selected' : ''}>English only</option>
            <option value="ar" ${settings.contentLang === 'ar' ? 'selected' : ''}>Add Arabic — a tile appears in Learn</option>
            <option value="so" ${settings.contentLang === 'so' ? 'selected' : ''}>Add Somali — a tile appears in Learn</option>
          </select>
        </label>
        <div class="hint">Controls stay in English. Add translations and recordings from Translate &amp; record.</div>
      </section>

      <section class="settings-section settings-learn">
        <h2>${L('gamepad-2')} Learn &amp; Play</h2>
        <label>After a Learn session
          <select id="s-bridge">
            <option value="on" ${settings.learnTalkBridge !== false ? 'selected' : ''}>Offer “Use it in Talk” (recommended)</option>
            <option value="off" ${settings.learnTalkBridge === false ? 'selected' : ''}>Show only game choices</option>
          </select>
        </label>
        <label>Play time before a learning break
          <select id="s-nudge">
            ${[['off', 'Off — no limit'], ['15', '15 minutes'], ['20', '20 minutes'], ['30', '30 minutes (recommended)'], ['45', '45 minutes']].map(([v, n]) =>
              `<option value="${v}" ${String(settings.playNudge) === v ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
        <div class="hint">After this much play, a First/Then screen offers one short learning game with a visible countdown, then games come back. A gentle warning appears two minutes before.</div>
        <label>Games shown in Play
          <div class="row" style="display:flex;gap:14px;flex-wrap:wrap">
            ${playActivities.map(a =>
              `<label style="flex-direction:row;gap:6px;align-items:center;font-weight:400">
                <input type="checkbox" class="s-game" data-g="${a.id}" style="width:auto;min-height:24px" ${(settings.gamesHidden || []).includes(a.id) ? '' : 'checked'}> ${esc(a.label)}</label>`).join('')}
          </div>
        </label>
        <div class="hint">Moving games remain hidden when Motion is set to None, even when they are checked here.</div>
      </section>

      <section class="settings-section settings-motion">
        <h2>${L('sparkles')} Motion &amp; celebrations</h2>
        <label>Motion
          <select id="s-motion">
            <option value="none" ${settings.motionLevel === 'none' ? 'selected' : ''}>None — static activities only</option>
            <option value="gentle" ${settings.motionLevel === 'gentle' ? 'selected' : ''}>Gentle — slow movement</option>
            <option value="full" ${settings.motionLevel === 'full' ? 'selected' : ''}>Full — all moving games</option>
          </select>
        </label>
        <label>Game celebration
          <select id="s-cele">
            ${[['star', 'Star'], ['rainbow', 'Rainbow'], ['balloons', 'Balloons'], ['check', 'Quiet check mark']].map(([v, n]) =>
              `<option value="${v}" ${settings.celebration === v ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
        <label>Celebration energy
          <select id="s-celev">
            <option value="quiet" ${settings.celebrationLevel === 'quiet' ? 'selected' : ''}>Quiet — small and brief</option>
            <option value="cheerful" ${settings.celebrationLevel === 'cheerful' ? 'selected' : ''}>Cheerful — bigger, with a melody</option>
            <option value="festive" ${settings.celebrationLevel === 'festive' ? 'selected' : ''}>Festive — floating stars when motion permits</option>
          </select>
        </label>
      </section>

      <section class="settings-section settings-data">
        <h2>${L('database')} Data reminders</h2>
        <label>Backup reminder
          <select id="s-remind">
            ${[3, 7, 14, 30].map(n => `<option value="${n}" ${Number(settings.backupReminderDays) === n ? 'selected' : ''}>Every ${n} days</option>`).join('')}
          </select>
        </label>
      </section>
      <div class="hint">Changes save immediately. Nothing is uploaded.</div>
      </div></div>`);
    bindNav();
    bindDeviceVoiceSelect($('#s-device-voice'), false);
    const dockEditor = $('#s-dock-editor');
    $('#s-talk-access').onchange = async e => {
      await setSetting('talkAccessMode', e.target.value);
      dockEditor.hidden = e.target.value !== 'dock';
    };
    app().querySelectorAll('.s-dock-word').forEach(sel => {
      let previousValue = sel.value;
      sel.onchange = () => {
        const others = [...app().querySelectorAll('.s-dock-word')].filter(s => s !== sel).map(s => s.value);
        if (sel.value && others.includes(sel.value)) {
          // Refuse the attempted duplicate and keep both the visible and persisted
          // slot assignments exactly as they were.
          sel.value = previousValue;
          toast('That word is already in the dock.');
          return;
        }
        previousValue = sel.value;
        const ids = [...app().querySelectorAll('.s-dock-word')].map(s => s.value).filter(Boolean);
        setSetting('talkDockWordIds', ids.slice(0, 3));
      };
    });
    $('#s-sbar').onchange = e => { setSetting('sentenceBar', e.target.value === 'on'); if (e.target.value === 'off') sentence = []; };
    $('#s-kb').onchange = e => setSetting('keyboard', e.target.value === 'on');
    $('#s-help').onchange = e => setSetting('helpEnabled', e.target.value === 'on');
    $('#s-cele').onchange = e => setSetting('celebration', e.target.value);
    $('#s-celev').onchange = e => setSetting('celebrationLevel', e.target.value);
    $('#s-motion').onchange = e => setSetting('motionLevel', e.target.value);
    $('#s-pic').onchange = e => setSetting('pictureStyle', e.target.value);
    $('#s-nudge').onchange = e => { setSetting('playNudge', e.target.value); playSec = 0; nudgeWarned = false; };
    $('#s-clang').onchange = e => setSetting('contentLang', e.target.value);
    $('#s-bridge').onchange = e => setSetting('learnTalkBridge', e.target.value === 'on');
    app().querySelectorAll('.s-game').forEach(cb => {
      cb.onchange = () => {
        const hidden = (settings.gamesHidden || []).filter(g => g !== cb.dataset.g);
        if (!cb.checked) hidden.push(cb.dataset.g);
        setSetting('gamesHidden', hidden);
      };
    });
    $('#s-wordonly').onchange = e => setSetting('wordOnly', e.target.value === 'yes');
    $('#s-density').onchange = e => setSetting('density', Number(e.target.value));
    $('#s-rate').onchange = async e => {
      await setSetting('speechRate', Number(e.target.value));
      $('#s-voice-style').value = 'custom';
    };
    $('#s-sound').onchange = e => setSetting('soundOn', e.target.value === 'on');
    $('#s-remind').onchange = e => setSetting('backupReminderDays', Number(e.target.value));
    $('#s-voice-style').onchange = async e => {
      const preset = {
        warm: [0.45, 1.25], clear: [0.55, 1.0], calm: [0.5, 0.85],
      }[e.target.value];
      if (!preset) return;
      await setSetting('speechRate', preset[0]);
      await setSetting('voicePitch', preset[1]);
      $('#s-rate').value = String(preset[0]);
    };
    $('#s-test').onclick = () => {
      Speech.prime();
      Speech.speakItem({ label: 'I want more water, please' }, {
        rate: Number($('#s-rate').value), soundOn: true, voiceURI: settings.voiceURI,
      });
    };
  };

  /* ---------- Backup / restore (spec 2.3) ---------- */

  screens.backup = async function () {
    await loadSettings();
    const last = settings.lastBackupAt;
    screen(`${topbar('Back up', 'caregiver')}
      <div class="screen"><div class="form">
        <div class="notice">A backup is one file that holds every word, photo, recording, and setting.
        Save it to Files or iCloud Drive, or send it to yourself. If anything ever happens to this iPad,
        that file brings everything back.</div>
        <div class="hint">${last ? 'Last backup: ' + new Date(last).toLocaleString() : 'No backup has been made yet.'}</div>
        <button id="b-run" class="btn-primary btn-big">Make a backup now</button>
        <div id="b-msg"></div>
      </div></div>`);
    bindNav();
    $('#b-run').onclick = async () => {
      $('#b-msg').innerHTML = '<div class="hint">Preparing the backup…</div>';
      try {
        const json = await DB.exportJSON();
        const stamp = new Date().toISOString().slice(0, 10);
        const file = new File([json], `nuran-backup-${stamp}.json`, { type: 'application/json' });
        let shared = false;
        try { shared = await window.NuranPlatform.shareBackup(json, file.name); }
        catch (e) { DB.logError('native share failed: ' + e.message); }
        if (!shared && navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Nuran backup' }); shared = true; }
          catch (e) { if (e && e.name === 'AbortError') { $('#b-msg').innerHTML = ''; return; } }
        }
        if (!shared) {
          const a = document.createElement('a');
          a.href = trackURL(URL.createObjectURL(file));
          a.download = file.name;
          a.click();
        }
        await setSetting('lastBackupAt', Date.now());
        $('#b-msg').innerHTML = '<div class="notice"><span class="ok-text">Backup ready.</span> Keep the file somewhere safe, like iCloud Drive.</div>';
      } catch (e) {
        DB.logError('export failed: ' + e.message);
        $('#b-msg').innerHTML = '<div class="notice warn">The backup could not be made just now. Please try once more. If it keeps failing, free some space on the iPad and try again.</div>';
      }
    };
  };

  screens.restore = async function () {
    const snaps = await DB.listSnapshots();
    screen(`${topbar('Restore', 'caregiver')}
      <div class="screen"><div class="form">
        <div class="notice">Restoring replaces what is in the app with the copy you choose. A safety copy of the
        current data is kept automatically first, so restoring can itself be undone.</div>
        <label>From a backup file
          <input id="r-file" type="file" accept=".json,application/json">
        </label>
        <div id="r-preview"></div>
        <h3 style="margin-top:8px">Or from an automatic snapshot on this iPad</h3>
        <div class="hint">The app quietly saves a snapshot every hour while it is open.</div>
        <div class="list-rows">
          ${snaps.slice(0, 10).map(s => `<div class="list-row">
            <div class="grow">${new Date(s.ts).toLocaleString()} <span class="hint">(${esc(s.type)})</span></div>
            <button data-snap="${s.id}">Restore this</button>
          </div>`).join('') || '<div class="notice">No snapshots yet. They appear after the app has been open for a while.</div>'}
        </div>
      </div></div>`);
    bindNav();
    $('#r-file').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const obj = DB.parseBackup(text);
        const pv = DB.backupPreview(obj);
        $('#r-preview').innerHTML = `<div class="notice">This backup is from <b>${esc(pv.exportedAt ? new Date(pv.exportedAt).toLocaleString() : 'unknown date')}</b>.
          It holds <b>${pv.words}</b> words, <b>${pv.categories}</b> groups, <b>${pv.people}</b> people${pv.scenes ? `, and <b>${pv.scenes}</b> visual routine` : ''}.
          <div style="margin-top:10px"><button id="r-go" class="btn-primary btn-big">Restore from this file</button></div></div>`;
        $('#r-go').onclick = async () => {
          const ok = await confirmModal('Restore now?', '<p>The app will be replaced with this backup. A safety copy of the current data is kept first.</p>', 'Restore');
          if (!ok) return;
          await DB.restoreFromBackup(obj);
          await loadSettings();
          $('#r-preview').innerHTML = '<div class="notice"><span class="ok-text">Done.</span> Everything from the backup is in place.</div>';
        };
      } catch (err) {
        DB.logError('restore parse failed: ' + err.message);
        $('#r-preview').innerHTML = '<div class="notice warn">That file does not look like a Nuran backup. Please choose the file that was made with the Back up button.</div>';
      }
    });
    app().querySelectorAll('[data-snap]').forEach(b => {
      b.onclick = async () => {
        const ok = await confirmModal('Restore this snapshot?', '<p>The app will go back to how it was at that time. A safety copy of the current data is kept first.</p>', 'Restore');
        if (!ok) return;
        try {
          await DB.restoreFromSnapshot(Number(b.dataset.snap));
          await loadSettings();
          go('caregiver');
        } catch (e) {
          DB.logError('snapshot restore failed: ' + e.message);
        }
      };
    });
  };

  /* ---------- Recover deleted (spec 2.3.1) ---------- */

  screens.recover = async function () {
    const [words, cats, people, scenes] = await Promise.all([
      DB.allDeleted('vocabulary'), DB.allDeleted('categories'), DB.allDeleted('people'), DB.allDeleted('visualScenes'),
    ]);
    const row = (store, r, label) => `<div class="list-row">
      <div class="grow"><b>${esc(label)}</b> <span class="hint">removed ${r.deletedAt ? new Date(r.deletedAt).toLocaleDateString() : ''}</span></div>
      <button data-rec="${esc(store)}:${esc(r.id)}">Bring back</button>
    </div>`;
    screen(`${topbar('Recover deleted', 'caregiver')}
      <div class="screen">
        <div class="notice">Nothing in this app is ever truly deleted by everyday use. Anything removed rests here and can come back with one tap.</div>
        <div class="list-rows">
          ${words.map(w => row('vocabulary', w, w.label)).join('')}
          ${cats.map(c => row('categories', c, c.name + ' (group)')).join('')}
          ${people.map(p => row('people', p, p.name + ' (person)')).join('')}
          ${scenes.map(s => row('visualScenes', s, s.title + ' (visual routine)')).join('')}
          ${(!words.length && !cats.length && !people.length && !scenes.length) ? '<div class="notice">Nothing has been removed. All good.</div>' : ''}
        </div>
      </div>`);
    bindNav();
    app().querySelectorAll('[data-rec]').forEach(b => {
      b.onclick = async () => {
        const [store, id] = b.dataset.rec.split(':');
        await DB.restoreDeleted(store, id);
        go('recover');
      };
    });
  };

  /* ---------- Progress (spec 3.5 — gentle, local only) ---------- */

  screens.progress = async function () {
    const rows = await DB.all('history');
    const words = await DB.allActive('vocabulary');
    const counts = {};
    rows.forEach(r => { counts[r.label] = (counts[r.label] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const recent = words.filter(w => w.custom).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);
    screen(`${topbar('Progress', 'caregiver')}
      <div class="screen">
        <div class="notice">This stays on the iPad only. It is a gentle picture of what your child reaches for, not a report card.</div>
        <h3>Words used most</h3>
        <div class="list-rows">
          ${top.map(([label, n]) => `<div class="list-row"><div class="grow"><b>${esc(label)}</b></div><span class="hint">${n} taps</span></div>`).join('') ||
            '<div class="notice">No taps recorded yet.</div>'}
        </div>
        <h3>Recently added words</h3>
        <div class="list-rows">
          ${recent.map(w => `<div class="list-row"><div class="grow"><b>${esc(w.label)}</b></div><span class="hint">${new Date(w.createdAt).toLocaleDateString()}</span></div>`).join('') ||
            '<div class="notice">No custom words added yet.</div>'}
        </div>
      </div>`);
    bindNav();
  };

  /* ---------- Device check (spec 7 on-device VERIFY, made caregiver-friendly) ---------- */

  screens.devicecheck = async function () {
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    const sw = 'serviceWorker' in navigator ? !!(await navigator.serviceWorker.getRegistration()) : false;
    const snaps = await DB.listSnapshots();
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const yn = (b, okText, fixText) => b ? `<span class="ok-text">Yes.</span> ${okText}` : `<span class="warn-text">Not yet.</span> ${fixText}`;
    screen(`${topbar('Device check', 'caregiver')}
      <div class="screen"><div class="form" style="max-width:680px">
        <div class="list-rows">
          <div class="list-row"><div class="grow"><b>1. Added to Home Screen?</b><br>
            ${yn(standalone, 'The app runs like a real app.', 'In Safari, tap the share button, then "Add to Home Screen". This makes the app open full screen and keeps its data safer.')}</div></div>
          <div class="list-row"><div class="grow"><b>2. Storage protected?</b><br>
            ${yn(persisted, 'The iPad has agreed to keep the data safe.', 'This usually turns on by itself after the app has been used a few times and is on the Home Screen.')}</div></div>
          <div class="list-row"><div class="grow"><b>3. Works offline?</b><br>
            ${yn(sw, 'The app is saved on the iPad. Test it: turn on Airplane Mode, close the app fully, and open it again.', 'Offline saving is not confirmed yet. Open the app once with internet, then it saves itself.')}</div></div>
          <div class="list-row"><div class="grow"><b>4. Speech works?</b><br>
            <button id="dc-speak" style="margin-top:6px">Tap to hear a test word</button>
            <span class="hint">You should hear a slow, clear voice. ${Speech.synthAvailable() ? '' : 'This device does not offer built-in speech; recorded words will still play.'}</span></div></div>
          <div class="list-row"><div class="grow"><b>5. Automatic snapshots?</b><br>
            ${yn(snaps.length > 0, snaps.length + ' snapshots are stored on this iPad.', 'Snapshots start after the app has been open a little while.')}</div></div>
          <div class="list-row"><div class="grow"><b>6. Backup tested?</b><br>
            Make one backup and check the file arrives in Files or iCloud Drive. <button data-nav="backup" style="margin-top:6px">Go to Back up</button></div></div>
        </div>
        <button data-nav="errorlog" style="align-self:flex-start">View technical log (for helpers)</button>
      </div></div>`);
    bindNav();
    $('#dc-speak').onclick = () => {
      Speech.prime();
      Speech.speakItem({ label: 'hello, I am ready' }, { rate: settings.speechRate, soundOn: true });
    };
  };

  /* ---------- Storage view (spec 6.1.5) ---------- */

  screens.storageview = async function () {
    const est = await DB.storageEstimate();
    const words = await DB.all('vocabulary');
    const people = await DB.all('people');
    const media = [];
    words.forEach(w => {
      const size = (w.imageBlob ? w.imageBlob.size : 0) + (w.audioBlob ? w.audioBlob.size : 0);
      if (size) media.push({ label: w.label, size });
    });
    people.forEach(p => {
      const size = (p.photoBlob ? p.photoBlob.size : 0) + (p.audioBlob ? p.audioBlob.size : 0);
      if (size) media.push({ label: p.name + ' (person)', size });
    });
    media.sort((a, b) => b.size - a.size);
    const mb = (n) => (n / (1024 * 1024)).toFixed(1) + ' MB';
    const pct = est && est.quota ? Math.round((est.usage / est.quota) * 100) : null;
    screen(`${topbar('Storage', 'caregiver')}
      <div class="screen"><div class="form" style="max-width:680px">
        ${est ? `<div class="notice ${pct !== null && pct > 80 ? 'warn' : ''}">
          The app is using about <b>${mb(est.usage)}</b>${est.quota ? ' of the ' + mb(est.quota) + ' the iPad allows' : ''}${pct !== null ? ' (' + pct + '%)' : ''}.
          ${pct !== null && pct > 80 ? 'Space is getting tight. Make a backup first, then remove photos or recordings that are no longer used.' : 'There is plenty of room.'}
        </div>` : '<div class="notice">This iPad does not report storage numbers, and that is okay.</div>'}
        <h3>Items using the most space</h3>
        <div class="list-rows">
          ${media.slice(0, 10).map(m => `<div class="list-row"><div class="grow"><b>${esc(m.label)}</b></div><span class="hint">${mb(m.size)}</span></div>`).join('') ||
            '<div class="notice">No photos or recordings stored yet.</div>'}
        </div>
        <div class="hint">To free space: open a word or person, and replace or remove its photo or recording. Nothing is ever removed automatically.</div>
      </div></div>`);
    bindNav();
  };

  /* ---------- Error log viewer (spec 6.3 — local only) ---------- */

  screens.errorlog = async function () {
    const rows = (await DB.all('errorLog')).sort((a, b) => b.ts - a.ts).slice(0, 50);
    screen(`${topbar('Technical log', 'devicecheck')}
      <div class="screen">
        <div class="notice">This log never leaves the iPad. It exists so a helper can see what happened if something misbehaves.</div>
        <div class="list-rows">
          ${rows.map(r => `<div class="list-row"><div class="grow"><span class="hint">${new Date(r.ts).toLocaleString()}</span><br>${esc(r.message)}</div></div>`).join('') ||
            '<div class="notice">No technical problems recorded. All good.</div>'}
        </div>
      </div>`);
    bindNav();
  };

  /* ---------- Launch-recovery screen (spec 6.1.1) ---------- */

  screens.launchrecover = async function () {
    const snaps = await DB.listSnapshots();
    screen(`<div class="screen" style="justify-content:center;max-width:640px;margin:0 auto">
      <div class="notice warn"><b>The app's memory looks empty.</b>
      This can happen if the iPad cleared space. Nothing needs to be lost — choose how to continue.</div>
      <div class="list-rows">
        ${snaps.slice(0, 5).map(s => `<div class="list-row">
          <div class="grow">Snapshot from ${new Date(s.ts).toLocaleString()}</div>
          <button data-snap="${s.id}" class="btn-primary">Use this</button></div>`).join('')}
      </div>
      <button id="lr-file" class="btn-big">Restore from a backup file</button>
      <button id="lr-fresh" class="btn-big">Start fresh with the built-in words</button>
    </div>`);
    app().querySelectorAll('[data-snap]').forEach(b => {
      b.onclick = async () => {
        await DB.restoreFromSnapshot(Number(b.dataset.snap));
        await startApp();
      };
    });
    $('#lr-file').onclick = () => go('restore');
    $('#lr-fresh').onclick = async () => { await Seed.seedIfEmpty(); await startApp(); };
  };

  /* ---------- Boot ---------- */

  async function startApp() {
    await loadSettings();
    go(settings.firstRunDone ? 'home' : 'welcome');
  }

  async function init() {
    window.addEventListener('error', (e) => DB.logError('error: ' + (e.message || 'unknown')));
    window.addEventListener('unhandledrejection', (e) => DB.logError('rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))));

    document.addEventListener('pointerdown', function once() {
      Speech.prime();
      document.removeEventListener('pointerdown', once);
    });

    try {
      await DB.open();
      const check = await DB.launchCheck();
      if ((check.empty || check.corrupt) && check.hasSnapshots) {
        // Try the silent mirror first; if that fills things in, continue normally.
        await DB.recoverFromMirror();
        const again = await DB.launchCheck();
        if (again.empty) { go('launchrecover'); DB.requestPersistence(); return; }
      } else if (check.empty) {
        await Seed.seedIfEmpty();
      }
      await Seed.ensureEssentials();    // non-destructive response/sentence-word migrations
      DB.requestPersistence();          // spec 2.3.3
      DB.startSnapshotTimer();          // spec 2.3.2
      setInterval(nudgeTick, 15000);    // play-time learning break (v2.2)
      if (window.NuranPlatform.canRegisterServiceWorker()) {
        navigator.serviceWorker.register('sw.js').catch(e => DB.logError('sw register failed: ' + e.message));
      }
      await startApp();
    } catch (err) {
      // Never a blank screen (spec 2.4): minimal, plain-language fallback.
      DB.logError && DB.logError('boot failed: ' + err.message);
      app().innerHTML = `<div class="screen" style="justify-content:center;max-width:600px;margin:0 auto">
        <div class="notice warn">The app could not start its memory. Please close it fully and open it again.
        If this keeps happening, restart the iPad and try once more. Your backups in Files are safe either way.</div></div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
