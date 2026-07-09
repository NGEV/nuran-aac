# Research foundation and citation status

The project spec required every empirical claim to be checked against a real source before public release, with no invented citations. Status of each claim follows. Items marked **verified (source)** were checked against the named source in July 2026. Items marked **practitioner guidance** are widely used conventions without a single canonical study, stated as such per the spec's honesty note. Items marked **on-device** can only be verified on the target iPad and are covered by the in-app Device check screen.

## Verified

**Universal Core vocabulary (36 words).** Core mode uses the exact 36-word Universal Core set: all, can, different, do, finished, get, go, good, he, help, here, I, in, it, like, look, make, more, not, on, open, put, same, she, some, stop, that, turn, up, want, what, when, where, who, why, you. Developed by Project Core, Center for Literacy and Disability Studies, UNC Chapel Hill; licensed CC BY 4.0. Sources: [Project Core communication systems](https://project-core.com/communication-systems/), [UNC CLDS Universal Core page](https://www.med.unc.edu/healthsciences/clds/universal-core-vocabulary/).

**Core vocabulary in toddlers.** Banajee, M., DiCarlo, C., & Stricklin, S. B. (2003). Core Vocabulary Determination for Toddlers. *Augmentative and Alternative Communication*, 19(2), 67–73. Fifty toddlers shared a small set of core words across activities; the core list was dominated by pronouns, verbs, prepositions, and demonstratives. Source located via [Semantic Scholar record](https://www.semanticscholar.org/paper/e78a149b6e0d2915eaa28244f87e0cdccd3f2303). This study is also the basis for adding "yes" and "no" to Core mode alongside the Universal Core 36: yes/no forms dominated the toddlers' core utterances, and a communicator must be able to answer questions. The app documents them as an addition, not as part of the Universal Core set. Note: the popular "80% of communication comes from a few hundred core words" figure is a summary claim repeated across AAC literature (e.g., [AAC Institute](https://aacinstitute.org/core-vocabulary-and-the-aac-performance-report/)); this project cites the toddler study for the design decision and treats the exact percentage as a common summary, not a precise finding.

**WCAG target size and contrast.** Interactive targets meet WCAG 2.1 SC 2.5.5 Target Size (AAA), minimum 44×44 CSS px; text contrast targets SC 1.4.6 (AAA, 7:1) and always meets SC 1.4.3 (AA, 4.5:1). W3C Web Content Accessibility Guidelines 2.1, https://www.w3.org/TR/WCAG21/.

**Web Speech API.** SpeechSynthesis rate property range 0.1–10, default 1. W3C Web Speech API specification, https://wicg.github.io/speech-api/. The app defaults to 0.55.

## Practitioner guidance (stated as such, not as research findings)

**Category color coding.** The app's color tokens loosely follow the modified Fitzgerald key convention (people/pronouns yellow, verbs green, descriptors blue, social pink, questions purple). This is a long-standing AAC layout convention rather than an experimentally validated standard, and is labeled accordingly.

**Concrete, imageable words first; PECS-style picture+word pairing; aided language modeling; visual scene displays for social vocabulary; muted sensory-friendly palettes.** Each reflects established AAC and autism design practice (Bondy & Frost's PECS; Light & McNaughton's visual scene display work; published autism-organization design guidance). Before public release, a contributor with library access should attach specific primary citations for each in this file. Do not publish invented ones.

## On-device verification (in-app Device check screen)

Offline operation in Airplane Mode after first load; IndexedDB persistence across restart and iOS storage pressure (persistence is requested via `navigator.storage.persist()` but iOS behavior varies by version); speech synthesis availability, offline voice availability, and first-tap reliability; share-sheet export to Files/iCloud; MediaRecorder support for caregiver recordings.

## Honest limitations carried over from the spec

Unattended hourly file exports to iCloud are impossible for an iOS web app; met instead with internal hourly snapshots plus one-tap manual export (spec 2.3). Remote push alerts to a caregiver's phone cannot coexist with a fully offline guarantee; met with a loud on-device Help alert, with a remote alert left as a clearly separate, online-only future phase (spec 6.4).
