/* Nuran product version — the authoritative runtime release identifier.
   Keep package.json and CHANGELOG.md aligned; verify-version.mjs enforces that contract. */
(function exposeNuranVersion(root) {
  root.NuranVersion = Object.freeze({
    version: '3.1.1',
    channel: 'stable',
  });
})(typeof self !== 'undefined' ? self : globalThis);
