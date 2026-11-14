# 0006: Accessibility testing and evidence policy

**Decision.**
- Target: WCAG 2.2 AA.
- Automated checks (axe-core, keyboard-only Playwright journeys, zoom and reflow, sound-off) are CI
  gates from Phase 2.
- **Manual testing and co-designer review happen in every phase**, logged in
  [manual-test-log.md](../accessibility/manual-test-log.md) and
  [codesign-log.md](../accessibility/codesign-log.md), with the action taken on each finding.
- **No claim of WCAG conformance, screen-reader compatibility or device support is made in the README,
  the UI, demos or the submission unless a logged test backs it up.** Untested areas are listed as
  limitations in the conformance report.
