# 0001: Technology stack

**Context.** The spec says the stack should be finalised after inspecting the official Savanna starter
and API documentation. Neither was available when the project started (see
[../integration/savanna-open-questions.md](../integration/savanna-open-questions.md)), so the spec's
recommended fallback stack applies.

**Decision.**
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS 4; Vitest + Testing Library; oxlint with jsx-a11y rules.
- Backend: Java 21 + Spring Boot 3.5 + Spring Security + Spring Data JPA + Flyway; JUnit 5.
- Database: PostgreSQL 16.
- Later phases: Playwright + axe-core, springdoc-openapi, Bucket4j, Docker Compose.

**Consequences.** If Savanna later provides a mandatory starter, this ADR is revisited before
integration work (Phase 8).
