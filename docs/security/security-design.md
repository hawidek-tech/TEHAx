# Security and privacy design

Status as of 2026-11-15. "Tested" means covered by automated tests in `backend/src/test` or `frontend/e2e`.

| Area | Design | Status |
|---|---|---|
| Passwords | Argon2id; minimum length; no composition rules; common-password check | Implemented, tested |
| Sessions (first-party) | HttpOnly, SameSite=Lax cookie (`Secure` when `COOKIE_SECURE=true` — required in production); session-id change on sign-in; 8-hour timeout; expiry never loses drafts | Implemented, tested |
| CSRF | Spring cookie token checked against a request header | Implemented, tested |
| Brute force | Progressive delays plus per-IP and per-account rate limits (no hard lockout) | Implemented, tested |
| Authorization | Roles plus owner-scoped queries; user identity taken from the server's security context only; random UUIDs; authorization matrix tests | Implemented, tested (authorization matrix) |
| Errors | RFC 7807 problem details; no stack traces or internal messages exposed | Implemented, tested |
| Logging | Request bodies are never logged (no request-logging filter); unexpected server errors are logged with their stack trace (exception messages could include database details — review before production); audit events record actions, never content. **No dedicated log-masking filter or test yet.** | Implemented by design, not specifically tested |
| Headers | Strict CSP, HSTS (production), nosniff, Referrer-Policy | Implemented, tested |
| Consent | `ConsentGrant` per recipient and field scope; application snapshots contain only consented fields; accommodation data needs a separate opt-in | Implemented, tested (journey test checks employer view) |
| Offline drafts | Shared-device mode stores nothing; sensitive fields (passwords, ID numbers, support details) are never stored on the device; per-user keys, 7-day expiry, wiped on sign-out; versioned server drafts with conflict detection. **Device copies are NOT encrypted** (WebCrypto encryption was planned but not implemented; only non-sensitive fields are stored). | Implemented, tested (e2e: shared device; passwords never stored) |
| Resume tokens | Random, stored hashed, single-use, expiring, no personal information in URLs | Not implemented: SMS resume links deferred (needs SMS provider); resume works by signing in, drafts are server-side |
| Uploads | Identity documents: PDF/JPEG/PNG; CVs: PDF/DOCX; 5 MB; type detected from file contents (Tika); random storage names outside the web root; owner/staff-only downloads served as attachments; staff document views audited | Implemented, tested |
| Embedding | See [ADR 0004](../adr/0004-embedded-components.md): iframe isolation, per-partner `frame-ancestors`, origin checks on postMessage, in-memory bearer tokens (no third-party cookies), full-page fallback. **Partner-signed launch tokens for account linking: not implemented** (needs partner token format). | Implemented, tested in Chromium (except launch tokens) |
| Secrets | Only from environment variables or a `.env` file (gitignored); never in frontend code | Implemented |
| Data rights | JSON export and account deletion | Implemented, tested |

## Additional notes
- **Rate limits** are in-memory (single instance). Per-IP limits are deliberately lenient because many users share IP
  addresses through mobile carrier NAT; per-account limits are strict.
- **Audit events** record sign-ins, failed sign-ins, profile completion, uploads, staff decisions, document views,
  employer views of applications, consent revocation, data export and account deletion — never personal content.
- **AI**: the API key stays on the server; questions are passed through a redactor (emails, phone numbers, long digit
  sequences) and only sent when the user opts in per question. The model is instructed not to decide, rank, infer
  disability or fill in answers. Server-side refusal fallbacks are enabled.
- **Not done yet**: malware scanning of uploads (ClamAV), encryption of uploaded files at rest (relies on disk
  encryption), dependency vulnerability scanning in CI, penetration test.
