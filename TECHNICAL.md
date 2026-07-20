# Nuran — technical documentation

Nuran is an offline-first AAC and early-literacy app built with vanilla HTML, CSS, and JavaScript.
The shipped runtime has no framework, bundler, account, backend, analytics, or runtime package
dependency. npm packages are development-only verification tools.

## Architecture and migration direction

`nuran-aac/` is the canonical runtime source. `nuran-ios/www/` is a generated mirror of shared files
and should not be hand-edited. Native capability differences live behind `core/platform.js`; the
same `app.js` now runs in Safari and Capacitor.

The chosen modernization strategy is **gradual modular separation, not a rewrite**. A rewrite would
discard stable AAC behavior and require the family to revalidate everything at once. The current
foundation extracts low-risk seams first while preserving the build-free runtime:

- `core/settings.js` — defaults, validation, and normalization for all settings.
- `core/activity-registry.js` — activity metadata plus mount/unmount lifecycle hooks.
- `core/platform.js` — web/native sharing and service-worker capabilities.
- `features/activity-catalog.js` — declarative Learn and Play catalog with motion eligibility.
- `db.js` — IndexedDB, bounded history, backup/restore, snapshots, and recovery.
- `speech.js` — recordings, synthesis, and the local Help alarm.
- `seed.js` — starter vocabulary/categories and idempotent essentials.
- `app.js` — current screen router and feature implementations; it remains the next extraction target.

The Activity Registry is intentionally a foundation. Existing hub lists use it now. Future slices
can move individual activity implementations out of `app.js` behind its mount/unmount contract,
one tested activity at a time.

## Settings schema

`NuranSettings.defaults` is the single semantic default source. `normalize()` validates persisted
values and bounds arrays before UI code uses them. New settings must be added there first and tested.
Important current defaults include:

- `talkAccessMode: "button"`
- `talkDockWordIds: ["core-help", "core-stop", "seed-bathroom"]`
- `learnTalkBridge: true`
- `motionLevel: "none"`
- `density: 4`

## Data model

IndexedDB database `nuran-aac` is at version 3. Stores are:

- `vocabulary`, `categories`, `people`, `visualScenes`
- `settings`
- `history` — communication log, capped at 5,000
- `progressLog` — learning events with stable `wordId` where available, capped at 20,000
- `snapshots` — rolling hourly/daily copies plus a current mirror
- `errorLog`

Complete export, snapshot, and restore include communication history, learning progress, and visual
scenes. Restore clears stores that are absent from an older backup so stale newer-format data cannot
survive unnoticed. Blobs are encoded inline for portable caregiver-controlled JSON backups. The
one-scene Visual Routine stores its resized photo as a bounded data URL because WebKit IndexedDB Blob
writes were unreliable in the tested path; older `imageBlob` records remain readable.

## Speech and Talk access

Speech fallback is caregiver recording → bundled core recording when present → Web Speech synthesis
→ visible silent feedback. The default synthesis rate is 0.55 and a caregiver can change rate and
pitch. Speaking-style labels describe device voice adjustments; they are not distinct downloaded
voices. A muted priming utterance handles iOS first-gesture behavior.

`talkAccessMode` supports `button`, `dock`, and `off`. Talk access is rendered only on child-facing
routes. The custom dock always starts with Talk and contains at most three de-duplicated word IDs.

## Accessibility invariants

- Targets remain at least 44×44 CSS pixels; communication tiles are substantially larger.
- Pictures remain paired with text labels.
- Core child actions do not require hover, drag, double-tap, swipe, or multi-touch.
- Motion is caregiver-gated and CSS honors `prefers-reduced-motion`.
- Sound is caregiver-controlled except the deliberately enabled Help alarm.
- A dedicated status live region replaces whole-screen announcements.
- Dialogs are labeled, receive focus, and return focus on close.
- Caregiver holds have keyboard/switch-compatible activation paths.
- Talk/Home positions remain stable within their selected access mode.

Automated axe checks are useful guardrails, not a substitute for VoiceOver, Switch Control, large
text, Guided Access, first-tap speech, and real family observation on the target iPad.

## Offline shell

`sw.js` (`nuran-v13`) precaches 83 verified assets. Navigation failures may fall back to `index.html`; missing
scripts, images, or data do not receive HTML as a false success. Only successful network responses
are cached. Bump `CACHE_VERSION` for every shipped runtime change.

## Development and verification

Install development tools once with `npm install`. The authoritative checks are:

```sh
npm run verify:all
```

This verifies every service-worker asset, runs Node unit/data tests through `node:test` and
`fake-indexeddb`, then runs a direct Playwright WebKit flow at 1280×720 and 768×1024. The browser flow
checks the onboarding viewport, caregiver keyboard-confirm gate, Talk Anytime button/dock/off modes,
dock duplicate refusal without persistence changes, Caregiver Today empty-state navigation, grouped
Settings, one Visual Routine, the most-practiced Learn-to-Talk bridge selection, absence of page
errors, and axe WCAG A/AA results on the main changed states.

The standard Playwright runner configuration remains available as `npm run test:e2e:runner`, but the
direct `npm run test:e2e` script is the authoritative browser check in this exported workspace.

Optional evidence screenshots:

```sh
NURAN_SCREENSHOT_DIR=/tmp/nuran-review npm run test:e2e
```

## iOS synchronization

After canonical runtime changes:

```sh
npm run sync:ios
```

The script copies and SHA-256 verifies shared runtime files into `../nuran-ios/www/`. iOS-owned app
icons are preserved. The legacy `native.js` file may remain as an unused compatibility artifact; the
current `index.html` does not load it. This command does not run Capacitor, build Xcode, push, deploy,
or publish.

## Next modular slices

Continue by extracting route lifecycle, then one feature at a time (Talk access, Caregiver Today,
Visual Routine, individual activities). Each extraction should preserve rendered behavior, add a
focused test, sync iOS, and receive owner review. Do not combine that migration with a framework or
storage rewrite.
