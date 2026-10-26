---
id: K-2026-10-26-p-072-design-review-fixes-views-css
type: decision
title: P-072 design review fixes: views.css joins touches for one .inbox__text rule (overflow-wrap: anywhere; min-width: 0) on the Inbox entry's question p; the Then you... follow-up input moves inside the answer form on its own row above the decision row, placeholder 'Then you... (optional step you will do)'. Spec: Scope UI bullet, Design, new AC6, T9, Test plan AC6 static and on-screen checks
scope: packages/crew/ui/src/views/Inbox.tsx, packages/crew/ui/src/styles/views.css
source: 
supersedes:
tier: project
created: 2026-10-26
---

# P-072 design review fixes: views.css joins touches for one .inbox__text rule (overflow-wrap: anywhere; min-width: 0) on the Inbox entry's question p; the Then you... follow-up input moves inside the answer form on its own row above the decision row, placeholder 'Then you... (optional step you will do)'. Spec: Scope UI bullet, Design, new AC6, T9, Test plan AC6 static and on-screen checks

Designer's review of P-072: unbroken tokens (branch names, paths) overflow the card at 375 px, and a follow-up field outside the form is skipped by Enter/Answer
