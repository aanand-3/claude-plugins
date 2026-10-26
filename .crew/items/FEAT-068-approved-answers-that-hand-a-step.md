---
id: FEAT-068
type: feat
title: Approved answers that hand a step to the human stay in the inbox until it's done
status: triaged
priority: P2
goal: G-007
plan: P-072
created: 2026-10-26
closed:
---

# FEAT-068: Approved answers that hand a step to the human stay in the inbox until it's done

## Summary
When the executive answers a question by approving a route that leaves a step for them to carry out (merge a branch, run a command, commit a result), the hub closes the question and nothing tracks the step. The inbox reads "nothing waits on you" while the work it unblocks still waits on the human.

## User story
As the executive, I want an approved answer that hands a step to me to stay in my inbox as a follow-up until it's done, so that nothing quietly waits on me.

## Acceptance criteria
- [ ] Answering a question can record a human follow-up step (what to do and what it unblocks), or the asker can attach one when it escalates.
- [ ] `inbox` (and the ui Inbox page) lists open follow-ups with the document they hold, until the human marks them done or the hub sees the condition met.
- [ ] The document the follow-up unblocks shows it as its wait reason in `status`, `staff` and `resume`.

## Notes
Found 2026-10-26: Q-d4e060 on P-003 was approved ("you commit/merge; the team won't push"). The answer closed the question, `inbox` showed it empty, and P-003 still waited for the merge of the `.crew`-only commits from `claude/crew-bug-001-9d4b01` into main. P-060's rollout step (`merge_settings.mjs`) and P-064's (refresh `.crew/templates/agents/`, run `agents`) are the same kind of step and were tracked only in agent reports.
- 2026-10-26: status new → triaged — priority P2
