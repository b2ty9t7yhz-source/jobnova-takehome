# Changelog

All notable public changes are recorded here. The repository, both workspaces, tags, and GitHub Releases use the same semantic version.

## [1.1.0] - 2026-08-23

### Added

- Connected the recommendation UI to a same-origin synthetic workflow API.
- Added D1-backed, 24-hour demo state with an inspectable event timeline.
- Added the visible manual-verification pause, resume path, final-review receipt, and enforced zero-submit invariant.
- Added unit tests for the public state machine and API client, plus desktop/mobile Playwright coverage of the integrated path.
- Added an automated package-version consistency gate to the reviewer command and CI.

### Changed

- Unified the root, web, automation, lockfile, and release version at `1.1.0`.
- Updated the architecture, trust-boundary, challenge-audit, submission, and walkthrough documentation for the connected safe demo.

### Security

- The public API accepts only fixture job IDs and stores no candidate profile, resume, credentials, session, verification code, or legal answer.
- The public surface exposes no employer-submit endpoint and never connects to the private Indeed automation session.

## [1.0.0] - 2026-08-23

- Initial recruiter-ready release with the responsive recommendation product, explainable scoring receipts, review-first Indeed automation module, encrypted Session Vault, CI, frontend E2E, and one-command reviewer evidence.

[1.1.0]: https://github.com/b2ty9t7yhz-source/jobnova-takehome/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/b2ty9t7yhz-source/jobnova-takehome/releases/tag/v1.0.0
