/* Nuran AAC — application screens and behavior.
   Design rules enforced here (spec Section 4):
   - every target ≥ 44px, generous spacing, no hover/drag/multi-touch for core actions
   - 3-5 choices per screen by default, one primary action per screen
   - no animations; calm static tap feedback; all sound toggleable
   - persistent, predictable navigation with an always-available way back */

(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => $('#app');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let settings = {};
  let objectURLs = [];
  const GATE_HOLD_MS = 2500;

  function trackURL(u) { objectURLs.push(u); return u; }
  function releaseURLs() { objectURLs.forEach(u => URL.revokeObjectURL(u)); objectURLs = []; }

  async function loadSettings() {
    const rows = await DB.all('settings');
    settings = Object.assign({}, Seed.DEFAULT_SETTINGS);
    rows.forEach(r => { settings[r.key] = r.value; });
  }
  async function setSetting(key, value) {
    settings[key] = value;
    await DB.setSetting(key, value);
  }

  /* ---------- Tiny UI helpers ---------- */

  function screen(html) {
    releaseURLs();
    app().innerHTML = html;
    window.scrollTo(0, 0);
  }

  function topbar(title, backScreen) {
    return `<div class="topbar">
      ${backScreen ? `<button class="btn-back" data-nav="${backScreen}">&#8592; Back</button>` : '<span class="spacer"></span>'}
      <h1>${esc(title)}</h1>
      <button class="btn-home" data-nav="home">Home</button>
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
  }

  function showModal(html) {
    $('#modal').innerHTML = html;
    $('#modal-wrap').classList.add('active');
  }
  function closeModal() {
    $('#modal-wrap').classList.remove('active');
    $('#modal').innerHTML = '';
  }
  function confirmModal(title, body, confirmLabel) {
    return new Promise((resolve) => {
      showModal(`<h3>${esc(title)}</h3><div>${body}</div>
        <div class="actions">
          <button id="m-cancel" class="btn-big">Cancel</button>
          <button id="m-ok" class="btn-primary btn-big">${esc(confirmLabel || 'Yes')}</button>
        </div>`);
      $('#m-cancel').onclick = () => { closeModal(); resolve(false); };
      $('#m-ok').onclick = () => { closeModal(); resolve(true); };
    });
  }

  function symbolHTML(item) {
    if (item.imageBlob instanceof Blob) {
      return `<img src="${trackURL(URL.createObjectURL(item.imageBlob))}" alt="">`;
    }
    if (item.photoBlob instanceof Blob) {
      return `<img src="${trackURL(URL.createObjectURL(item.photoBlob))}" alt="">`;
    }
    if (item.symbolKey && Symbols.has(item.symbolKey)) return Symbols.get(item.symbolKey);
    return Symbols.letterTile(item.label || item.name);
  }

  async function speakAndFeedback(btn, item) {
    Speech.prime();
    btn.classList.add('speaking');
    setTimeout(() => btn.classList.remove('speaking'), 450); // calm static change, no motion
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

  /* ---------- Router ---------- */

  const screens = {};
  let currentScreen = 'home';
  function go(name, params) {
    currentScreen = name;
    (screens[name] || screens.home)(params || {});
  }

  /* ---------- Home (spec 4.6: very few, very large) ---------- */

  screens.home = function () {
    screen(`
      <div id="help-banner"></div>
      <div class="screen">
        <div class="home-grid">
          <button class="home-btn talk" id="h-talk">${Symbols.get('_talk')}<span>Talk</span></button>
          <button class="home-btn people" id="h-people">${Symbols.get('_people')}<span>People</span></button>
          <button class="home-btn helpme" id="h-help">${Symbols.get('_help')}<span>Help</span></button>
          <button class="home-btn" id="h-star" style="background:var(--cat-neutral-bg);border-color:var(--cat-neutral-edge)">
            ${Symbols.get('_star')}<span id="star-label"></span></button>
        </div>
        <div class="home-footer">
          <button class="gate-btn" id="h-gate">Grown-ups: press and hold</button>
        </div>
      </div>`);
    $('#h-talk').onclick = () => { Speech.prime(); go('talk'); };
    $('#h-people').onclick = () => { Speech.prime(); go('people'); };
    $('#h-help').onclick = () => triggerHelp();
    // Fourth tile speaks a gentle greeting — keeps the grid balanced and gives a safe "try me" spot
    const star = $('#h-star');
    $('#star-label').textContent = 'Hello';
    star.onclick = () => speakAndFeedback(star, { id: 'greet', label: 'hello' });
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
    if (ts && helpActive) {
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
    'cat-actions': 'go', 'cat-places': 'home', 'cat-play': 'ball',
  };
  function catSymbolHTML(c) {
    const key = c.symbolKey || CAT_SYMBOLS[c.id];
    if (key && Symbols.has(key)) return Symbols.get(key);
    return Symbols.letterTile(c.name);
  }

  /* Sentence bar: tapped words collect here so she can combine them
     ("I want cookie") and speak the whole thought with one tap.
     Persists while moving between groups; only Clear empties it. */
  let sentence = [];
  const SENTENCE_MAX = 8;

  function sentenceChipHTML(it) {
    let mini = '';
    if (it.imageBlob instanceof Blob) mini = `<img src="${trackURL(URL.createObjectURL(it.imageBlob))}" alt="">`;
    else if (it.symbolKey && Symbols.has(it.symbolKey)) mini = Symbols.get(it.symbolKey);
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
      <button class="speak-clear" id="sb-clear" aria-label="Clear the sentence">Clear</button>
    </div>`;
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
  }

  /* Talk: core words open first (fastest communication), and a persistent
     symbol strip of every group — plus People — is always one tap away.
     Modes never gate the child's navigation; she can reach everything herself. */
  screens.talk = async function (params) {
    const allWords = await DB.allActive('vocabulary');
    const cats = (await DB.allActive('categories')).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const usable = cats.filter(c => allWords.some(w => w.categoryId === c.id)); // no empty dead ends
    const cat = cats.find(c => c.id === (params.categoryId || 'cat-core')) || usable[0]
      || { id: 'none', name: 'Talk', colorToken: 'neutral' };
    const words = allWords
      .filter(w => w.categoryId === cat.id)
      .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt));
    const per = Number(settings.density) || 4;
    const pages = Math.max(1, Math.ceil(words.length / per));
    const page = Math.min(Number(params.page) || 0, pages - 1);
    const slice = words.slice(page * per, page * per + per);
    const wordOnly = !!settings.wordOnly;
    const dClass = per <= 4 ? 'd4' : per <= 6 ? 'd6' : per <= 9 ? 'd9' : 'd12';

    const strip = `<div class="group-strip" role="navigation" aria-label="word groups">
      ${usable.map(c => `<button class="group-chip tok-${esc(c.colorToken)} ${c.id === cat.id ? 'current' : ''}"
          data-goto="${esc(c.id)}" ${c.id === cat.id ? 'aria-current="true"' : ''}>
          <span class="gsym">${catSymbolHTML(c)}</span><span class="glbl">${esc(c.name)}</span>
        </button>`).join('')}
      <button class="group-chip tok-people" data-goto="__people">
        <span class="gsym">${Symbols.get('_people')}</span><span class="glbl">People</span>
      </button>
    </div>`;

    screen(`${topbar(cat.name || 'Talk', null)}
      <div class="screen">
        ${speakBarHTML()}
        ${strip}
        <div class="tile-grid ${dClass}">
          ${slice.map(w => `
            <button class="tile ${wordOnly ? 'word-only' : ''} tok-${esc(w.colorToken || cat.colorToken)}" data-word="${esc(w.id)}">
              ${wordOnly ? '' : `<span class="sym">${symbolHTML(w)}</span>`}
              <span class="lbl">${esc(w.label)}</span>
            </button>`).join('') ||
            '<div class="notice">No words here yet. A grown-up can add some in the caregiver area.</div>'}
        </div>
        ${pages > 1 ? `<div class="pager">
          <button id="pg-prev" ${page === 0 ? 'disabled' : ''}>&#8592; Back</button>
          <span class="count">${page + 1} of ${pages}</span>
          <button id="pg-next" ${page >= pages - 1 ? 'disabled' : ''}>More &#8594;</button>
        </div>` : ''}
      </div>`);
    bindNav();
    app().querySelectorAll('[data-goto]').forEach(b => {
      b.onclick = () => b.dataset.goto === '__people' ? go('people') : go('talk', { categoryId: b.dataset.goto });
    });
    bindSpeakBar();
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
    if (pages > 1) {
      const nav = (d) => go('talk', { categoryId: cat.id, page: page + d });
      if ($('#pg-prev')) $('#pg-prev').onclick = () => nav(-1);
      if ($('#pg-next')) $('#pg-next').onclick = () => nav(1);
    }
  };

  /* ---------- People (spec 3.3, visual scene style) ---------- */

  screens.people = async function () {
    const people = (await DB.allActive('people')).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    screen(`${topbar('People', 'home')}
      <div class="screen">
        ${speakBarHTML()}
        <div class="group-strip"><button class="group-chip tok-action" data-nav="talk">
          <span class="gsym">${Symbols.get('_talk')}</span><span class="glbl">Back to words</span></button></div>
        <div class="tile-grid d4">
          ${people.map(p => `
            <button class="tile person tok-people" data-person="${esc(p.id)}">
              <span class="sym">${symbolHTML(p)}</span>
              <span class="lbl">${esc(p.name)}</span>
            </button>`).join('') ||
            `<div class="notice">No people added yet. A grown-up can add photos of family in the caregiver area.</div>`}
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
          <button class="menu-item" data-nav="addword"><b>Add a word</b><span>New word with photo and speech</span></button>
          <button class="menu-item" data-nav="managewords"><b>Words &amp; groups</b><span>Edit, move, or remove words</span></button>
          <button class="menu-item" data-nav="managepeople"><b>People</b><span>Add family photos and names</span></button>
          <button class="menu-item" data-nav="settingsview"><b>Settings</b><span>Mode, speech speed, sound, layout</span></button>
          <button class="menu-item" data-nav="backup"><b>Back up</b><span>Save a copy off this iPad</span></button>
          <button class="menu-item" data-nav="restore"><b>Restore</b><span>Bring data back from a backup</span></button>
          <button class="menu-item" data-nav="recover"><b>Recover deleted</b><span>Nothing is ever really gone</span></button>
          <button class="menu-item" data-nav="progress"><b>Progress</b><span>Words used most, gently tracked</span></button>
          <button class="menu-item" data-nav="devicecheck"><b>Device check</b><span>Make sure everything works</span></button>
          <button class="menu-item" data-nav="storageview"><b>Storage</b><span>Space used on this iPad</span></button>
        </div>
      </div>`);
    bindNav();
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
          ${words.map(w => `<div class="list-row">
              <span class="thumb">${symbolHTML(w)}</span>
              <div class="grow"><b>${esc(w.label)}</b>${w.core ? ' <span class="hint">(core word)</span>' : ''}</div>
              <button data-edit="${esc(w.id)}">Edit</button>
              <button class="btn-danger" data-del="${esc(w.id)}">Remove</button>
            </div>`).join('') || '<div class="notice">No words in this group.</div>'}
        </div>
      </div>`);
    bindNav();
    $('#mw-cat').onchange = (e) => go('managewords', { categoryId: e.target.value });
    $('#mw-editcats').onclick = () => go('managecats');
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
    screen(`${topbar('Settings', 'caregiver')}
      <div class="screen"><div class="form">
        <div class="hint">Talk opens with the core words, and she can move between all groups herself using the symbol strip.</div>
        <label>Sentence bar
          <select id="s-sbar">
            <option value="on" ${settings.sentenceBar !== false ? 'selected' : ''}>Shown — tapped words build a sentence</option>
            <option value="off" ${settings.sentenceBar === false ? 'selected' : ''}>Hidden — words speak one at a time only</option>
          </select>
        </label>
        <label>Show
          <select id="s-wordonly">
            <option value="no" ${!settings.wordOnly ? 'selected' : ''}>Picture and word together</option>
            <option value="yes" ${settings.wordOnly ? 'selected' : ''}>Word only (for reading practice)</option>
          </select>
        </label>
        <label>Buttons per screen
          <select id="s-density">
            ${[4, 6, 9, 12].map(n => `<option value="${n}" ${Number(settings.density) === n ? 'selected' : ''}>${n}${n === 4 ? ' (recommended)' : ''}</option>`).join('')}
          </select>
        </label>
        <label>Speaking speed
          <select id="s-rate">
            <option value="0.4" ${settings.speechRate <= 0.45 ? 'selected' : ''}>Very slow</option>
            <option value="0.55" ${settings.speechRate > 0.45 && settings.speechRate <= 0.65 ? 'selected' : ''}>Slow (recommended)</option>
            <option value="0.8" ${settings.speechRate > 0.65 && settings.speechRate <= 0.9 ? 'selected' : ''}>Medium</option>
            <option value="1" ${settings.speechRate > 0.9 ? 'selected' : ''}>Normal</option>
          </select>
        </label>
        <div class="row"><button id="s-test">Hear a sample</button></div>
        <label>Sound
          <select id="s-sound">
            <option value="on" ${settings.soundOn ? 'selected' : ''}>On</option>
            <option value="off" ${!settings.soundOn ? 'selected' : ''}>Off (quiet mode)</option>
          </select>
        </label>
        <label>Backup reminder
          <select id="s-remind">
            ${[3, 7, 14, 30].map(n => `<option value="${n}" ${Number(settings.backupReminderDays) === n ? 'selected' : ''}>Every ${n} days</option>`).join('')}
          </select>
        </label>
        <div class="hint">Changes save immediately.</div>
      </div></div>`);
    bindNav();
    $('#s-sbar').onchange = e => { setSetting('sentenceBar', e.target.value === 'on'); if (e.target.value === 'off') sentence = []; };
    $('#s-wordonly').onchange = e => setSetting('wordOnly', e.target.value === 'yes');
    $('#s-density').onchange = e => setSetting('density', Number(e.target.value));
    $('#s-rate').onchange = e => setSetting('speechRate', Number(e.target.value));
    $('#s-sound').onchange = e => setSetting('soundOn', e.target.value === 'on');
    $('#s-remind').onchange = e => setSetting('backupReminderDays', Number(e.target.value));
    $('#s-test').onclick = () => {
      Speech.prime();
      Speech.speakItem({ label: 'I want more water, please' }, { rate: Number($('#s-rate').value), soundOn: true });
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
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
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
          It holds <b>${pv.words}</b> words, <b>${pv.categories}</b> groups, and <b>${pv.people}</b> people.
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
    const [words, cats, people] = await Promise.all([
      DB.allDeleted('vocabulary'), DB.allDeleted('categories'), DB.allDeleted('people'),
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
          ${(!words.length && !cats.length && !people.length) ? '<div class="notice">Nothing has been removed. All good.</div>' : ''}
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
        <div class="notice">This stays on the iPad only. It is a gentle picture of what she reaches for, not a report card.</div>
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
    go('home');
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
      await Seed.ensureEssentials();    // adds yes/no to installs seeded before they existed
      DB.requestPersistence();          // spec 2.3.3
      DB.startSnapshotTimer();          // spec 2.3.2
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
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
