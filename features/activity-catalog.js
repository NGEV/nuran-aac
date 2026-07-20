/* Nuran AAC — declarative activity catalog.
   Hub rendering now reads this list; new activities no longer require another
   hard-coded array in app.js. */

(function (root) {
  'use strict';

  const A = root.NuranActivities;
  if (!A) throw new Error('Activity Registry must load before the catalog');

  [
    { id: 'learn-picture', family: 'learn', route: 'learngame', label: 'Match Pictures', token: 'thing', symbolKey: 'apple', params: { mode: 'wp' } },
    { id: 'learn-word', family: 'learn', route: 'learngame', label: 'Match Words', token: 'describe', symbolKey: 'same', params: { mode: 'ww' } },
    { id: 'learn-color', family: 'learn', route: 'learngame', label: 'Match Colors', token: 'question', symbolKey: 'cele_rainbow', params: { mode: 'cc' } },

    { id: 'pop', family: 'play', route: 'pop', label: 'Balloons', token: 'social', icon: 'balloon-pink' },
    { id: 'memory', family: 'play', route: 'memory', label: 'Memory', token: 'describe', symbolKey: 'same' },
    { id: 'paint', family: 'play', route: 'paint', label: 'Paint', token: 'question', symbolKey: '_paint' },
    { id: 'piano', family: 'play', route: 'piano', label: 'Music', token: 'place', symbolKey: '_piano' },
    { id: 'floats', family: 'play', route: 'floats', label: 'Sky Pop', token: 'describe', icon: 'balloon-blue', eligible: c => c.motionLevel !== 'none' },
    { id: 'blocks', family: 'play', route: 'blocks', label: 'Blocks', token: 'thing', symbolKey: 'make', eligible: c => c.motionLevel !== 'none' },
  ].forEach(def => A.register(def));
})(typeof window !== 'undefined' ? window : globalThis);
