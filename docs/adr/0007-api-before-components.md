# 0007: REST API foundations before Web Components

**Decision.** Every feature phase (1–7) delivers its endpoints under `/api/v1` with OpenAPI documentation,
server-side validation, consistent RFC 7807 errors, and integration and authorization tests. The first-party
frontend uses only this public API. Phase 8 (Web Components) may start only after the API foundation
gate in Phase 7 passes. Phase 9 finalises and hardens the API (contract tests, examples, security review).

**Why.** The Web Components and partners depend on a stable, secure API; building the components first
would hide gaps in the API.
