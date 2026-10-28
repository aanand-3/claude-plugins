---
id: P-086
title: Long words wrap on document pages at 375 px
goal:
items: BUG-039
touches: packages/crew/ui/src/styles/views.css, packages/crew/ui/src/styles/components.css, packages/crew/test/tools/layout-sweep.test.ts
depends_on:
status: draft
branch: plan/P-086-long-words-wrap-on-document-pages-at-375
pr:
created: 2026-10-28
started:
completed:
---

# P-086: Long words wrap on document pages at 375 px

## Context
BUG-039 (G-003, S4/P3): P-021's layout sweep (`plugins/crew/skills/design/scripts/layout_sweep.mjs`) finds document pages in
this repo's hub that scroll sideways at 375 px. Rerun on main on 2026-10-28 (`--widths 375 --themes light`): 444 findings
on 166 of 421 routes, all of them on `#/doc/*` routes, from three elements:

- `span.id` in the doc page header kicker (`.docpage__kicker .id`), the page's own ID: long knowledge IDs such as
  `K-2026-10-24-release-builds-the-generated-files-plans` run 18–50 px past `header.docpage__head`. Line 77 of `views.css`
  already gives it `overflow-wrap: anywhere`, but that has no effect because `.id` in `base.css` sets
  `white-space: nowrap`.
- `span.id` inside a markdown section (`Markdown.tsx` turns every known ID into `a.idlink > span.id`): long knowledge IDs
  mentioned in a plan's or item's text run past `article.docpage__main`. `.md` has `overflow-wrap: anywhere`, but the
  same `nowrap` cancels it, and the inline-flex `.idlink` keeps the ID's min-content width.
- `h2.docpage__title`: a title with a long unbroken word (`packages/crew/.vitest/`, `.crew/bin/crew.mjs…`) runs up to
  150 px past the header. The title has no wrap rule.

Each of these produces an `overflow` finding and, on most of those routes, a `sideways scroll` finding as well. Gotcha
K-2026-10-26-a-long-unbroken-word-overflows-as-text explains why only a text-node measurement catches it. The fix is CSS
only: long words wrap inside their box on the document page.

## Scope
**In:**
- `views.css` and `components.css`: the doc page title, the kicker ID and IDs inside markdown sections wrap long
  unbroken words instead of overflowing. Short IDs elsewhere (cards, relations, tree, chips) keep `nowrap`.
- `test/tools/layout-sweep.test.ts`: a regression test with a sandbox hub that has a long-word plan title, a long knowledge ID
  and that ID mentioned in a plan's text, with no findings on those doc pages at 375 px. The planted-overflow test is
  changed to match. The sweep's sideways-scroll detection keeps its own test.

**Out (explicitly not doing):**
- The board card title (`.doccard__title`): the sweep finds nothing there on this repo, and it is the planted overflow the
  sweep's own test relies on.
- Changes to the sweep or `layout_scan.ts`, and the relations panel (its IDs already truncate with an ellipsis).
- Build outputs (`plugins/crew/skills/hub/dist/**`, `.crew/bin/ui.html`): Release builds them (convention
  K-2026-10-24-release-builds-the-generated-files-plans).

## Acceptance criteria
- [ ] AC1: After `hub.build` in the plan worktree, run the worktree's sweep with the **main checkout** as the working
      directory: `node <worktree>/plugins/crew/skills/design/scripts/layout_sweep.mjs --widths 375 --themes light,dark`.
      It exits 0 ("clean"). Plan worktrees are sparse and have no hub documents; run this way, the sweep serves the
      worktree's built `crew.mjs`/`ui.html` against main's `.crew`. On main before the fix the same sweep exits 1 with more
      than 400 findings.
- [ ] AC2: The same run with `--widths 900,1440 --themes light,dark` reports no finding that the base
      branch run (same command on main, recorded in this plan's Progress log before the fix) does not report.
- [ ] AC3 (regression test): a `layout-sweep.test.ts` case builds a sandbox hub with (a) a plan whose title contains a
      long unbroken word, (b) a knowledge entry with a long ID, and (c) a plan whose Context mentions that ID. The sweep at
      `--widths 375 --themes light,dark` reports no finding on any of those `#/doc/…` routes. Run against the base branch's
      CSS, the test fails.
- [ ] AC4: the sweep still detects overflow and sideways scroll. The planted test still exits 1 and names
      `div.doccard__title` on `#/board` at 375 and 1440 px. A test serves a stub page wider than the viewport over `--url`
      (a `node:http` server in the test answering `api/graph` with `{"docs":[]}`) and gets exit 1 with a
      `375px light #/overview: sideways scroll` line. The no-plant test (exit 0) and the no-browser test (exit 2) pass unchanged.
- [ ] AC5: IDs outside the doc page header and markdown sections do not wrap. `base.css` is unchanged (`.id` keeps
      `white-space: nowrap`), and the new wrap rules are scoped to `.docpage__kicker`, `.docpage__title` and `.md`. Checked by reading the diff.
- [ ] AC6: `check_design.mjs --all` is clean in the worktree, and Designer screenshots of a long-ID knowledge page and a
      long-title plan page at 375 px (light and dark) show the text wrapped inside the header and panels.

## Approach
- Kicker ID: in `views.css` add `white-space: normal` to the existing `.docpage__kicker .id` rule so that its
  `overflow-wrap: anywhere` takes effect.
- Markdown IDs: in `components.css` next to the `.md` rules, add `.md .id { white-space: normal; }` and make the link
  shrinkable (`.md .idlink { min-width: 0; }` already exists on `.idlink`, so check whether the inline-flex item also
  needs `min-width: 0` on `.md .id`). The ID then wraps like the surrounding prose, which inherits `overflow-wrap: anywhere`.
- Title: in `views.css` add `overflow-wrap: anywhere` to `.docpage__title`. `.docpage__headmain` already has `min-width: 0`.
- Use `anywhere` rather than `break-word`. Only `anywhere` lowers the min-content width, which a flex item needs in order
  to shrink.
- Verify with the sweep itself (AC1/AC2) on this repo's real data rather than reasoning about selectors. The generated
  bundle is built in the worktree only to run the sweep and is never committed.
- Overlap: P-072 (accepted, not landed) touches `views.css` with one line at `.inbox__text` (~line 199), far from the
  docpage rules (~70–80). The test file is under `hub.shared`.

## Design
<!-- Written by the Designer before ready (UI plan: touches overlap packages/crew/ui/**). -->

## Tasks
- [ ] T1: Record the baseline: on main, run the sweep at `--widths 375 --themes light,dark` and at `--widths 900,1440 --themes light,dark`, and log the finding counts plus the 900/1440 finding list in the Progress log → verify: the counts are in the Progress log
- [ ] T2: Write the AC3 regression test and the AC4 changes in `packages/crew/test/tools/layout-sweep.test.ts`: the planted test drops the `#/doc/P-001` sideways-scroll expectation and keeps the board overflow, and a stub `--url` sideways-scroll test is added. Show that AC3 fails on the base CSS → verify: `cd packages/crew && npx vitest run test/tools/layout-sweep.test.ts` fails only on the AC3 case before T3
- [ ] T3: CSS fix in `packages/crew/ui/src/styles/views.css` and `components.css` (`base.css` stays unchanged) → verify: `npx vitest run test/tools/layout-sweep.test.ts` passes, and `npm run typecheck` passes
- [ ] T4: Real-data sweep: `npm run build` in `packages/crew` (not committed), then, with the main checkout as the working directory, run `node <worktree>/plugins/crew/skills/design/scripts/layout_sweep.mjs` at 375 (light, dark) and at 900/1440 → verify: AC1 exit 0, and AC2 has no new findings compared with T1
- [ ] T5: Visual QA → verify: `check_design.mjs --all` clean; screenshots at full size at 375/900/1440 px, light and dark, of a long-ID knowledge page and a long-title plan page match DESIGN.md (IDs in monospace, header layout unchanged at 1440)

## Test plan
**Targeted checks:**
- `cd packages/crew && npx vitest run test/tools/layout-sweep.test.ts` covers AC3 and AC4. It needs a Chromium-family
  browser: without one the browser tests skip, which does not count as evidence.
- `node <worktree>/plugins/crew/skills/design/scripts/layout_sweep.mjs --widths 375 --themes light,dark`, run with the main
  checkout as the working directory after `npm run build` in the worktree's `packages/crew`, covers AC1 (exit 0).
- The same sweep with `--widths 900,1440 --themes light,dark`, compared with T1's baseline, covers AC2.
- Reading `git diff main...HEAD -- packages/crew/ui/src/styles` covers AC5.
- `check_design.mjs --all` plus the Designer's screenshots cover AC6.
- Bug regression: the AC3 case fails on the base CSS and passes after T3.

## Rollout & rollback
n/a: a CSS-only change to the hub UI that ships with the next build. To back out, revert the commit.

## Risks & open questions
- `overflow-wrap: anywhere` breaks a long ID mid-word at the line end, so `K-2026-…-plans` may split across two lines.
  That is intended: wrapping is better than a sideways scroll, and the ID stays a complete link.
- A short ID such as `P-012` inside prose may now break at its hyphen at the end of a line. This is acceptable in prose.
  If the Designer objects, the alternative is a `long` class from `Markdown.tsx` on IDs over ~20 characters, which adds
  `Markdown.tsx` to touches.
- The sandbox regression test adds three doc routes × 2 themes to the sweep test's runtime (seconds).

## Handoff

## Progress log

## Outcome
