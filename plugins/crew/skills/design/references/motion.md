# Motion

Motion explains change: where something came from, what responded, what is loading. It is not decoration.

## Should it animate?
- **How often the user sees it decides.** Something seen hundreds of times a day (menus, tabs, list updates) should be instant or under 150 ms. Something seen rarely (onboarding, an empty-state illustration, a success moment) can take longer and carry character.
- Keyboard-triggered actions (shortcuts, command palette) get no entrance animation.
- Allow one orchestrated moment per page at most, such as a hero reveal or a first-run success. Everything else is quiet.

## How
- **Durations:** 100–150 ms for micro feedback (hover, press), 150–250 ms for UI transitions (popovers, drawers), 300–500 ms for rare, larger moments.
- **Easing:** ease-out for things entering (they arrive fast and settle), ease-in for things leaving, ease-in-out for things moving on screen. Avoid linear except for spinners and progress.
- **Properties:** animate `transform` and `opacity` only. Name them explicitly (`transition: transform 150ms, opacity 150ms`) and never use `transition: all`.
- **Entrances:** start from `scale(0.96)` plus `opacity: 0`, not from `scale(0)`. Popovers and menus grow from their trigger (`transform-origin` at the anchor).
- **Press feedback:** `:active { transform: scale(0.98) }` on buttons makes them feel physical.
- **Lists:** stagger 20–40 ms per item, capped at about 6 items.
- **Interruptible:** a transition reversed halfway should not jump. Prefer CSS transitions or springs over fixed keyframes for interactive state.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, replace movement with opacity fades or nothing. This is required.

## Tokens
Record durations and easings in DESIGN.md (`motion` in the prose, or as `--duration-*` / `--ease-*` CSS variables) so every page uses the same feel.

## Library
CSS transitions cover most UI. Use Motion (motion.dev) for layout animations, shared-element transitions or gestures, and only after the design calls for them.
