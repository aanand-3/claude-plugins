---
id: K-2026-10-24-judge-ui-from-full-size-screenshots
type: gotcha
title: Judge UI from full-size screenshots and sweep every view for overflow; scaled-down screenshots and doc-page-only checks let visual defects through
scope: packages/crew/ui/**
source: P-020
supersedes:
tier: project
created: 2026-10-24
---

# Judge UI from full-size screenshots and sweep every view for overflow; scaled-down screenshots and doc-page-only checks let visual defects through

P-020 passed tests and browser checks, yet the user found unstyled select arrows, a select as wide as its longest option, overflowing Relations rows, sideways-scrolling item pages and a board card whose FEAT-ID chip overflowed. The browser pane scaled 1280px pages into an 800px frame, and the overflow sweep only covered document pages.
