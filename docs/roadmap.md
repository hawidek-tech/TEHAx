# ACCESSFLOW development roadmap

Status: **approved 2026-11-15**. Current phase: **Phase 0 complete – awaiting review.**

Each phase ends with a demo and a review. The next phase starts only after approval.

## Non-negotiable rules (final corrections from review)

1. **Voice input on every applicable text-entry field.** Typing is always available. Technical
   limitations (browser and language support) are documented in
   [accessibility/known-limitations.md](accessibility/known-limitations.md).
2. **Co-designer feedback and manual accessibility testing happen in every phase**, not only at the end
   ([accessibility/codesign-log.md](accessibility/codesign-log.md),
   [accessibility/manual-test-log.md](accessibility/manual-test-log.md)).
3. **Embedded authentication never depends on third-party cookies.** The full-page new-tab fallback
   must always work ([ADR 0004](adr/0004-embedded-components.md)).
4. **The REST API foundations are built and tested before the Web Components.** Phase 9 finalises
   and hardens the API ([ADR 0007](adr/0007-api-before-components.md)).
5. **A complete onboarding-to-job-application journey comes before optional features.**
6. **No accessibility compliance claims without testing evidence**
   ([ADR 0006](adr/0006-accessibility-evidence-policy.md)).
7. **Every mandatory ALX Track 1 requirement stays in scope.**

## Mandatory scope (spec sections → phase)

| Requirement | Phase(s) |
|---|---|
| A. Accessible onboarding (one question per screen, voice, save/resume, ID routes, private support, why-we-ask) | 3, 4 |
| B. Accessibility preferences (all 8, before registration) | 2 |
| C. Voice assistance and read-aloud | 3, applied in 4–7 |
| D. Low-literacy experience | 2, 3, 4 |
| E. Reusable profile with controlled sharing | 5 |
| F. Accessible job discovery incl. private accommodation filter | 7 |
| G. Accessible job application on the same form engine | 7 |
| H. Employer accommodation form | 6 |
| I. Private support system with human route | 4 |
| J. Multilingual: en, am, om, so, ti | 2 onward |
| K. Non-AI alternative for every essential task (AI layer itself is deferred) | 4–7 |
| L. Low data, local + server drafts, sync status, secure resume tokens | 2, 3, 4 |
| Integration Level 1: Web Components | 8 |
| Integration Level 2: REST API | 1–7 (built per feature), 9 (finalised) |
| Integration Level 3: schema.org/JobPosting (LTI 1.3 and Open Badges documented only) | 6 |
| Security and privacy (spec §8) | 1 onward |
| WCAG 2.2 AA testing and conformance report | 2 onward, report in 9 |
| Submission package: source, README, Docker Compose, report, API docs, embed guide, demo | 9 |

## Deferred (after the MVP, in this order)

AI assistance → Resume-to-Profile → SMS delivery of resume links → Accessibility Test Playground →
Partner Integration Dashboard → LTI 1.3 / Open Badges 3.0 (needs official credentials) → ClamAV
scanning and pre-recorded audio prompts.

## Every phase includes

- Automated tests for the phase's work (unit, integration, end-to-end where applicable).
- From Phase 2: axe-core with zero serious or critical issues on every new page, plus keyboard-only checks.
- Every new endpoint added to the authorization matrix (role × owner/non-owner).
- Every new endpoint under `/api/v1`, documented in OpenAPI, with integration tests.
- A **manual accessibility check** (keyboard plus at least one screen reader) and a **co-designer
  review** of the phase's work, both logged with what was changed as a result.

## Phases and acceptance criteria

### Phase 0: Repository and tooling ✅
- Git repository, `.gitignore`, monorepo layout, Maven wrapper, Vite + React + TS + Tailwind, Vitest,
  oxlint with jsx-a11y rules, Prettier, local check script, documentation structure, ADRs.
- **Accepted when:** the backend starts against local PostgreSQL with Flyway; `/actuator/health` is UP;
  the frontend shows the API connection status; `scripts/check.sh` passes.

### Phase 1: Backend core and API foundations
- Flyway schema for core tables; Argon2id authentication; sessions; CSRF; roles; owner-scoped data access;
  RFC 7807 errors with i18n keys; rate limiting; audit events; log masking; security headers;
  springdoc-openapi; `/api/v1` conventions.
- **Accepted when:** register and sign in work; wrong passwords trigger progressive delays; IDOR is
  blocked; requests without CSRF protection are rejected; passwords and tokens are never logged;
  OpenAPI is served.
- **Tests:** authentication integration tests, authorization matrix, log masking, rate limits.

### Phase 2: Design system, preferences and i18n
- AppShell, basic components, LiveAnnouncer, Dialog, all 8 preferences, Accessibility Preview, language
  switching (en/am/om/so/ti), Ethiopic font subset, i18n completeness check, Playwright + axe setup.
- **Accepted when:** each preference visibly changes the page; 200% zoom and 320 px width work with no
  horizontal scrolling; zero serious or critical axe issues; `lang` and `dir` update on language switch.
- **Manual:** first NVDA and keyboard session; first co-designer review of the preferences.

### Phase 3: Form engine
- Flow-definition schema and versioning, core engine, React renderer, all field types, error summary,
  progress indicator, device and server drafts with version conflicts and sync status, shared-device
  mode, sensitive fields kept off the device, read-aloud controls, **voice input on every applicable
  text-entry field** with confirmation.
- **Accepted when:** a sample flow works by keyboard alone; focus and error announcements are correct;
  going offline and back loses nothing; sensitive fields never appear in IndexedDB; the server rejects
  input the definition doesn't allow.
- **Manual:** NVDA and TalkBack on the engine; co-designer review of voice input and read-aloud.

### Phase 4: Registration journey
- Welcome → language → Accessibility Preview → registration (Ethiopian name fields, +251 phone numbers,
  Ethiopian/Gregorian dates, identity routes leading to pending verification, private support request,
  review, confirmation); resume tokens; support-staff queue; privacy page.
- **Accepted when:** demo steps 1–8 work by keyboard, by mouse and with sound off; no identity route
  verifies anyone without a staff action; resume tokens are secure.

### Phase 5: Profile, CV and consent
- Profile editors on the form engine, CV upload validation, consent and sharing manager, data export and
  account deletion.
- **Accepted when:** profile data prefills forms; bad uploads are rejected; export and deletion are
  complete; revoked consent stops sharing.

### Phase 6: Employer side
- Employer onboarding, jobs with plain-language summaries and custom questions, accommodation form
  (all 5 areas), schema.org/JobPosting.
- **Accepted when:** an employer publishes a job; the JSON-LD validates; no applicant data is visible yet.

### Phase 7: Job discovery, applications and status ✅ MVP milestone
- Search and filters (including the private accommodation filter), job detail, saved jobs, application
  flow (prefill, field-level sharing, separate accommodation opt-in, review, explicit confirmation),
  consented snapshot, employer view of received applications (no ranking), status history, notifications.
- **API foundation gate for Phase 8:** every endpoint the Web Components need exists, is documented and
  is covered by integration and authorization tests.
- **Accepted when:** the full demo scenario (steps 1–14) passes by keyboard only, with sound off, at 200%
  zoom, on a phone-sized screen and on slow 3G; employers see only consented fields.

### Phase 8: Web Components and demo partner site
- `accessflow.js`; iframe-backed `<accessflow-signup>`, `<accessflow-profile>` and
  `<accessflow-job-application>`; strict postMessage protocol; publishable and secret partner keys;
  per-partner `frame-ancestors` and CORS; **authentication with no third-party cookies**; full-page
  new-tab fallback; signed launch-token interface (stubbed until Savanna's documentation arrives);
  demo partner site on a separate origin; embed guide.
- **Accepted when:** all three components work with one script tag; disallowed origins are blocked; the
  host page can't read form values; **the full journey works with all third-party cookies blocked,
  both inside the frame and through the new-tab fallback**.

### Phase 9: Finalise and harden the API, then submit
- Finalise `/api/v1` and OpenAPI with integration examples; security review (OWASP checklist, dependency
  scans); performance; translation reviews; evidence-based WCAG 2.2 AA conformance report; Docker
  Compose; README; demo script.
- **Accepted when:** the OpenAPI spec matches the API's behaviour; `docker compose up` works from a clean
  machine; every claim in the report has evidence behind it.
