# ACCESSFLOW — WCAG 2.2 AA conformance report (interim)

| | |
|---|---|
| Product | ACCESSFLOW 0.1.0 (web app, embeddable components) |
| Standard | WCAG 2.2, levels A and AA |
| Report date | 2026-11-15 |
| Status | **Interim. Automated and scripted testing complete; manual assistive-technology testing and co-designer testing NOT yet done.** |
| Conformance claim | **None.** ACCESSFLOW does not claim WCAG 2.2 AA conformance until the manual tests below have been carried out and passed. |

## 1. How it was evaluated

| Method | Tool / setup | Scope | Result |
|---|---|---|---|
| Automated rules | axe-core 4.x via `@axe-core/playwright`, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` (+ `best-practice` for the summary below) | 11 public pages; all 5 registration steps + review + error state; first profile step; 9 signed-in pages; high-contrast + 200 % text job list; voice-privacy dialog; assistant dialog; application confirmation | **0 serious / critical** (release gate). On the 10 public pages: **0 violations of any severity, including best practices** (42–47 rule passes per page). |
| Keyboard only | Playwright, keyboard events only | Full registration journey; error summary | Pass — skip link is first stop; every control reachable; radios via arrow keys; focus moves to each new question. |
| End-to-end journey | Playwright, real backend + PostgreSQL | Spec §12 demonstration journey on desktop Chrome **and** a Pixel 5 (Android) profile | Pass on both. |
| Reflow (1.4.10) | 320 × 640 viewport | 7 key pages | Pass — no horizontal scrolling. |
| Resize text (1.4.4) | 200 % text-size preference at 1280 px | 7 key pages | Pass — no horizontal scrolling, nothing clipped. |
| Contrast (1.4.3, 1.4.11) | Computed with the WCAG relative-luminance formula from the design tokens; axe colour-contrast rule | Default and high-contrast palettes | Text ≥ 6.5:1 in default theme (ink/bg 15.1:1); form-control borders 4.4–4.8:1; high contrast 9.2–14.7:1. |
| Preferences really change the UI | Playwright | Text size, contrast, simple words, listen buttons, keyboard-first, reduced motion, captions, language, shared device | Pass — each setting changes the rendered page or behaviour. |
| Sound off | Every journey test runs without audio | Whole journey | Pass — no information is audio-only; read-aloud is optional and always has visible text. |
| Voice input & read-aloud UI | Playwright with simulated Web Speech APIs (headless browsers have no microphone or voices) | Privacy notice, review-and-edit before use, language tag follows UI language, unsupported-browser message, play/pause/resume/stop, captions, "no voice for this language" message | Pass — verifies the interface; real recognition quality and real voices are NOT tested. |
| Offline drafts | Playwright `setOffline` | Profile flow | Pass — offline banner, answers kept on the device, synced after reconnecting. |
| Slow network / low-cost device | Chrome DevTools Slow 3G (400 kbps, 400 ms RTT) + 4× CPU slowdown, cold cache | First visit | Usable after ~4.5 s; 144 KB transferred. |
| Screen readers (NVDA, TalkBack) | — | — | **PENDING — not yet tested.** See [manual-test-checklist.md](manual-test-checklist.md). |
| Co-designer / disabled users | — | — | **PENDING — no sessions yet.** See [codesign-log.md](codesign-log.md). |

Automated test sources: `frontend/e2e/*.spec.ts`. Run with `npx playwright test` (see README).

**Defects found and fixed by this testing (2026-11-15):**
1. Question fade-in animation briefly lowered text contrast (axe `color-contrast`) → animation now moves only, never fades.
2. "Check your answers" `<dl>` had buttons outside `dd` (axe `definition-list`, `dlitem`) → restructured.
3. First visit transferred 424 KB on slow 3G → enabled HTTP compression and device-installed Ethiopic font first (now 144 KB).

## 2. Success criteria (WCAG 2.2 A and AA)

Legend — **AUTO**: covered by passing automated checks · **SCRIPTED**: verified by a scripted Playwright test ·
**DESIGN**: implemented by design, reviewed in code, not independently verified · **PENDING**: needs manual / AT testing ·
**N/A**: not applicable.

| SC | Title | Status | Evidence / notes |
|---|---|---|---|
| 1.1.1 | Non-text content | AUTO, DESIGN | All icons `aria-hidden` and always paired with text; no informative images. |
| 1.2.1–1.2.5 | Time-based media | N/A | No pre-recorded or live audio/video content. Read-aloud is generated from on-screen text. |
| 1.3.1 | Info and relationships | AUTO, SCRIPTED | Labels, fieldsets/legends for choices, headings, landmarks, lists, tables with headers; `dl` structure fixed. |
| 1.3.2 | Meaningful sequence | DESIGN, PENDING | DOM order equals visual order; to confirm with screen readers. |
| 1.3.3 | Sensory characteristics | DESIGN | Instructions never rely on shape, colour or position only. |
| 1.3.4 | Orientation | SCRIPTED | Works in portrait (Pixel 5 profile) and landscape (desktop). |
| 1.3.5 | Identify input purpose | DESIGN | `autocomplete` on name, email, tel, password, region fields. |
| 1.4.1 | Use of colour | DESIGN | Status shown as text + icon (progress, badges, errors), not colour alone. |
| 1.4.2 | Audio control | DESIGN | Audio only plays on request; Pause and Stop always visible. |
| 1.4.3 | Contrast (minimum) | AUTO | See §1. |
| 1.4.4 | Resize text | SCRIPTED | 200 % preference; also respects browser zoom (rem-based). |
| 1.4.5 | Images of text | AUTO | None used. |
| 1.4.10 | Reflow | SCRIPTED | 320 px, no horizontal scroll. |
| 1.4.11 | Non-text contrast | AUTO, DESIGN | Field borders ≥ 4.4:1; focus indicator = ink outline 15:1 + halo. |
| 1.4.12 | Text spacing | PENDING | Layout uses flexible boxes; not yet tested with a text-spacing bookmarklet. |
| 1.4.13 | Content on hover or focus | DESIGN | No hover-only tooltips; disclosures are click/keyboard operated. |
| 2.1.1 | Keyboard | SCRIPTED | Registration completed keyboard-only; all controls are native elements. |
| 2.1.2 | No keyboard trap | SCRIPTED, DESIGN | Native `<dialog>` (Escape closes, focus returns). |
| 2.1.4 | Character key shortcuts | N/A | No single-key shortcuts. |
| 2.2.1 | Timing adjustable | DESIGN | No time limits in any form; 8-hour session; drafts survive session expiry. |
| 2.2.2 | Pause, stop, hide | DESIGN | Only short entrance motion; disabled by Reduce motion or OS setting. |
| 2.3.1 | Three flashes | DESIGN | No flashing content. |
| 2.4.1 | Bypass blocks | SCRIPTED | Skip link (always visible in keyboard-first mode). |
| 2.4.2 | Page titled | DESIGN | `document.title` set from each page's h1. |
| 2.4.3 | Focus order | SCRIPTED, PENDING | Logical in keyboard test; confirm with screen readers. |
| 2.4.4 | Link purpose (in context) | AUTO | Repeated links get visually hidden context (e.g. "View job: …"). |
| 2.4.5 | Multiple ways | DESIGN | Navigation, search (jobs, help), dashboard links. |
| 2.4.6 | Headings and labels | AUTO, DESIGN | Every question is a heading and a label. |
| 2.4.7 | Focus visible | AUTO, DESIGN | 3 px (5 px keyboard-first) outline + halo on every focusable element. |
| 2.4.11 | Focus not obscured (minimum) | DESIGN, PENDING | No sticky overlays except the caption bar (bottom, only while reading). To verify. |
| 2.5.1 | Pointer gestures | N/A | No multipoint or path gestures. |
| 2.5.2 | Pointer cancellation | DESIGN | Native buttons activate on up-event. |
| 2.5.3 | Label in name | AUTO | Visible text is the accessible name. |
| 2.5.4 | Motion actuation | N/A | None. |
| 2.5.7 | Dragging movements | N/A | None. |
| 2.5.8 | Target size (minimum) | DESIGN | Controls ≥ 44 px (exceeds the 24 px minimum). |
| 3.1.1 | Language of page | SCRIPTED | `<html lang>` follows the selected language. |
| 3.1.2 | Language of parts | DESIGN | Language names and untranslated articles carry `lang`. |
| 3.2.1 / 3.2.2 | On focus / On input | DESIGN | No context change on focus or input; language change is an explicit, announced setting. |
| 3.2.3 / 3.2.4 | Consistent navigation / identification | DESIGN | One shared shell and component set. |
| 3.2.6 | Consistent help | DESIGN | "Help with this question", Help page and "Get support" in the same places throughout. |
| 3.3.1 | Error identification | SCRIPTED | Error summary (focused, `role=alert`) + inline error linked with `aria-describedby`, `aria-invalid`. |
| 3.3.2 | Labels or instructions | AUTO, DESIGN | Labels, hints, examples, "why we ask". |
| 3.3.3 | Error suggestion | DESIGN | Messages say how to fix (e.g. phone format example). |
| 3.3.4 | Error prevention (legal, financial, data) | SCRIPTED | Review step + explicit confirmation before sending an application; withdraw / consent-revoke confirmations. |
| 3.3.7 | Redundant entry | SCRIPTED | Profile and account details prefill applications; drafts restore answers. |
| 3.3.8 | Accessible authentication (minimum) | DESIGN | Password managers and paste allowed, "Show password"; no cognitive tests or CAPTCHAs. |
| 4.1.2 | Name, role, value | AUTO | Native controls; `aria-pressed`, `aria-current`, `role=switch` where relevant. |
| 4.1.3 | Status messages | DESIGN, PENDING | One shared polite/assertive live region; to confirm announcements with NVDA and TalkBack. |

## 3. Known limitations and unverified requirements

- **No screen-reader testing yet** (NVDA, TalkBack, VoiceOver). This is the largest gap.
- **No testing with disabled users or a co-designer yet.** Spec §9 requires this; sessions are planned in the co-design log.
- **Translations** in Amharic, Afaan Oromo, Somali and Tigrinya are drafts and have not been reviewed by fluent speakers. Plain-language quality in those languages is unverified.
- **Voice input** depends on the browser's speech recognition. Support for Afaan Oromo, Somali and Tigrinya is likely missing; Chrome sends audio to an online service. See [known-limitations.md](known-limitations.md).
- **Read-aloud** depends on device voices; many devices have no Ethiopian-language voice (the app says so instead of reading in the wrong language).
- **Embedded components**: tested in Chromium only; Safari and Firefox not yet tested.
- **1.4.12 Text spacing** and **2.4.11 Focus not obscured** not yet explicitly tested.
- Automated tools find only part of real accessibility problems; passing axe is not evidence of full conformance.
