/* Nuran AAC — one visual-symbol resolver for words, navigation, and activities.
   Best available: caregiver photo → Mulberry → complete Nuran symbol → letter tile.
   Mulberry-first and original-symbol modes remain explicit caregiver choices. */

(function (root) {
  'use strict';

  const ROLE_ALIASES = Object.freeze({
    _talk: 'hello',
    _people: 'hug',
    _learn: 'school',
    _help: 'help',
    _piano: 'music',
  });

  const cleanKey = (value) => String(value == null ? '' : value).trim().toLowerCase();

  function mulberryKey(item) {
    const record = item || {};
    const candidates = [cleanKey(record.label), cleanKey(record.name), cleanKey(record.symbolKey)];
    const roleAlias = ROLE_ALIASES[record.symbolKey];
    if (roleAlias) candidates.push(roleAlias);
    return candidates.find(key => key && root.MulberryMap && root.MulberryMap[key]) || null;
  }

  function mulberryHTML(item) {
    const key = mulberryKey(item);
    return key ? `<img class="symbol-img symbol-mulberry" src="${root.MulberryMap[key]}" alt="">` : '';
  }

  function originalHTML(item) {
    const record = item || {};
    const key = record.symbolKey || cleanKey(record.label) || cleanKey(record.name);
    if (key && root.Symbols && root.Symbols.has(key)) return root.Symbols.get(key);
    if (root.Symbols) return root.Symbols.letterTile(record.label || record.name || '?');
    return '';
  }

  function html(item, options) {
    const opts = options || {};
    const style = opts.style || 'best';
    const photo = opts.photoHTML || '';
    const mulberry = mulberryHTML(item);
    const original = originalHTML(item);

    if (style === 'symbols') return original || photo || mulberry;
    if (style === 'mulberry') return mulberry || photo || original;
    // `photos` is an older saved value. Treat it as today's best-available mode.
    return photo || mulberry || original;
  }

  function source(item, options) {
    const opts = options || {};
    const style = opts.style || 'best';
    if (style !== 'symbols' && opts.photoHTML && style !== 'mulberry') return 'photo';
    if (style !== 'symbols' && mulberryKey(item)) return 'mulberry';
    if (style === 'mulberry' && opts.photoHTML) return 'photo';
    return 'original';
  }

  root.NuranSymbols = Object.freeze({
    html,
    source,
    has(item) {
      const record = item || {};
      const key = record.symbolKey || cleanKey(record.label) || cleanKey(record.name);
      return !!(mulberryKey(record) || (root.Symbols && key && root.Symbols.has(key)));
    },
    mulberryKey,
    roleAliases: ROLE_ALIASES,
  });
})(typeof window !== 'undefined' ? window : globalThis);
