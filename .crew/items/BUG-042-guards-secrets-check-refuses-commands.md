---
id: BUG-042
type: bug
title: guard's secrets check refuses commands that only mention a secrets filename in text
status: done
severity: S3
priority: P2
goal: G-007
plan: P-063
created: 2026-10-26
closed: 2026-10-26
---

# BUG-042: guard's secrets check refuses commands that only mention a secrets filename in text

## Summary
The guard's secrets check (`secrets.files`) refuses a Bash command when the command's text merely contains a secrets filename (for example the literal dotenv file name), even when the command neither reads nor writes a secrets file. Prose in a heredoc body or a string inside a script is enough to trigger the refusal.

## Environment
Crew hub guard on main (commit f019bc5), local checkout, 2026-10-26. Roles affected: PM and Architect.

## Steps to reproduce
1. As an agent, run a Bash command whose text contains the literal dotenv filename only as prose, for example a heredoc that writes a drafts file under `.crew/drafts/` and mentions the dotenv file in its body (this is how the PM filing BUG-041 hit it).
2. Or run a Python script that edits a plan file and mentions the dotenv filename in a string or comment (this is how the Architect speccing P-062 hit it).
3. Observe the refusal.

## Expected
The secrets check refuses commands that would access a secrets file: as a path argument, a redirect target, or a file an interpreter opens. It does not refuse commands whose text merely contains the filename inside quoted prose or a heredoc body whose target is a non-secrets file. Real protection is unchanged: reading, writing, copying, cat-ing or grepping an actual secrets file stays refused.

## Actual
Both commands were refused with "the command touches a secret file (secrets.files)". The only trigger was the literal dotenv filename in the command text. Neither command read or wrote a secrets file.

## Evidence
Two occurrences on 2026-10-26:
1. PM filing BUG-041: Bash heredoc writing a drafts file whose prose mentioned the dotenv filename was refused.
2. Architect speccing P-062: Python script editing the plan file was refused with "the command touches a secret file (secrets.files)".

## Impact
Agents then made the same edit with the Edit/Write tools, i.e. worked around a guard refusal. Harmless here, but it trains exactly the habit that convention K-2026-10-26-when-the-guard-refuses-an-action-report forbids, and it blocks legitimate writing about secrets handling (specs, tests, bug reports). Workaround exists (Edit/Write tools), hence S3.

## Notes
Added to G-007 at the executive's request ("add to g7"). Fix needs care to avoid weakening the check: add negative tests (text-only mention is allowed) alongside positive tests (cat, grep, cp, redirect, interpreter open of a real secrets file stay refused).
- 2026-10-26: goal hint G-007 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P2, severity S3
- 2026-10-26: status triaged → done — delivered by P-063
