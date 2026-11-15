# ACCESSFLOW — Project status

_Last updated: 2026-11-15_

## Current phase
**MVP complete and verified by automated tests.** All phases of the roadmap have been built.
**Remaining work is mainly evidence that only people can provide:** manual screen-reader testing, co-designer
sessions, and fluent-speaker translation review. External integrations (Savanna, SMS) are blocked on missing information.

## Overall progress
| Area | State |
|---|---|
| Core journey (welcome → language → preview → register → profile → dashboard → jobs → job detail → apply → review → submit → confirmation → tracking) | ✅ Implemented and tested end to end (desktop + Android profile) |
| Mandatory ALX Track 1 features | ✅ Implemented; see the matrix below for the testing level of each |
| Reusability (Web Components, REST API, OpenAPI, schema.org) | ✅ Implemented and tested; LTI 1.3 / Open Badges ⛔ blocked |
| Accessibility evidence | 🟡 Automated testing complete; manual AT and co-designer testing **pending** |
| Deployment | 🟡 Production mode verified locally; Docker files written but **not executed** |

Legend: ✅ implemented and tested · 🟢 implemented, not fully tested · 🟡 partially implemented · ❌ not implemented · ⛔ blocked by an external dependency

## Requirement matrix (master prompt §4–§5)
| # | Requirement | Status | Evidence / notes |
|---|---|---|---|
| A | Multilingual (am, om, en, so, ti), Ethiopic font, `lang`/`dir` | ✅ / 🟡 | All 961 keys in every language (CI check); e2e switches languages. **Non-English texts are unreviewed drafts.** |
| B | Preferences: text size, contrast, simple words, captions, keyboard-first, read-aloud, language (+ reduced motion, shared device) applied everywhere and saved | ✅ | `e2e/preferences.spec.ts`; saved locally and to the account. Simple-word variants exist for selected texts only. |
| C | Accessible registration & profile: one question per screen, progress, validation, errors, no time limits, keyboard, announcements, save/resume, review, why-we-ask, shared engine | ✅ | `journey`, `keyboard`, `a11y` specs; backend validation tests. |
| D | Voice input on every applicable text field, review/edit/confirm, typing alternative, unsupported/permission errors, privacy disclosure | 🟢 | UI behaviour tested with simulated speech APIs (`assistive.spec.ts`). **Real speech recognition per language not tested.** |
| E | Read-aloud with play/pause/resume/stop; questions, instructions, errors, messages; never audio-only | 🟢 | Controls and captions tested with a simulated speech engine. **Real device voices not tested.** |
| F | AI assistant: explains questions, fields, instructions, options, next steps, jobs; grounded in approved help; no decisions, no filling, admits uncertainty, human route, consent before external AI, replaceable provider, local fallback | 🟢 | Local fallback tested (`OnboardingToApplicationJourneyTest`, a11y spec). Claude provider (`ClaudeAssistantProvider`, model `claude-opus-5-5`, low effort, server-side refusal fallbacks) **not exercised: no API key configured.** |
| G | Reusable profile: view, edit, choose what to share, reuse, consent required | ✅ | Prefill + share-choice + employer-view privacy asserted in backend and e2e tests. |
| H | Accessible job application on the same engine (voice, read-aloud, validation, save/resume, review, confirmation) | ✅ | `journey.spec.ts`, backend journey test. |
| I | Private support requests (no proof, private, staff-only access, minimal data, human route) | ✅ | Authorization matrix; staff e2e (`roles.spec.ts`). |
| J | Alternative identification (Fayda, kebele ID, passport, refugee ID, other document, partner referral, "Refer me"); staff verification; protected documents | ✅ | Never auto-verified (tests); only last 4 characters stored; uploads content-type checked; document views audited. |
| K | Private support-needs job filter | ✅ | Filter prefilled from the private profile choice; never stored or shown to employers (tests). |
| L | Employer accommodations form, shown clearly to job seekers | ✅ | Employer job form (a11y-tested), job detail page. |
| M | Progress tracker: completed, remaining, missing info, saved applications, submission status, next action | ✅ | Dashboard; applications page; status tracker. |
| N | Low data & offline: light pages, save/resume, drafts on connection failure, cached guidance, retry messages, offline vs online distinction, no insecure storage | ✅ / 🟢 | 144 KB first visit; slow-3G test; offline test. Service-worker caching of help/forms implemented, **not covered by an automated offline-reload test.** |
| O | Accessibility preview before registration | ✅ | `/preview`, tested. |
| §5 | Script-tag embedding, origin validation, postMessage checks, no third-party cookies, full-page fallback | ✅ | `embed.spec.ts` (all cookies stripped; unregistered origin blocked). Chromium only. |
| §5 | REST API + OpenAPI + schema.org/JobPosting | ✅ | `/swagger-ui.html`, JSON-LD test. |
| §5 | LTI 1.3, Open Badges 3.0 | ⛔ | Needs official platform registration/credentials. Documented. |
| §5 | Savanna integration | ⛔ | No official documentation/credentials. Generic partner integration ready; see `docs/integration/savanna-open-questions.md`. |
| §8 | Security & privacy | ✅ / 🟡 | See `docs/security/security-design.md` (includes the honest gaps). |
| L (spec) | SMS resume links | ⛔ | Needs an SMS provider account. Resume works by signing in (server-side drafts). |
| — | Resume-to-Profile (CV parsing), Accessibility Test Playground, Partner Integration Dashboard | ❌ | Optional ("Medium"/"Later" in the spec). Partners are configured in the database. |

## Tests
| Suite | Command | Result (2026-11-15) |
|---|---|---|
| Backend unit + integration (PostgreSQL) | `cd backend && ./mvnw verify` | **52 passed, 0 failed** |
| Frontend unit + translation completeness | `cd frontend && npm test` | **11 passed**; 961 keys complete in 5 languages |
| Lint (incl. jsx-a11y), types, formatting, build | `npm run lint && npm run typecheck && npm run format:check && npm run build` | **Pass** (0 warnings) |
| Browser, accessibility, journey, embed, performance | `cd frontend && npx playwright test` (production mode on :8081) | **59 passed, 0 failed** (desktop Chromium + Pixel 5 profile) |
| axe-core WCAG 2.2 A/AA | part of Playwright | **0 serious/critical** on every scanned page and step; **0 violations of any severity** on 10 public pages |
| Manual NVDA / TalkBack / co-designer | — | **Not performed — PENDING** |
| Docker Compose | — | **Not executed — Docker unavailable** |

Total automated: **122 tests passing.** Failed tests: none.

## Known bugs and limitations
- No known functional bugs at the time of writing.
- Session timeout is 8 hours; inside an embed, reloading the partner page requires signing in again (by design: no cookies).
- Rate limiting is in-memory (single server instance).
- Device drafts are not encrypted (only non-sensitive fields are stored; shared-device mode stores nothing).
- Unexpected server errors are logged with stack traces; review logging before production.
- Embedded components tested in Chromium only.
- Full list: `docs/accessibility/known-limitations.md`.

## Missing dependencies / external information
| Needed | For |
|---|---|
| Docker (Desktop or Colima) | Running `docker compose up` (files are ready) |
| Savanna/ALX documentation, origins, credentials, Track 1 brief PDF | Savanna integration, LTI 1.3 |
| SMS provider account (e.g. Africa's Talking) | SMS resume links |
| `ANTHROPIC_API_KEY` | Live AI assistant (local fallback works without it) |
| Co-designer(s), NVDA and TalkBack testers, a low-cost Android phone | Manual accessibility evidence |
| Fluent reviewers for am, om, so, ti | Translation sign-off |

## Remaining tasks (priority order)
1. Run the manual checklist (`docs/accessibility/manual-test-checklist.md`) with NVDA and TalkBack and a co-designer; log results; fix findings; update the conformance report.
2. Translation review by fluent speakers; then add the locale to `REVIEWED_LOCALES` in `frontend/src/i18n/index.ts` and set `reviewed = TRUE` for help articles.
3. Run `docker compose up --build` once Docker is available; fix any issue.
4. Test real speech recognition and read-aloud voices per language on Chrome for Android; update known limitations.
5. Test embedding in Safari and Firefox.
6. Savanna: when documentation arrives, add partner-signed launch tokens (ADR 0004) and register Savanna origins.
7. Optional: SMS resume links, CV-to-profile suggestions, partner self-service dashboard, ClamAV scanning, shared rate-limit store.

## Exact commands to run the project
```bash
# one-time: create DB role/databases (README §1), then
cp backend/.env.example backend/.env    # set DB_PASSWORD (+ optional DEMO_ACCOUNTS_PASSWORD)
cd frontend && npm install && npm run build && cd ..
cd backend && ./mvnw -DskipTests package
SERVER_PORT=8081 ACCESSFLOW_FRONTEND_DIR=../frontend/dist java -jar target/accessflow-backend-0.1.0-SNAPSHOT.jar
# open http://localhost:8081 · API docs http://localhost:8081/swagger-ui.html
node demo-partner-site/serve.mjs 5500 http://localhost:8081   # embedding demo at http://localhost:5500
```
Development with hot reload: README §2.

## How to resume development
1. `git log --oneline` — every milestone is a commit on `main`.
2. Verify the baseline: `cd backend && ./mvnw verify`; `cd frontend && npm test && npm run build`;
   start production mode (above) and run `cd frontend && npx playwright test`. All should pass.
3. Pick the next item from "Remaining tasks". Keep these rules (from the approved roadmap):
   every new screen passes axe with zero serious/critical issues and works by keyboard; every new endpoint is under
   `/api/v1`, owner-scoped, documented in OpenAPI and added to the authorization tests; every new text key is added to
   all five locale files (the `npm test` check enforces it); never claim accessibility compliance without logged evidence.
