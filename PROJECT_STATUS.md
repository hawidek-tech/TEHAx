# ACCESSFLOW — Project status (DIGITAL BRIDGE Accessibility Hackathon 2026, Track 1)

_Last updated: 2026-11-15 (final compliance audit)_

**Important:** the DIGITAL BRIDGE Technical Guide v2 is **not in this repository**. This audit follows the requirements as
quoted in the audit brief (sections 2–17). Anything in the guide that the brief did not quote could not be checked.

Statuses: **PASS** verified implementation + test evidence · **PARTIAL** implemented but incomplete or under-tested ·
**FAIL** missing or not working · **NOT TESTED** needs human or real-device evidence.

## Test totals (run 2026-11-15)
| Suite | Result |
|---|---|
| Backend (`cd backend && ./mvnw verify`) | 56 passed, 0 failed |
| Frontend unit + translation completeness (`npm test`) | 11 passed; 1,021 keys complete in en, am, om, so, ti |
| Browser / accessibility (`npx playwright test`, production mode) | 74 passed, 0 failed (desktop Chromium + Pixel 5 profile) |
| Lint (incl. jsx-a11y), types, formatting, production build | pass, 0 warnings |
| **Total automated** | **141 passing** (previously reported 122 — all still pass) |
| Docker Compose | **NOT TESTED** — Docker is not installed on this machine |

## Requirements audit
| Status | Requirement | Actual implementation | Evidence / test result | Remaining limitation | Next action |
|---|---|---|---|---|---|
| PASS | One-script install, custom element | `<script src=".../db-signup.js" defer>` + `<db-signup>`; also `<accessflow-signup|profile|job-application>` | `plugin.spec.ts`: blank page + Savanna | — | — |
| PASS | Attributes `lang`, `api`, `theme` | `lang` (en/am/om/so/ti), `api` (module origin), `theme` (auto/light/dark/high-contrast), plus `view` (signup/profile/jobs/job-application), `job-id`, optional `partner-key`, `frame-title` | `plugin.spec.ts` (am honoured), `a11y-new.spec.ts` (dark) | — | — |
| PASS | Custom events, bubbling + composed | `db-signup:ready`, `db-signup:step`, `db-signup:support`, `db-signup:done`; `{bubbles: true, composed: true}`; no personal data | `plugin.spec.ts` asserts events and absence of email/name/support text | Event payload schema not compared with the official guide (not available) | Compare with official data contract when available |
| PASS | CSS isolation, no host style changes, no Bootstrap/Savanna dependency | Shadow DOM wrapper + iframe; module styles never leave the shadow root | `plugin.spec.ts`: hostile host CSS doesn't reach inputs; host button/heading/body unchanged | — | — |
| PASS | No unnecessary globals | IIFE with no exports | `plugin.spec.ts` compares `window` keys before/after | — | — |
| PASS | Host CSS variables with fallbacks | `--db-signup-accent` (applied only if ≥ 4.5:1 on white), `--db-signup-radius`, `--db-signup-border`, `--db-signup-background`, `--db-signup-link-color` | Blank page uses them; axe passes | Accent ignored in dark mode | — |
| PASS | Responsive | Fluid iframe height via messages; 320 px reflow | `reflow.spec.ts` (main app), Pixel 5 project | Embedded reflow at 320 px not separately tested | Add embedded reflow test |
| PASS | First load < 500 KB | Loader 4.9 KB (2.1 KB gzip). Module first load: **359 KB** transferred (Amharic, Ethiopic font downloaded); main app English first visit **144 KB** | `plugin.spec.ts`, `performance.spec.ts` | Ethiopic font (2 weights, ~150 KB) dominates when not installed on the device | Consider single-weight font |
| PASS | Savanna integration | `savanna/` = official starter @ `9e83ac7`, **originals unmodified**; added `pages/signup.html`, `profile.html`, `jobs.html` | `plugin.spec.ts`: register → profile edit on another page (same session) → apply in career gateway; no page errors; Bootstrap still works | Not tested on a live Savanna deployment; Savanna `index.html` not linked (left unmodified) | Register real Savanna origins |
| PASS | Blank-page integration | `demo/blank.html`, no frameworks | `plugin.spec.ts` | — | — |
| PASS | Unregistered sites blocked | `frame-ancestors` from registered origins (keyless install resolves by origin) | `plugin.spec.ts`, `embed.spec.ts`, `LearnerApiTest` | — | — |
| PASS | Data contract endpoints | `POST /api/v1/learners`, `PATCH /api/v1/learners/{id}`, `PUT /api/v1/learners/{id}/support`, `GET /api/v1/learners/{id}/export`, `DELETE /api/v1/learners/{id}` (password required) | `LearnerApiTest` (4 tests: lifecycle, IDOR → 404, support never visible to employers, keyless embed) | Request/response field names not compared with the official contract (guide unavailable) | Align field names with the guide |
| PASS | Support data separate, never to employers | Separate column/requests; employer views use consented snapshot only | Backend journey + learner tests | — | — |
| PASS | View / export / delete own data | Account page, `/account/export`, `/learners/{id}/export`, delete with password | Backend tests | — | — |
| PASS | One question per screen, Back/Continue, "Question N of M", focus to heading | Form engine | `journey`, `keyboard` specs | — | — |
| PASS | Immediate persistence, resume after refresh | Server + device drafts, conflict detection | `journey.spec.ts` (sign out/in), offline q7 reload | — | — |
| PASS | Accessible validation and announcements | Error summary (alert, focused), inline errors, spoken by audio guide | `keyboard.spec.ts`, `audio-sign-offline.spec.ts` | Real screen-reader output unverified | NVDA/TalkBack session |
| PARTIAL | Voice input on every applicable field, editable transcript | Web Speech API, privacy notice, review-before-use | `assistive.spec.ts` (simulated recogniser) | **Real speech recognition not tested on any device/language**; Afaan Oromo/Somali/Tigrinya likely unsupported by browsers | Test Chrome Android with am/en |
| FAIL | Voice-note fallback when recognition is unavailable | Not implemented (users can type, or use the phrase board) | — | No audio note recording | Implement voice notes for support messages with consent and storage rules |
| PASS | Read-aloud (play/pause/resume/stop, captions) | Speech synthesis, never automatic | `assistive.spec.ts` (simulated) | Real voices untested | Real-device check |
| PARTIAL | One-touch audio accessibility (blind users) | "Activate Audio Accessibility" on the first screen + header toggle; reads pages, questions, choices, how to answer, progress, errors, review, success; Repeat/Pause/Resume/Stop/Help/Turn off; text always shown | `audio-sign-offline.spec.ts`: English + Amharic with a **simulated** engine; no-voice message | **No real voice tested**; this Mac has no Amharic voice; recorded-audio fallback **not implemented** (no recordings) | Test on Android with Amharic TTS; record core prompts |
| NOT TESTED | Audio guidance with real screen readers (no conflict) | Opt-in only, never autoplays | — | Needs NVDA/TalkBack users | Manual session |
| PARTIAL | Sign-language communication | Camera opt-in, indicator, stop, track cleanup; phrase board; confirm-before-use; recogniser adapter; validated clip manifest | `audio-sign-offline.spec.ts` (fake camera), `a11y-new.spec.ts` | **Sign recognition NOT implemented** (no validated EthSL model); **text-to-sign has no clips** | See `docs/integration/sign-language.md` |
| PASS | Camera privacy | No recording/upload; `Permissions-Policy: camera=(self)`; frame `allow="camera"` | Tracks `ended` after stop and after close (test) | — | — |
| PASS | Low-literacy mode, icons with text | "Simple words" variants, examples, pictograms with labels | `preferences.spec.ts` | Simplified variants mainly English | Add simplified texts per language with reviewers |
| PASS | 200 % zoom, 320 px, keyboard, no time limits, no drag-only | — | `reflow`, `keyboard`, `preferences` specs | Real-user keyboard test pending | Manual session |
| PASS | Offline-first answers | Device draft (non-sensitive fields), sync on reconnect, conflict dialog, offline banner, offline reload via service worker | `audio-sign-offline.spec.ts`: drop at question 7, reload offline, answers restored, synced after reconnect | Sensitive answers typed offline are not stored on the device by design | — |
| PASS | Duplicate submission prevention | Submit button disabled while sending; server rejects a second application (409) | Backend journey test | — | — |
| PARTIAL | Multilingual (am, en, om, so, ti) | All UI text in language files; 1,021 keys complete per language | i18n check in `npm test` | **am/om/so/ti are unreviewed drafts** | Fluent-speaker review |
| PASS | Ethiopian calendar, phone numbers 09/07/+251, Ethiopic font | Converter (tested), normaliser (tested), font with `unicode-range` + local-first | Unit + backend tests | — | — |
| PARTIAL | AI architecture | Replaceable provider, local approved-help fallback, consent per question, redaction | Local fallback tested | **Claude provider not exercised (no key)**; no local model | Test with a key; evaluate a local model only if it adds value |
| PASS | Security & privacy (auth, roles, employer boundaries, staff permissions, validation, secrets) | See `docs/security/security-design.md` | Authorization matrix, learner IDOR tests, upload tests | CORS is not enabled (same-origin by design); logs include stack traces on unexpected errors | Review logging before production |
| PASS | README, `.env.example`, `openapi.yaml`, `CONFORMANCE.md`, licences, cost estimate | Repository root | — | Team members / co-designer names not provided | Team to fill in |
| NOT TESTED | `docker-compose.yml` | Written (app + db + demo hosts) | **Docker not installed** | — | Run `docker compose up --build` |
| NOT TESTED | NVDA, TalkBack, real keyboard user, co-designer completion, translation review | Checklist ready | — | All pending | Run sessions, log in `docs/accessibility/manual-test-log.md` |

## Exact commands (demonstration)
```bash
# 1. Production mode (backend serves the built frontend)
cd frontend && npm install && npm run build && cd ..
cd backend && ./mvnw -DskipTests package && cd ..
(cd backend && SERVER_PORT=8081 ACCESSFLOW_FRONTEND_DIR=../frontend/dist java -jar target/accessflow-backend-0.1.0-SNAPSHOT.jar)
# 2. Host sites (separate origins)
python3 -m http.server 5510 -d savanna     # http://localhost:5510/pages/signup.html | profile.html | jobs.html
python3 -m http.server 5520 -d demo        # http://localhost:5520/blank.html
# 3. Tests
cd backend && ./mvnw verify
cd frontend && npm test && npx playwright test
```

## How to resume
1. `git log --oneline` — every step is committed.
2. Start production mode and the two host servers (above), run all tests — all should pass.
3. Next actions, in order: run the manual checklist with NVDA/TalkBack and the co-designer; fluent-speaker translation
   review; `docker compose up --build`; real-device voice tests (Amharic/English TTS, speech recognition); align the
   learner API field names and event payloads with the official guide once it is in the repository.
