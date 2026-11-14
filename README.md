# ACCESSFLOW

**One accessible journey from onboarding to employment.**

ACCESSFLOW is an accessibility-first onboarding and employment platform for the ALX Ethiopia
Accessibility Hackathon 2026 (Track 1: Accessible Onboarding Kit). It helps people with disabilities
register, build a reusable profile, find jobs and apply on their own, in English, Amharic, Afaan Oromo,
Somali and Tigrinya.

> **Project status: Phase 0 (foundation).** Only the project skeleton exists so far. No user features are
> built yet, and no accessibility conformance is claimed (see
> [ADR 0006](docs/adr/0006-accessibility-evidence-policy.md)). See [docs/roadmap.md](docs/roadmap.md).

## Repository layout

```
ACCESSFLOW/
├─ backend/            Java 21 + Spring Boot 3.5 REST API (Maven wrapper included)
├─ frontend/           React 19 + TypeScript + Vite + Tailwind CSS 4
├─ demo-partner-site/  Neutral partner website for embedding demos (Phase 8)
├─ docs/               Specification, roadmap, ADRs, accessibility, security, integration, API docs
└─ scripts/check.sh    Runs every backend and frontend check
```

## Prerequisites

| Tool | Version used | Check |
|---|---|---|
| Java JDK | 21 | `java -version` |
| Node.js / npm | Node 22+ (developed on 26.5) / npm 10+ | `node -v` |
| PostgreSQL | 16 | `psql --version` |
| Maven | Not required; use the included `./mvnw` | |

Docker is **not** required yet. Docker Compose is added and tested in Phase 9.

## First-time setup

### 1. Database (existing local PostgreSQL)

Create a dedicated role and two databases (development and tests). Choose your own password:

```bash
psql -d postgres <<'SQL'
CREATE ROLE accessflow LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE accessflow OWNER accessflow ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE accessflow_test OWNER accessflow ENCODING 'UTF8' TEMPLATE template0;
SQL
```

### 2. Backend configuration

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set DB_PASSWORD to the password you chose.
```

`backend/.env` is gitignored. **Never commit secrets.** All configuration comes from environment
variables, and the `.env` file is only a local convenience; real environment variables take precedence.

### 3. Frontend dependencies

```bash
cd frontend && npm install
```

## Running

Open two terminals from the repository root.

**Backend** (http://localhost:8080):

```bash
cd backend
./mvnw spring-boot:run
```

Flyway applies database migrations automatically at startup. To check it's running:

```bash
curl http://localhost:8080/actuator/health        # {"status":"UP"}
curl http://localhost:8080/api/v1/system/info     # {"name":"ACCESSFLOW",...}
```

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm run dev
```

The Vite dev server forwards `/api` requests to the backend, so the browser sees one origin. To use a
different backend address: `BACKEND_URL=http://localhost:9090 npm run dev`.

## Tests and checks

```bash
./scripts/check.sh                 # everything below

cd backend && ./mvnw verify        # backend build + tests (uses the accessflow_test database)

cd frontend
npm run lint                       # oxlint, including jsx-a11y accessibility rules
npm run format:check               # Prettier
npm run typecheck                  # TypeScript
npm test                           # Vitest + Testing Library
npm run build                      # production build into frontend/dist
```

## Documentation

- [Roadmap and acceptance criteria](docs/roadmap.md)
- [Architecture decision records](docs/adr/README.md)
- [Security and privacy design](docs/security/security-design.md)
- [Accessibility: co-design log, manual tests, known limitations](docs/accessibility/)
- [Savanna integration open questions](docs/integration/savanna-open-questions.md)
- [API](docs/api/README.md)
