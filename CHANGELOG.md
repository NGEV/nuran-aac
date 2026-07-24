# Changelog

All notable changes to Nuran are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.1] - 2026-07-24

### Added

- One product-version source shared by the visible app and offline service worker.
- A documented version, changelog, commit, tag, and deployment policy.

### Fixed

- The English pronoun `I` now remains `I` on screen but sends `eye` to device speech, avoiding
  Apple voices announcing “capital I.” Existing default overrides migrate safely, custom
  pronunciations remain unchanged, and caregiver recordings still have priority.

## [3.1.0] - 2026-07-24

### Added

- A complete, curated offline picture system for built-in communication words, with caregiver
  photo overrides, reviewed real-photo preference, explicit words-only mode, attribution, and
  iPad/PWA offline support.

[Unreleased]: https://github.com/NGEV/nuran-aac/compare/v3.1.1...HEAD
[3.1.1]: https://github.com/NGEV/nuran-aac/releases/tag/v3.1.1
