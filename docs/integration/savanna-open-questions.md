# Savanna integration: open questions

**Status:** no official Savanna starter, API documentation or Track 1 brief PDF had been provided by
2026-11-15. **No Savanna integration details are assumed.** Until they arrive, integration is built
to work with any partner and shown on the neutral demo partner site.

| # | Needed from Savanna / ALX | Affects |
|---|---|---|
| 1 | How learners are identified: OAuth2/OIDC, LTI 1.3 launch, or a signed token format | Account linking, launch tokens (Phase 8) |
| 2 | Production and staging origins; CSP and iframe rules for embedded content | `frame-ancestors`, CORS, new-tab fallback |
| 3 | What learner data may be exchanged, and the data-sharing agreement | Consent scopes, profile prefill |
| 4 | Whether Savanna expects completion or status webhooks, and their format | Partner events |
| 5 | Sandbox environment, test accounts, LTI / Open Badges registration and credentials | Integration Level 3 |
| 6 | Branding and UI rules for embedded components | Component theming |
| 7 | Any mandatory starter repository or stack for the hackathon | ADR 0001 |
| 8 | The official Track 1 brief (PDF) referenced by the specification | Scope check |
