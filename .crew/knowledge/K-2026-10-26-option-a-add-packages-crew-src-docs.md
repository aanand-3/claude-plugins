---
id: K-2026-10-26-option-a-add-packages-crew-src-docs
type: decision
title: Option (a). Add packages/crew/src/docs/inventory.ts to touches (done in the plan: touches, Scope In, AC1 and T1 updated). Change RUNS to capture the script name and its flags separately with an optional closing quote between them, e.g. /\bnode\s+"?(?:[^\s"]*\/)?([\w-]+\.mjs)"?((?: --?[\w-]+| [a-z][\w-]*)*)/g, and emit m[1]+m[2]. Hook 3 stays byte-identical to this repo's command, and context-and-memory.md must stay unchanged (SessionStart row: crew.mjs context, track_plan_draft.mjs --session; ExitPlanMode row: track_plan_draft.mjs). Why (a) over (b): the doc change would be a regression, not a fact; RUNS dropping flags on quoted-path commands is a latent extractor bug. No overlap: inventory.ts is in no open plan (P-059, P-061 touch other files). AC1 check stays: docs.test.ts plus git diff --quiet main -- plugins/crew/docs/context-and-memory.md.
scope: 
source: P-060
supersedes:
tier: project
created: 2026-10-26
---

# Option (a). Add packages/crew/src/docs/inventory.ts to touches (done in the plan: touches, Scope In, AC1 and T1 updated). Change RUNS to capture the script name and its flags separately with an optional closing quote between them, e.g. /\bnode\s+"?(?:[^\s"]*\/)?([\w-]+\.mjs)"?((?: --?[\w-]+| [a-z][\w-]*)*)/g, and emit m[1]+m[2]. Hook 3 stays byte-identical to this repo's command, and context-and-memory.md must stay unchanged (SessionStart row: crew.mjs context, track_plan_draft.mjs --session; ExitPlanMode row: track_plan_draft.mjs). Why (a) over (b): the doc change would be a regression, not a fact; RUNS dropping flags on quoted-path commands is a latent extractor bug. No overlap: inventory.ts is in no open plan (P-059, P-061 touch other files). AC1 check stays: docs.test.ts plus git diff --quiet main -- plugins/crew/docs/context-and-memory.md.

Answer to Q-f74680 (architect): AC1 conflict: the byte-exact hook 3 the spec requires (node "$CLAUDE_PROJECT_DIR/.crew/bin/track_plan_draft.mjs" --session) makes the generated hooks table in plugins/crew/docs/context-and-memory.md change from 'track_plan_draft.mjs --session' to 'track_plan_draft.mjs', because the RUNS regex in packages/crew/src/docs/inventory.ts stops at the closing quote. So 'docs unchanged' and 'hook 3 byte-identical' can't both hold within touches. Proposal: add packages/crew/src/docs/inventory.ts to touches and let RUNS skip an optional closing quote after .mjs (capture name and flags separately), which keeps the table unchanged (the ExitPlanMode row has no flags, so it stays as is). Alternative: accept the doc change and add plugins/crew/docs/context-and-memory.md to touches. Which one? I am continuing with T2-T5 meanwhile.
