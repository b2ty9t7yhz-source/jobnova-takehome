# JobNova Submission Checklist

This checklist maps the take-home requirements to reviewer-visible evidence. It distinguishes implemented source code, reproducible local demonstrations, and live actions that are intentionally excluded from the submission artifact.

## Frontend requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Implement the recommendation job board | Complete | `packages/web/src/App.tsx`, reusable components, and deterministic fixtures |
| Responsive mobile/H5 experience | Complete | Responsive CSS, mobile navigation, mobile filter and review sheets; real Playwright journey verifies list/detail/review at 390×844 without horizontal overflow |
| Useful interaction extensions | Complete | Search, filters, saved-job persistence, detail navigation, keyboard shortcut, loading/empty states, and safe review preview |
| Explain recommendations | Complete | Visible category evidence, deterministic weights, and a versioned recommendation receipt |

## Backend requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Minimal end-to-end Indeed workflow | Implemented | `IndeedWorkflow`, `BrowserManager`, field filler, answer policy, and CLI `apply`/`resume` commands |
| Save and restore a browser session without a continuously running browser | Implemented end to end and tested | Local 0600 atomic store plus client-side encrypted HTTPS adapter and repository-provided tenant-scoped Session Vault |
| Pause/resume for CAPTCHA, SMS, email, device, or login checks | Implemented and tested | Manual-gate detector, `manual_action_required`, persisted session, and `resume` command |
| Do not bypass verification | Complete | Verification always becomes a manual checkpoint; no solver or bypass code exists |
| Use verified candidate data | Implemented | Private ignored profile, strict schema, exact-question `knownAnswers`, and sensitive-answer deny policy |
| Select a small number of suitable jobs | Implemented and bounded | `jobPlanSchema`, `plan:validate`, and `apply:batch`; one to three Indeed URLs, each with a candidate-reviewed fit reason |
| Track all required statuses | Complete | `pending`, `in_progress`, `submitted`, `failed`, and `manual_action_required` state machine |
| Complete the application flow | Complete, with reproducible and private evidence separated | Browser-backed synthetic E2E reaches final review with zero submit requests; one candidate-controlled relevant live application was separately confirmed on 2026-08-23 and retained only in ignored private evidence |
| Record history and failure context | Complete | Atomic repository, transition history, failure details, JSONL logs, and optional screenshots |
| Duplicate protection | Complete | Normalized Indeed job keys and idempotent `createOrGet` behavior |
| Reusable module design | Complete | Browser, domain, workflow, policy, storage, and observability adapters are separated |
| Multi-user extension explanation | Complete | README data model and production infrastructure notes |

## Reproducible reviewer path

Public frontend demo: <https://jobnova-jinhan-takehome.jessica2134.chatgpt.site>

```bash
npm ci
npx playwright install chromium
npm run reviewer:demo
```

The reviewer command runs all static checks, 49 unit/component tests, 3 browser-backed automation tests, 2 frontend E2E journeys, all five statuses, encrypted session restore, and the safe workflow fixture. Demo commands are offline, do not read a private profile, and store synthetic evidence separately under `runtime/demo/`. `demo:session` proves authenticated encryption, ciphertext-only vault persistence, and correct restore. `demo:workflow` launches headless Chromium with every request intercepted locally, then proves end-to-end form progression to final review without submission.

## Safety and packaging audit

- [x] `runtime/`, session state, screenshots, logs, and artifacts are ignored.
- [x] `profile.local.json`, candidate profiles, resumes, and `.env` files are ignored.
- [x] Only the placeholder `profile.example.json` is included.
- [x] Synthetic records carry `source: "demo"` and cannot be presented as live applications.
- [x] The frontend review panel contains no submission control.
- [x] The walkthrough uses no live Indeed login, CAPTCHA, employer communication, or submission.
- [x] Remote session envelopes contain ciphertext only; bearer token and encryption key stay in ignored environment configuration.
- [x] The included Session Vault binds credentials to a tenant, rejects malformed envelopes, writes atomically with mode `0600`, and supports revocation.
- [x] Recommendation receipts link visible reasons to a versioned, candidate-specific evidence map.
- [x] The review dialog traps keyboard focus, closes with Escape, and restores focus to its trigger.
- [x] The live workflow rejects placeholders and a missing/unreadable resume before opening a browser.
- [x] The workflow revalidates the Indeed host on every application screen before filling profile data.
- [x] Real Chromium tests cover native and ARIA fields, radio/checkbox answers, resume upload, and the final-review stop.
- [x] Frontend Playwright E2E covers the desktop discovery-to-review journey and the 390×844 mobile journey; CI retains screenshots as an artifact.

## Intentionally not claimed

- No real application data is packaged or presented as a demo fixture. The repository's `submitted` demo record remains explicitly synthetic; the separately confirmed live result exists only in ignored candidate-controlled runtime/account evidence.
- No live Indeed selector is claimed to be permanently stable.
- Local fallback storage is permission-restricted, not encrypted. The optional remote session adapter is encrypted and authenticated client-side.
- Recommendation fixtures are deterministic product data, not a trained AI ranking model.
- The one-day estimate is a challenge constraint, not a measured completion-time claim in this artifact.
- The go-through video and challenge-submission email are final candidate actions; the repository provides the script and verified package but does not claim they were recorded or sent.
