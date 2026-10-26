---
id: BUG-038
type: bug
title: layout-sweep.test.ts failed once under load at P-021 719ed77
status: new
severity:
priority: P3
goal: G-003
plan:
created: 2026-10-26
closed:
---

# BUG-038: layout-sweep.test.ts failed once under load at P-021 719ed77

## Summary
`layout-sweep.test.ts` failed once during QA's run of P-021 at 719ed77 (AC5/AC6 checks), then passed on two further runs of the same code. The cause is unknown; load on the machine is the suspect.

## Environment
P-021 worktree at commit 719ed77, packages/crew, run by QA on 2026-10-26 while other agents were also running builds and suites on the same machine.

## Steps to reproduce
1. In the P-021 worktree at 719ed77, run `npx vitest run` for `layout-sweep.test.ts` while the machine is under load (other suites or builds running).
2. Repeat several times; the failure is intermittent (1 failure in 3 runs observed).

## Expected
The test passes every time on unchanged code, regardless of machine load.

## Actual
It failed once and passed twice with no code change in between. The failure message was not analysed further.

## Evidence
QA's scratch log: /private/tmp/claude-502/-Users-aanand-Documents-Projects-Personal-claude-plugins/7d499a6e-8ddb-494b-9ce3-90b14bf1a8bb/scratchpad/sweep.log
Scratch paths are not durable; if the log is gone, the failed AC5/AC6 checkpoint in P-021's history records the run.

## Impact
A flaky check can block or mislead an acceptance (here it was resolved by two passing runs). No product defect is known. Suggested severity S3.

## Notes
- Likely a timing or timeout dependence under load, as with BUG-028 (full suite times out under load); the architect should check for a fixed timeout in the sweep.
