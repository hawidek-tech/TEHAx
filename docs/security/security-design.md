# Security and privacy design

Summary of the approved design. Each item is implemented and tested in the phase shown.

| Area | Design | Phase |
|---|---|---|
| Passwords | Argon2id; minimum length; no composition rules; common-password check | 1 |
| Sessions (first-party) | HttpOnly, Secure, SameSite=Lax cookie; session fixation protection; generous idle timeout; expiry never loses drafts | 1 |
| CSRF | Spring cookie token checked against a request header | 1 |
| Brute force | Progressive delays plus per-IP and per-account rate limits (no hard lockout) | 1 |
| Authorization | Roles plus owner-scoped queries; user identity taken from the server's security context only; random UUIDs; authorization matrix tests | 1 onward |
| Errors | RFC 7807 problem details; no stack traces or internal messages exposed | 1 |
| Logging | Passwords, tokens and sensitive fields masked; audit events for access to applicant data | 1 |
| Headers | Strict CSP, HSTS (production), nosniff, Referrer-Policy | 1 |
| Consent | `ConsentGrant` per recipient and field scope; application snapshots contain only consented fields; accommodation data needs a separate opt-in | 5, 7 |
| Offline drafts | Shared-device mode; sensitive fields never stored on the device; per-user, 7-day expiry, wiped on sign-out; encrypted with a non-exportable WebCrypto key (limited protection, documented); versioned server drafts | 3 |
| Resume tokens | Random, stored hashed, single-use, expiring, no personal information in URLs | 4 |
| Uploads | PDF/DOCX only, 5 MB, type checked from file contents (Tika), stored outside the web root, permission-checked downloads served as attachments | 5 |
| Embedding | See [ADR 0004](../adr/0004-embedded-components.md): iframe isolation, origin allow lists, no third-party cookie dependency, signed launch tokens | 8 |
| Secrets | Only from environment variables or a `.env` file (gitignored); never in frontend code | 0 onward |
| Data rights | JSON export and account deletion | 5 |
