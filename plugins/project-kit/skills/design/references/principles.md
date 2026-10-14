# Design principles

What makes a UI feel deliberate rather than generated. Use with DESIGN.md: this file explains *how to decide*; DESIGN.md records *what was decided* for the project.

## Colour
- **Start from a combination, not a hue.** Wada's combinations are 2–4 colours chosen to sit together. Use one combination per product. The most saturated colour becomes the accent (`primary`). The quietest colour tints the neutrals. The rest become `secondary` and chart colours. `wada.py roles` does this mapping and checks contrast.
- **Proportions:** roughly 70% neutral surfaces, 20% secondary/structure, 10% or less accent. The accent marks the one primary action and the current state. It is not decoration.
- **Tinted neutrals.** Pure grey and pure black look unconsidered. Give backgrounds, borders and text a trace of the palette's hue (chroma under 6).
- **Status colours** (destructive, success, warning) are functional. Keep them few, and always pair them with an icon or text, never colour alone.
- **Dark mode is its own palette**, not an inversion. Use raised surfaces instead of shadows, a slightly desaturated accent, and text no brighter than about 94 L*.
- Contrast: body text 4.5:1 or more (aim for 7:1), large text and UI boundaries 3:1 or more.

## Typography
- **Two families at most:** one for text, optionally one for display or headings. A monospace face is allowed for code and IDs. Pick fonts for the adjectives: geometric for precise, humanist for warm, grotesk for neutral or technical, serif for editorial or trustworthy. Avoid defaulting to whatever is most common; choose deliberately and write down why.
- **A modular scale** (e.g. 1.2 for apps, 1.25–1.333 for marketing) with 5–7 steps. Every size used comes from the scale.
- Body text 16 px with line height 1.5 and 60–75 characters per line. Headings get tighter line height (1.1–1.25) and slight negative tracking at large sizes.
- Show hierarchy with weight and size together. Never use more than three weights.
- Use tabular numerals for tables and figures that change.

## Space and shape
- **4 px base, 8 px rhythm:** 4, 8, 12, 16, 24, 32, 48, 64, 96. The space between groups is larger than the space within them, because that gap is what shows the grouping.
- **One radius family:** e.g. sm 4, md 8, lg 12. Nested radius equals outer radius minus padding. Choose either sharp or soft and stay consistent.
- **Elevation:** at most two shadow levels, tinted with the palette hue. Prefer borders or surface contrast to shadows in apps.

## Layout shell (defined once, used by every page)
- Apps: a persistent nav (side rail or top bar), a page header (title, primary action, secondary actions), a content area with a max width, and a consistent page padding. Define the breakpoints for collapsing the nav.
- Marketing: a container width (e.g. 1200 px), a section vertical rhythm (e.g. 96/64 px desktop/mobile), a consistent header and footer, and a 12-column grid.
- A page composes the shell and adds content. It never re-implements it.

## App and dashboard patterns
- **Density:** apps can be denser than marketing pages (14 px UI text is fine for tables and forms), but keep the rhythm.
- **Tables:** left-align text and right-align numbers, sticky header, row hover, and an empty state with a call to action. Numbers use tabular figures.
- **Forms:** one column, labels above fields, helper text below, errors inline with a fix, and the primary button at the end of the reading path.
- **Dashboards:** show the 3–5 numbers that matter first, then trends, then detail. Every chart has a title that states the insight, and the first chart colour is the accent.
- **States for every data view:** loading (skeletons shaped like the content), empty (why it's empty plus the next action), error (what happened plus retry), and partial or stale data when relevant.

## Marketing patterns
- Make one argument per section: a claim plus proof (number, quote, screenshot). Avoid the reflex sequence of hero, logo strip, three feature cards, testimonials and CTA. Choose sections that support this product's argument.
- Show the real product early. Use specific headlines, not slogans.

## Tells that make UI look generic: avoid
| Tell | Why it hurts | Instead |
|---|---|---|
| Purple/blue gradients, gradient text | The most common machine-made default, and it says nothing about the product | Solid accent from the palette; emphasis through weight or size |
| Three identical icon cards in a row | Filler structure, and content is forced into threes | Lay out the real content: list, comparison, or one large example |
| Emoji as icons | Inconsistent rendering, unserious | One icon set (e.g. Lucide) at one stroke width |
| Small all-caps "eyebrow" label above every heading | A template habit that adds noise | Only where it carries information |
| Grey drop shadow on every card, cards inside cards | Muddy depth, no hierarchy | Borders or surface contrast; one shadow level for overlays |
| Centred everything | Weak reading path, wasted width | Left-aligned text; centre only short hero copy |
| Numbered "01 / 02 / 03" sections, arrows on every button | Decoration pretending to be structure | Real headings; arrows only for navigation |
| Default font with no reason, pure #000 on #fff | Looks unconsidered | A deliberate pairing; tinted ink on tinted paper |
| Placeholder copy ("Lorem", "Feature one") | Hides layout problems | Real domain content |

## Self-check before calling a page done
1. Would this page look the same for any other product? If so, it doesn't use the direction.
2. Squint: is there exactly one most-important thing?
3. Are all spacing, colour, radius and font values tokens? (`check_design.py`)
4. Light and dark, 375 and 1280 px, keyboard-only: does it still work?
