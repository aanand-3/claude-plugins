---
id: K-2026-10-23-a-crashed-write-can-leave-a-torn-ledger
type: gotcha
title: A crashed write can leave a torn ledger line: start the next append on a fresh line
scope: packages/crew/src/hub/core/memory/ledger.ts
source: FEAT-001
supersedes:
tier: project
created: 2026-10-23
---

# A crashed write can leave a torn ledger line: start the next append on a fresh line

Appending straight after a partial line glued the next event onto it and both were skipped as unparseable — a lost claim or release means the wrong owner. commit() now writes a newline first when the file doesn't end in one.
