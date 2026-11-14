# Known limitations

Kept up to date as testing finds limitations. Last reviewed: Phase 0.

## Voice input and read-aloud (expected, still to be verified per language in Phase 3)

- Voice input uses the browser Web Speech API. Support differs by browser: Chrome on Android and desktop
  supports it; Firefox doesn't support recognition.
- Speech recognition for **Amharic** is available on some browsers. Support for **Afaan Oromo, Somali and
  Tigrinya** is expected to be weak or missing. Each will be tested and recorded here.
- In Chrome, speech recognition can send audio to the browser vendor's servers, so it needs an internet
  connection. Users are told this before first use.
- Read-aloud depends on the voices installed on the device. Many low-cost Android phones have no voice for
  Ethiopian languages.
- Typing is always available.

## Not yet tested

Everything. No assistive technology testing has taken place yet (Phase 0).
