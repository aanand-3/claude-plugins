---
id: BUG-013
type: bug
title: Guard refuses writes through $(mktemp) and loop variables
status: new
severity:
priority:
goal: G-001
plan:
created: 2026-10-24
closed:
---

# BUG-013: Guard refuses writes through $(mktemp) and loop variables

## Summary
P-019's guard refuses a write target that starts with an unresolvable variable. Two common legitimate subagent commands hit it: 'tmp=$(mktemp -d) && echo x > "$tmp/a"' (only a plain VAR=value is recorded, so $(...) never resolves) and 'for f in src/*.ts; do sed -i s/a/b/ "$f"; done' (loop variable). Found in P-019's round-3 architect review. Possible fix: a variable set from $(mktemp ...) counts as a temp path; 'for VAR in <glob>' resolves to the glob's directory. Weigh together with BUG-011 (mid-path variables are neither expanded nor refused).

## Environment

## Steps to reproduce
1.

## Expected

## Actual

## Evidence

## Impact

## Notes
