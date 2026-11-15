# ACCESSFLOW voice assistant — the primary experience for blind users

_Status: built 2026-11-16. Tested with simulated speech only. **Not yet tested with a blind user, a screen reader, or
real device voices/recognition** — see "Real-user test protocol" below._

## What it does
A conversation instead of screens: ACCESSFLOW speaks, listens for one answer, understands it, and continues.

```
ACCESSFLOW: Welcome to ACCESSFLOW! What can I help you with today? …
User:       I want to find a job.
ACCESSFLOW: Of course! What kind of job are you looking for?
User:       Customer support.
ACCESSFLOW: Great! I found one job for customer support. Let me tell you about it. Job 1 of 1: …
            Would you like to hear more, hear the next job, or apply?
```

| Task | By voice | Saved through |
|---|---|---|
| Find and understand jobs | search by words, "tell me more" (plain description + workplace support), "next job", "go back", "search again" | `GET /api/v1/jobs`, `/jobs/{id}` |
| Create an account | name (read back), phone digits (read back) or email, **typed** password, privacy agreement | `POST /api/v1/auth/register` |
| Create a profile | 3 parts, answered questions skipped, stop after any part; optional private support | `PUT /api/v1/profile/steps`, `/learners/{id}/support` |
| Apply | only missing profile details, application questions, answers read back, **explicit "yes" to send** ("no" keeps a draft) | `PUT /api/v1/drafts/…`, `POST /jobs/{id}/applications` |
| Ask for support | 3 questions, confirmation, private | `POST /api/v1/support-requests` |
| Track applications | statuses read aloud; employer news read at the start | `GET /api/v1/applications`, notifications |
| Continue unfinished work | offered at the start ("You have something unfinished: a job application. Continue?") | drafts |

At any question: **repeat**, **go back**, **skip** (optional questions, or keep an existing answer), **help**, **stop**,
**main menu**, **speak Amharic / English**. Silence: "I didn't hear anything" once, then it pauses and waits.

## Starting it — the one action browsers require
Browsers do not allow a page to speak or listen before the person presses a key or taps. So:
- On the welcome page the **"Talk to ACCESSFLOW" button has keyboard focus when the page opens** (it is also the
  first, largest control). One **Enter** — or one tap — starts the conversation. No searching for buttons.
- In the conversation: **Enter or Space** = talk now / interrupt / continue after a pause; **Escape** = pause.
  These are not single-character shortcuts and work only on the assistant page, outside text fields.
- `/assistant` can be bookmarked; opening it focuses "Start talking".

## How it understands — rule-based, not AI
`frontend/src/assistant/nlu.ts` matches everyday phrases against word lists (English and Amharic; Afaan Oromo, Somali and
Tigrinya lists are drafts), plus numbers ("two", "ሁለት"), yes/no, spoken phone numbers ("zero nine one one…") and
spoken emails ("almaz at gmail dot com"). When nothing matches it says so and repeats the choices. **No AI service is
used and nothing is sent anywhere for understanding.** (The optional AI help, if configured, is separate and consent-based.)

## Privacy and safety
- Listens for **one answer at a time** (never continuous recording); the microphone is released after each answer, on
  pause, when the page is hidden, and when leaving the assistant. Nothing is recorded or stored by ACCESSFLOW; the
  conversation text exists only on the screen and disappears when the page closes.
- The microphone notice is spoken and shown before the first question (Chrome sends audio to an online recogniser).
- **Passwords are typed**, never spoken, read back or shown in the conversation.
- Applications and support requests are sent only after an explicit "yes". Private support is never shown to employers.

## Other users — the same conversation without sound
- **Deaf / non-speaking:** turn off "Spoken replies" and the microphone; type, tap suggestions, or use **Picture phrases**.
  Every message is shown as text and announced politely to screen readers in this mode.
- **Text users / screen-reader users:** everything also works on the normal screens (one question per screen, keyboard,
  screen readers), unchanged.
- Sign-language **recognition is not implemented** (no validated Ethiopian Sign Language model); the picture-phrase board
  and camera self-view remain the sign-language interface.

## Languages
English and Amharic conversation texts are written (Amharic: unreviewed draft). Afaan Oromo, Somali and Tigrinya use the
English conversation texts for now (structure ready, translations needed); their recognition is often not supported by
browsers — the assistant then says so and continues by typing.

## Limitations (honest)
- Tested only with **simulated** speech synthesis and recognition (`e2e/assistant.spec.ts`).
- Real recognition accuracy for Amharic, Ethiopian names and phone numbers is unknown.
- Barge-in is by key/tap (Enter/Space), not by speaking over the assistant (echo would be heard as an answer).
- The browser's own microphone-permission prompt appears once; a blind person without a screen reader may need help with
  that first prompt (or the microphone can be allowed in advance in browser settings).
- Profile lists (work experience, education) are asked by voice; documents (CV, ID) must be added on screen.

## Real-user test protocol (to do — required before any claim)
1. Participant: blind, own device (Android + TalkBack, or Windows + NVDA), and a participant without a screen reader.
2. Tasks, unassisted, timed: open ACCESSFLOW and start talking · find a customer-support job and hear its details ·
   create an account · apply (decline once, then return and continue) · ask for private support · hear application
   status.
3. Record: completion, time, recognition errors (what was said vs. heard), moments of confusion, overlap with screen
   reader speech, permission-prompt problems.
4. Log in `docs/accessibility/manual-test-log.md`; fix issues; repeat in Amharic.
