/* Nuran AAC — one visual resolver for words, navigation, and activities.
   Best available: caregiver photo → reviewed real photograph → neutral letter tile.
   There is deliberately no cartoon, stick-figure, or synthetic-human fallback path. */

(function (root) {
  'use strict';

  function html(item, options) {
    const opts = options || {};
    const photo = opts.photoHTML || '';
    if (photo) return photo;
    if (root.NuranRealPhotos) return root.NuranRealPhotos.html(item);
    return '<span class="nuran-letter-tile" aria-hidden="true">?</span>';
  }

  function source(item, options) {
    const opts = options || {};
    if (opts.photoHTML) return 'photo';
    if (root.NuranRealPhotos && root.NuranRealPhotos.hasPhoto(item)) return 'real-photo';
    return 'letter';
  }

  root.NuranSymbols = Object.freeze({
    html,
    source,
    has(item) {
      return !!(root.NuranRealPhotos && root.NuranRealPhotos.has(item));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
