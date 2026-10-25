#!/bin/sh
# P-041 QA AC4: changed paths (committed since main merge-base + uncommitted + untracked) stay within
# packages/crew/test/helpers/, packages/crew/test/setup/, packages/crew/vitest.config.ts; none in src/** or plugins/**
# and none in P-024's or P-038's touches. Run from the worktree root.
BASE=$(git merge-base HEAD main)
CHANGED=$( { git diff --name-only "$BASE"; git ls-files --others --exclude-standard; } | sort -u | grep -v '^\.crew/')
echo "base=$BASE"; echo "changed:"; echo "$CHANGED"
BAD=$(echo "$CHANGED" | grep -v -E '^packages/crew/(test/helpers/|test/setup/|vitest\.config\.ts$)')
TOUCH="packages/crew/src/hub/core/team/policy.ts packages/crew/src/hub/commands/work/release.ts packages/crew/src/hub/cli.ts packages/crew/src/hub/commands/work/release.reg.ts packages/crew/src/hub/commands/index.ts packages/crew/test/hub/refresh-bin.test.ts plugins/crew/skills/hub/agents/release.md plugins/crew/skills/hub/references/model.md packages/crew/src/hub/commands/team/policy.ts .crew/config.yaml packages/crew/src/hub/commands/work/planning.ts packages/crew/test/hub/e2e/sparse-worktrees.test.ts packages/crew/test/hub/e2e/worktrees.test.ts packages/crew/test/hub-worktrees.test.ts"
OVER=""
for t in $TOUCH; do echo "$CHANGED" | grep -qx "$t" && OVER="$OVER $t"; done
echo "outside allowed: ${BAD:-<none>}"; echo "overlap with P-024/P-038: ${OVER:-<none>}"
[ -z "$BAD" ] && [ -z "$OVER" ] && [ -n "$CHANGED" ]
