---
id: BUG-002
type: bug
title: A subagent can run crew.mjs init and rewrite .crew/bin
status: new
severity:
priority:
goal: G-003
plan:
created: 2026-10-23
closed:
---

# BUG-002: A subagent can run crew.mjs init and rewrite .crew/bin

## Summary
The guard blocks direct writes to .crew/bin/** but init vendors the CLI and templates through the hub, which the guard can't see (found in T2). Low risk: it copies the plugin's own files. Fix: the guard denies crew.mjs init from subagents, as it does agents.

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
