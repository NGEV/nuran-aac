/* Nuran AAC — reviewed real-photograph layer.
   The shared registry places this above the curated ARASAAC layer when caregivers prefer photos. */

(function (root) {
  'use strict';

  const HUMAN = Object.freeze([
    'yes', 'no', 'hello', 'i', 'you', 'he', 'she', 'want', 'like', 'get', 'make', 'go', 'stop', 'do', 'put', 'turn', 'help', 'open', 'look', 'can', 'finished', 'not',
    'me', 'we', 'they', 'my', 'your', 'have', 'need', 'see', 'feel', 'know', 'say', 'wait',
    'hurt', 'tired', 'hungry', 'thirsty', 'sick', 'sleep', 'happy', 'sad', 'mad', 'scared', 'calm', 'silly',
    'eat', 'drink', 'play', 'wash', 'hug', 'sit', 'come', 'give',
  ]);
  const OBJECT = Object.freeze([
    'it', 'that', 'more', 'good', 'a', 'the', 'water', 'milk', 'juice', 'cookie', 'apple', 'banana', 'bread', 'snack', 'bathroom',
    'home', 'school', 'park', 'outside', 'car', 'store', 'ball', 'bubbles', 'book', 'music', 'blocks', 'swing', 'tv', 'tablet',
  ]);
  const RELATION = Object.freeze([
    'all', 'some', 'same', 'different', 'in', 'on', 'up', 'here', 'is', 'am', 'are', 'and', 'but', 'because', 'this', 'to', 'with', 'for', 'out', 'off', 'down', 'there', 'again', 'now', 'later', 'bad', 'big', 'little', 'or', 'hot', 'cold',
  ]);
  const QUESTION = Object.freeze(['what', 'when', 'where', 'who', 'why', 'how']);
  const WORD_KEYS = Object.freeze([...HUMAN, ...OBJECT, ...RELATION, ...QUESTION]);
  const WORD_SET = new Set(WORD_KEYS);

  const ALIASES = Object.freeze({
    _talk: 'hello', _people: 'hug', _learn: 'school', _help: 'help', _piano: 'music', _body: 'calm', _star: 'good', _paint: 'play',
    cele_star: 'good', cele_rainbow: 'good', cele_balloons: 'bubbles', cele_check: 'finished',
  });

  // These are bounded, EXIF-free PNG derivatives of individual, source-recorded photographs.
  // Exact license, attribution, source URL, and SHA-256 are in design-intake/photo-real-visuals/PROVENANCE.json.
  const PHOTOS = Object.freeze({
    apple: Object.freeze({ src: 'real-photos/apple.png', description: 'a real red apple' }),
    ball: Object.freeze({ src: 'real-photos/ball.png', description: 'a real toy ball' }),
    banana: Object.freeze({ src: 'real-photos/banana.png', description: 'a real banana' }),
    blocks: Object.freeze({ src: 'real-photos/blocks.png', description: 'real toy blocks' }),
    bread: Object.freeze({ src: 'real-photos/bread.png', description: 'a real loaf of bread' }),
    cookie: Object.freeze({ src: 'real-photos/cookie.png', description: 'a real chocolate-chip cookie' }),
    milk: Object.freeze({ src: 'real-photos/milk.png', description: 'a real glass of milk' }),
    water: Object.freeze({ src: 'real-photos/water.png', description: 'a real glass of water' }),
  });

  function clean(value) { return String(value == null ? '' : value).trim().toLowerCase(); }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function keyFor(item) {
    const record = item || {};
    const candidates = [record.symbolKey, record.label, record.name].map(clean);
    for (const candidate of candidates) {
      const resolved = ALIASES[candidate] || candidate;
      if (WORD_SET.has(resolved)) return resolved;
    }
    return null;
  }

  function wordTile(label) {
    const word = String(label == null ? '' : label).trim() || '?';
    return `<span class="nuran-word-tile" aria-hidden="true" data-nuran-word="${escapeHTML(word)}">${escapeHTML(word)}</span>`;
  }

  function photoHTML(item) {
    const key = typeof item === 'string' ? item : keyFor(item);
    const photo = PHOTOS[key];
    if (!photo) return '';
    return `<img class="nuran-real-photo" src="${photo.src}" alt="" aria-hidden="true" draggable="false" data-nuran-real-photo="${key}">`;
  }

  function html(item) {
    const key = keyFor(item);
    return photoHTML(key) || wordTile((item && (item.label || item.name)) || key || '?');
  }

  root.NuranRealPhotos = Object.freeze({
    html,
    has(item) { return !!keyFor(item); },
    hasPhoto(item) { return !!PHOTOS[keyFor(item)]; },
    photoHTML,
    keyFor,
    wordTile,
    keys: WORD_KEYS,
    aliases: ALIASES,
    photoKeys: Object.freeze(Object.keys(PHOTOS)),
  });
})(typeof window !== 'undefined' ? window : globalThis);
