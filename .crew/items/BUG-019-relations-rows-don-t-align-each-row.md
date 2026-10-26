---
id: BUG-019
type: bug
title: Relations rows don't align: each row sizes its own chip column
status: triaged
severity: S4
priority: P3
goal: G-001
plan: P-020
created: 2026-10-24
closed:
---

# BUG-019: Relations rows don't align: each row sizes its own chip column

## Summary
Relations rows on the document page put the status chip first, but the linked titles do not line up: each row is its own grid with an `auto` first column, so a row's title starts wherever its chip ends. P-020 AC5 asks for rows "aligned in a grid".

## Environment
P-020 worktree at 3baae03 (branch plan/P-020-jira-style-document-page-spend-by-plan), hub UI served for the sandbox clone at http://127.0.0.1:8767/, desktop app browser pane, 1440px and pane width.

## Steps to reproduce
1. Open http://127.0.0.1:8767/#/doc/G-001 and look at the Relations card, group "In this goal 8" (mix of `triaged` and `done` items).
2. In the console: `[...document.querySelectorAll('.relations__group li')].map(li => li.querySelector('.chip').textContent.trim() + '@' + Math.round(li.querySelector('a').getBoundingClientRect().left))`
3. Repeat on #/doc/P-014, group "Mentioned in 4" (`done` and `dropped`).

## Expected
Every row's ID/title starts at the same x within a group: the chip column has one width for the whole group (shared grid columns or a fixed chip column).

## Actual
The link's left edge depends on the chip text: G-001 gives `done@864`, `triaged@875`; P-014 "Mentioned in 4" gives `done@864`, `dropped@883`; IDEA's `proposed` row starts at 888. Visibly ragged in the screenshot of G-001's Relations card.

## Evidence
`packages/crew/ui/src/styles/views.css:129`: `.relations__group li { display: grid; grid-template-columns: auto minmax(0, 1fr); ... }` — each `<li>` sizes its own `auto` column; the `<ul>` has no grid (`grid-template-columns: none`).

## Impact
Cosmetic (S4): titles are harder to scan down a group. Fails the "aligned in a grid" part of P-020 AC5; chip-first order and collapsible groups work.

## Notes
Found by QA while testing P-020.
- 2026-10-24: status new → triaged — priority P3, severity S4
- 2026-10-26: DONE: fixed by P-020 (78a3edf). ui/src/styles/views.css .relations__group li uses grid-template-columns 96px minmax(0,1fr) (fixed chip column sized for 'superseded'), so titles align. No remaining work.
