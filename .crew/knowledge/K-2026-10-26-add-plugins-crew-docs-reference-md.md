---
id: K-2026-10-26-add-plugins-crew-docs-reference-md
type: decision
title: Add plugins/crew/docs/reference.md to touches and let the checkpoint commit the regenerated line; it's now in P-054's touches and test plan. Don't mark plugins/crew/docs generated. Its pages are hand prose with generated blocks. git.codeChanges leaves linguist-generated files out of checkpoint commits and review diffs, and land step 2 resets uncommitted generated files to the branch version, so a plan's prose edits there would be lost and never reviewed. Rule for all plans: a change that alters a generated block in plugins/crew/docs/*.md (commands, MCP tools, ledger events, flows, gates, policy layers, hooks, skills, UI actions) lists the affected page in touches, runs npm run build or npm run docs, and is checkpointed with test/docs.test.ts green on the branch. Only whole-file build outputs (dist, scripts, references/commands.md) are linguist-generated.
scope: 
source: P-054
supersedes:
tier: project
created: 2026-10-26
---

# Add plugins/crew/docs/reference.md to touches and let the checkpoint commit the regenerated line; it's now in P-054's touches and test plan. Don't mark plugins/crew/docs generated. Its pages are hand prose with generated blocks. git.codeChanges leaves linguist-generated files out of checkpoint commits and review diffs, and land step 2 resets uncommitted generated files to the branch version, so a plan's prose edits there would be lost and never reviewed. Rule for all plans: a change that alters a generated block in plugins/crew/docs/*.md (commands, MCP tools, ledger events, flows, gates, policy layers, hooks, skills, UI actions) lists the affected page in touches, runs npm run build or npm run docs, and is checkpointed with test/docs.test.ts green on the branch. Only whole-file build outputs (dist, scripts, references/commands.md) are linguist-generated.

Answer to Q-d5eddf (architect): T4 changes the suites MCP tool description (adds sha, branch). Since P-025, npm run build regenerates plugins/crew/docs/reference.md (line 86 holds that description) and test/docs.test.ts fails if it is stale. plugins/crew/docs is not in touches and not linguist-generated. May I add plugins/crew/docs/reference.md to P-054's touches and commit the regenerated line, or should it be marked generated for Release to rebuild?
