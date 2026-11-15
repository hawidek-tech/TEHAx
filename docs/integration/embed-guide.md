# Embedding ACCESSFLOW (Web Components)

**Recommended (Track 1 contract):** `<script src="https://HOST/db-signup.js" defer></script>` and
`<db-signup lang="am" api="https://HOST" theme="auto"></db-signup>`. Attributes, events (`db-signup:ready|step|support|done`)
and CSS variables are documented in the [README](../../README.md#one-script-installation). If your origin is registered, no
key is needed: the module resolves your integration from the page origin. The older elements below still work.

## 1. Get a partner key
A platform administrator registers your organisation and allowed website origins (exact scheme + host + port).
You receive a **publishable key** (`pk_…`). It is safe to put in your HTML because it only works from your
registered origins. (Partner self-service is not built yet; keys are seeded/created by administrators.)

## 2. Add the script and an element
```html
<script src="https://ACCESSFLOW-HOST/accessflow.js" defer></script>

<accessflow-signup partner-key="pk_…" locale="am"></accessflow-signup>
<accessflow-profile partner-key="pk_…"></accessflow-profile>
<accessflow-job-application partner-key="pk_…" job-id="JOB-UUID"></accessflow-job-application>
```
Optional attributes: `locale` (`en|am|om|so|ti`), `frame-title` (accessible name of the frame, recommended in your page's
language), `fallback-text` (text of the "open in a new tab" link).

## 3. Listen for events (optional)
```js
document.addEventListener('accessflow:ready', (e) => console.log(e.detail))      // { component }
document.addEventListener('accessflow:completed', (e) => console.log(e.detail))  // { component, reference }
```
`reference` is an opaque identifier (account id after sign-up, or the application reference). **No personal data is ever
sent to your page.**

## How it is secured
- Each element renders a sandboxed iframe from the ACCESSFLOW origin; your page's scripts cannot read form values.
- The server sends `Content-Security-Policy: frame-ancestors <your registered origins>` — browsers refuse to show the frame
  on any other website.
- Inside the frame, the iframe checks that its parent origin is registered before posting messages, and only posts to that
  exact origin. The loader only accepts messages from the ACCESSFLOW origin and its own iframe.
- **Authentication never uses third-party cookies**: the frame keeps a short-lived bearer token in memory.
- A visible **"Open ACCESSFLOW in a new tab"** link is always shown under the frame and inside it (full-page fallback with
  first-party cookies).
- The frame may use the microphone (`allow="microphone"`) only after the user presses "Speak your answer".

## Try it locally
See [demo-partner-site/README.md](../../demo-partner-site/README.md).
