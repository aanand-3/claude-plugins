---
id: K-2026-10-28-main-session-usage-is-captured
type: decision
title: Main-session usage is captured by the same usage --hook command run as a Stop hook: a Stop payload's transcript_path is recorded as a cumulative source:transcript snapshot under run executive:<session_id> (role executive, ref null, no report), skipped when unchanged; isSidechain records are never counted
scope: packages/crew/src/hub/commands/team/autonomy.ts, plugins/crew/skills/guidelines/templates/settings.json
source: 
supersedes:
tier: project
created: 2026-10-28
---

# Main-session usage is captured by the same usage --hook command run as a Stop hook: a Stop payload's transcript_path is recorded as a cumulative source:transcript snapshot under run executive:<session_id> (role executive, ref null, no report), skipped when unchanged; isSidechain records are never counted

Stop fires every main-session turn and carries the main transcript; a per-session run keeps the snapshot delta in countedUsage exact (a shared wt: run would interleave sessions), and one command avoids registry churn
