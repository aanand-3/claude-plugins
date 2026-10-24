---
id: FEAT-023
type: feat
title: Jira-style document page, spend by plan and agent, tasks and epic views
status: triaged
priority: P2
goal: G-001
plan: P-020
created: 2026-10-24
closed:
---

# FEAT-023: Jira-style document page, spend by plan and agent, tasks and epic views

## Summary
The hub UI's document page is one long scroll with a blank band on the right, Touches as one comma-joined string, relation status after the title and actions as a row of pills; spend shows only as one overall number. Make the document page read like a Jira issue, show spend per plan and per agent, and show tasks and a goal's (epic's) child issues.

## User story
As someone running a crew project, I want each plan, item and goal page to be laid out like an issue tracker (details rail, collapsible and tabbed sections, an actions menu, task lists, child issues) and to see what each plan and agent spent, so that I can scan the state of the work and its cost at a glance.

## Acceptance criteria
- [ ] The document page fills the content width with a 360px details rail; main sections collapse and reference sections are tabs.
- [ ] Actions are one split-button dropdown; Touches is a counted, filterable file list; Relations put the status first.
- [ ] Spend is shown per plan (doc page) and per agent (Overview), in tokens, with $ only when cost > 0.
- [ ] Plan pages show tasks by phase with verify commands; goal pages show a child-issues table; Hierarchy expands plans into tasks.

## Notes
- Design: /Users/aanand/.claude/plans/the-crew-ui-looks-declarative-coral.md (approved). No database: files, git and the ledger stay the source of truth.
- 2026-10-24: status new → triaged — priority P2
