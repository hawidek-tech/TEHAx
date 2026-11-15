# ACCESSFLOW — Simplified learner flow (UX specification)

_Status: approved plan, 2026-11-15. Not built yet. Amharic text is an **unreviewed draft** and must be checked by a fluent
speaker and the co-designer before release._

## Why
Today a new learner answers 6 registration and 23 profile questions (~29 screens) before seeing a job, and every page
carries a toolbar (language, audio, preferences, help) that screen-reader users must pass each time. This specification
reorders the journey around what the learner wants to do, asks only what is needed when it is needed, and moves secondary
controls into one Help menu. No feature is removed.

## Decisions (approved)
1. Jobs can be browsed without an account (already true in the API and `/jobs`); sign-in is asked only when applying.
2. The profile is split into a **minimum** part (asked when applying) and **optional parts** (asked later, skippable).
3. We do **not** ask "Do you use a screen reader?". We ask how the person wants to use the module (screen 2).

## Rules
| # | Rule | How it is checked |
|---|---|---|
| R1 | One decision per screen; the first sentence says what to do | Each screen has exactly one `h1` and one primary button |
| R2 | Intent before identity | No account question before the learner picks a path |
| R3 | Ask each question only when needed; never ask twice | Known answers are pre-filled, skipped, and shown on the review screen (WCAG 3.3.7) |
| R4 | Always say length and that answers are saved | Path intro states parts, question count, "saved after each question" |
| R5 | One "Help and settings" button instead of a toolbar | Header contains logo, Help button, and (signed in) "My account" only |
| R6 | No single-key shortcuts | Nothing reacts to a single character key (WCAG 2.1.4) |
| R7 | Every choice can be changed later | All first-visit choices appear in Help and settings |

## First visit

### Screen 0 — Start
One full-width button. The press is the user gesture that allows the browser to speak.

| | English | Amharic (draft) |
|---|---|---|
| Button | Start · ጀምር · Jalqabi · Bilow · ጀምር | (same; each word carries its own `lang`) |
| After press | Speaks "Choose your language" once in each language that has a device voice, then stops. Pressing any language stops it immediately. | ቋንቋዎን ይምረጡ |

Skipped when: a language and mode are already remembered (returning visit), or inside an embed.

### Screen 1 — Language
`h1`: "Choose your language" / "ቋንቋዎን ይምረጡ". Five large buttons, each in its own language and script, with matching `lang`:
**English · አማርኛ · Afaan Oromoo · Soomaali · ትግርኛ**. One press chooses and moves on (Back is always available).
Skipped when the embed `lang` attribute or a remembered choice exists.

### Screen 2 — How do you want to use ACCESSFLOW?
| Option (English) | Amharic (draft) | What it sets |
|---|---|---|
| **Read it to me** — "I will hear each question and my choices." | **አንብብልኝ** | Audio guide on (short prompts after first use), captions off |
| **I use my own screen reader** — "ACCESSFLOW stays quiet so voices don't overlap." | **የራሴን የስክሪን አንባቢ እጠቀማለሁ** | Audio guide off, read-aloud buttons kept, no autoplay of any sound |
| **I'll read and type** | **እኔ አንብቤ እጽፋለሁ** | Defaults |
| **I use sign language or pictures** | **የምልክት ቋንቋ ወይም ስዕሎችን እጠቀማለሁ** | Phrase board + sign button shown on every text question, pictograms on, sound off, captions on |
| Checkbox: **Use simple words** | **ቀላል ቃላት ተጠቀም** | Low-literacy variants |

Footer line: "You can change this any time in Help and settings." / "ይህንን በማንኛውም ጊዜ በእገዛ እና ቅንብሮች መቀየር ይችላሉ።"

### Screen 3 — What would you like to do today?
`h1`: "What would you like to do today?" / "ዛሬ ምን ማድረግ ይፈልጋሉ?"

| Option | Amharic (draft) | Goes to |
|---|---|---|
| **Find a job** | **ሥራ ፈልግ** | Path A |
| **Create my profile** | **መገለጫዬን ፍጠር** | Path B |
| **Ask for support** — "Private. Employers never see it." | **ድጋፍ ጠይቅ** | Path C |
| **Learn how this works** — "About one minute." | **እንዴት እንደሚሰራ ተማር** | Path D |
| Small link: I'm an employer or staff member | አሰሪ ወይም ሠራተኛ ነኝ | Sign-in for employers/staff (unchanged) |
| Small link (if an account exists): Sign in | ግባ | Sign-in, then Returning visit |

**Storage:** language and mode are kept in this browser (`localStorage`, no personal data) and, once signed in, in the
account's preferences. In "Shared device" mode nothing is kept locally, so screens 0–2 appear again next time.

## Paths

### Path A — Find a job (main path)
| Step | Screen | Notes |
|---|---|---|
| A1 | Jobs list | Spoken: "5 jobs found. Job 1 of 5: Data clerk, Addis Ababa." Actions: **Hear more**, **Next job**, filter **Only jobs that offer the support I need** |
| A2 | Job detail | Primary: **Apply** / **አመልክት** |
| A3 | Account (only if signed out) | Intro: "To apply you need an account. 4 questions. Your answers are saved after each one." Questions: name → phone → password → privacy agreement. "Use email instead" is a link on the phone question, not a separate question. Link: "I already have an account" |
| A4 | Minimum profile (only the missing items) | Intro: "The employer needs a few details. 4 questions." father's name → region → "What work do you do?" (headline) → skills. Given name is pre-filled from the account name |
| A5 | Application | motivation → availability → what to share → share private support needs? (+ note if yes). Phone/email are pre-filled from the account and shown on review instead of being asked |
| A6 | Review | Everything read back by section; each item has **Change**. Primary: **Send application** |
| A7 | Done | "Sent. Reference AF-123. We will tell you when the employer replies." / "ተልኳል። ..." Next choice: **Finish my profile (optional)** or **Look at more jobs** |

New learner total: about 13 question screens before sending (was 29+ before seeing a job).

### Path B — Create my profile
Intro: "Your profile has 3 parts, about 12 questions, plus 2 optional parts. You can stop after any part."

| Part | Questions |
|---|---|
| 1. About you | given name, father's name, grandfather's name, birth year, region, city |
| 2. Work and study | headline, summary, experience, education |
| 3. Skills and languages | skills, languages |
| Optional: ID or referral | identity route (+ document or referral, by answer) |
| Optional: Private support | support needed? (+ category, message, contact) , workplace support |

After each part: "Part 2 of 3 done." Buttons: **Continue** / **Stop for now**. Questions answered in Path A are skipped.
If the learner is signed out, the 4 account questions come first (same as A3).

### Path C — Ask for support
Account questions first if signed out (A3). Then category → message (voice, typing or phrase board) → how to contact.
Confirmation: "Only support staff can see this. Employers never see it." / "ይህንን የሚያዩት የድጋፍ ሠራተኞች ብቻ ናቸው። አሰሪዎች በፍጹም አያዩትም።"

### Path D — Learn how this works (≈ 60 s, spoken and shown)
1. You answer one question at a time; **Continue** and **Back** are always at the bottom.
2. **Help and settings** is at the top: repeat, change language, sound, ask a person, save and stop.
3. You can type, speak your answer (you check it before it is used), or use picture phrases.
4. If the internet stops, keep going; your answers are kept and sent later.
5. Your private support needs are never shown to employers.
Ends on screen 3.

## Returning visit
- No setup questions (language and mode remembered).
- One spoken sentence and one primary button, chosen in this order:
  1. News: "The employer replied to your application for Data clerk." → **Open**
  2. Unfinished work: "You have one thing to finish: your application for Data clerk." → **Continue**
  3. Otherwise: "Welcome back, Almaz." → screen 3 choices.
- Secondary: **Something else** (screen 3).

Amharic (draft): "እንኳን ደህና መጡ፣ {name}።" · Continue **ቀጥል** · Something else **ሌላ ነገር** · Open **ክፈት**

## Help and settings (one button on every screen)
| Item | Amharic (draft) |
|---|---|
| Repeat | ድገም |
| Change language | ቋንቋ ቀይር |
| Sound and reading (mode from screen 2, speed, simple words) | ድምፅ እና ንባብ |
| Speak or use pictures (voice input, phrase board, sign) | በድምፅ ወይም በስዕል ይመልሱ |
| Ask a question (approved help; AI only with consent) | ጥያቄ ይጠይቁ |
| Ask a person (private support) | ሰው ይጠይቁ |
| Save and stop | አስቀምጥ እና አቁም |
| All settings (theme, text size, contrast, motion, shared device) | ሁሉም ቅንብሮች |

"My account" (signed in): My applications, My profile, Download my data, Delete my account, Sign out.

## Audio guide wording rules
- First time a question type appears: question + choices + how to answer. Afterwards: progress + question + choices only.
- Errors: spoken immediately, then the question again.
- Offline: "No internet. Keep going; your answers are safe." / "ኢንተርኔት የለም። ይቀጥሉ፤ መልሶችዎ ደህና ናቸው።" (spoken once)
- Back online: "Connected. Your answers were sent."
- Never speaks when mode is "I use my own screen reader" or "sign language or pictures".

## Embedded module (`<db-signup>`)
- `lang` attribute → screen 1 skipped. `view` → screen 3 skipped (`signup` = Path B part 1 after account, `jobs` = Path A,
  `profile` = Path B, `job-application` = A3–A7).
- Screen 2 is shown once (stored in the module's own storage); a link "Change how I use this" stays in the frame's Help.
- Events (`db-signup:*`) are unchanged.

## Acceptance tests (to write before building)
Automated (Playwright, desktop + Android profile):
1. First visit shows screen 0 → 1 → 2 → 3; each screen has one `h1`, focus on it, axe 0 serious/critical.
2. Choosing a language sets `<html lang>` and all text; choice survives reload; Shared device mode does not store it.
3. Mode "Read it to me" turns the audio guide on (simulated engine); "own screen reader" and "sign/pictures" never call
   `speechSynthesis.speak` after screen 1.
4. Path A, signed out, new learner: jobs list → apply → 4 account questions → 4 profile questions → application →
   review → sent, with **≤ 14 question screens**, no question asked twice, phone pre-filled.
5. Path A, signed in with full profile: Apply goes straight to the application questions.
6. Path B: "Stop for now" after part 1 → returning visit offers **Continue** to part 2.
7. Path C: support request visible to staff, never to employers (existing backend test extended).
8. Returning visit: unfinished application is the one primary action; status news takes priority.
9. Help menu contains every item in the table; header has no other preference controls; no single-key shortcuts.
10. Embed: `lang` + `view` skip screens 1 and 3; existing plugin tests still pass.
11. Offline during Path A at the application step: reload, answers restored, sent after reconnect.
12. All existing 141 tests still pass (updated only where the old order is asserted).

Manual (required before any claim):
- Co-designer completes Path A independently with their own setup; time and problems logged in `docs/accessibility/codesign-log.md`.
- NVDA and TalkBack: screens 0–3 and Path A; confirm screen 0's one-time spoken prompt is acceptable or should be removed.
- Fluent speakers review all Amharic (and later om/so/ti) wording in this document.

## Build impact (outline, for the next phase)
| Area | Change |
|---|---|
| Frontend | New `FirstVisit` (screens 0–3) at `/`; returning-visit logic in `WelcomePage`; header reduced to Help + My account; Help sheet gathers existing controls |
| Form engine | Flow "parts" with stop points; skip steps already answered; pre-fill from account; a `profile-minimum` step list |
| Flows | Registration: `contactMethod` becomes a link on the phone step; profile sections regrouped into 3 parts + 2 optional |
| Backend | Minimal: profile PATCH already exists; applying already works with a partial profile |
| Docs/tests | Update README, PROJECT_STATUS, tests listed above |
