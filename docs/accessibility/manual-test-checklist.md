# Manual accessibility test checklist

**Status: ALL ITEMS PENDING.** No manual assistive-technology or co-designer test has been carried out yet.
Do not mark an item as passed without recording it in [manual-test-log.md](manual-test-log.md) (date, tester,
device, assistive technology, language, result, issues).

Run against the production build (README → "Production mode"). Use a fresh account for each session.

## A. NVDA + Chrome or Firefox (Windows) — PENDING
1. Welcome page: headings list (NVDA+F7) shows one h1; language radios announce native names correctly in Amharic/Tigrinya.
2. Accessibility Preview: each switch announces name, "switch", on/off and its hint.
3. Registration: each step's question is announced when it appears; hint, example and error are read with the field.
4. Submit an empty step: the error summary is announced immediately; the link moves focus to the field.
5. "Why we ask" disclosure: expanded/collapsed state announced.
6. Voice input dialog (if a microphone is available): dialog name announced; focus trapped; Escape closes; focus returns.
7. Review step: each answer is read as question + answer; "Change: <question>" buttons are distinct.
8. Profile flow: list entries (education) can be added, edited and removed; status messages announced.
9. Job search: result count announced after Search; job cards navigable by heading (H).
10. Application: prefilled values announced; confirmation checkbox required; confirmation page reference read out.
11. Application status: stages announced with "current step".
12. Read-aloud does not start by itself and does not talk over NVDA.

## B. TalkBack + Chrome (low-cost Android phone, ideally 2 GB RAM) — PENDING
Repeat A1–A12 with swipe navigation, plus:
13. Touch targets are easy to activate; nothing requires two-finger gestures.
14. Amharic on-screen keyboard (e.g. Gboard) works in all text fields.
15. Voice input in Chrome: microphone permission prompt appears only after pressing "Speak your answer".
16. Turn on airplane mode in the middle of the profile flow: the offline banner and "Saved on this device" appear; answers are sent after reconnecting.

## C. Keyboard only (no screen reader) — partly automated, manual check PENDING
17. Visible focus on every control in default, high-contrast and keyboard-first modes.
18. Employer job form and staff queue are fully operable by keyboard.

## D. Vision settings — PENDING
19. Browser zoom 200 % and 400 % (reflow) on every page.
20. Windows High Contrast / forced colours: controls and focus remain visible.
21. Text spacing (WCAG 1.4.12) bookmarklet: no clipped text.

## E. Sound off / Deaf and hard-of-hearing users — PENDING
22. Complete the journey with sound off; captions setting shows read-aloud text on screen.

## F. Cognitive / low literacy (with co-designer) — PENDING
23. "Simple words" setting: is the language actually easier? Record words that confused participants.
24. Can participants explain what each "why we ask" means?
25. Can participants find human support from any question?

## G. Embedded components — PENDING
26. On the demo partner site, complete sign-up with NVDA and with TalkBack; the iframe title is announced.
27. Safari (iOS) and Firefox: embed works; if not, the "Open in a new tab" fallback works.
