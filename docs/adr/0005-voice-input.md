# 0005: Voice input on every applicable text-entry field

**Decision.**
- Every text-entry field (single-line text, multi-line text, and fields typed as free text such as
  names or descriptions) has a voice input button, unless voice can't apply. Non-applicable fields
  (passwords, file uploads, checkboxes and radio buttons) are listed explicitly in the flow definitions.
- Recognised speech is placed in an **editable** box that the user must confirm before it becomes the
  answer. Typing is always available and voice input is never required.
- The microphone is only requested when the user presses the voice button.
- Before first use, users are told that some browsers (for example Chrome) send audio to the browser
  vendor's speech service.
- Support is detected for each language. When the browser can't recognise the chosen language, the button
  explains why and suggests typing; it never fails silently.
- Read-aloud plays only on user request (play, pause, stop, replay) so it never talks over a screen reader.

**Known limitations** are kept current in
[../accessibility/known-limitations.md](../accessibility/known-limitations.md).
