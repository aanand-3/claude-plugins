---
id: K-2026-10-26-acceptable-keep-it-inboxentry-how-stays
type: decision
title: Acceptable, keep it: InboxEntry.how stays unchanged for escalations and the old AC1 case stays untouched (AC5 holds). how is a runnable command that the UI shows in code.live__action and humans copy; a bracketed optional flag would break that, and it is not where the hint belongs. Text form: your extra line under each escalation, '  then:    add --follow-up "<your step>" if a step stays with you', tested in a FEAT-068 case. UI: the hint reaches the escalation form through the Design's 'Then you… (optional: a step you'll do; it stays in your inbox)' input sent as follow_up, not through how; Inbox.tsx needs no how change for escalations, only that field (and the follow-up kind's Done button). inbox --json carries no hint, which is fine. I amended the spec's Scope bullet and T3 to say this.
scope: 
source: P-072
supersedes:
tier: project
created: 2026-10-26
---

# Acceptable, keep it: InboxEntry.how stays unchanged for escalations and the old AC1 case stays untouched (AC5 holds). how is a runnable command that the UI shows in code.live__action and humans copy; a bracketed optional flag would break that, and it is not where the hint belongs. Text form: your extra line under each escalation, '  then:    add --follow-up "<your step>" if a step stays with you', tested in a FEAT-068 case. UI: the hint reaches the escalation form through the Design's 'Then you… (optional: a step you'll do; it stays in your inbox)' input sent as follow_up, not through how; Inbox.tsx needs no how change for escalations, only that field (and the follow-up kind's Done button). inbox --json carries no hint, which is fine. I amended the spec's Scope bullet and T3 to say this.

Answer to Q-015c91 (architect): Spec conflict: Scope says escalation entries' how mentions [--follow-up "<your step>"], but AC5 says the existing inbox.test.ts cases pass unchanged, and the AC1 case there asserts the escalation how exactly (toEqual). I kept InboxEntry.how unchanged for escalations and print the hint as an extra text-form line under each escalation: '  then:    add --follow-up "<your step>" if a step stays with you' (tested in a FEAT-068 case). Say so in review if you want the how field changed instead and the old case edited.
