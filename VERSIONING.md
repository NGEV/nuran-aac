# Nuran version policy

Nuran uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) in the form
`MAJOR.MINOR.PATCH`. The first release under this policy is `3.1.1`; older internal service-worker
labels such as `nuran-v25` were build iterations, not meaningful product versions.

## What changes each number

| Change | Example | Use it for |
|---|---|---|
| PATCH | `3.1.0` → `3.1.1` | Backward-compatible defect, pronunciation correction, copy repair, safe content correction, security repair, or internal improvement with no new caregiver/learner capability |
| MINOR | `3.1.1` → `3.2.0` | Backward-compatible feature, new activity, new caregiver option, new learning level, or substantial visible improvement |
| MAJOR | `3.2.0` → `4.0.0` | Incompatible data/export change, removal of a relied-on capability, or a navigation/access contract change that requires migration or relearning |

Use a pre-release such as `3.2.0-beta.1` for a family trial that is not yet the stable release.
Never change the contents of a published version; make a new version instead.

## Release records

- `version.js` is the authoritative runtime version and service-worker cache identity.
- `package.json` mirrors it for development tooling; `npm run verify:version` rejects drift.
- `CHANGELOG.md` records notable caregiver/learner-facing changes using
  [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) sections.
- Release commits use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for
  example `fix(speech): pronounce I as a word` or `feat(learn): add matching level`.
- Stable releases receive an annotated Git tag such as `v3.1.1`.
- A deployment is complete only when the exact commit succeeds in GitHub Pages and public bytes,
  the changed journey, and the new offline cache are verified.

## Web and Apple versions

The web/PWA product version and Apple store version are related but separately released. For a
native submission, set Apple's user-visible marketing version to the intended Nuran release and
increment its monotonically increasing build number. Do not change or distribute native metadata
as part of a web-only release.
