# Policy

<!-- The generated blocks below are rewritten from the code by `npm run docs` in packages/crew (`npm run build` runs it too). Edit the prose around them, never inside them. -->

## Gates

The checks a move runs before a document reaches a status (`packages/crew/src/hub/commands/work/workflow.ts:guard`), and
who may take the move under the `lifecycle` preset.

<!-- generated:transition-gates -->
| Moving to | Gate | Refused as | Who (lifecycle) |
|---|---|---|---|
| `plan.ready` | Definition of Ready | `<id> is not ready (Definition of Ready)` | architect |
| `plan.in-review` | Learnings recorded | `<id> can't go to review` | developer |
| `plan.accepted` | Tasks, evidence and review | `<id> can't be accepted` | pm |
| `plan.done` | Landed | `<id> isn't landed` | pm |
| `goal.active` | Outcome and criteria written | `<id> can't be active` | human |
| `goal.done` | Criteria verified | `<id> isn't reached` | pm |
| `item.triaged` | Triage | `<id> can't be triaged` | pm |
| `idea.decided` | Decision agreed | `<id> can't be decided` |  |
<!-- /generated -->

## Layers

The policy is read in layers, later ones overriding earlier ones
(`packages/crew/src/hub/core/team/policy.ts:loadLayers`).

<!-- generated:policy-layers -->
| # | Layer | Read from |
|---|---|---|
| 1 | built-in | crew's defaults (core/team/policy.ts) |
| 2 | org | the org playbook's `policy/global.yaml` (`CREW_PLAYBOOK` or `playbook:` in .crew/config.yaml) |
| 3 | org role | the playbook's `policy/roles/<role>.yaml` |
| 4 | preset | the preset named by `preset:` in .crew/policy.yaml (core/team/presets.ts) |
| 5 | preset role | the preset's section for the role |
| 6 | project | .crew/policy.yaml, outside `roles:` and `teams:` |
| 7 | project role | `roles.<role>` in .crew/policy.yaml |
| 8 | project team | `teams.<team>` in .crew/policy.yaml (`CREW_TEAM`) |
<!-- /generated -->
