/* Nuran AAC — web/native capability adapter.
   The canonical app source is identical in Safari and Capacitor. */

(function (root) {
  'use strict';

  function isNative() {
    return !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform());
  }

  async function shareBackup(json, filename) {
    if (!isNative()) return false;
    const plugins = root.Capacitor.Plugins || {};
    if (!plugins.Filesystem || !plugins.Share) return false;
    const b64 = btoa(unescape(encodeURIComponent(json)));
    await plugins.Filesystem.writeFile({ path: filename, data: b64, directory: 'CACHE' });
    const result = await plugins.Filesystem.getUri({ path: filename, directory: 'CACHE' });
    await plugins.Share.share({ title: 'Nuran backup', url: result.uri });
    return true;
  }

  function canRegisterServiceWorker() {
    return !isNative() && 'serviceWorker' in navigator && location.protocol !== 'file:';
  }

  root.NuranPlatform = Object.freeze({ isNative, shareBackup, canRegisterServiceWorker });
})(typeof window !== 'undefined' ? window : globalThis);
