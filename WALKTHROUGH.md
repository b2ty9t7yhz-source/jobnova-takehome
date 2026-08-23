# JobNova Walkthrough Script

This 4–5 minute walkthrough demonstrates the product and backend architecture without exposing a private Indeed session or sending another application.

## 1. Product overview — 20 seconds

“JobNova connects explainable job discovery with a safe, resumable application workflow. The prototype is intentionally review-first: it never guesses sensitive answers, bypasses verification, or submits from the product demo.”

## 2. Recommendation experience — 90 seconds

1. Run `npm run dev` and open `http://127.0.0.1:4173`.
2. Point out the recommendation cards, transparent match score, and visible evidence.
3. Search for `research software`.
4. Open Filters, choose a work mode, and adjust the minimum match.
5. Save a role and switch to the Saved tab. Refresh once to show that the shortlist persists locally.
6. Open a job detail and explain the weighted match breakdown.
7. Expand **Recommendation receipt**. Show the versioned profile, policy, job ID, and evidence IDs, and explain that the ranking is deterministic and local.
8. Click **Review application**. Show that the local checklist contains no submit action and makes the safety boundary explicit.
9. Press `Escape` to close the dialog, then press `Cmd/Ctrl + K` to focus search.

## 3. Responsive layout — 30 seconds

Switch to a 390px-wide viewport. Show the condensed search controls, stacked cards, bottom navigation, full-width detail flow, and mobile review sheet.

## 4. Backend lifecycle demo — 75 seconds

Run:

```bash
npm run demo:seed
npm run demo:status
npm run demo:session
npm run demo:workflow
```

Explain that these commands:

- keep the first three commands fully browser-free and offline;
- do not read a candidate profile;
- use an isolated `runtime/demo/applications.json` repository;
- create five synthetic records covering `pending`, `in_progress`, `manual_action_required`, `failed`, and `submitted`;
- label every record with `source: "demo"` so a fixture cannot be mistaken for a live outcome.

Then point out the two `PASS` checks from `demo:session`: the synthetic browser state was restored exactly, and the plaintext cookie never appeared in the Session Vault file.

Explain that `demo:workflow` launches real headless Chromium but intercepts every request locally. It exercises the production workflow and field filler against synthetic Indeed/Smart Apply pages, including contact fields, state/country, exact radio/checkbox answers, and resume attachment. Point out the four `PASS` checks, six persisted transitions, final-review checkpoint, and `Submit requests sent: 0`.

Open the `manual_action_required` record and point out the synthetic CAPTCHA reason. Open the failed record and show its step, timestamp, URL, and recovery context.

## 5. Architecture and safety — 60 seconds

Use the README diagrams to explain:

- `BrowserManager` restores a saved Playwright storage state only when a live workflow is explicitly started;
- the session adapter can use an owner-only local file or the included tenant-scoped HTTPS Session Vault with client-side AES-256-GCM encryption, tamper authentication, atomic ciphertext persistence, and revocation;
- `ApplicationRepository` atomically persists state and transition history;
- a bounded job plan accepts only one to three candidate-reviewed Indeed roles with written fit reasons;
- `AnswerPolicy` fills only ordinary profile fields and exact candidate-verified answers;
- the strict live-profile preflight rejects placeholders and a missing/unreadable resume before opening Indeed;
- the workflow rechecks the Indeed host on every screen before transmitting profile data;
- verification, unknown required questions, external ATS redirects, and final review become `manual_action_required`;
- duplicate protection is based on a normalized Indeed job key;
- a production multi-user version would replace local stores with tenant-scoped encrypted storage and workers while keeping the domain state machine.

## 6. Close — 15 seconds

“The frontend demonstrates JobNova’s explainable, reproducible product experience. The backend demonstrates a reusable, observable state machine plus a tenant-scoped encrypted Session Vault, bounded role selection, strict data boundaries, and explicit human checkpoints. The recording uses only synthetic data, reaches final review through the production workflow, and proves that no demo submission request was sent. One candidate-controlled relevant live application was separately confirmed, while its private evidence remains outside the repository and video.”
