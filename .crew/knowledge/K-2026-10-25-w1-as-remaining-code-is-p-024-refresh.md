---
id: K-2026-10-25-w1-as-remaining-code-is-p-024-refresh
type: decision
title: W1-a's remaining code is P-024 (refresh-bin); P-032 (land) depends on P-024, P-028, P-030 and P-039 for code, and on nothing for overlap
scope: packages/crew/src/hub/commands/work/land.ts, packages/crew/src/hub/commands/work/release.ts
source: P-032
supersedes:
tier: project
created: 2026-10-25
---

# W1-a's remaining code is P-024 (refresh-bin); P-032 (land) depends on P-024, P-028, P-030 and P-039 for code, and on nothing for overlap

P-023 shipped the rest of W1-a (linguist-generated marking, drift ignore, hub.build); P-029 takes W1-a's 'check warns on generated touches'. land calls refreshBin (P-024), reuses P-028's generated/codeChanges helpers and WIP-commit model, registers through P-030's registry, and merges the base into plan branches, which is only safe once P-039 stops plans(true) from reading a plan's own (stale) copy on its branch.
