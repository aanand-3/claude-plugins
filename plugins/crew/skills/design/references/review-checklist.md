# Review checklist

What slipped past every functional check in the hub's own UI (P-020, P-011) and was found only by looking. Go through it
for each screen a change touches, at full size, at 375, 900 and 1440 px, in light and dark. Each entry: how to spot it,
then the fix. `layout_sweep.mjs` (in `scripts/`) catches sideways scroll and overflow mechanically; the rest needs eyes.

## Native form controls left unstyled
- **Spot:** a `<select>`, checkbox, radio, date or file input with the browser's own arrow, border or focus ring; it
  looks different in dark mode or in another browser than the controls around it.
- **Fix:** use the inventory's control (or style the native one from tokens: `appearance: none`, a token border and
  radius, an icon for the arrow, the token focus ring), and check both themes.

## Controls sized by their content
- **Spot:** a filter, select or button whose width follows its longest option or label (a 288 px Goal filter beside
  120 px ones); widths jump when the data changes.
- **Fix:** give the control a width from the layout (a token width, `min-width` / `max-width`, or the grid it sits in)
  and truncate the value with an ellipsis and a title.

## Joined ID lists in chips
- **Spot:** one chip holding several IDs joined by commas ("FEAT-012, FEAT-013, FEAT-014, …"); it wraps or runs past
  the card.
- **Fix:** show the first ID and a count ("FEAT-012 +6") with the full list in a title or a popover, or one chip per ID
  with a cap and "+N more".

## Long IDs overflowing cards and rails
- **Spot:** a long unbroken token (a knowledge ID, a branch name, a path, a URL) running past the edge of a card, a
  side rail or a Relations row; at 375 px it pushes the page sideways.
- **Fix:** `min-width: 0` on the flex or grid child, then `overflow-wrap: anywhere` for text that should wrap, or
  `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` with a title for an ID that should stay on one line.

## Text past containers at narrow widths
- **Spot:** at 375 px the page scrolls sideways, or a heading, table, code block or toolbar sticks out of its column;
  scroll the page horizontally to check — a sideways scroll is always a defect unless the area scrolls on purpose.
- **Fix:** let the layout stack below the breakpoint, wrap or truncate the text, and give an intentional scroll area its
  own `overflow-x: auto` container (tables, code) instead of letting the page scroll.

## Icons misaligned with text
- **Spot:** an icon sitting above or below the text baseline beside it, a different size from the text, or a chip
  whose icon and label don't share a centre line.
- **Fix:** put icon and text in an inline flex with `align-items: center` and a token gap, size the icon from the text
  size (`1em` or the inventory's icon size), and mark decorative icons `aria-hidden`.

## Screens judged only from scaled-down screenshots
- **Spot:** a review that looked at thumbnails or a screenshot squeezed into a chat; small defects (a 1 px misalignment,
  an unstyled arrow, a clipped descender) are invisible at that size.
- **Fix:** capture at the real viewport width with device scale 1 or more, and open each screenshot at 100 % (or zoom
  into regions) before giving a verdict — at 375, 900 and 1440 px, light and dark.
