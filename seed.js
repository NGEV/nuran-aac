/* Nuran AAC — starter data.
   Core Words preserves the Universal Core 36 (Project Core / UNC Center for
   Literacy and Disability Studies, word list licensed CC BY 4.0). The adjacent
   Sentence Words group adds grammatical building blocks that the intentionally
   minimal 36-word board does not contain.
   Learning categories start with concrete, highly imageable words,
   consistent with early AAC practice (spec 3.2). */

(function () {
  'use strict';

  // Color tokens loosely follow the modified Fitzgerald key convention:
  // people/pronouns = yellow, actions/verbs = green, descriptors = blue,
  // little words/places = sage, social/negation = rose, questions = lavender.
  const CATEGORIES = [
    { id: 'cat-core',     name: 'Core Words',     colorToken: 'neutral',  symbolKey: '_talk', sortOrder: 0, builtin: true },
    { id: 'cat-sentence', name: 'Sentence Words', colorToken: 'place',    symbolKey: 'is',    sortOrder: 0.5, builtin: true },
    { id: 'cat-food',     name: 'Food & Drink',   colorToken: 'thing',    symbolKey: 'apple', sortOrder: 1, builtin: true },
    { id: 'cat-body',     name: 'Body & Needs',   colorToken: 'describe', symbolKey: '_body', sortOrder: 2, builtin: true },
    { id: 'cat-feelings', name: 'Feelings',       colorToken: 'social',   symbolKey: 'happy', sortOrder: 3, builtin: true },
    { id: 'cat-actions',  name: 'Actions',        colorToken: 'action',   symbolKey: 'go',    sortOrder: 4, builtin: true },
    { id: 'cat-places',   name: 'Places',         colorToken: 'place',    symbolKey: 'home',  sortOrder: 5, builtin: true },
    { id: 'cat-play',     name: 'Play',           colorToken: 'question', symbolKey: 'ball',  sortOrder: 6, builtin: true },
    { id: 'cat-phrases',  name: 'My Phrases',     colorToken: 'people',   symbolKey: '_star', sortOrder: 7, builtin: true },
  ];

  // [label, symbolKey, colorToken] — Universal Core 36, plus yes/no.
  // yes/no are not in the Universal Core set, but Banajee et al. (2003) found
  // they dominate toddlers' core utterances; a child must be able to answer.
  const CORE_WORDS = [
    ['yes', 'yes', 'social'], ['no', 'no', 'social'], ['hello', 'hello', 'social'],
    ['I', 'i', 'people'], ['you', 'you', 'people'], ['he', 'he', 'people'], ['she', 'she', 'people'],
    ['it', 'it', 'people'], ['that', 'that', 'people'],
    ['want', 'want', 'action'], ['like', 'like', 'action'], ['get', 'get', 'action'],
    ['make', 'make', 'action'], ['go', 'go', 'action'], ['stop', 'stop', 'action'],
    ['do', 'do', 'action'], ['put', 'put', 'action'], ['turn', 'turn', 'action'],
    ['help', 'help', 'action'], ['open', 'open', 'action'], ['look', 'look', 'action'],
    ['can', 'can', 'action'], ['finished', 'finished', 'action'],
    ['more', 'more', 'describe'], ['all', 'all', 'describe'], ['some', 'some', 'describe'],
    ['same', 'same', 'describe'], ['different', 'different', 'describe'], ['good', 'good', 'describe'],
    ['not', 'not', 'social'],
    ['in', 'in', 'place'], ['on', 'on', 'place'], ['up', 'up', 'place'], ['here', 'here', 'place'],
    ['what', 'what', 'question'], ['when', 'when', 'question'], ['where', 'where', 'question'],
    ['who', 'who', 'question'], ['why', 'why', 'question'],
  ];

  // Nuran sentence-building extension. Keep this separate from Project Core's
  // exact 36-word set so provenance stays honest and the original tile order
  // remains stable. The first page deliberately exposes is/am/are/a at the
  // default four-tile density. [label, symbolKey, colorToken]
  const SENTENCE_WORDS = [
    ['is', 'is', 'action'], ['am', 'am', 'action'], ['are', 'are', 'action'], ['a', 'a', 'place'],
    ['the', 'the', 'place'], ['and', 'and', 'place'], ['but', 'but', 'place'], ['because', 'because', 'place'],
    ['me', 'me', 'people'], ['we', 'we', 'people'], ['they', 'they', 'people'], ['my', 'my', 'people'],
    ['your', 'your', 'people'], ['this', 'this', 'people'], ['have', 'have', 'action'], ['need', 'need', 'action'],
    ['see', 'see', 'action'], ['feel', 'feel', 'action'], ['know', 'know', 'action'], ['say', 'say', 'action'],
    ['to', 'to', 'place'], ['with', 'with', 'place'], ['for', 'for', 'place'], ['out', 'out', 'place'],
    ['off', 'off', 'place'], ['down', 'down', 'place'], ['there', 'there', 'place'], ['how', 'how', 'question'],
    ['again', 'again', 'place'], ['now', 'now', 'place'], ['later', 'later', 'place'], ['wait', 'wait', 'action'],
    ['bad', 'bad', 'describe'], ['big', 'big', 'describe'], ['little', 'little', 'describe'], ['or', 'or', 'place'],
  ];

  // [categoryId, label, symbolKey]
  const LEARNING_WORDS = [
    ['cat-food', 'water', 'water'], ['cat-food', 'milk', 'milk'], ['cat-food', 'juice', 'juice'],
    ['cat-food', 'cookie', 'cookie'], ['cat-food', 'apple', 'apple'], ['cat-food', 'banana', 'banana'],
    ['cat-food', 'bread', 'bread'], ['cat-food', 'snack', 'snack'],

    ['cat-body', 'bathroom', 'bathroom'], ['cat-body', 'hurt', 'hurt'], ['cat-body', 'tired', 'tired'],
    ['cat-body', 'hungry', 'hungry'], ['cat-body', 'thirsty', 'thirsty'], ['cat-body', 'sick', 'sick'],
    ['cat-body', 'hot', 'hot'], ['cat-body', 'cold', 'cold'], ['cat-body', 'sleep', 'sleep'],

    ['cat-feelings', 'happy', 'happy'], ['cat-feelings', 'sad', 'sad'], ['cat-feelings', 'mad', 'mad'],
    ['cat-feelings', 'scared', 'scared'], ['cat-feelings', 'calm', 'calm'], ['cat-feelings', 'silly', 'silly'],

    ['cat-actions', 'eat', 'eat'], ['cat-actions', 'drink', 'drink'], ['cat-actions', 'play', 'play'],
    ['cat-actions', 'wash', 'wash'], ['cat-actions', 'hug', 'hug'], ['cat-actions', 'sit', 'sit'],
    ['cat-actions', 'come', 'come'], ['cat-actions', 'give', 'give'],

    ['cat-places', 'home', 'home'], ['cat-places', 'school', 'school'], ['cat-places', 'park', 'park'],
    ['cat-places', 'outside', 'outside'], ['cat-places', 'car', 'car'], ['cat-places', 'store', 'store'],

    ['cat-play', 'ball', 'ball'], ['cat-play', 'bubbles', 'bubbles'], ['cat-play', 'book', 'book'],
    ['cat-play', 'music', 'music'], ['cat-play', 'blocks', 'blocks'], ['cat-play', 'swing', 'swing'],
    ['cat-play', 'TV', 'tv'], ['cat-play', 'tablet', 'tablet'],
  ];

  const DEFAULT_SETTINGS = Object.freeze(Object.assign({}, window.NuranSettings.defaults));

  window.Seed = {
    /* Idempotent migration for installs seeded before response and sentence words existed.
       Respects deliberate deletion: if a record exists at all (even deleted), leave it be. */
    async ensureEssentials() {
      const now = Date.now();
      const essentials = [['yes', 'yes', -2], ['no', 'no', -1]];
      for (const [label, symbolKey, sortOrder] of essentials) {
        const existing = await DB.get('vocabulary', 'core-' + symbolKey);
        if (existing) continue;
        await DB.put('vocabulary', {
          id: 'core-' + symbolKey, label, symbolKey, colorToken: 'social',
          categoryId: 'cat-core', core: true, sortOrder,
          imageBlob: null, audioBlob: null,
          deleted: false, createdAt: now, updatedAt: now,
        });
      }
      // Migration: isolated "I"/"i" can be announced as "capital I" by Apple voices.
      // "eye" is pronunciation text only; the visible AAC label remains the proper "I".
      const iWord = await DB.get('vocabulary', 'core-i');
      if (iWord && (!iWord.speakAs || String(iWord.speakAs).trim().toLowerCase() === 'i')) {
        iWord.speakAs = 'eye';
        await DB.put('vocabulary', iWord);
      }
      // Migration: "hello" becomes a core word (the home tile it lived on is now Learn).
      const helloWord = await DB.get('vocabulary', 'core-hello');
      if (!helloWord) {
        await DB.put('vocabulary', {
          id: 'core-hello', label: 'hello', symbolKey: 'hello', colorToken: 'social',
          categoryId: 'cat-core', core: true, sortOrder: 2.5,
          imageBlob: null, audioBlob: null,
          deleted: false, createdAt: now, updatedAt: now,
        });
      }
      // Migration: My Phrases group for installs seeded before it existed.
      // Respects deliberate deletion: if the record exists at all, leave it be.
      const phrasesCat = await DB.get('categories', 'cat-phrases');
      if (!phrasesCat) {
        await DB.put('categories', {
          id: 'cat-phrases', name: 'My Phrases', colorToken: 'people', symbolKey: '_star',
          sortOrder: 7, builtin: true, deleted: false, createdAt: now, updatedAt: now,
        });
      }
      // Migration: sentence-building words live in their own adjacent Talk group.
      // This avoids moving the established Project Core tiles on upgraded devices.
      const sentenceCat = await DB.get('categories', 'cat-sentence');
      if (!sentenceCat) {
        await DB.put('categories', {
          id: 'cat-sentence', name: 'Sentence Words', colorToken: 'place', symbolKey: 'is',
          sortOrder: 0.5, builtin: true, deleted: false, createdAt: now, updatedAt: now,
        });
      }
      for (let index = 0; index < SENTENCE_WORDS.length; index += 1) {
        const [label, symbolKey, colorToken] = SENTENCE_WORDS[index];
        const existing = await DB.get('vocabulary', 'core-' + symbolKey);
        if (existing) continue;
        await DB.put('vocabulary', {
          id: 'core-' + symbolKey, label, symbolKey, colorToken,
          categoryId: 'cat-sentence', core: true, sortOrder: index,
          imageBlob: null, audioBlob: null,
          deleted: false, createdAt: now, updatedAt: now,
        });
      }
    },

    async seedIfEmpty() {
      const existing = await DB.all('vocabulary').catch(() => []);
      const existingCats = await DB.all('categories').catch(() => []);
      if (existing.length > 0 || existingCats.length > 0) return false;

      const now = Date.now();
      for (const c of CATEGORIES) {
        await DB.put('categories', Object.assign({ deleted: false, createdAt: now, updatedAt: now }, c));
      }
      let i = 0;
      for (const [label, symbolKey, colorToken] of CORE_WORDS) {
        const rec = {
          id: 'core-' + symbolKey, label, symbolKey, colorToken,
          categoryId: 'cat-core', core: true, sortOrder: i++,
          imageBlob: null, audioBlob: null,
          deleted: false, createdAt: now, updatedAt: now,
        };
        // A single-letter utterance can make Apple voices announce "Capital I".
        // Use pronunciation text while displaying the proper capitalized pronoun.
        if (label === 'I') rec.speakAs = 'eye';
        await DB.put('vocabulary', rec);
      }
      let sentenceOrder = 0;
      for (const [label, symbolKey, colorToken] of SENTENCE_WORDS) {
        await DB.put('vocabulary', {
          id: 'core-' + symbolKey, label, symbolKey, colorToken,
          categoryId: 'cat-sentence', core: true, sortOrder: sentenceOrder++,
          imageBlob: null, audioBlob: null,
          deleted: false, createdAt: now, updatedAt: now,
        });
      }
      for (const [categoryId, label, symbolKey] of LEARNING_WORDS) {
        await DB.put('vocabulary', {
          id: 'seed-' + symbolKey, label, symbolKey,
          categoryId, core: false, sortOrder: i++,
          imageBlob: null, audioBlob: null,
          deleted: false, createdAt: now, updatedAt: now,
        });
      }
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        const cur = await DB.get('settings', key);
        if (cur === undefined) await DB.put('settings', { key, value });
      }
      await DB.updateMirror();
      return true;
    },
    DEFAULT_SETTINGS,
    UNIVERSAL_CORE_WORDS: Object.freeze(CORE_WORDS.slice(3).map(([label]) => label)),
    SENTENCE_WORDS: Object.freeze(SENTENCE_WORDS.map(([label]) => label)),
  };
})();
