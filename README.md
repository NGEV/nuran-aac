# Nuran — Talk & Learn

Current product version: **3.1.1**. Nuran uses
[Semantic Versioning](VERSIONING.md); notable changes are recorded in
[CHANGELOG.md](CHANGELOG.md).

Nuran is a free, private communication and early-literacy app for minimally verbal children. Once
installed, it runs offline, has no account, ads, analytics, or tracking, and keeps child data on the
device unless a caregiver deliberately exports a backup.

This workspace contains the source for the current web-PWA release. It is not an App Store build.

## Daily use

The child-facing Home screen offers **Talk**, **People**, **Learn**, and **Play**. Caregivers may also
enable an on-device Help alarm. Large buttons, stable positions, pictures with labels, calm colors,
and forgiving learning activities reduce memory and motor-planning demands.

The presentation uses a shared professional visual layer across child and caregiver screens:
calmer muted category colors, consistent white picture wells, bold labels below each picture, a
stable single-line Talk group rail, and clearly accented caregiver cards and settings sections.
The familiar child routes, large target geometry, and caregiver-controlled motion are unchanged.

Talk includes the complete Project Core 36 starter set plus an adjacent **Sentence Words** extension
for grammatical building blocks such as `is`, `am`, `are`, `a`, `the`, `and`, pronouns,
prepositions, and other high-use words. It also includes category groups, a sentence bar, personal
words, family voices, and an optional type-to-speak keyboard. Words and sentences speak on the device. Recorded family audio
takes priority over the device voice.

## Pictures and voices

The default picture policy uses a caregiver's photo when one has been added, then a reviewed
bundled real-world photograph, then one manually curated offline ARASAAC picture for every built-in
word. Every picture is paired with its written word. A caregiver may choose bigger pictures or an
explicit Words-only mode. A brand-new custom word without a photo uses its complete readable label,
never a single initial, and the Add-a-word screen encourages adding a familiar family photo.

The 120-pictogram ARASAAC bundle remains CC BY-NC-SA 4.0 and keeps Nuran free, ad-free, and
non-commercial. Exact per-word IDs and hashes are recorded in the project manifest; the in-app
Settings credits and `ARASAAC_CREDITS.md` carry the required attribution.

The default **Automatic** voice mode ranks the English voices actually installed on the device,
preferring offline and enhanced/natural voices when the browser identifies those qualities. Settings
also lists the installed voices by name so a caregiver can save a specific choice. Warm, Clear, and
Calm remain honest speaking styles applied to that selected voice; they adjust rate and pitch rather
than pretending to be separate voices. Family recordings remain the first playback choice.

## Talk Anytime

Talk stays reachable from child-facing activities by default. In **Caregiver → Settings → Talk &
access**, a caregiver can choose:

- **Persistent Talk button** — the default single Talk button in the top bar.
- **Custom dock** — Talk plus up to three stable quick words at the bottom.
- **Off** — no persistent Talk control.

The child can still open Talk from Home in every mode.

## Daily Language Rail

Talk also has a default-on **Daily Language Rail**: a caregiver-selected row of up to 12 important
words, in the exact order the caregiver chose. It appears on every Talk screen and never changes
itself from prediction or recent-use data. A caregiver may hide it or change the words in
**Words & groups**.

## Learn, Today, and Visual Routine

After a Learn session, Nuran can offer **Use [word] in Talk**. This opens the real Talk board on the
correct group and highlights the learned word; it does not create a separate practice board. The
caregiver can disable this bridge in Settings.

At the top of Learn, **Today** offers one small next step based on local learning activity: a new
learner begins with pressure-free exploration, then moves through picture and word matching at a
caregiver-manageable pace. There are no streaks, scores, leaderboards, or penalties.

Play is always available. An optional caregiver reminder can suggest a transition after 15--45
minutes, but it never closes Play or makes a lesson compulsory.

The simplified **Caregiver Today** screen is a calm action summary rather than an analytics
dashboard. It shows backup health, recently used words, family recording coverage, the Visual
Routine trial, and a short learning summary.

The first Visual Routine trial supports one caregiver-created family-photo scene with four familiar
word hotspots. The scene appears as a Talk group, is included in backup/restore, and uses soft delete
so it can be recovered. This deliberately stays a one-scene trial until a family validates it.

## Keeping data safe

Normal removal is reversible through **Recover deleted**. Nuran also keeps rolling local snapshots
and lets a caregiver export a complete JSON backup. The backup includes vocabulary, categories,
people, settings, communication history, learning progress, and the Visual Routine scene. Learning
history is capped at 20,000 events so it cannot grow forever.

Save exported backups somewhere outside the device, such as iCloud Drive. Nothing is uploaded by
Nuran itself.

## iPad setup

The PWA requires HTTPS for reliable installation and offline caching. Open its hosted URL in Safari,
choose **Share → Add to Home Screen**, then launch it once while online so the offline shell is
cached. The Capacitor iOS package uses the same canonical runtime source.

For a child device, consider iPadOS **Guided Access** so the device remains inside Nuran.

## Caregiver Settings

Settings are grouped by task: Talk & access, Voice & sound, Pictures & language, Learn & Play,
Motion & celebrations, and Data reminders. Changes save immediately. Motion defaults to None and can
be set to Gentle or Full by a caregiver. The four-step full setup makes the actual device voice,
real-world picture policy, motion, and celebration choices clear before handoff to the child.

See `TECHNICAL.md` for architecture, verification, and native synchronization. The illustrated
user manual (`nuran-user-manual.pdf`, Version 5) covers this update: first-time setup, Talk
Anytime, the Daily Language Rail, Learn & Play, the Visual Routine, Caregiver Today, and grouped
Settings.

## License

Nuran is open source under the MIT license. Bundled third-party assets retain their own notices and
licenses.
