# JobNova Walkthrough Script

This 4–5 minute walkthrough is ordered for a hiring reviewer: product value first, one distinctive design decision, reproducible engineering evidence, and a concise safety close. It exposes no private Indeed session and sends no application.

## Recording safety preflight

- Use the public demo and this repository only; close Indeed, email, resume, and private runtime tabs.
- Hide browser bookmarks, notifications, terminal history, and unrelated tabs.
- Keep `runtime/`, `.env`, local profiles, session files, screenshots, phone numbers, and application IDs off screen.
- Record at 1440×900 or higher with browser zoom at 100%; use a readable terminal font.
- Rehearse once and keep the final video between 4:00 and 5:00.

## 1. Public product hook — 20 seconds

Open <https://jobnova-jinhan-takehome.jessica2134.chatgpt.site> immediately—do not begin on a slide or terminal.

“JobNova connects explainable job discovery with a safe, resumable application workflow. I designed it to make both recommendation evidence and human checkpoints visible.”

## 2. Recommendation and personal design signature — 80 seconds

1. Point out the recommendation cards, transparent match score, and illustrative-data disclosure.
2. Search for `research software`, filter to Hybrid, and save the role.
3. Open its details and expand **Recommendation receipt**.
4. Show the profile version, policy version, job ID, and evidence IDs: “This receipt is my personal design choice. A reviewer can reproduce why the recommendation appeared instead of trusting a black-box label.”
5. Click **Review application**, start the connected safe demo, advance to the verification checkpoint, then acknowledge the simulated gate and show the final-review timeline with `Submit requests: 0`.
6. Explain that this is persisted synthetic D1 state—not a private Indeed session—then press `Escape` and use `Cmd/Ctrl + K` to demonstrate keyboard behavior.

## 3. Responsive layout — 25 seconds

Switch to a 390px-wide viewport. Show the condensed search controls, stacked cards, bottom navigation, full-width detail flow, and mobile review sheet.

## 4. Reproducible engineering proof — 85 seconds

Run one command:

```bash
npm run reviewer:demo
```

Do not read every log line. Let the recording show the command, then cut or accelerate to the final PASS summary. Explain that it:

- runs version consistency, TypeScript, lint, 54 unit/component tests, production builds, 3 browser-backed automation tests, and 2 frontend Playwright E2E journeys;
- creates all five required statuses using synthetic records labeled `source: "demo"`;
- proves the encrypted Session Vault restores the original state while storing no plaintext cookie;
- runs the production workflow against locally intercepted synthetic pages;
- reaches final review with exact answers and a synthetic resume while sending zero submit requests.

End this segment on the seven-line `Reviewer evidence summary`, not on a long log.

## 5. Architecture and trade-offs — 55 seconds

Open `docs/DESIGN_DECISIONS.md` and explain only three rows:

- deterministic scoring makes recommendation evidence reproducible; an LLM is not forced into the ranking path;
- the public UI uses a D1-backed synthetic API to prove a vertical slice without exposing a live provider session;
- CAPTCHA and unknown questions persist `manual_action_required` instead of being bypassed or guessed;
- session state is encrypted in the client, while multi-user scale replaces adapters rather than the domain state machine.

## 6. Evidence close — 15 seconds

Show the GitHub Actions green check and the public URL.

“The result is a public, responsive product plus a reusable and observable workflow module. The reviewer path is deterministic, synthetic, privacy-safe, and ends with zero submission requests.”

## Final video audit

- [ ] The first frame is the public product, not setup instructions.
- [ ] Recommendation receipt, manual-action pause, persisted timeline, and zero-submit receipt are visible.
- [ ] The seven-line reviewer PASS summary is readable.
- [ ] GitHub Actions green status is visible near the end.
- [ ] No real Indeed, email, CAPTCHA, resume, phone number, cookie, session file, or application identifier appears.
- [ ] Duration is 4–5 minutes and the shared link opens without requesting editor access.
