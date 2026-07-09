# Nuran — technical documentation

Offline-first AAC and early literacy web app. Vanilla HTML/CSS/JS, no build step, no dependencies, no network calls at runtime. Built against the project spec (`aac app spec.md`) for Safari on iPad.

## Files

`index.html` is the shell. `styles.css` holds the sensory-friendly design system (muted palette, ≥44px targets, no animations). `symbols.js` is a self-made SVG symbol library (85 symbols, MIT). `db.js` is the IndexedDB data layer. `speech.js` handles synthesis, recorded audio, and the Help alarm. `seed.js` holds starter data. `app.js` contains all screens and behavior. `sw.js` and `manifest.webmanifest` provide PWA install and offline caching.

## Hosting (one-time)

Service workers require HTTPS, so the PWA path needs static hosting. Any static host works; GitHub Pages is free: create a repo, push these files, enable Pages, open the URL on the iPad, Add to Home Screen. After first load the app is fully offline. Opening `index.html` from the local filesystem also works (the app detects `file:` and skips service worker registration), but without the offline cache and with weaker storage durability — fine for development, not recommended for the child's device.

## Data model (IndexedDB, database `nuran-aac`)

Object stores: `vocabulary` (id, label, categoryId, symbolKey, colorToken, imageBlob, audioBlob, core, custom, sortOrder, timestamps, deleted/deletedAt), `categories` (id, name, colorToken, sortOrder, builtin, deleted), `people` (id, name, relationship, photoBlob, audioBlob, deleted), `settings` (key/value), `history` (tap log, capped at 5000, local only), `snapshots` (hourly/daily snapshots plus a continuously updated `mirror` record of critical stores), `errorLog` (capped plain-text log).

Durability design, per spec 2.3: soft delete everywhere (no normal action hard-deletes), hourly in-app snapshots with a rolling window (24 hourly + 14 daily), a redundant mirror of critical stores refreshed on every write, `navigator.storage.persist()` requested on boot, one-tap JSON export via the share sheet (blobs base64-encoded inline), and one-tap restore with preview and a pre-restore safety snapshot. On boot, `launchCheck()` detects empty/corrupt data and recovers silently from the mirror or offers snapshot/file restore — never a blank screen.

## Speech

Fallback order per spec 5.4: caregiver recording (MediaRecorder blob) → bundled core recording (`coreAudioBlob`, none shipped by default; the recorder supersedes it) → Web Speech synthesis at rate 0.55 default (caregiver adjustable 0.4–1.0) → silent visual feedback. iOS quirks handled: a muted priming utterance on first user gesture, async voice loading via `onvoiceschanged`, en-US local voice preferred.

## Accessibility invariants (do not weaken — spec Section 4)

Minimum 44×44 CSS px targets (comm tiles are ~150px+); no hover, drag, double-tap, or multi-finger gestures anywhere in the child-facing flow; muted low-saturation palette with WCAG AA+ text contrast; picture always paired with a text label; 4 choices per screen by default (caregiver may raise to 6/9/12); no CSS animations or transitions; all sound toggleable (the Help alarm intentionally overrides the toggle); consistent navigation with persistent Home access.

## Extension points (spec 3.7)

New learning packs are just data: add a category and vocabulary rows (see `seed.js` for the shape), plus optional symbols in `symbols.js`. Nothing in the rendering layer is category-aware beyond `colorToken`. New screens register as `screens.<name>` functions in `app.js` and are reachable via `data-nav`. The export format is versioned (`formatVersion`) for forward migration. A future remote Help alert should be built as a separate, clearly online-only module per spec 6.4 — do not entangle it with the offline core.

## Testing

`node --check` passes on all JS. The data layer has a smoke test (seed, soft delete/recover, snapshot restore, export/restore round-trip, mirror recovery, foreign-file rejection) run against an in-memory IndexedDB shim. On-device checks (Airplane Mode, storage persistence, share sheet, first-tap speech) are guided by the in-app Device check screen in the caregiver area, which mirrors the spec Section 7 checklist in plain language.
