/* Nuran AAC — one visual resolver for words, navigation, and activities.
   Best available: caregiver photo → reviewed real photograph → curated ARASAAC pictogram.
   Full-word text is the explicit Words-only mode and the safe terminal fallback for a
   caregiver-created word that has neither a photo nor a bundled pictogram. */

(function (root) {
  'use strict';

  function html(item, options) {
    const opts = options || {};
    const photo = opts.photoHTML || '';
    if (photo) return photo;
    if (opts.wordOnly && root.NuranRealPhotos) {
      return root.NuranRealPhotos.wordTile((item && (item.label || item.name)) || '?');
    }
    if (opts.preferRealPhotos !== false && root.NuranRealPhotos && root.NuranRealPhotos.hasPhoto(item)) {
      return root.NuranRealPhotos.photoHTML(item);
    }
    if (root.NuranArasaac && root.NuranArasaac.has(item)) return root.NuranArasaac.html(item);
    if (root.NuranRealPhotos && root.NuranRealPhotos.hasPhoto(item)) return root.NuranRealPhotos.photoHTML(item);
    if (root.NuranRealPhotos) return root.NuranRealPhotos.wordTile((item && (item.label || item.name)) || '?');
    return '<span class="nuran-word-tile" aria-hidden="true" data-nuran-word="?">?</span>';
  }

  function source(item, options) {
    const opts = options || {};
    if (opts.photoHTML) return 'photo';
    if (opts.wordOnly) return 'text';
    if (opts.preferRealPhotos !== false && root.NuranRealPhotos && root.NuranRealPhotos.hasPhoto(item)) return 'real-photo';
    if (root.NuranArasaac && root.NuranArasaac.has(item)) return 'arasaac';
    if (root.NuranRealPhotos && root.NuranRealPhotos.hasPhoto(item)) return 'real-photo';
    return 'word-label';
  }

  root.NuranSymbols = Object.freeze({
    html,
    source,
    has(item) {
      return !!(
        (root.NuranRealPhotos && root.NuranRealPhotos.hasPhoto(item)) ||
        (root.NuranArasaac && root.NuranArasaac.has(item))
      );
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
