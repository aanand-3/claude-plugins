---
id: FEAT-071
type: feat
title: Accepted plans land together: one full-suite run per batch
status: triaged
priority: P0
goal: G-007
plan:
created: 2026-10-26
closed:
---

# FEAT-071: Accepted plans land together: one full-suite run per batch

## Summary
When several plans are accepted, Release lands them together: one update of each onto the base, one full-suite run for the batch, then one squash commit per plan. Today `land` runs the full suite once per plan, one plan at a time (one shared slot, 11–22 min each), so four accepted plans take about an hour and a late failure restarts the wait.

## User story
As the executive, I want accepted plans to land together, so that the team's finished work reaches main in one suite run instead of queuing for an hour.

## Acceptance criteria
- [ ] With two or more plans in `merge-order`, `land` (no ID) stacks them in merge order on one candidate of the base branch and runs the full suite once for the batch.
- [ ] On a green suite each plan still lands as its own squash commit (one commit per plan, in merge order), and each plan's evidence and ledger events are kept per plan.
- [ ] On a red suite the hub finds which plan broke it (bisect over the batch, or rerun without the last added) and sends only that plan back to its developer; the rest land without another full wait where the suite allows it.
- [ ] A plan that doesn't apply cleanly on top of the others (conflict) drops out of the batch and stays first in the next one; it never blocks the rest.
- [ ] A single accepted plan lands as today.
- [ ] `suites` records one run per batch, listing its plans.

## Notes
Executive's request 2026-10-26, top priority. Evidence from `crew.mjs suites` the same day: P-060 11.0 min, P-063 10.9 min, P-064 18.7 min (failed), P-062 22.1 min (failed), P-065 12.6 min; P-064, P-069, P-066 and P-067 accepted and queued behind one another.
- 2026-10-26: status new → triaged — priority P0
