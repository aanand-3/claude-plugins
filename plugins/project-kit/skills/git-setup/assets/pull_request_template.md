{{#tracker}}
## P-###: <plan title>

**Plan:** `.project/plans/P-###-<slug>.md` · **Items:** FEAT-### / BUG-### · **Epic:** EP-### / standalone · **Sprint:** S-##
{{/tracker}}
{{^tracker}}
## <type(scope): summary>

**Closes:** <issue link, or n/a>
{{/tracker}}

### What & why
<!-- 2–4 sentences.{{#tracker}} Link the plan's Context.{{/tracker}} -->

### Acceptance criteria
<!-- Each must be checked with evidence (test name, screenshot, command output).{{#tracker}} Copy them from the plan.{{/tracker}} -->
- [ ]

### How it was verified
- [ ] Tests added/updated and passing ({{#tracker}}the plan's Test plan; {{/tracker}}bug fixes include a regression test)
- [ ] Lint, format, type-check clean
- [ ] Manually exercised: <how>

### Checklist
{{#tracker}}
- [ ] Plan file updated: tasks ticked, Outcome written, status `done`
{{/tracker}}
- [ ] Rollout & rollback steps{{#tracker}} from the plan{{/tracker}} done or documented (migrations, flags, config)
- [ ] Docs / `.env.example` / ADR updated if behavior, config or a decision changed
- [ ] No secrets, no debug leftovers, no unrelated changes

### Follow-ups
<!-- Anything deferred{{#tracker}} — also listed in the plan's Outcome and captured as items (`tracker.mjs new-item … --why`) on main{{/tracker}}. -->
