---
id: K-2026-10-25-full-suites-run-through-crew-mjs-as
type: decision
title: Full suites run through crew.mjs --as architect --run-id architect:a71b50fb5e17a29d8 suite: hub.suite_slots slot locks (default 1) in the git common dir, stale only when the holder pid is dead on this host, each run recorded (wait and run time) in suites.jsonl beside the ledger and read with suites; land (P-032) calls runSuite
scope: packages/crew/src/hub/commands/work/suite.ts, packages/crew/src/hub/commands/work/land.ts, plugins/crew/skills/hub/agents/release.md
source: P-043
supersedes:
tier: project
created: 2026-10-25
---

# Full suites run through crew.mjs --as architect --run-id architect:a71b50fb5e17a29d8 suite: hub.suite_slots slot locks (default 1) in the git common dir, stale only when the holder pid is dead on this host, each run recorded (wait and run time) in suites.jsonl beside the ledger and read with suites; land (P-032) calls runSuite

BUG-028: parallel plans' full suites timed out under load and Release merged on per-file passes; a suite lasts minutes, so the ledger's mtime staleness does not fit, and suite runs are not plan state so they stay out of the ledger
