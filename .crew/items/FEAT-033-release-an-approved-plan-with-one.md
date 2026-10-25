---
id: FEAT-033
type: feat
title: Release an approved plan with one scripted command
status: new
priority:
goal: G-001
plan:
created: 2026-10-25
closed:
---

# FEAT-033: Release an approved plan with one scripted command

## Summary
Releasing an approved plan is mechanical: discard the generated files, update to main, build, commit, run hub.full_suite, squash-merge. Today an LLM Release agent does it, relayed through the Director, which took about 15 minutes for P-022 and P-023, almost all of it agent startup and hub reads rather than git or tests. A crew.mjs release P-### command should run the whole sequence as a script, finishing in about the time the tests take, and stop with a clear report on a conflict or a failing suite. The Release agent only steps in on that report. Never push.

## User story

## Acceptance criteria
- [ ]

## Notes
