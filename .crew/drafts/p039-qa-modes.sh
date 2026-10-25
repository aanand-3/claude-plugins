#!/bin/bash
# P-039 QA: exercise plans(true) in both modes against throwaway repos with the worktree's built CLI.
# usage: p039-qa-modes.sh <crew.mjs> <scratch-dir>
set -u
HUB="$1"; S="$2"
for v in $(env | grep -o '^CREW_[A-Z_]*'); do unset "$v"; done
export GIT_AUTHOR_NAME=T GIT_AUTHOR_EMAIL=t@e.x GIT_COMMITTER_NAME=T GIT_COMMITTER_EMAIL=t@e.x GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
c() { node "$HUB" "$@"; }
fails=0
expect() { if echo "$2" | grep -qE -- "$3"; then echo "ok   $1"; else echo "FAIL $1 (wanted /$3/)"; echo "$2" | head -20; fails=$((fails+1)); fi; }
refuse() { if echo "$2" | grep -qE -- "$3"; then echo "FAIL $1 (found /$3/)"; echo "$2" | grep -E -- "$3" | head -5; fails=$((fails+1)); else echo "ok   $1"; fi; }
cat > "$S/plan.md" <<'EOF'
## Context
Scratch.

## Scope
**In:**
- a

**Out:**
- b

## Acceptance criteria
- [ ] original criterion text

## Tasks
- [ ] T1: first → verify: true
- [ ] T2: second → verify: true

## Test plan
true

## Risks
- none
EOF
setup() { rm -rf "$1"; mkdir -p "$1"; cd "$1"; git init -q -b main; git commit -q --allow-empty -m init; c init >/dev/null
  printf 'mode: ai-native\n' > .crew/policy.yaml; git add -A; git commit -q -m policy; }
pf() { ls .crew/plans/$1-*.md; }

echo "== mode A: plan_worktrees true, stale branch copy (AC1, AC7)"
setup "$S/a"
printf 'hub:\n  plan_worktrees: true\n  wip_limit: 5\n' > .crew/config.yaml; git add -A; git commit -q -m cfg
mkdir -p .crew/drafts; cp "$S/plan.md" .crew/drafts/p.md
c new-plan "Signup" --from .crew/drafts/p.md --touches "src/auth/**" >/dev/null
c move P-001 ready >/dev/null
WT=$(ls -d .claude/worktrees/P-001-*); REL=$(pf P-001)
git -C "$WT" merge -q --ff-only main
expect "branch copy carries ready" "$(git -C "$WT" show HEAD:$REL)" "status: ready"
c start P-001 >/dev/null
sed -i '' -e 's/original criterion text/AMENDED main criterion/' -e 's/- \[ \] T1:/- [x] T1:/' "$REL"; git add -A; git commit -q -m amend
expect "branch copy still stale" "$(git -C "$WT" show HEAD:$REL)" "status: ready"
st=$(c status); expect "status in-progress 1/2" "$st" "P-001 \| Signup \|[^|]+\| in-progress \| 1/2"; refuse "status no (live on" "$st" "live on"
sj=$(c staff --json); refuse "staff does not offer P-001 to start" "$(echo "$sj" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).start??[])))')" "P-001"
ctx=$(c context P-001); expect "context in-progress" "$ctx" "\[in-progress\]"; expect "context amended criterion" "$ctx" "AMENDED main criterion"; refuse "context no branch criterion" "$ctx" "original criterion text"; expect "context tasks 1/2" "$ctx" "tasks 1/2"
rs=$(c resume P-001); expect "resume in-progress 1/2" "$rs" "\[in-progress\] tasks 1/2"; refuse "resume no [ready]" "$rs" "\[ready\]"
ex=$(c export --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).docs.find(x=>x.id==="P-001");console.log(p.status, p.tasks.done)})')
expect "export in-progress 1" "$ex" "^in-progress 1$"
mo=$(c merge-order); echo "   merge-order: $(echo "$mo" | tr '\n' ' ' | cut -c1-160)"; refuse "merge-order no ready" "$mo" "ready"

echo "== mode A2: plan_worktrees true, hand-made branch copy differing (AC2), then start without worktree (AC3)"
setup "$S/a2"
mkdir -p .crew/drafts; cp "$S/plan.md" .crew/drafts/p.md
c new-plan "Signup" --from .crew/drafts/p.md --touches "src/auth/**" >/dev/null; c move P-001 ready >/dev/null; git add -A; git commit -q -m plan 2>/dev/null
REL=$(pf P-001); BR=$(git branch --list 'plan/*' | tr -d ' *' | head -1); [ -z "$BR" ] && BR=plan/P-001-signup
git switch -q -c "$BR" 2>/dev/null || git switch -q "$BR"
sed -i '' -e 's/status: ready/status: in-progress/' -e 's/^Scratch\.$/Scratch. BRANCHMARK/' "$REL"; git add -A; git commit -q -m branchcopy
TIP=$(git rev-parse HEAD); git switch -q main
printf 'hub:\n  plan_worktrees: true\n' > .crew/config.yaml; git add -A; git commit -q -m cfg
st=$(c status); expect "A2 status ready" "$st" "P-001 \| Signup \|[^|]+\| ready"; refuse "A2 no (live on" "$st" "live on"
ctx=$(c context P-001); refuse "A2 context no BRANCHMARK" "$ctx" "BRANCHMARK"
before=$(sed -n '/^## Context/,/^## Progress log/p' "$REL")
out=$(c start P-001 2>&1); echo "   start: $(echo "$out" | tr '\n' ' ' | cut -c1-200)"; refuse "A2 start no took-the-plan" "$out" "took the plan from"
WT=$(ls -d .claude/worktrees/P-001-* 2>/dev/null); expect "A2 worktree on branch tip" "$(git -C "$WT" rev-parse HEAD) $(git -C "$WT" branch --show-current)" "^$TIP $BR$"
after=$(sed -n '/^## Context/,/^## Progress log/p' "$REL"); [ "$before" = "$after" ] && echo "ok   A2 main body unchanged" || { echo "FAIL A2 main body changed"; fails=$((fails+1)); }
refuse "A2 main no BRANCHMARK" "$(cat "$REL")" "BRANCHMARK"; expect "A2 main in-progress" "$(cat "$REL")" "status: in-progress"

echo "== mode B: plan_worktrees false (default), real start on branch (AC2 false, AC8)"
setup "$S/b"
mkdir -p .crew/drafts; cp "$S/plan.md" .crew/drafts/p.md
c new-plan "Signup" --from .crew/drafts/p.md --touches "src/auth/**" >/dev/null; c move P-001 ready >/dev/null; git add -A; git commit -q -m plan 2>/dev/null
c start P-001 >/dev/null; echo "   on branch: $(git branch --show-current)"
REL=$(pf P-001); sed -i '' -e 's/^Scratch\.$/Scratch. BRANCHMARK/' -e 's/- \[ \] T1:/- [x] T1:/' "$REL"; git add -A; git commit -q -m progress 2>/dev/null
git switch -q main
expect "B main copy says ready" "$(cat "$REL")" "status: ready"
st=$(c status); expect "B status shows branch in-progress (live on" "$st" "in-progress \(live on .plan/P-001"
ctx=$(c context P-001); expect "B context in-progress" "$ctx" "\[in-progress\]"; expect "B context branch marker" "$ctx" "BRANCHMARK"

echo "== AC4 lost plans"
setup "$S/c"
git branch plan/P-009-x; out=$(c check 2>&1); expect "local hint" "$out" "P-009: branch plan/P-009-x has no plan file and no worktree — its worktree was removed"
git branch -D -q plan/P-009-x; git update-ref refs/remotes/origin/plan/P-009-x HEAD; out=$(c check 2>&1)
expect "origin-only hint" "$out" "P-009: only origin/plan/P-009-x has it and the main checkout has no plan file"; refuse "origin no work-gone" "$out" "uncommitted work is gone"
git branch plan/P-009-x; out=$(c check 2>&1); expect "both: local hint" "$out" "branch plan/P-009-x has no plan file"; refuse "both: no origin-only hint" "$out" "only origin/"

echo "== AC5 shared overlaps"
setup "$S/d"
printf 'hub:\n  plan_worktrees: true\n  wip_limit: 5\n  shared: [src/cli.ts]\n' > .crew/config.yaml; git add -A; git commit -q -m cfg
mkdir -p .crew/drafts; cp "$S/plan.md" .crew/drafts/p.md
c new-plan One --from .crew/drafts/p.md --touches "src/cli.ts, src/one.ts" >/dev/null
c new-plan Two --from .crew/drafts/p.md --touches "src/cli.ts, src/two.ts" >/dev/null
c new-plan Three --from .crew/drafts/p.md --touches "src/one.ts, src/three.ts" >/dev/null
for p in P-001 P-002 P-003; do c move $p ready >/dev/null; done
c start P-001 >/dev/null
refuse "context P-002 no overlap" "$(c context P-002)" "overlaps P-001"
a=$(c next --role architect); refuse "architect no P-002 overlap" "$a" "P-002 overlaps P-001"; refuse "architect no depends_on" "$a" "depends_on"
expect "architect real overlap advice" "$a" "P-003 overlaps P-001.*narrow touches or list the file in hub.shared"
o=$(c start P-002 2>&1); refuse "start P-002 no overlap warning" "$o" "overlap"
expect "context P-003 overlap" "$(c context P-003)" "overlaps P-001"
o=$(c start P-003 --force 2>&1); expect "start P-003 warns" "$o" "P-003 overlaps P-001.*hub.shared"; refuse "start P-003 no depends_on" "$o" "depends_on"
d=$(c next --role director); refuse "director no depends_on" "$d" "depends_on"; refuse "director no shared pair" "$d" "P-00[12] and P-00[12] overlap"
expect "director real overlap" "$d" "P-00[13] and P-00[13] overlap on src/one.ts.*hub.shared"
echo "== failures: $fails"
