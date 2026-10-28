---
id: BUG-060
type: bug
title: Runner still lands one plan at a time: dispatch gives Release one plan and its agent lacks the batch steps
status: triaged
severity: S2
priority: P0
goal: G-007
plan: P-094
created: 2026-10-28
closed:
origin: P-079
---

# BUG-060: Runner still lands one plan at a time: dispatch gives Release one plan and its agent lacks the batch steps

## Summary
Under the runner, accepted plans still land one at a time. Batch landing exists (P-079, fixed by P-093), but two things keep the runner off it:
- dispatch hands Release a single plan;
- Release's rendered agent was never updated with P-079's batch instructions.

## Environment
Main after the 2026-10-28 batch land (hub 9a3f7a47), runner restarted with `run --until-done` in auto mode.

## Steps to reproduce
1. Have two or more accepted plans in merge order.
2. Run `node .crew/bin/crew.mjs dispatch`.
3. Compare `plugins/crew/skills/hub/agents/release.md` with `.crew/templates/agents/release.md` and `.claude/agents/crew-release.md`.

## Expected
- Dispatch gives Release one entry to land the whole queue, for example `land: N accepted plans as one batch (P-…, P-…)`, and Release runs `land` with no ID.
- Release's rendered agent describes batches, as the plugin's release.md does since P-079.

## Actual
- `dispatch.ts:79-80` gives Release `land P-###: <title> (first in merge-order)`, built from `mergeOrder(...).merge.slice(0, 1)`. A Release agent following its entry runs `land P-###`, which takes the single path with one full suite per plan.
- `.crew/templates/agents/release.md` and `.claude/agents/crew-release.md` still carry the pre-P-079 Loop text: no batch, no `land-batch` candidate, no "left the batch". `agents --check` reports "Agents up to date" because it compares against the vendored templates, not against the plugin's source.

## Evidence
- `dispatch.ts:78-80`.
- `diff` of the Loop sections: the plugin's release.md has the batch paragraph (P-079, ca71ee4); the vendored template and the rendered agent don't.
- The only batch land so far (8 plans, one suite) was run by the executive by hand.

## Impact
FEAT-071's goal (accepted plans land together, one full suite per batch) isn't met when the runner drives the team. Each accepted plan costs its own 11–22 min suite, and plans keep re-merging main. The workaround is for the executive to run `land --as release` by hand.

## Notes
- **Fix direction:**
  - the dispatch Release entry names the whole merge queue and the command `land`;
  - refresh the vendored agent templates from the plugin;
  - `agents --check` should flag a vendored template that is older than the plugin's.
- **Separate from this bug:** in auto mode, the permission classifier has refused Release's `land` several times on 2026-10-28 (Q-6fd3fa, the P-062 retry). Without a permission rule, even a correct batch entry stalls and ends up with the executive.
- **Related:** FEAT-071, P-079, P-093, BUG-059.
- 2026-10-28: goal hint G-007 (by Arpit Anand)
- 2026-10-28: status new → triaged — priority P0, severity S2
- 2026-10-28: re-goaled G-007 → G-007 by Arpit Anand: P0 BUG-060 fix belongs to G-007
