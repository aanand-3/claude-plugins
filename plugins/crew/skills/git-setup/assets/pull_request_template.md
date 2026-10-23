{{#hub}}
## P-###: <plan title>

**Plan:** `.crew/plans/P-###-<slug>.md` · **Items:** FEAT-### / BUG-### · **Goal:** G-### / standalone · **Sprint:** S-##
{{/hub}}
{{^hub}}
## <type(scope): summary>

**Closes:** <issue link, or n/a>
{{/hub}}

### What & why
<!-- 2–4 sentences.{{#hub}} Link the plan's Context.{{/hub}} -->

### Acceptance criteria
<!-- Each must be checked with evidence (test name, screenshot, command output).{{#hub}} Copy them from the plan.{{/hub}} -->
- [ ]

### How it was verified
- [ ] Tests added/updated and passing ({{#hub}}the plan's Test plan; {{/hub}}bug fixes include a regression test)
- [ ] Lint, format, type-check clean
- [ ] Manually exercised: <how>

### Checklist
{{#hub}}
- [ ] Plan file updated: tasks ticked, Outcome written, status `done`
{{/hub}}
- [ ] Rollout & rollback steps{{#hub}} from the plan{{/hub}} done or documented (migrations, flags, config)
- [ ] Docs / `.env.example` / ADR updated if behavior, config or a decision changed
- [ ] No secrets, no debug leftovers, no unrelated changes

### Follow-ups
<!-- Anything deferred{{#hub}} — also listed in the plan's Outcome and captured as items (`crew.mjs new-item … --why`) on main{{/hub}}. -->
