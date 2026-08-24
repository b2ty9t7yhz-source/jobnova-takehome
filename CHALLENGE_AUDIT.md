# Challenge Requirement Audit

This audit was rebuilt from the supplied two-page challenge document. It separates code evidence, reproducible demo evidence, private/live actions, and final delivery actions so the submission never overstates what was completed.

## Frontend

| Challenge requirement | Evidence | Audit result |
| --- | --- | --- |
| Implement the Figma job board and recommendation page | `packages/web/src/App.tsx`, component library, job/detail/match layouts, desktop Playwright E2E, [public demo](https://jobnova-jinhan-takehome.jessica2134.chatgpt.site) | Complete; visually compared with the supplied Figma and rechecked at 1440×1000 |
| Finish within an estimated one day | Focused two-workspace vertical slice and 4–5 minute walkthrough | Design target supported; no unverifiable elapsed-time claim |
| Make a responsive mobile H5 view without a supplied mobile design | Responsive CSS, `MobileNav`, mobile sheets, 390×844 Playwright list/detail/review journey | Complete; no horizontal overflow observed |
| Add useful interactions where appropriate | Search, filters, shortlist persistence, detail view, loading/empty states, `Cmd/Ctrl+K`, and a D1-backed safe workflow timeline | Complete; the public vertical slice reaches a manual gate and final review with zero submission capability |

## Backend

| Challenge requirement | Evidence | Audit result |
| --- | --- | --- |
| Minimal end-to-end Indeed auto-apply workflow | `IndeedWorkflow`, `BrowserManager`, `field-filler`, CLI | Implemented; live selectors remain platform-dependent |
| Own Indeed account and manual verification | `login` command, verification gates, and ignored private runtime history | Complete; private account evidence is intentionally excluded from the package |
| Own profile: resume, contact, experience, education, preferences | ignored `profile.local.json`, strict schema, profile validation | Implemented without committing personal data |
| Securely save/restore login remotely without leaving a browser running | `EncryptedRemoteSessionStore`, tenant-scoped `EncryptedSessionVault`, HTTPS server, `demo:session`, AES-256-GCM envelope, ephemeral restore context | Complete end to end and tested; owner-only local fallback also available |
| Pause/resume for SMS, email, CAPTCHA; never bypass | gate detector, `manual_action_required`, session save, `resume` | Complete and unit-tested |
| Select a small number of suitable jobs | one-to-three job plan with Indeed URL validation and mandatory fit reason | Complete and bounded |
| Automatically complete Indeed application flow using profile | known field filler, exact-answer policy, resume upload, safe continuation loop, browser-backed synthetic E2E fixture, ignored private live history | Complete; the reproducible fixture reaches final review with zero submit requests, and one candidate-controlled relevant live application was separately confirmed on 2026-08-23 |
| Record pending, in progress, submitted, failed, manual action required | state machine, repository, CLI status, five isolated demo fixtures, six-event E2E transition trace | Complete and reproducible offline |
| Explain architecture | README diagrams and module map | Complete |
| Explain browser session storage/restore | README local and encrypted remote modes | Complete |
| Explain manual verification and failures | README, state machine, JSONL logging, failure artifact path | Complete |
| Explain extension to multiple users | README tenant data model and infrastructure boundary | Complete |
| Only own information/relevant roles; no bypass | private ignored profile, bounded reviewed plan, deny policy, manual gates | Enforced by design and documented |

## AI scope decision

The document encourages AI-assisted coding; it does not require an LLM API. The product therefore uses deterministic, explainable recommendation scoring and exposes a recommendation receipt. This avoids pretending a black-box model is necessary while still demonstrating thoughtful AI-product infrastructure: evidence, provenance, versioning, review boundaries, and safe failure handling.

## Personal design signature

- Candidate-specific evidence is grounded in mathematics + computer science, reproducible software, scientific/data tooling, early-career goals, and location preferences.
- Every recommendation can be traced to evidence IDs and a policy version.
- Synthetic workflow roles reflect research software, reproducibility, data quality, and frontend quality rather than generic placeholder jobs.
- Security choices are visible and testable: HTTPS-only remote storage, tenant-scoped ciphertext vault, encryption before transfer, tamper rejection, explicit revocation, strict live-profile preflight, bounded batch size, exact-answer policy, per-screen Indeed-host checks, and no silent submission.
- The browser-backed fixture uses the production workflow, locally intercepts every request, verifies native and ARIA form controls, and proves that final review can be reached without a submit request.
- The public UI and backend are connected through a synthetic-only Worker API with a D1 event record, a 24-hour TTL, an explicit manual-action pause, and no route capable of employer submission.

## Final actions outside the repository

- Record the walkthrough using `WALKTHROUGH.md`.
- Send the verified source archive and video to the email address specified in the challenge.
- Keep any private account state, resume, application record, email, and identifiers outside the source archive and recording.
