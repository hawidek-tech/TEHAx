# Sign-language communication — research, design and honest status

## What is implemented (and tested)
- **"Sign or choose phrases"** on every free-text question (and support messages).
- **Camera only on explicit request**; clear "Camera is on" indicator; "Turn off camera" button; tracks stopped when the
  dialog closes, the component unmounts, the page is hidden or left (`pagehide`, `visibilitychange`).
  Tested with a fake camera (`e2e/audio-sign-offline.spec.ts`).
- **No recording, no upload.** Video is only shown locally as a preview. The server's `Permissions-Policy` allows the
  camera for the ACCESSFLOW origin only; embedded frames get `allow="camera"` from the loader.
- **Phrase board** (pictograms + text) for people who cannot speak or type, building an **editable message that must be
  confirmed** before it is used. This works today, without any AI.
- **Recognition adapter** (`frontend/src/a11y/sign/recognition.ts`): interface for a recogniser with confidence, a
  minimum-confidence rule, and a registry that refuses recognisers without a named validator.
- **Validated clip manifest** for text-to-sign (`frontend/src/a11y/sign/clips.ts`) — **empty**.

## What is NOT implemented
- **Sign recognition: not implemented.** No recogniser is registered. The interface says so plainly. Nothing simulated is
  ever presented as recognition.
- **Text-to-sign: no clips.** ACCESSFLOW never generates or animates signs; it would only play clips listed in the manifest.

## Why
- **Ethiopian Sign Language (EthSL)** is the relevant signed language. Amharic, Afaan Oromo, English, Somali and Tigrinya
  are spoken/written languages, not separate sign languages; ACCESSFLOW does not claim support for "four sign languages".
- We did not find a publicly available, licensed and validated EthSL recognition model or dataset suitable for production
  use within the deadline. General hand-landmark trackers (e.g. MediaPipe Hands) detect hand positions, not EthSL
  vocabulary or grammar; using them as "recognition" without a trained, validated model would produce invented results.
  Training a model was out of scope (the brief says not to).
- Adding MediaPipe only to show "hands detected" would add several MB of model downloads (conflicting with low-data goals)
  without improving communication, so it was not added.

## How to add real support later
1. Partner with the Ethiopian National Association of the Deaf (ENAD) or university EthSL researchers for data,
   licensing and validation (accuracy measured with Deaf signers, per sign/phrase).
2. Prefer a model that runs **locally in the browser** (e.g. a small landmark-based classifier) so video never leaves the
   device; if a server is needed, ask for explicit, informed consent first.
3. Implement `SignRecognizer` (start/stop, `confidence`), set `validatedBy`, and call `registerRecognizer` at start-up.
   Results below `MIN_CONFIDENCE` are shown as "unsure" and are never used without the user's confirmation.
4. For text-to-sign, record fixed messages with fluent signers, have them reviewed by Deaf reviewers, and list each clip
   in `VALIDATED_CLIPS` with `signedBy`, `validatedBy` and `validatedOn`.
