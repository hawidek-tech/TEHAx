# ACCESSFLOW

**One accessible journey from onboarding to employment.**

ACCESSFLOW is an accessibility-first registration, profile and job-application platform built for the ALX Ethiopia
Accessibility Hackathon 2026 (Track 1: Accessible Onboarding Kit). People can register, build a reusable profile, find
jobs with the support they need, and apply on their own: one question at a time, in Amharic, Afaan Oromo, English,
Somali or Tigrinya, with voice input, read-aloud, private support and alternative identity routes. Partners can
embed it with a single script tag or use its REST API.

> **Status:** the full onboarding-to-application journey works end to end with real persistence and is covered by
> 122 automated tests (52 backend, 11 frontend unit, 59 browser/accessibility). **Manual screen-reader testing and
> co-designer sessions have not happened yet, so no WCAG conformance is claimed.** Non-English translations are drafts
> awaiting fluent-speaker review. Details: [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## What's in it

| For | Features |
|---|---|
| Job seekers | Language choice and Accessibility Preview before registering · 8 preferences that change the interface (text size to 200 %, high contrast, simple words, listen buttons, captions, keyboard-first, reduced motion, shared-device mode) · one-question-per-screen registration and profile on a **shared form engine** · voice input on every text field with review before use · read-aloud with play/pause/resume/stop · "why we ask" and examples on every question · save and resume (server and device drafts, conflict detection) · alternative identity routes (Fayda, kebele ID, passport, refugee ID, other document, partner referral, "refer me"), always checked by staff · private support requests (no medical proof) · reusable profile with CV · job search with a **private** support filter · simple job descriptions · applications prefilled from the profile, with field-level sharing choices, review, explicit confirmation and status tracking · consent withdrawal · data export and account deletion · optional AI help assistant with a non-AI fallback and a human route |
| Employers | Jobs with plain-language summaries, an accommodation form (workplace, interview, flexible working, assistive technology, application accessibility, contact) and custom questions · received applications in submission order with only consented data (**no ranking**) · status updates that notify the applicant |
| Support staff | Identity-verification queue (audited document viewing) and private support queue |
| Partners / developers | `<accessflow-signup>`, `<accessflow-profile>`, `<accessflow-job-application>` Web Components (iframe-isolated, per-partner origin allow-list, **no third-party cookies**, full-page fallback) · REST API `/api/v1` with OpenAPI · schema.org/JobPosting JSON-LD |

Designed for Ethiopia: Ethiopic font that is only downloaded when needed (and not at all on Android, which ships it) ·
Ethiopian-calendar dates · Ethiopian name structure (given / father / grandfather) · +251 phone numbers · regional
states · ~144 KB first visit, usable in about 4.5 s on emulated slow 3G with a slow CPU · offline app shell.

## Repository layout
```
backend/            Java 21 · Spring Boot 3.5 · Spring Security · JPA · Flyway · PostgreSQL
  src/main/resources/flows/      form-engine flow definitions (shared by UI and server validation)
  src/main/resources/db/migration/  schema (V2) and demo data (V3)
frontend/           React 19 · TypeScript · Vite 8 · Tailwind 4 · i18next
  src/engine, src/engine-react   form engine core and renderer
  src/a11y                       preferences, voice input, read-aloud, live announcer
  src/i18n/locales               en, am, om, so, ti
  src/embed-loader/accessflow.ts drop-in Web Components (built to dist/accessflow.js)
  e2e/                           Playwright + axe-core tests
demo-partner-site/  Neutral "Demo Learning Platform" embedding ACCESSFLOW from another origin
docs/               roadmap, ADRs, API guide, embed guide, security, accessibility report, Savanna status
Dockerfile, docker-compose.yml   container setup (not yet run, see below)
```

## Prerequisites
Java 21 · Node.js 22+ (developed on 26) · PostgreSQL 16 (Maven isn't needed; use `./mvnw`). Docker is optional.

## 1. First-time setup
```bash
# Database: dedicated role + dev and test databases (choose your own password)
psql -d postgres <<'SQL'
CREATE ROLE accessflow LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE accessflow OWNER accessflow ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE accessflow_test OWNER accessflow ENCODING 'UTF8' TEMPLATE template0;
SQL

cp backend/.env.example backend/.env      # set DB_PASSWORD; optionally DEMO_ACCOUNTS_PASSWORD, ANTHROPIC_API_KEY
cd frontend && npm install && cd ..
```
`backend/.env` is gitignored. Never commit secrets; real environment variables override `.env`.

## 2. Run for development (two terminals, hot reload)
```bash
cd backend  && ./mvnw spring-boot:run     # API on http://localhost:8080 (Flyway migrates automatically)
cd frontend && npm run dev                # app on http://localhost:5173 (proxies /api to :8080)
```
If 8080 is taken: `SERVER_PORT=8081 ./mvnw spring-boot:run` and `BACKEND_URL=http://localhost:8081 npm run dev`.

## 3. Run in production mode (one origin; required for embedding and e2e tests)
```bash
cd frontend && npm run build && cd ..                 # builds dist/ incl. accessflow.js and sw.js
cd backend && ./mvnw -DskipTests package
SERVER_PORT=8081 ACCESSFLOW_FRONTEND_DIR=../frontend/dist java -jar target/accessflow-backend-0.1.0-SNAPSHOT.jar
```
Open http://localhost:8081. API docs: http://localhost:8081/swagger-ui.html

**Demo accounts** (created only when `DEMO_ACCOUNTS_PASSWORD` is set in `backend/.env`; the password is whatever you
put there): `employer@example.com` (employer for "Kidame Digital Services (Demo)") and `support@example.com` (support
staff). Applicants register through the app. All seeded organisations are fictional and labelled "(Demo)".

**Embedding demo:** `node demo-partner-site/serve.mjs 5500 http://localhost:8081`, then open http://localhost:5500.

## 4. Demonstration script (spec §12)
1. http://localhost:5500 (partner site) → the embedded sign-up form; or http://localhost:8081 directly.
2. Choose a language (for example አማርኛ) → **Start** → Accessibility Preview: try 200 % text, high contrast, simple words.
3. Register one question at a time; press **Speak your answer** (Chrome) and edit the recognised text.
4. Profile: choose **Refugee ID** or **"I have no document — please ask a partner"**; ask for **private support**.
5. Close the tab partway through, sign in again → **"We kept your answers"**.
6. **Find jobs** → the private support filter is already set from your profile → open a job → **Show simple description**.
7. **Apply** → answers prefilled → choose what to share → review → tick the confirmation → send → reference number.
8. Sign in as `employer@example.com` → **View applications** → only shared data is shown, no ranking → set **Interview**.
9. Back as the applicant: the dashboard message and status tracker show **Invited to interview**.
10. Sign in as `support@example.com` → verify the identity request; answer the support request.
11. Developers page / http://localhost:5500: one script tag; the frame is blocked on unregistered sites.

## 5. Tests
```bash
cd backend && ./mvnw verify                      # 52 tests against the accessflow_test database
cd frontend && npm test                          # translation completeness check + 11 unit tests
cd frontend && npm run lint && npm run typecheck && npm run build
# Browser + accessibility tests (start production mode on :8081 first, see §3):
cd frontend && npx playwright install chromium && npx playwright test   # 59 tests: desktop + Android profile
./scripts/check.sh                               # backend + frontend checks (not Playwright)
```
The Playwright suite covers the full journey, keyboard-only registration, axe-core WCAG 2.2 A/AA (gate: zero serious or
critical issues), every preference, 320 px reflow, 200 % text, embedding with all cookies stripped, `frame-ancestors`
blocking, a slow-3G budget, voice-input review and read-aloud controls (with simulated speech APIs), offline draft
keeping, and the employer and support-staff screens. Results and what is **not** tested: [conformance report](docs/accessibility/conformance-report.md).

## 6. Docker (written, not yet run)
```bash
cp .env.example .env          # set POSTGRES_PASSWORD
docker compose up --build     # http://localhost:8080
docker compose --profile demo up --build   # + demo partner site on :5500
```
Docker wasn't available on the development machine, so these files **have not been executed**. Please run them once
and report any issue.

## Configuration
| Variable | Purpose | Default |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection | required |
| `DB_TEST_URL` | test database | — |
| `SERVER_PORT` | HTTP port | 8080 |
| `ACCESSFLOW_FRONTEND_DIR` | built frontend served by the backend | `../frontend/dist` |
| `ACCESSFLOW_STORAGE_DIR` | uploaded files (outside the web root) | `./storage` |
| `COOKIE_SECURE` | `true` behind HTTPS (required in production) | false |
| `SESSION_TIMEOUT` | session length (no short timeouts) | 8h |
| `DEMO_ACCOUNTS_PASSWORD` | creates demo employer/staff accounts; **never in production** | unset |
| `ANTHROPIC_API_KEY` | enables the optional AI assistant (server-side only) | unset → local help only |
| `ACCESSFLOW_AI_MODEL` | Claude model for the assistant | `claude-opus-5-5` |

## Documentation
- [PROJECT_STATUS.md](PROJECT_STATUS.md): what is done, tested, pending and blocked
- [Roadmap](docs/roadmap.md) · [Architecture decisions](docs/adr/README.md)
- [REST API guide](docs/api/README.md) · [Embedding guide](docs/integration/embed-guide.md) · [Savanna status](docs/integration/savanna-open-questions.md)
- [Security and privacy](docs/security/security-design.md)
- Accessibility: [conformance report](docs/accessibility/conformance-report.md) · [manual test checklist](docs/accessibility/manual-test-checklist.md) · [known limitations](docs/accessibility/known-limitations.md) · [co-design log](docs/accessibility/codesign-log.md)
