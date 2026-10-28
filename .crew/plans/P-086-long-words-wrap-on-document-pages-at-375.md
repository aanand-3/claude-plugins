---
id: P-086
title: Long words wrap on document pages at 375 px
goal:
items: BUG-039
touches: packages/crew/ui/src/styles/views.css, packages/crew/ui/src/styles/components.css, packages/crew/test/tools/layout-sweep.test.ts
depends_on:
status: ready
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
- Markdown IDs: in `components.css` next to the `.md` rules, add `.md .id { white-space: normal; min-width: 0; }`.
  `.idlink` already has `min-width: 0; max-width: 100%`; `.md .id` is a flex item of the inline-flex `.idlink`, so it
  needs its own `min-width: 0` to shrink below its min-content width. The ID then wraps like the surrounding prose, whose
  `overflow-wrap: anywhere` it inherits. If the AC3 case still finds the ID after this, the developer reports it in the
  Progress log rather than widening the selector beyond `.md`.
- Title: in `views.css` add `overflow-wrap: anywhere` to `.docpage__title`. `.docpage__headmain` already has `min-width: 0`.
- Use `anywhere` rather than `break-word`. Only `anywhere` lowers the min-content width, which a flex item needs in order
  to shrink.
- Verify with the sweep itself (AC1/AC2) on this repo's real data rather than reasoning about selectors. The generated
  bundle is built in the worktree only to run the sweep and is never committed.
- Overlap: P-072 (accepted, not landed) touches `views.css` with one line at `.inbox__text` (~line 199), far from the
  docpage rules (~70–80). The test file is under `hub.shared`.

## Design
<!-- Written by the Designer before ready (UI plan: touches overlap packages/crew/ui/**). -->
**Layout: unchanged.** The document page keeps the shell and composition from `packages/crew/docs/design/DESIGN.md`
(Layout, "Document pages"): a header across both columns (kicker, title, progress on the left; Actions split button on the
right), the main column of collapsible panels and tabs with prose capped at 90ch, and the 360 px details rail (stacked
below the main column under 900 px). No component is added, and no inventory entry changes. The only change is that three
text runs wrap inside their existing boxes:

```
375 px, before                          375 px, after
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ KNOWLEDGE · K-2026-10-24-relea│se-…  │ KNOWLEDGE · K-2026-10-24-rele│
│ Fix packages/crew/.vitest/caches│…   │ ase-builds-the-generated-fil │
│ ┌ Context ──────────────────┐ │        │ es-plans                     │
│ │ see K-2026-10-24-release-b│ui…     │ Fix packages/crew/.vitest/ca │
└──────────────────────────────┘        │ ches                         │
                                        │ ┌ Context ─────────────────┐ │
                                        │ │ see K-2026-10-24-release-│ │
                                        │ │ builds-the-generated-fil │ │
                                        │ │ es-plans and P-012 …     │ │
                                        └──────────────────────────────┘
```

**Decision on the open point (short IDs at a line end): no `long` class, `Markdown.tsx` stays out of touches.** A short ID
cannot split at its hyphen with the Approach's CSS, because each markdown ID is an `a.idlink` with `display: inline-flex`:
an atomic inline box that moves whole to the next line when it does not fit, and is sized from the full line width, so its
inner `.id` only wraps when the ID alone is wider than the column. The kicker ID is a flex item in a `flex-wrap: wrap` row
and behaves the same way. The developer therefore must not change `.idlink` to `display: inline` (that would let short
IDs split); if that ever seems needed, stop and ask the Designer.

**Rules for the build:**
- Only existing tokens; no new colour, size or font. IDs keep `font: 500 var(--text-xs) var(--font-mono)` and
  `--muted-foreground` (DESIGN.md Typography: IDs in monospace); a wrapped ID stays one link with one underline on hover.
- The wrap rules are the three in the Approach, scoped to `.docpage__kicker .id`, `.md .id` and `.docpage__title`.
  `base.css`, `.idlink`, `.idlink__title` (ellipsis) and the relations panel (ellipsis at 55 %) are unchanged.
- The title keeps its size, line height (1.1) and letter spacing; ordinary titles still break between words, and only a
  word wider than the column breaks inside itself.

**UI acceptance criteria (checked in the design review, at full size):**
- D1 · Breakpoints: 375, 900 and 1440 px, light and dark, for (a) a knowledge page with a long ID (e.g.
  `#/doc/K-2026-10-24-release-builds-the-generated-files-plans`), (b) a plan whose title has a long unbroken word and (c) a
  plan or item whose prose mentions a long knowledge ID. At 375 px nothing runs past the header or a panel edge and the
  page does not scroll sideways; at 900 and 1440 px the header (title left, Actions right), panels and rail look as on main.
- D2 · Short IDs in prose (`P-012`, `FEAT-016`) never split across lines at any width; resize 375 → 900 on a page with
  dense ID prose (e.g. a plan's Context) and check line ends.
- D3 · Long content: a wrapped long ID in prose keeps its baseline with the surrounding text and the line spacing of
  `.md` (1.6) does not collapse; a wrapped kicker ID does not push the Actions split button off the header.
- D4 · States: these pages have no empty, loading or error state of their own; the existing doc page "not found" state is
  unchanged and is not re-reviewed.
- D5 · Components used: shell, document page header (kicker, title), collapsible panel, IdLink inside Markdown, details
  rail; none new.

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
- Short IDs such as `P-012` in prose: resolved in Design. `.idlink` stays `inline-flex` (an atomic inline box), so a
  short ID moves whole to the next line and never splits; no `long` class, `Markdown.tsx` stays out of touches (D2).
- The sandbox regression test adds three doc routes × 2 themes to the sweep test's runtime (seconds).

## Handoff

## Progress log

- 2026-10-28: status draft → ready

## Outcome
