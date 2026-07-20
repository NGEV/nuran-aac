# Nuran — Talk & Learn

Nuran is a free, private communication and early-literacy app for minimally verbal children. Once
installed, it runs offline, has no account, ads, analytics, or tracking, and keeps child data on the
device unless a caregiver deliberately exports a backup.

This workspace contains a held local update for owner review. It has not been pushed, deployed, or
submitted to an app store.

## Daily use

The child-facing Home screen offers **Talk**, **People**, **Learn**, and **Play**. Caregivers may also
enable an on-device Help alarm. Large buttons, stable positions, pictures with labels, calm colors,
and forgiving learning activities reduce memory and motor-planning demands.

Talk includes core vocabulary, category groups, a sentence bar, personal words, family voices, and
an optional type-to-speak keyboard. Words and sentences speak on the device. Recorded family audio
takes priority over the device voice.

## Talk Anytime

Talk stays reachable from child-facing activities by default. In **Caregiver → Settings → Talk &
access**, a caregiver can choose:

- **Persistent Talk button** — the default single Talk button in the top bar.
- **Custom dock** — Talk plus up to three stable quick words at the bottom.
- **Off** — no persistent Talk control.

The child can still open Talk from Home in every mode.

## Learn, Today, and Visual Routine

After a Learn session, Nuran can offer **Use [word] in Talk**. This opens the real Talk board on the
correct group and highlights the learned word; it does not create a separate practice board. The
caregiver can disable this bridge in Settings.

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
be set to Gentle or Full by a caregiver.

See `TECHNICAL.md` for architecture, verification, and native synchronization. The illustrated
user manual (`nuran-user-manual.pdf`, Version 2) covers this update: first-time setup, Talk
Anytime, Learn & Play, the Visual Routine, Caregiver Today, and grouped Settings.

## License

Nuran is open source under the MIT license. Bundled third-party assets retain their own notices and
licenses.
