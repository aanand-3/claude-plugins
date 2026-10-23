---
pack: design
description: Visual design system — every page follows docs/design/DESIGN.md (tokens, layout shell, component inventory); checked by check_design.py.
scope: frontend
requires: [react]
paths: ["**/*.tsx", "**/*.jsx", "**/*.css", "index.html"]
---

# Visual design

`docs/design/DESIGN.md` is the one home of visual decisions: colour roles, typography, radius, spacing, the layout shell, the component inventory, and the do's and don'ts. This file holds the rules for using it. It never repeats token values.

## Before UI work
- Read DESIGN.md. For a new page or screen, follow `/crew:design page <name>`. Sketch the page as **shell + inventory components** before coding.
- Reuse before create: extend an inventory component before writing a new one. A new composite is added to DESIGN.md → Components, with its states, in the same change.

## While building
- **Tokens only:** semantic classes (`bg-background`, `text-muted-foreground`, `bg-primary`, `rounded-md`) and the spacing scale. No raw hex/rgb/hsl, no Tailwind arbitrary values (`bg-[#…]`, `text-[13px]`), no raw palette classes (`bg-blue-500`). A deliberate exception gets a `design-ok` comment saying why.
- Fonts only from DESIGN.md → Typography. Icons from the one icon set, never emoji.
- Every data view has loading (skeleton), empty (reason + next action) and error (what happened + retry) states.
- One primary action per view, using the accent. Status is never shown by colour alone.
- Motion follows DESIGN.md → Motion: transform and opacity only, ease-out for things entering, and `prefers-reduced-motion` respected.

## Before done
- `python3 .crew/bin/check_design.py --all` reports no findings for the files you touched.
- Screenshots at 375 px and 1280 px, in light and dark, compared against DESIGN.md and an existing page. Fix everything in one batch.
- Visual changes to the system itself (new colour, font or radius) go through `/crew:design refresh` and an ADR, never directly into one component. A `final` DESIGN.md changes only as a new `revision` with an ADR mentioning `DESIGN.md revision <n>`; the pre-commit check blocks anything else.
- A page listed in DESIGN.md → Screens is built from its approved layout (`docs/design/studio.json`).
