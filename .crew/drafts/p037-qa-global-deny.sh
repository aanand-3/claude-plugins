#!/usr/bin/env bash
# P-037 QA (AC3, AC1): a tools.deny set ONLY in the playbook's policy/global.yaml, relative playbook.path,
# guard + policy show run from a git worktree under .claude/worktrees. Usage: p037-qa-global-deny.sh <crew.mjs>
set -euo pipefail
HUB="$1"
for v in $(env | grep -o '^CREW_[A-Z_]*'); do unset "$v"; done
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
export GIT_AUTHOR_NAME=qa GIT_AUTHOR_EMAIL=qa@example.test GIT_COMMITTER_NAME=qa GIT_COMMITTER_EMAIL=qa@example.test
mkdir "$T/pb" "$T/main"
git -C "$T/pb" init -q -b main
mkdir -p "$T/pb/policy"
printf 'tools:\n  deny: [WebFetch]\n' > "$T/pb/policy/global.yaml"
git -C "$T/pb" add -A && git -C "$T/pb" commit -qm org
cd "$T/main"
git init -q -b main && git commit -q --allow-empty -m init
node "$HUB" init >/dev/null
printf 'mode: ai-native\n' > .crew/policy.yaml
printf 'hub:\n  plan_worktrees: true\nplaybook:\n  path: ../pb\n' > .crew/config.yaml
node "$HUB" agents >/dev/null
git add -A && git commit -qm hub
git worktree add -q -b plan/P-001-x .claude/worktrees/P-001-x
WT="$T/main/.claude/worktrees/P-001-x"
for at in "$T/main" "$WT"; do
  echo "== $at"
  (cd "$at" && node "$HUB" policy show --role developer 2>&1 | grep -E 'tools.deny|not found|org' || true)
  printf '{"tool_name":"WebFetch","tool_input":{"url":"https://example.com"},"agent_type":"crew-developer","agent_id":"a1","cwd":"%s"}' "$at" \
    | (cd "$at" && node "$HUB" guard)
  echo
done
