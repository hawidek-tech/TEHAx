# Savanna (ALX) integration — status and open questions

**Status (2026-11-15): integrated with a LOCAL COPY of the official Savanna static starter** (`savanna/`, see
`savanna/ACCESSFLOW-INTEGRATION.md`; tested end to end). **Not integrated with a live Savanna system.** No official Savanna starter, API documentation, credentials or Track 1 brief PDF
have been provided to this project. **No Savanna integration details are assumed and no integration is claimed.**

## What exists instead (partner-agnostic, ready for Savanna)
| Capability | Status |
|---|---|
| Drop-in Web Components with per-partner origin allow-list | Implemented and tested (demo partner site) |
| REST API `/api/v1` + OpenAPI | Implemented and tested |
| schema.org/JobPosting JSON-LD | Implemented and tested |
| Account linking via a partner-signed launch token | **Not implemented** — interface designed (ADR 0004), needs Savanna's token format |
| LTI 1.3 launch | **Not implemented** — needs Savanna/ALX platform registration (issuer, client id, JWKS URL, deployment id) |
| Open Badges 3.0 | **Not implemented** — needs agreement on which credentials to exchange |

## Information needed from Savanna / ALX
| # | Needed | Affects |
|---|---|---|
| 1 | How learners are identified: OAuth2/OIDC, LTI 1.3 launch, or a signed token format (claims, signing algorithm, key distribution) | Account linking |
| 2 | Production and staging origins; CSP/iframe rules on Savanna pages | `allowed_origins`, `frame-ancestors` |
| 3 | What learner data may be exchanged, and the data-sharing agreement | Consent scopes, profile prefill |
| 4 | Whether Savanna expects completion/status webhooks, their format and authentication | Partner events |
| 5 | Sandbox environment, test accounts, LTI / Open Badges registration and credentials | Level 3 standards |
| 6 | Branding and UI rules for embedded components | Component theming |
| 7 | Any mandatory starter repository or technology stack | ADR 0001 |
| 8 | The official Track 1 brief (PDF) referenced by the specification | Scope verification |

**Minimum to start a Savanna pilot:** item 2 (origins) — embedding works with origins alone; items 1 and 3 are needed for
account linking and data exchange.
