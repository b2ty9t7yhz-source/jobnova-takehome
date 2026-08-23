# JobNova Design Decisions

This document is the short reviewer-oriented companion to the full README. It records the choices that make the prototype safe, explainable, and extensible without pretending it is a production-scale application service.

## Decision summary

| Question | Decision | Why this prototype chooses it | Extension trigger |
| --- | --- | --- | --- |
| Should recommendation explanations call an LLM? | Use deterministic, versioned weighted scoring with evidence IDs | A reviewer can reproduce every score, inspect gaps, and distinguish product data from model output. AI-assisted coding is encouraged by the challenge, but an AI API is not required. | Add an LLM only for bounded explanation drafting after grounding, evaluation, latency, cost, and fallback policies exist. Keep ranking evidence deterministic. |
| What should happen at CAPTCHA or an unknown required question? | Persist state and transition to `manual_action_required` | Verification proves human presence; guessing or bypassing it would violate both the challenge and the platform boundary. Unknown answers can materially misrepresent the candidate. | Resume only after the candidate completes the gate or supplies an exact answer. |
| Where should browser-session encryption happen? | Encrypt with AES-256-GCM in the automation client before HTTPS transfer | The Session Vault stores ciphertext-only envelopes and never receives the plaintext cookies or encryption key. Authentication also detects tampering. | Use managed key rotation and durable object storage when multiple users or long-lived sessions are introduced. |
| How should workflow progress be represented? | Explicit state machine plus atomic transition history | `pending`, `in_progress`, `manual_action_required`, `failed`, and `submitted` are inspectable and recoverable. The event trail makes pauses and failures explainable. | Move the same domain model to a transactional database and leased workers when concurrency is required. |
| Should the demo submit an employer application? | Stop at a visible final-review checkpoint | Review is a meaningful product boundary and prevents a UI demonstration from causing an external side effect. Live submission requires separate, action-time candidate confirmation. | Preserve the same checkpoint even in production; add consent records and an idempotent submission command. |
| How should multi-user support be added? | Keep the current domain modules; replace local adapters with tenant-scoped services | Browser, workflow, policy, storage, and observability are already separated. This avoids rewriting the safety logic while changing infrastructure. | Add tenant-scoped profiles, sessions, applications, event logs, queues, rate limits, retention, and access control. |

## Trust boundaries

| Boundary | Sensitive material | Control in this repository |
| --- | --- | --- |
| Candidate device ↔ Indeed | Profile fields, resume, answers, session cookies | Headed/manual verification, Indeed-host validation on every screen, exact-answer policy, bounded job plan |
| Automation client ↔ Session Vault | Playwright storage state | HTTPS-only endpoint, client-side authenticated encryption, envelope-size limits, tenant-bound bearer token |
| Local process ↔ filesystem | Application ledger, logs, failure screenshots | Atomic writes, owner-only permissions, Git exclusions, structured logs without profile values |
| Public demo ↔ reviewer | Illustrative job and candidate evidence | Synthetic fixtures, visible disclosure, no employer submission control, no private backend connection |

## Failure policy

| Situation | Recorded outcome | Recovery |
| --- | --- | --- |
| CAPTCHA, SMS, email, login, or device check | `manual_action_required` | Candidate completes verification, then runs `resume` |
| Unknown or sensitive required answer | `manual_action_required` | Candidate adds an exact reviewed answer or stops the application |
| External ATS redirect | `manual_action_required` | Treat as a different provider workflow; do not transmit profile data automatically |
| Selector or navigation failure | `failed` with step, URL, timestamp, error, and optional screenshot | Inspect the evidence, update the provider adapter, and resume only when safe |
| Final review reached | `manual_action_required` with `final_review` | Candidate reviews and gives explicit action-time confirmation before any live submit |

## Explicit non-goals

- High-volume or unattended applications.
- CAPTCHA solving, verification bypass, or anti-bot evasion.
- Guessing legal, demographic, sponsorship, compensation, or eligibility answers.
- Automating external employer ATS variants under the Indeed adapter.
- Training or claiming a production recommendation model from illustrative fixtures.
- Publicly deploying real candidate data, browser sessions, resumes, or application records.
- Claiming that live Indeed selectors are permanently stable.

## Why this is an AI-application project without an AI dependency

The product surface addresses a core AI-product problem: how a recommendation should expose evidence, provenance, uncertainty, versioning, and human review. The implementation deliberately keeps the score deterministic so those guarantees can be tested. A future language model can draft a readable explanation from the same evidence receipt, but it should not become the untraceable source of the ranking decision.
