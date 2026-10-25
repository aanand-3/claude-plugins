---
id: K-2026-10-25-the-human-answers-and-approves-from
type: decision
title: The human answers and approves from the hub, not from a session: crew.mjs inbox and the ui Inbox page list goals to approve, escalations and human-gated steps; the human answers from their own terminal or the page, naming themselves as approver; the guard refuses both paths to every Claude tool call; a Claude Code session is one view onto the hub and records an approval only for a decision given in its conversation
scope: packages/crew/src/hub/commands/team/inbox.ts, packages/crew/src/hub/commands/team/guard.ts, packages/crew/src/hub/server.ts, plugins/crew/skills/team/SKILL.md
source: P-035
supersedes:
tier: project
created: 2026-10-25
---

# The human answers and approves from the hub, not from a session: crew.mjs inbox and the ui Inbox page list goals to approve, escalations and human-gated steps; the human answers from their own terminal or the page, naming themselves as approver; the guard refuses both paths to every Claude tool call; a Claude Code session is one view onto the hub and records an approval only for a decision given in its conversation

G-007: an unattended run must not wait for a session to be opened (design W2-e, human decision 2026-10-25); the old rule that answers count only in the session conversation held only while one session relayed to one Director
