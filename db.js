/* Nuran AAC — data layer.
   IndexedDB with soft delete everywhere, internal hourly snapshots,
   a redundant mirror of critical stores, one-tap export/restore,
   and a local-only error log. Nothing ever leaves the device unless
   the caregiver explicitly exports it. (Spec sections 2.2, 2.3, 6) */

(function () {
  'use strict';

  const DB_NAME = 'nuran-aac';
  const DB_VERSION = 3; // v3: one family-created visual scene
  const CRITICAL_STORES = ['vocabulary', 'categories', 'people', 'settings', 'visualScenes'];
  const ALL_DATA_STORES = ['vocabulary', 'categories', 'people', 'settings', 'visualScenes', 'history', 'progressLog'];
  const SNAPSHOT_HOURLY_KEEP = 24;   // rolling 24 hourly
  const SNAPSHOT_DAILY_KEEP = 14;    // plus one per day for 14 days
  const HISTORY_MAX = 5000;
  const PROGRESS_MAX = 20000;

  let _db = null;

  function uid() {
    return (crypto.randomUUID) ? crypto.randomUUID()
      : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const mk = (name, keyPath, autoIncrement) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, autoIncrement ? { keyPath, autoIncrement: true } : { keyPath });
          }
        };
        mk('vocabulary', 'id');
        mk('categories', 'id');
        mk('people', 'id');
        mk('settings', 'key');
        mk('history', 'id', true);
        mk('snapshots', 'id', true);
        mk('errorLog', 'id', true);
        mk('progressLog', 'id', true);
        mk('visualScenes', 'id');
      };
      req.onsuccess = () => { _db = req.result; _db.onversionchange = () => _db.close(); resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      try { out = fn(s); } catch (err) { reject(err); return; }
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('transaction aborted'));
    }));
  }

  const put = (store, obj) => tx(store, 'readwrite', s => { s.put(obj); return obj; });
  const get = (store, key) => open().then(db => new Promise((res, rej) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const all = (store) => open().then(db => new Promise((res, rej) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
  }));
  const hardDelete = (store, key) => tx(store, 'readwrite', s => s.delete(key)); // internal use only
  const clearStore = (store) => tx(store, 'readwrite', s => s.clear());          // internal use only

  /* ---------- Blob (de)serialization for export/snapshots ---------- */

  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataURL) {
    const [head, body] = dataURL.split(',');
    const mime = (head.match(/data:(.*?);/) || [])[1] || 'application/octet-stream';
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function serializeRecord(rec) {
    const out = {};
    for (const k of Object.keys(rec)) {
      const v = rec[k];
      if (v instanceof Blob) {
        out[k] = { __blob: await blobToDataURL(v) };
      } else if (k === 'translations' && v && typeof v === 'object') {
        // per-language nested blobs (v2.2 multilingual audio)
        out[k] = {};
        for (const lang of Object.keys(v)) {
          out[k][lang] = {};
          for (const f of Object.keys(v[lang] || {})) {
            const fv = v[lang][f];
            out[k][lang][f] = (fv instanceof Blob) ? { __blob: await blobToDataURL(fv) } : fv;
          }
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function reviveRecord(rec) {
    const out = {};
    for (const k of Object.keys(rec)) {
      const v = rec[k];
      if (v && typeof v === 'object' && v.__blob) {
        out[k] = dataURLToBlob(v.__blob);
      } else if (k === 'translations' && v && typeof v === 'object') {
        out[k] = {};
        for (const lang of Object.keys(v)) {
          out[k][lang] = {};
          for (const f of Object.keys(v[lang] || {})) {
            const fv = v[lang][f];
            out[k][lang][f] = (fv && typeof fv === 'object' && fv.__blob) ? dataURLToBlob(fv.__blob) : fv;
          }
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  async function collectAllData(includeHistory) {
    const stores = includeHistory ? ALL_DATA_STORES : CRITICAL_STORES;
    const data = {};
    for (const st of stores) {
      const recs = await all(st);
      data[st] = [];
      for (const r of recs) data[st].push(await serializeRecord(r));
    }
    return data;
  }

  /* ---------- Public API ---------- */

  const DB = {
    uid, open, put, get, all,
    meta: Object.freeze({
      version: DB_VERSION,
      allDataStores: Object.freeze([...ALL_DATA_STORES]),
      limits: Object.freeze({ history: HISTORY_MAX, progress: PROGRESS_MAX }),
    }),

    /* Soft delete: nothing is ever hard-deleted by a normal action (spec 2.3.1) */
    async softDelete(store, key) {
      const rec = await get(store, key);
      if (!rec) return null;
      rec.deleted = true;
      rec.deletedAt = Date.now();
      await put(store, rec);
      await DB.updateMirror();
      return rec;
    },

    async restoreDeleted(store, key) {
      const rec = await get(store, key);
      if (!rec) return null;
      rec.deleted = false;
      rec.deletedAt = null;
      await put(store, rec);
      await DB.updateMirror();
      return rec;
    },

    async allActive(store) {
      return (await all(store)).filter(r => !r.deleted);
    },

    async allDeleted(store) {
      return (await all(store)).filter(r => r.deleted);
    },

    /* Save wrapper for critical stores that also refreshes the mirror */
    async save(store, rec) {
      if (!rec.id && store !== 'settings') rec.id = uid();
      rec.updatedAt = Date.now();
      if (!rec.createdAt) rec.createdAt = rec.updatedAt;
      await put(store, rec);
      if (CRITICAL_STORES.includes(store)) await DB.updateMirror();
      return rec;
    },

    /* ---------- Settings ---------- */
    async getSetting(key, fallback) {
      const r = await get('settings', key);
      return r ? r.value : fallback;
    },
    async setSetting(key, value) {
      await put('settings', { key, value });
      await DB.updateMirror();
    },

    /* ---------- History (local only, never transmitted — spec 3.5) ---------- */
    async logTap(wordId, label) {
      try {
        await put('history', { wordId, label, ts: Date.now() });
        const rows = await all('history');
        if (rows.length > HISTORY_MAX) {
          rows.sort((a, b) => a.ts - b.ts);
          const excess = rows.slice(0, rows.length - HISTORY_MAX);
          for (const r of excess) await hardDelete('history', r.id);
        }
      } catch (e) { DB.logError('history write failed: ' + e.message); }
    },

    /* ---------- Progress log (append-only within a bounded local window).
       Existing events are not mutated; the oldest are pruned above the cap. */
    async logProgress(event) {
      try {
        await put('progressLog', Object.assign({ ts: Date.now() }, event));
        const rows = await all('progressLog');
        if (rows.length > PROGRESS_MAX) {
          rows.sort((a, b) => a.ts - b.ts);
          const excess = rows.slice(0, rows.length - PROGRESS_MAX);
          for (const r of excess) await hardDelete('progressLog', r.id);
        }
      } catch (e) { DB.logError('progress write failed: ' + e.message); }
    },

    async progressEvents(options) {
      const opts = options || {};
      const since = Number(opts.since) || 0;
      const type = opts.type || null;
      const limit = Math.min(5000, Math.max(1, Number(opts.limit) || 1000));
      const rows = (await all('progressLog'))
        .filter(r => r.ts >= since && (!type || r.type === type))
        .sort((a, b) => b.ts - a.ts);
      return rows.slice(0, limit);
    },

    /* ---------- Error log (local only — spec 6.3) ---------- */
    async logError(message) {
      try { await put('errorLog', { ts: Date.now(), message: String(message).slice(0, 500) }); }
      catch (e) { /* never let logging itself break the app */ }
    },

    /* ---------- Redundant mirror of critical stores (spec 2.2) ---------- */
    async updateMirror() {
      try {
        const data = await collectAllData(false);
        const snaps = await all('snapshots');
        const old = snaps.find(s => s.type === 'mirror');
        const rec = { type: 'mirror', ts: Date.now(), data };
        if (old) rec.id = old.id;
        await put('snapshots', rec);
      } catch (e) { DB.logError('mirror update failed: ' + e.message); }
    },

    /* ---------- Internal snapshots (spec 2.3.2) ---------- */
    async takeSnapshot(type) {
      try {
        const data = await collectAllData(true);
        await put('snapshots', { type: type || 'hourly', ts: Date.now(), data });
        await DB.pruneSnapshots();
        return true;
      } catch (e) { DB.logError('snapshot failed: ' + e.message); return false; }
    },

    async pruneSnapshots() {
      const snaps = (await all('snapshots')).filter(s => s.type !== 'mirror');
      snaps.sort((a, b) => b.ts - a.ts); // newest first
      const keep = new Set();
      // last 24 hourly
      snaps.slice(0, SNAPSHOT_HOURLY_KEEP).forEach(s => keep.add(s.id));
      // one per day for 14 days
      const byDay = {};
      for (const s of snaps) {
        const day = new Date(s.ts).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = s; // newest of that day
      }
      Object.values(byDay).slice(0, SNAPSHOT_DAILY_KEEP).forEach(s => keep.add(s.id));
      for (const s of snaps) if (!keep.has(s.id)) await hardDelete('snapshots', s.id);
    },

    async listSnapshots() {
      const snaps = (await all('snapshots')).filter(s => s.type !== 'mirror');
      snaps.sort((a, b) => b.ts - a.ts);
      return snaps.map(s => ({ id: s.id, ts: s.ts, type: s.type }));
    },

    startSnapshotTimer() {
      DB.takeSnapshot('open'); // one on open
      setInterval(() => DB.takeSnapshot('hourly'), 60 * 60 * 1000);
    },

    /* ---------- Export / restore (spec 2.3.4, 2.3.6) ---------- */
    async exportJSON() {
      const data = await collectAllData(true);
      return JSON.stringify({
        app: 'nuran-aac', formatVersion: 1, exportedAt: new Date().toISOString(), data,
      });
    },

    parseBackup(text) {
      const obj = JSON.parse(text);
      if (!obj || obj.app !== 'nuran-aac' || !obj.data) throw new Error('not a Nuran backup file');
      return obj;
    },

    backupPreview(obj) {
      const d = obj.data;
      const n = (st) => (d[st] || []).filter(r => !r.deleted).length;
      return {
        exportedAt: obj.exportedAt,
        words: n('vocabulary'), categories: n('categories'), people: n('people'), scenes: n('visualScenes'),
      };
    },

    async restoreFromBackup(obj) {
      // Safety snapshot of whatever exists before we overwrite (never lose data, even during restore)
      await DB.takeSnapshot('pre-restore');
      for (const st of ALL_DATA_STORES) {
        await clearStore(st);
        if (!obj.data[st]) continue; // older backup: newer store restores as empty
        for (const raw of obj.data[st]) await put(st, reviveRecord(raw));
      }
      await DB.updateMirror();
    },

    async restoreFromSnapshot(snapshotId) {
      const snap = await get('snapshots', snapshotId);
      if (!snap) throw new Error('snapshot not found');
      await DB.takeSnapshot('pre-restore');
      for (const st of ALL_DATA_STORES) {
        await clearStore(st);
        if (!snap.data[st]) continue; // older snapshot: newer store restores as empty
        for (const raw of snap.data[st]) await put(st, reviveRecord(raw));
      }
      await DB.updateMirror();
    },

    /* Recover from the mirror if a critical store is empty/corrupt (spec 6.1.3) */
    async recoverFromMirror() {
      const snaps = await all('snapshots');
      const mirror = snaps.find(s => s.type === 'mirror');
      if (!mirror) return false;
      for (const st of Object.keys(mirror.data)) {
        const current = await all(st).catch(() => []);
        if (current.length === 0 && mirror.data[st].length > 0) {
          for (const raw of mirror.data[st]) await put(st, reviveRecord(raw));
        }
      }
      return true;
    },

    /* ---------- Storage health ---------- */
    async requestPersistence() {
      try {
        if (navigator.storage && navigator.storage.persist) {
          const already = await navigator.storage.persisted();
          if (already) return true;
          return await navigator.storage.persist();
        }
      } catch (e) { DB.logError('persist request failed: ' + e.message); }
      return false;
    },

    async storageEstimate() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          return { usage: est.usage || 0, quota: est.quota || 0 };
        }
      } catch (e) { /* fine */ }
      return null;
    },

    /* Launch health check: empty data + snapshots available? (spec 6.1.1) */
    async launchCheck() {
      let vocabCount = 0, snapCount = 0;
      try { vocabCount = (await all('vocabulary')).length; } catch (e) { vocabCount = -1; }
      try { snapCount = (await DB.listSnapshots()).length; } catch (e) { snapCount = 0; }
      return { empty: vocabCount === 0, corrupt: vocabCount === -1, hasSnapshots: snapCount > 0 };
    },
  };

  window.DB = DB;
})();
