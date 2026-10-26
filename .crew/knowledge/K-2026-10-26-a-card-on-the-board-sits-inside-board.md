---
id: K-2026-10-26-a-card-on-the-board-sits-inside-board
type: gotcha
title: A card on the board sits inside .board (an intentional horizontal scroll area) but is still a box: skip selectors exempt what is inside a skip area within the box, never boxes inside a skip area, or overflowing cards go unreported
scope: packages/crew/src/tools/design/layout_scan.ts
source: 
supersedes:
tier: project
created: 2026-10-26
---

# A card on the board sits inside .board (an intentional horizontal scroll area) but is still a box: skip selectors exempt what is inside a skip area within the box, never boxes inside a skip area, or overflowing cards go unreported

P-021: the first scan skipped everything under .board and missed the planted 400-character ID
