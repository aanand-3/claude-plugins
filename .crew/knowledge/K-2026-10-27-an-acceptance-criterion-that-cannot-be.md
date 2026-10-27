---
id: K-2026-10-27-an-acceptance-criterion-that-cannot-be
type: decision
title: An acceptance criterion that cannot be checked is waived with checkpoint P-### --waive WHY --ac N, CLI only, by the role that gates plan.accepted (any non-implementer when no role gate), never by an implementer; the waiver is a verify entry {ok:false, waived:true} bound to the criterion text, counts as settled (not a pass) for acceptance, dispatch, next and inbox, commits nothing, and any later check on that criterion replaces it
scope: packages/crew/src/hub/commands/work/execution.ts, packages/crew/src/hub/commands/team/dispatch.ts, packages/crew/src/hub/commands/team/roles.ts, packages/crew/src/hub/commands/team/inbox.ts
source: P-084
supersedes:
tier: project
created: 2026-10-27
---

# An acceptance criterion that cannot be checked is waived with checkpoint P-### --waive WHY --ac N, CLI only, by the role that gates plan.accepted (any non-implementer when no role gate), never by an implementer; the waiver is a verify entry {ok:false, waived:true} bound to the criterion text, counts as settled (not a pass) for acceptance, dispatch, next and inbox, commits nothing, and any later check on that criterion replaces it

BUG-052: a PM-accepted not-reproduced criterion (P-077 AC4) stayed red and drove fix dispatch; registry-before.json is frozen so the MCP checkpoint schema and pass|fail choices stay unchanged
