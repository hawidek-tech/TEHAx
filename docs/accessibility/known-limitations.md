# Known limitations

Last reviewed: 2026-11-15.

## Voice input
- Uses the browser's Web Speech API. Works in Chrome (Android, desktop) and Edge; **not available in Firefox**; Safari support varies.
  When unavailable, the button is replaced by a message and typing works as normal.
- Language support depends on the browser's speech service. **Amharic** (`am-ET`) is offered by some browsers.
  **Afaan Oromo (`om-ET`), Somali (`so-SO`) and Tigrinya (`ti-ET`) are expected to be unsupported or poor** — not yet
  verified per device. When the browser reports "language not supported", the user is told and offered typing.
- In Chrome, speech is processed by an online service (Google) and needs an internet connection. Users see this
  disclosure before first use and can decline.
- Recognised text is never used automatically: the user always reviews and edits it first.

## Read-aloud
- Uses voices installed on the device. Many phones have **no Amharic, Afaan Oromo, Somali or Tigrinya voice**; in that
  case the app says so instead of reading with a wrong-language voice. Text is always on screen.

## Translations
- Amharic, Afaan Oromo, Somali and Tigrinya are **draft translations** that have not been reviewed by fluent speakers.
  Help articles in those languages are marked "not yet checked" in the interface.
- Simplified-language variants exist for selected key texts only (mostly English); other languages fall back to
  their normal (not English) text.

## Embedding
- Tested in Chromium only. Inside the frame, sign-in lasts only while the frame is open (token in memory by design);
  reloading the partner page requires signing in again. Server-side drafts mean no answers are lost.

## Offline
- The app shell and approved help/form definitions are cached by a service worker after the first visit. Submitting,
  searching jobs and signing in need a connection. Sensitive answers are not stored on the device, so a half-finished
  sensitive step may need re-entering after a crash while offline.

## AI assistant
- Optional and off unless `ANTHROPIC_API_KEY` is configured. Answers can be wrong; the UI says so and always offers a
  person. Personal identifiers are removed by pattern matching, which cannot catch everything — users are asked not to
  type personal details.

## Not yet tested
- Screen readers (NVDA, TalkBack, VoiceOver), real users with disabilities, co-designer sessions, Safari/Firefox,
  real low-cost Android hardware. See [manual-test-checklist.md](manual-test-checklist.md).
