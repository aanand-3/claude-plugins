---
id: CHORE-029
type: chore
title: QA scratch scripts get a per-plan scratch folder that is never committed and is cleared at done
status: triaged
priority: P3
goal: G-007
plan: P-068
created: 2026-10-26
closed:
---

# CHORE-029: QA scratch scripts get a per-plan scratch folder that is never committed and is cleared at done

## Summary
QA's paths.write is limited to `.crew/drafts/**`, and since P-051 the guard refuses inline scripts for drafts-only roles, so QA writes its hands-on check scripts as files into `.crew/drafts/` and runs them. Nothing removes them: on 2026-10-26 the folder held 13 stale QA files for done plans (p024/p026/p037/p039/p041/p059 *.sh, p040 hook payload *.json/*.jsonl), which the executive had cleared by hand. `.crew/drafts/` is meant for documents that become hub documents (the SessionStart hook warns about unconverted drafts), so scripts there are noise and the warning loses its meaning.

Proposal: a per-plan scratch folder `.crew/scratch/P-###/`, gitignored (never committed by hub commits or checkpoints), writable by QA (added to its paths.write in the lifecycle preset alongside `.crew/drafts/**`), and emptied when the plan moves to done. Scripts still run as files, so the guard's inline-script rule is unchanged. The QA template points QA there instead of drafts.

Cost of not doing it: drafts keeps filling with stale scripts and needs manual cleanup by the executive.

## Done when
- [ ] QA can write and run a script in `.crew/scratch/P-###/`.
- [ ] Nothing under `.crew/scratch/` is ever committed (gitignored; hub commits and checkpoints skip it).
- [ ] `move P-### done` removes `.crew/scratch/P-###/`.
- [ ] Drafts-only roles still cannot write anywhere else.
- [ ] QA's template says where scratch goes (`.crew/scratch/P-###/`, not drafts).

## Notes
Asked by the executive ("both, do we need a scripts folder for QA?"). Goal G-007.
If this repository's `.crew/policy.yaml` overrides QA's paths.write, changing it is the executive's call (escalation), not the PM's or the developer's.
- 2026-10-26: goal hint G-007 (by Arpit Anand)
- 2026-10-26: status new → triaged — priority P3
- 2026-10-26: re-triaged: priority P3
- 2026-10-28: re-goaled G-007 → G-007 by Arpit Anand: temp
