# ACCESSFLOW — Accessibility conformance (WCAG 2.2 AA) — interim report

| | |
|---|---|
| Product | ACCESSFLOW module (`<db-signup>`) and web app, version 0.1.0 |
| Date | 2026-11-15 |
| Standard | WCAG 2.2 Level A and AA |
| Claim | **No conformance claim.** Automated and scripted evidence only; the required human evidence (below) is missing. |
| Detailed criterion table | [docs/accessibility/conformance-report.md](docs/accessibility/conformance-report.md) |

Terms: **Supports** — automated/scripted evidence and no known failures (still awaiting human testing) ·
**Partly Supports** — some parts work, known gaps · **Does Not Support** — not met.

## Evidence collected (automated, 2026-11-15)
- axe-core (WCAG 2.0/2.1/2.2 A+AA rules): **0 serious/critical** on every scanned page, form step, dialog, the audio bar, the
  dark theme, and the module embedded in the Savanna pages and the blank page; **0 violations of any severity** on the 10
  public pages.
- Scripted (Playwright): keyboard-only registration; focus moves to each question heading; error summary focused and
  linked; 320 px reflow and 200 % text with no horizontal scrolling; every preference changes the UI; sound-off journey;
  audio guidance (simulated speech engine) in English and Amharic; camera permission and cleanup (fake camera); offline
  at question 7 with reload; full journey on desktop and an Android (Pixel 5) profile.
- Totals: 141 automated tests passing (56 backend, 11 frontend unit, 74 browser).

## Summary by principle
| Area | Status | Notes |
|---|---|---|
| 1.1 Text alternatives | Supports | Icons are decorative and always paired with text. |
| 1.2 Time-based media | Not applicable | No audio/video content. Optional read-aloud is generated from visible text; audio guide text is always shown on screen. |
| 1.3 Adaptable (info & relationships, sequence, orientation, input purpose) | Supports | Native controls, fieldsets/legends, landmarks, `autocomplete`; screen-reader order still to be verified by people. |
| 1.4 Distinguishable (contrast, resize, reflow, non-text contrast, hover) | Partly Supports | Contrast/resize/reflow pass; **1.4.12 Text spacing not yet tested**. |
| 2.1 Keyboard accessible | Supports | Scripted keyboard-only journey; no traps (native `<dialog>`). |
| 2.2 Enough time | Supports | No time limits; drafts survive session expiry. |
| 2.3 Seizures | Supports | No flashing; motion only, can be disabled. |
| 2.4 Navigable | Partly Supports | Skip link, titles, headings, focus visible; **2.4.11 Focus not obscured** not yet verified with the fixed audio/caption bar (page bottom padding added). |
| 2.5 Input modalities (target size, label in name, pointer) | Supports | Targets ≥ 44 px; voice and sign/phrase inputs are optional. |
| 3.1 Readable (language of page/parts) | Partly Supports | `lang` set per language; **translations other than English are unreviewed drafts**; simplified-language variants exist for some texts only. |
| 3.2 Predictable / 3.2.6 Consistent help | Supports | Same help, support and audio controls on every page. |
| 3.3 Input assistance (errors, labels, prevention, redundant entry, accessible authentication) | Supports | Plain-language errors spoken and shown; review + explicit confirmation; profile reuse; no cognitive tests. |
| 4.1 Compatible (name, role, value, status messages) | Partly Supports | Native semantics; shared live region; **not yet confirmed with NVDA/TalkBack**. |

## Missing human evidence (all PENDING)
| Required evidence | Status |
|---|---|
| NVDA (Windows) full journey | Not done |
| TalkBack (low-cost Android) full journey | Not done |
| Keyboard-only completion by a real user | Not done (scripted only) |
| Independent completion by the co-designer | Not done — co-designer not yet named |
| Human review of Amharic, Afaan Oromo, Somali, Tigrinya | Not done |
| Real-device speech recognition per language | Not done |
| Real-device speech-synthesis voices (Amharic, English) | Not done — tests use a simulated engine; the development Mac has no Amharic voice |
| Sign-language recognition validation | Not applicable yet — **no recogniser is implemented** |

Checklist for the sessions: [docs/accessibility/manual-test-checklist.md](docs/accessibility/manual-test-checklist.md).
