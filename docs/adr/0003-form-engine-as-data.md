# 0003: Form engine driven by versioned flow definitions

**Decision.** Registration, identity routes, support requests, profile editors, job applications and
the employer accommodation form are all **flow definitions** (data) run by one engine.
Each definition lists its steps and fields, with: type, i18n key, simplified-language key, help text,
example, "why we ask", icon, whether voice is allowed, whether the field is sensitive, which profile field
it prefills from, validation rules, and branching conditions. Definitions are versioned and served by
the backend.

- The frontend validates for immediate, accessible feedback; the **backend re-validates against the same
  definition version** and is authoritative.
- The engine core (`frontend/src/engine`) has no React dependency; the renderer lives in `engine-react`.

**Why.** The spec requires the same form engine for registration and applications, and it guarantees
consistent accessibility behaviour everywhere.
