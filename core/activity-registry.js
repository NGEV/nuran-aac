/* Nuran AAC — shared Activity Registry.
   Learn, Play, and future Focus Time discover activities through metadata instead
   of duplicating hub lists. Optional mount/unmount hooks support gradual extraction. */

(function (root) {
  'use strict';

  const definitions = new Map();
  let mounted = null;

  function register(definition) {
    const def = Object.assign({}, definition);
    if (!def.id || typeof def.id !== 'string') throw new Error('activity id is required');
    if (!def.family || typeof def.family !== 'string') throw new Error('activity family is required');
    if (!def.route || typeof def.route !== 'string') throw new Error('activity route is required');
    if (definitions.has(def.id)) throw new Error('duplicate activity: ' + def.id);
    definitions.set(def.id, Object.freeze(def));
    return def;
  }

  function get(id) { return definitions.get(id) || null; }

  function list(options) {
    const opts = options || {};
    const context = opts.context || {};
    return [...definitions.values()].filter(def => {
      if (opts.family && def.family !== opts.family) return false;
      if (typeof def.eligible === 'function' && !def.eligible(context)) return false;
      return true;
    });
  }

  function unmount() {
    if (!mounted) return;
    try {
      if (typeof mounted.cleanup === 'function') mounted.cleanup();
      else if (typeof mounted.definition.unmount === 'function') mounted.definition.unmount();
    } finally {
      mounted = null;
    }
  }

  function mount(id, container, context, hooks) {
    const definition = get(id);
    if (!definition) throw new Error('unknown activity: ' + id);
    if (typeof definition.mount !== 'function') throw new Error('activity is route-based: ' + id);
    unmount();
    const cleanup = definition.mount(container, context || {}, hooks || {});
    mounted = { definition, cleanup };
    return definition;
  }

  function current() { return mounted ? mounted.definition : null; }

  root.NuranActivities = Object.freeze({ register, get, list, mount, unmount, current });
})(typeof window !== 'undefined' ? window : globalThis);
