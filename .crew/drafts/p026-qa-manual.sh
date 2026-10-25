#!/bin/bash
# P-026 QA manual checks: AC4 newer worktree copy of a main item; AC5 guard allows a main-checkout .crew/items write
set -e
HUB=/Users/aanand/Documents/Projects/Personal/claude-plugins/.claude/worktrees/P-026-one-home-for-hub-state/plugins/crew/skills/hub/dist/crew.mjs
for v in $(env | grep -o '^CREW_[A-Z_]*' || true); do unset $v; done
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
R=$(mktemp -d)/repo; mkdir -p $R; cd $R; R=$(pwd -P)
git init -q -b main; git commit -q --allow-empty -m init
node $HUB init >/dev/null; printf 'mode: ai-native\n' > .crew/policy.yaml; git add -A; git commit -qm policy
printf 'hub:\n  plan_worktrees: true\n' > .crew/config.yaml; git add -A; git commit -qm wt
node $HUB new-item bug "Crash" --why "500" | tail -1
printf '## Context\nx\n## Scope\nx\n## Acceptance criteria\n- [ ] AC1: works\n## Tasks\n- [ ] T1: do\n## Test plan\n- t\n' > .crew/drafts/plan.md
node $HUB new-plan "Signup" --from .crew/drafts/plan.md --touches "src/**" | tail -1 || true
WT=$(ls -d $R/.claude/worktrees/P-001-*); BUG=$(cd $R && ls .crew/items/BUG-001-*.md); echo "worktree: $WT  bug: $BUG"
echo "== AC4: worktree holds a NEWER differing copy of a main item"
sleep 1; printf '\nnewer line from worktree\n' >> $WT/$BUG
node $HUB migrate --gather
grep -c "newer line from worktree" $R/$BUG && echo "AC4 newer copy reached main: OK"
echo "worktree .crew status (empty = clean):"; git -C $WT status --porcelain -- .crew
node $HUB migrate --gather
echo "== AC4 inverse: main copy newer than worktree copy"
printf '\nolder wt line\n' >> $WT/$BUG; sleep 1; printf '\nmain edit\n' >> $R/$BUG
node $HUB migrate --gather; grep -q "older wt line" $R/$BUG && echo "FAIL: older wt copy overwrote main" || echo "main kept: OK"
echo "== AC5"
mkdir -p .claude/agents; printf -- '---\nname: crew-developer\ncrew-role: developer\n---\nbody\n' > .claude/agents/crew-developer.md
for p in "$WT/.crew/items/BUG-009-x.md" "$R/.crew/items/BUG-009-x.md"; do
  echo "-- Write $p"; echo "{\"tool_name\":\"Write\",\"agent_type\":\"crew-developer\",\"agent_id\":\"a\",\"cwd\":\"$R\",\"tool_input\":{\"file_path\":\"$p\"}}" | node $HUB guard; echo "[exit $?; empty output = allowed]"
done
