# 0004: Iframe-backed Web Components with no third-party cookie dependency

**Decision.**
- `<accessflow-signup>`, `<accessflow-profile>` and `<accessflow-job-application>` are custom elements,
  loaded by `accessflow.js`, that render a **sandboxed iframe served from the ACCESSFLOW origin**. The
  partner page's scripts can't read form values, and partner CSS can't break accessibility.
- **Authentication never depends on third-party cookies.** That includes partitioned (CHIPS) cookies,
  which are only used as an optimisation when available. Inside the frame:
  - after sign-in, a short-lived access token is kept **in memory** inside the frame
  - tokens are bound to the partner origin and expire quickly
  - reloading the frame needs a new sign-in or a new launch token; server-side drafts mean no work is lost
- **A full-page new-tab fallback must always work.** It's offered when the frame can't authenticate or
  storage is blocked, or when the user prefers it. The journey continues first-party on the ACCESSFLOW
  domain and returns to the partner through an allowed return URL.
- Messages between host and frame use `postMessage` with exact origin checks both ways and a short list
  of allowed events: `ready`, `resize`, `completed` (opaque ID only), `error`. Personal information never
  goes to the host.
- Partners get a **publishable key** (only valid from their registered origins, used to set
  `frame-ancestors` and CORS) and a **secret key** (server to server only, stored hashed).
- Linking a partner's user account requires a **launch token signed by the partner's server** that
  expires in seconds and can only be used once. A raw `partner-user-id` is never trusted.
- Accessibility of the frame: a descriptive `title`, automatic height, managed focus moving in and out,
  and the host `locale` passed in.

**Acceptance (Phase 8).** The full journey passes with all third-party cookies blocked, both inside the
frame and through the new-tab fallback.
