#!/bin/sh
# P-024 AC4: release.md orders hub.build -> refresh-bin (in the plan's worktree) -> one commit -> hub.full_suite,
# and says a project without release.refresh_bin skips it. Run from the plan's worktree root.
f=plugins/crew/skills/hub/agents/release.md
b=$(grep -n 'run `hub.build` there' "$f" | head -1 | cut -d: -f1)
r=$(grep -n 'refresh-bin` in the plan.s worktree' "$f" | head -1 | cut -d: -f1)
c=$(grep -n "the plan's one commit" "$f" | head -1 | cut -d: -f1)
s=$(grep -n 'run `hub.full_suite` on that commit' "$f" | head -1 | cut -d: -f1)
echo "build=$b refresh=$r commit=$c suite=$s"
grep -q 'without `release.refresh_bin` skips this step' "$f" || { echo "no skip sentence"; exit 1; }
[ -n "$b" ] && [ -n "$r" ] && [ -n "$c" ] && [ -n "$s" ] && [ "$b" -le "$r" ] && [ "$r" -lt "$c" ] && [ "$c" -le "$s" ]
