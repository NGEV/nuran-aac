/* Nuran AAC — one visual-symbol resolver for words, navigation, and activities.
   Best available: caregiver photo → complete Nuran Friends illustration → neutral letter tile.
   There is deliberately no clinical/stick-figure fallback path. */

(function (root) {
  'use strict';

  function html(item, options) {
    const opts = options || {};
    const photo = opts.photoHTML || '';
    if (photo) return photo;
    if (root.NuranFriends) return root.NuranFriends.html(item);
    return '';
  }

  function source(item, options) {
    const opts = options || {};
    if (opts.photoHTML) return 'photo';
    if (root.NuranFriends && root.NuranFriends.has(item)) return 'nuran-friends';
    return 'letter';
  }

  root.NuranSymbols = Object.freeze({
    html,
    source,
    has(item) {
      return !!(root.NuranFriends && root.NuranFriends.has(item));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
