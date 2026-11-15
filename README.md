# ACCESSFLOW — `<db-signup>`

**Track 1: Accessible Onboarding Kit · DIGITAL BRIDGE Accessibility Hackathon 2026**

| | |
|---|---|
| Module name | ACCESSFLOW (custom element `<db-signup>`) |
| Team members | _To be completed by the team_ |
| Co-designer | _To be completed by the team (no co-designer sessions have been recorded yet — see CONFORMANCE.md)_ |
| Status | Working end to end; 141 automated tests passing; human accessibility testing pending; **no WCAG conformance claimed** |

## In plain English
ACCESSFLOW lets people with disabilities register, build a profile, find jobs and apply on their own, one question at
a time, in Amharic, Afaan Oromo, English, Somali or Tigrinya. It can read every page and question aloud, accepts typed,
spoken or pictogram-phrase answers, keeps answers safe when the internet drops, and never shares private support needs with
employers. Any website — Savanna or a blank page — can add it with one script tag.

**Main user task:** create an account and profile, then apply for a job and follow the application, without help from
another person.

## One-script installation
```html
<script src="https://YOUR-MODULE-HOST/db-signup.js" defer></script>

<db-signup lang="am" api="https://YOUR-MODULE-HOST" theme="auto"></db-signup>

<script>
  document.addEventListener('db-signup:done', (event) => {
    console.log(event.detail)
  })
</script>
```
The host website's origin must be registered for an integration (see [embed guide](docs/integration/embed-guide.md)).
Unregistered websites cannot display the module: browsers refuse because of `frame-ancestors`.

### Attributes
| Attribute | Values | Default |
|---|---|---|
| `lang` | `en`, `am`, `om`, `so`, `ti` | `en` |
| `api` | module origin, e.g. `https://accessflow.example` | the script's origin |
| `theme` | `auto`, `light`, `dark`, `high-contrast` | `auto` |
| `view` | `signup` (account + profile), `profile` (edit), `jobs` (career gateway), `job-application` | `signup` |
| `job-id` | job UUID (for `view="job-application"`) | — |
| `partner-key` | optional publishable key (otherwise resolved from the host origin) | — |
| `frame-title` | accessible name of the embedded frame | `ACCESSFLOW: <view>` |
| `fallback-text` | text of the "open in a new tab" link | English text |

Host CSS variables (optional): `--db-signup-accent` (used only if it has ≥ 4.5:1 contrast with white),
`--db-signup-radius`, `--db-signup-border`, `--db-signup-background`, `--db-signup-link-color`.

### Events (bubble, composed, no personal data)
| Event | `detail` |
|---|---|
| `db-signup:ready` | `{ view }` |
| `db-signup:step` | `{ view, step, index, total, section }` |
| `db-signup:support` | `{ view, requested: true }` — the learner asked for private support (content is never sent) |
| `db-signup:done` | `{ view, reference }` — account id after sign-up, or the application reference |

### How it stays isolated
Shadow DOM around a sandboxed iframe from the module origin; no global variables; host CSS can't reach it and it
never changes host styles or other DOM. Sign-in inside the frame uses a short-lived bearer token kept per tab in the
frame's own storage, never third-party cookies. A full-page "open in a new tab" link is always shown.

## Integrations included
| Host | URL (after setup below) | Notes |
|---|---|---|
| Savanna starter (official, unmodified) + 3 added pages | http://localhost:5510/pages/signup.html, `profile.html`, `jobs.html` | [savanna/ACCESSFLOW-INTEGRATION.md](savanna/ACCESSFLOW-INTEGRATION.md) |
| Blank page (no frameworks) | http://localhost:5520/blank.html | Deliberately hostile host CSS to show isolation |
| Full web app | http://localhost:8081 | Employer and support-staff areas too |

## Setup and run
Prerequisites: Java 21, Node.js 22+, PostgreSQL 16, Python 3 (only to serve the demo hosts).
```bash
# Database
psql -d postgres <<'SQL'
CREATE ROLE accessflow LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE accessflow OWNER accessflow ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE accessflow_test OWNER accessflow ENCODING 'UTF8' TEMPLATE template0;
SQL
cp backend/.env.example backend/.env   # set DB_PASSWORD (+ optional DEMO_ACCOUNTS_PASSWORD, ANTHROPIC_API_KEY)

# Build and run (one origin for app, API, embeds)
cd frontend && npm install && npm run build && cd ..
cd backend && ./mvnw -DskipTests package
SERVER_PORT=8081 ACCESSFLOW_FRONTEND_DIR=../frontend/dist java -jar target/accessflow-backend-0.1.0-SNAPSHOT.jar

# Demo hosts (other terminals, from the repository root)
python3 -m http.server 5510 -d savanna
python3 -m http.server 5520 -d demo
```
For development with hot reload: `cd backend && ./mvnw spring-boot:run` and `cd frontend && npm run dev` (port 5173).
Demo accounts `employer@example.com` and `support@example.com` exist only if `DEMO_ACCOUNTS_PASSWORD` is set.

**Docker:** `cp .env.example .env && docker compose up --build` (app on http://localhost:8081) (add `--profile demo` for the Savanna and blank hosts).
**Not yet verified: Docker was not available on the development machine.**

## Tests
```bash
cd backend  && ./mvnw verify          # 56 tests (PostgreSQL test database)
cd frontend && npm test               # translation completeness + 11 unit tests
cd frontend && npx playwright install chromium && npx playwright test   # 74 browser tests; needs production mode + demo hosts
```
Browser tests cover: full journey (desktop + Android profile), keyboard-only registration, axe-core WCAG 2.2 A/AA (zero
serious/critical, including inside the embedded module), all preferences, 320 px and 200 %, one-script install on the blank
page and in Savanna (isolation, no globals, events), unregistered-origin blocking, audio guide (English, Amharic — simulated
speech engine), camera permission and cleanup (fake camera), offline at question 7 with reload, employer and staff screens,
slow 3G.

## API
OpenAPI: [`openapi.yaml`](openapi.yaml) (live: `/swagger-ui.html`). Guide: [docs/api/README.md](docs/api/README.md).

Track 1 data contract:
| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/learners` | Create a learner and sign in → 201 + `Location` |
| PATCH | `/api/v1/learners/{id}` | Change only the profile fields sent; validated like the form |
| PUT | `/api/v1/learners/{id}/support` | Private support preferences (+ optional private request); never shown to employers |
| GET | `/api/v1/learners/{id}/export` | All of the learner's data (JSON) |
| DELETE | `/api/v1/learners/{id}` | Permanent deletion; body `{"password": "…"}` → 204 |

A learner can only access their own id (others → 404). Example:
```bash
B=http://localhost:8081; curl -s -c j -b j $B/api/v1/auth/csrf >/dev/null; X=$(awk '/XSRF-TOKEN/{print $7}' j)
curl -s -c j -b j -H "X-XSRF-TOKEN: $X" -H 'Content-Type: application/json' \
  -d '{"displayName":"Almaz","phone":"0911234567","password":"my coffee is hot","locale":"am","acceptPrivacyNotice":true}' $B/api/v1/learners
```

## Languages
English, Amharic, Afaan Oromo, Somali, Tigrinya: 1,021 interface keys each; `npm test` fails if any key is missing or a
placeholder differs. **Only English is reviewed; the other four are drafts awaiting fluent speakers.** Audio guidance is
written for English and Amharic (others are drafts) and uses the device's voices — if there is no voice for the language,
the module says so and shows the text.

**Add a language:** copy `frontend/src/i18n/locales/en.json` to `<code>.json` and translate; add the code to `LOCALES` in
`frontend/src/i18n/index.ts` and to the loaders map; add the code to the `locale` patterns in the backend DTOs
(`PreferencesDto`, `RegisterRequest`, help/assistant controllers); add help articles in a new Flyway migration; run `npm test`.

## Offline
Answers are saved on the server as you go and, on your own device, kept locally (except passwords, ID numbers and support
details) for up to 7 days. If the connection drops, you can keep answering and even reload the page; answers are sent when
you are back online. Signing in, searching jobs and sending need a connection. "Shared device" mode stores nothing locally.
AI help is never needed to complete a task.

## Privacy and data deletion
Employers see only the profile parts you choose to share; private support needs are never shown. The camera and microphone
are used only after you press a button; nothing is recorded or uploaded. You can download all your data (Account page or
`GET /learners/{id}/export`) and permanently delete your account (`DELETE /learners/{id}`). Details:
[docs/security/security-design.md](docs/security/security-design.md).

## Measured size and performance
| Measurement | Result |
|---|---|
| Loader `db-signup.js` | 4.9 KB (2.1 KB gzip) |
| Embedded module first load, Amharic, Ethiopic font downloaded | 359 KB transferred |
| Main app first visit (English) | 144 KB transferred; usable after ~4.5 s on emulated slow 3G with 4× slower CPU |
Android devices ship Noto Sans Ethiopic, so the font (~150 KB) is normally not downloaded there.

## Estimated monthly cost for 3,000 learners
| Item | Assumption | USD / month |
|---|---|---|
| App server | 1 VM, 2 vCPU / 4 GB | 15–25 |
| PostgreSQL | small managed instance (or same VM: 0) | 0–15 |
| File storage + backups | ~12 GB uploads, daily backups | 3–6 |
| Bandwidth | ~6 MB per learner per month ≈ 18 GB | 0–2 (usually included) |
| Domain + TLS | Let's Encrypt | ~1 |
| **Subtotal without AI** | | **≈ 20–50** |
| Optional AI help (Claude Opus 5.5, $4 / $20 per M tokens) | 20 % of learners × 5 questions ≈ 3,000 questions × ~2,500 input + ~700 output tokens | ≈ 70 |
SMS is not included (not implemented). AI cost scales with usage; a smaller model would cost much less.

## Completed and incomplete
**Completed:** registration and guided profile on one form engine; job discovery with a private support filter; applications
with consent, review and tracking; employer and support-staff areas; one-script `<db-signup>` (blank page + Savanna);
learner data contract; audio accessibility (one-touch); voice input with review; read-aloud; sign-language camera interface and
phrase board; offline drafts and sync; five languages (drafts); Ethiopian calendar and phone formats.

**Incomplete / not done:** real sign-language recognition (no validated EthSL model; adapter ready); text-to-sign clips;
voice-note fallback; recorded-audio fallback; SMS resume links; LTI 1.3; human accessibility testing (NVDA, TalkBack,
co-designer); translation review; Docker verification; real-device speech tests. See [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Third-party libraries and licences
React, React Router, i18next (MIT); lucide icons (ISC); Noto Sans Ethiopic (OFL-1.1); Spring Boot, Flyway, Tika, springdoc,
Anthropic SDK (Apache-2.0); Hibernate 6.6 (LGPL-2.1); PostgreSQL driver (BSD-2-Clause); Bouncy Castle (MIT-style).
Full list: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## More documentation
[PROJECT_STATUS.md](PROJECT_STATUS.md) · [CONFORMANCE.md](CONFORMANCE.md) · [embed guide](docs/integration/embed-guide.md) ·
[sign language](docs/integration/sign-language.md) · [Savanna status](docs/integration/savanna-open-questions.md) ·
[security](docs/security/security-design.md) · [architecture decisions](docs/adr/README.md) · [roadmap](docs/roadmap.md)
