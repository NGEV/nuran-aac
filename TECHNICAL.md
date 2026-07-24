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
- `core/symbol-registry.js` — one caregiver-photo/real-photo/curated-ARASAAC/full-word fallback
  policy for all visible symbols.
- `core/activity-registry.js` — activity metadata plus mount/unmount lifecycle hooks.
- `core/platform.js` — web/native sharing and service-worker capabilities.
- `features/activity-catalog.js` — declarative Learn and Play catalog with motion eligibility.
- `visual-system.css` — presentation-only design tokens and shared visual treatments layered over
  the stable accessibility/layout primitives in `styles.css`. This keeps future art-direction work
  separate from feature behavior and avoids another monolithic styling rewrite.
- `db.js` — IndexedDB, bounded history, backup/restore, snapshots, and recovery.
- `speech.js` — recordings, synthesis, and the local Help alarm.
- `seed.js` — starter vocabulary/categories and idempotent essentials. It keeps the licensed
  Universal Core 36 unchanged, while a separate data-defined Sentence Words extension supplies
  audited grammar/function words. `ensureEssentials()` adds that group to existing installs without
  restoring a word the caregiver deliberately removed.
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
- `pictureStyle: "best"` — caregiver photo → reviewed real photograph → curated offline ARASAAC
- `pictureDisplay: "together"` — pictures plus words; `big` and explicit `words` are caregiver options
- `preferRealPhotos: true` — real photographs precede drawn pictures when both are reviewed
- `dailyLanguageRail: true` — caregiver-selected words retain their exact order on every Talk screen
- `dailyLanguageWordIds` — up to 12 stable words; never generated from predictions or recent use
- `voiceURI: "auto"` — highest-ranked installed offline English voice

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
→ visible silent feedback. The default synthesis rate is 0.55. Automatic mode ranks the device's
actual English voices, strongly prefers local/offline voices, recognizes enhanced/natural quality
labels when exposed, and avoids common novelty/compact voices. Caregivers can save an installed
voice by its stable URI; if it later disappears, synthesis safely returns to Automatic. Language
activities select a matching installed language voice instead of forcing the saved English choice.
Speaking styles remain rate/pitch adjustments to the selected voice, not downloaded voice models.
A muted priming utterance handles iOS first-gesture behavior.

Display text and speech text are separate data fields. The English pronoun tile remains visibly
`I`, while its `speakAs` value is `eye`: isolated `I` and lowercase `i` were both observed to make
some Apple voices announce “capital I.” `Seed.ensureEssentials()` migrates either ineffective value
to `eye` without overwriting a different custom pronunciation. Caregiver recordings still take
priority over this synthesis-only override. Any future pronunciation exception must preserve the
visible label, be idempotently migrated for existing records, and have a device-speech regression
test.

`core/symbol-registry.js` is the only visual policy. It uses a caregiver photo when present, then a
reviewed source-recorded real photograph when preferred, then the exact curated offline ARASAAC
pictogram. `nuran-real-photos.js` contains only bounded offline photo references; `nuran-arasaac.js`
maps all 120 seeded visual keys to hashed local PNGs. The same resolver supplies word tiles and
navigation aliases. A caregiver-created word with no photo or bundled match renders its complete
word label, never a one-letter fallback. Historic visual-mode values normalize to the current
picture-display settings without discarding caregiver photos.

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

## Visual system

`styles.css` remains the behavior-adjacent layout and accessibility foundation.
`visual-system.css` is loaded afterward and owns the visual art direction: canvas/surface/ink tokens,
semantic category colors, radii, shadows, focus appearance, icon wells, navigation chrome, Talk
composer and category rail, child tiles, caregiver cards, Settings sections, and responsive
welcome composition. New features should reuse these variables and shared component classes before
adding feature-specific presentation. Visual changes must preserve the accessibility invariants
above and be reviewed at 1280×720 and 768×1024.

## Offline shell

`version.js` is the authoritative product version. `sw.js` derives its immutable cache name from
that value (`nuran-3.1.1`) and precaches 153 verified runtime assets, including the offline real-photo and
120-pictogram ARASAAC packs, registries, and both credit notices.
Navigation failures may fall back to
`index.html`; missing scripts, images, or data do not receive HTML as a false success. Only
successful network responses are cached. Every shipped runtime change receives a new SemVer
release; `npm run verify:version` rejects drift between runtime, package, cache, and changelog.
See `VERSIONING.md`.

## Development and verification

Install development tools once with `npm install`. The authoritative checks are:

```sh
npm run verify:all
```

This verifies every service-worker asset, runs Node unit/data tests through `node:test` and
`fake-indexeddb`, then runs a direct Playwright WebKit flow at 1280×720 and 768×1024. The browser flow
checks the onboarding viewport, complete default picture setup, absence of the retired cartoon art
and single-letter fallback (including a pictureless custom word), People and Talk coverage,
Talk Anytime button/dock/off modes, the Daily Language Rail, Caregiver Today navigation, grouped
Settings, one Visual Routine, the Learn-to-Talk bridge selection, non-gating Play reminder copy,
absence of page errors, and axe WCAG A/AA results on the main changed states.

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

The script copies and SHA-256 verifies shared runtime files into `../nuran-ios/www/`. Then run
`npm run ios:sync` from `nuran-ios/` before opening Xcode so Capacitor refreshes
`ios/App/App/public/` and native configuration. iOS-owned app icons are preserved. The legacy
`native.js` file may remain as an unused compatibility artifact; the current `index.html` does not
load it. Neither command builds Xcode, pushes, deploys, or publishes.

## Next modular slices

Continue by extracting route lifecycle, then one feature at a time (Talk access, Caregiver Today,
Visual Routine, individual activities). Each extraction should preserve rendered behavior, add a
focused test, sync iOS, and receive owner review. Do not combine that migration with a framework or
storage rewrite.
