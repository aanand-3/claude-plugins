---
id: K-2026-10-26-a-long-unbroken-word-overflows-as-text
type: gotcha
title: A long unbroken word overflows as text, not as a box: its element's getBoundingClientRect stays inside the card while the text runs thousands of px past it; measure text nodes with a Range (layout_scan.ts right()) to find overflow and sideways scroll
scope: packages/crew/src/tools/design/layout_scan.ts, packages/crew/ui/**
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A long unbroken word overflows as text, not as a box: its element's getBoundingClientRect stays inside the card while the text runs thousands of px past it; measure text nodes with a Range (layout_scan.ts right()) to find overflow and sideways scroll

P-021's first sweep reported a sideways scroll on body with no element past the viewport, and missed the board card's overflow entirely
