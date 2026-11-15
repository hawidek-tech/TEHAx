# 0001: Technology stack

**Context.** The spec says the stack should be finalised after inspecting the official Savanna starter
and API documentation. Neither was available when the project started (see
[../integration/savanna-open-questions.md](../integration/savanna-open-questions.md)), so the spec's
recommended fallback stack applies.

**Decision.**
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS 4; Vitest + Testing Library; oxlint with jsx-a11y rules.
- Backend: Java 21 + Spring Boot 3.5 + Spring Security + Spring Data JPA + Flyway; JUnit 5.
- Database: PostgreSQL 16.
- i18next for localisation; native Web Speech APIs for voice input and read-aloud (no paid services).
- Testing: Playwright + axe-core, Vitest, JUnit 5. API docs: springdoc-openapi. Deployment: Docker Compose.
- Rate limiting: a small in-memory limiter instead of Bucket4j (single instance; documented limitation).
- Optional AI assistant: Anthropic Java SDK behind a replaceable `AssistantProvider` interface (ADR 0008).

**Consequences.** If Savanna later provides a mandatory starter, this ADR is revisited before
integration work (Phase 8).
