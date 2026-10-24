---
version: alpha
name: crew hub — Sienna Workshop
description: Warm, characterful and calm project-tracking UI for developers and their Claude sessions; dense like Linear, friendlier in tone.
status: final
revision: 1
source: "Wada #182"  # Raw Sienna #bb7125, Vandyke Brown #4b3317, Deep Indigo #051230
colors:
  background: "#f9faff"
  foreground: "#212331"
  card: "#feffff"
  card-foreground: "#212331"
  muted: "#eff0fc"
  muted-foreground: "#686a77"
  border: "#dbdce7"
  primary: "#bb7125"
  primary-foreground: "#111111"
  secondary: "#ffe6c7"
  secondary-foreground: "#111111"
  accent: "#fff0df"
  accent-foreground: "#212331"
  destructive: "#be3c3c"
  destructive-foreground: "#ffffff"
  success: "#2f7a4f"
  warning: "#9a6200"
  ring: "{colors.primary}"
  chart-1: "#bb7125"
  chart-2: "#3f5aa6"
  chart-3: "#4b3317"
  dark-background: "#181921"
  dark-foreground: "#ebedff"
  dark-card: "#212126"
  dark-card-foreground: "#ebedff"
  dark-muted: "#2f3039"
  dark-muted-foreground: "#a4a5b3"
  dark-border: "#383942"
  dark-primary: "#bb7125"
  dark-primary-foreground: "#111111"
  dark-secondary: "#4f3921"
  dark-secondary-foreground: "#ffffff"
  dark-accent: "#38291d"
  dark-accent-foreground: "#ebedff"
  dark-destructive: "#f36b64"
  dark-destructive-foreground: "#111111"
  dark-success: "#6cc08f"
  dark-warning: "#e0a94a"
  dark-ring: "{colors.dark-primary}"
  dark-chart-1: "#c97d30"
  dark-chart-2: "#7d8fd6"
  dark-chart-3: "#a4a5b3"
typography:
  pairing: workshop  # Bricolage Grotesque / Nunito Sans (assets/fonts.json)
  display:
    fontFamily: Bricolage Grotesque
    fontWeight: 600
    letterSpacing: -0.02em
  body:
    fontFamily: Nunito Sans
    fontSize: 14px
    lineHeight: 1.5
  mono:
    fontFamily: ui-monospace
  scale: 1.2  # sizes: 12, 14, 16, 20, 24, 28, 34
rounded:
  sm: 6px
  md: 10px
  lg: 12px
spacing:
  base: 4px  # scale: 4 8 12 16 24 32 48 64 96
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: 36px
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: 36px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: 16px
---

# crew hub design system

The single home of visual decisions for the hub UI (`packages/crew/ui`). Read this before building or changing any UI. Code uses tokens (CSS custom properties in `ui/src/styles/tokens.css`), never the raw values above. Change it with `/crew:design refresh`.

## Overview
**Sienna Workshop.** A warm raw-sienna accent on cool, slightly blue paper with deep-indigo ink. It feels like a well-kept workshop bench: friendly and characterful, but calm enough to read for an hour. It has the density of Linear without that tool's cold monochrome; the warmth comes from one accent and a rounded humanist text face, not from decoration. Surface: **app** (executive overview, board, tree, graph, document pages). Dark mode: **yes**, following the OS setting with a manual toggle.

## Colors
- **Primary (sienna)** marks the one main action on a page, the selected nav item, the active/in-progress card and the focus goal. It's never used for body text: its contrast on the background is 3.4:1, which is fine for boundaries and large marks but not for text. Links are `foreground` text with a primary underline.
- **Secondary (apricot)** fills chips for the current context (the focus goal) and the selected filter. **Muted** is for page backgrounds behind cards, empty bars and skeletons.
- **Status:** `success` (done, decided), `warning` (waiting, in review, P1), `destructive` (blocked, S1/S2 bugs). Always paired with a word or icon, never colour alone.
- **Charts** use `chart-1` (sienna: actual / done) and `chart-2` (indigo-blue, from the palette's Deep Indigo: committed / second series), in that order. Both pairs pass the dataviz validator (lightness band, chroma, CVD ΔE ≥ 22) on `card` in light and dark. `chart-3` is reserved. Ideal and target lines are dashed `muted-foreground` reference lines, not series. Charts with 2 or more series always have a legend, and values in tooltips use text tokens.
- Proportion: neutral ~70%, secondary ~20%, sienna ≤10%.

## Typography
- **Bricolage Grotesque** (display, 600) for page titles, card titles and KPI numbers. Its slightly quirky grotesque shapes give the warmth and character.
- **Nunito Sans** (text, 400/500/600) for everything else. It's rounded and humanist, so it stays friendly at 13–14 px.
- **ui-monospace** for IDs (`P-012`, `FEAT-016`), points and branch names.
- Fonts are bundled into the page (no network), so it works offline from `file://`.
- Scale 1.2: 12 caption/meta · 14 UI and body · 16 doc body · 20 section title · 24 page title · 28/34 KPI and hero numbers.
- Weights 400/500/600 only. All numbers that change use tabular numerals.

## Layout
- **Shell:** a left sidebar (232 px) with the project name, nav (Overview, Board, Hierarchy, Graph), and the current branch plus data source at the bottom. A top bar holds the page title, the global search (`/` focuses it) and the filter chips. Content has a max width of 1440 px and padding of 24 px (16 px on mobile). Document pages use a two-column layout: a header across both columns (title on the left, the Actions split button on the right), a main column that fills the width (prose capped at 90ch) with main sections as collapsible panels and reference sections as tabs, plus a sticky 360 px details rail (details with spend, touches, relations, triage/log).
- **Breakpoints:** below 768 px the sidebar collapses to a top bar with a menu button, and the details rail moves below the content (it stacks below 1024 px). At 1024 px and up the board shows all columns side by side; below that it scrolls horizontally with snap.
- **Rhythm:** 24 px between sections, 12 px between cards in a group, 8 px inside cards.

## Elevation & Depth
Borders and surface contrast, not shadows. Cards are `card` on a `muted`/`background` page with a 1 px `border`. One shadow level (`0 8px 24px` at 12% ink) for overlays only: popovers, the command palette, toasts. In dark mode, cards are lighter surfaces (`dark-card`), with no shadows.

## Shapes
Radius family: `sm` 6 for chips, inputs inside dense rows and bars; `md` 10 for buttons, inputs and board cards; `lg` 12 for panels and cards. A nested radius equals the outer radius minus the padding. Icons are Lucide at 16 px with a 1.75 stroke, inline SVG.

## Components
Inventory: compose pages from these. A new composite is added here, with its states, in the same change that introduces it.

| Component | Built from | Variants | States |
|---|---|---|---|
| Button | `<button>` | primary, secondary, ghost, destructive | hover, active, focus, disabled, busy |
| AppShell | sidebar + topbar | desktop, mobile | — |
| PageHeader | shell | title only / with actions | — |
| Chip | `<span>` | neutral, accent, status (success/warning/destructive) | — |
| IdTag | mono text | plain, link | — |
| Card | `<section>` | plain, KPI, interactive (hover border) | loading (skeleton) |
| KpiCard | Card | number + caption, status-coloured number | loading |
| DocCard | Card | plan, item, goal (compact board card) | active (primary border), blocked (destructive left bar), dragging |
| ProgressBar | `<div>` | tasks, items, success criteria | — |
| DataTable | `<table>` | dense | loading, empty, error |
| TreeRow | `<details>` | idea, goal, item, plan | collapsed, expanded, filtered-out |
| BoardColumn | list of DocCard | by plan or item status | empty |
| GraphCanvas | React Flow | dependency / hierarchy | empty, focused node |
| RelationsPanel | list of IdTag | parent, children, delivers, depends on/blocks, mentioned in | empty |
| Checklist | list | readiness (gate) and tasks | pass/fail per line |
| Markdown | rendered sections | doc body | — |
| FilterBar | Chips + search | — | active filters |
| Tabs | `role="tablist"` buttons | reference sections per kind | selected (arrow keys, Home, End), hidden when no tab has content |
| CollapsiblePanel | `<details>` | plain, with aside (progress) | open (default), collapsed |
| ActionMenu | split Button + `role="menu"` | primary move + menu, menu only | open, closed, busy, disabled (CLI-only entry shows its command) |
| FileList | mono list in a scroll box | Touches, Applies to | collapsed (first 10), expanded (show all), filtered (more than 20), no match |
| SpendBreakdown | rows + ProgressBar | by agent (role), by document | empty (CLI command), unattributed row |
| TaskList | list grouped by `###` phase | plan tasks | done/open per line, long verify collapsed |

**States:** loading = skeletons shaped like the content; empty = why it's empty plus the CLI command that fills it (e.g. "No focus goal: `crew.mjs focus G-###`"); error = what happened plus retry (served mode).

## Do's and Don'ts
- Do show IDs everywhere in monospace and make every ID a link to its document page.
- Do spend sienna on one thing per view: the primary action, the active card, or the focus goal.
- Do keep status words next to status colours ("in progress", "blocked").
- Don't use gradients, gradient text, emoji icons or drop shadows on cards.
- Don't centre body text or nest cards inside cards.
- Don't invent states the hub doesn't have. Labels mirror the CLI vocabulary exactly (`in-review`, `triaged`, `P1`, `S2`).

## Motion
120–180 ms ease-out for hover, expand/collapse and panel slides. Cards that change status in served mode fade their border to the new status for 600 ms (the one signature moment). `prefers-reduced-motion` turns all of this off.

## Voice
Plain, specific and in sentence case, using the hub's own nouns (idea, goal, focus, item, plan). Insights go in card titles ("2 of 5 success criteria met"). Empty and error states name the command that fixes them.
