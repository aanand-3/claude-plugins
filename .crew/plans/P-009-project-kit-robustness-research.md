---
id: P-009
title: project-kit robustness research
goal: 
items: 
touches:
depends_on:
status: dropped
branch:
pr: 
created: 2026-10-21
started:
completed: 
---

# P-009: project-kit robustness research

## Context
`/project-kit:research` (depth **deep**) on *how to make project-kit more robust*. Target user: solo devs on Claude Code + public OSS. Reported lag areas: session continuity, tracker friction, kickoff/adopt weight, reliability/drift. Plan mode blocked writing during gathering; three read-only lane agents already collected ~136 evidence records (products/prior-art for trackers & continuity; spec/kickoff frameworks + market; voice of customer). This plan writes them out, verifies them, and produces the report. Output is research only — no code, no tracker items.

Baseline (repo): hooks exist only as generated per-project `.claude/settings.json` (`plugins/project-kit/skills/guidelines/templates/settings.json`: SessionStart → `tracker current` + leftover drafts; PostToolUse format + ExitPlanMode→plan). No plugin-level `hooks/`, no compact/clear re-injection, no Stop/PreCompact, no trigger evals (`tests/project-kit/*` are structural pytest).

## Steps
1. **Evidence file** — write `docs/research/evidence.jsonl` from the three agents' JSONL, deduped (planning-with-files appears in two lanes), ids `E1…En`; for HN records, prefer apostrophe-free quotes.
2. **Second round (deep)** — fill critique gaps with a few targeted fetches, appended as new ids:
   - Claude Code docs: plugin-level `hooks/hooks.json`, `PreCompact`/`Stop` hook semantics, `${CLAUDE_PLUGIN_ROOT}`.
   - Reddit (r/ClaudeAI) via WebFetch for continuity/ceremony complaints (lane had none).
   - Clawket is 1★ / brand new → keep as low-confidence lead, not main table.
3. **Verify** — `python3 <skill>/scripts/verify_evidence.py --file docs/research/evidence.jsonl`; re-check `blocked`/`mismatch` (HN escaped HTML, kiro.dev/docs.cline.bot JS pages) with WebFetch → `"verified":"manual"` + note; drop/downgrade the rest. ≤3 rounds.
4. **Report** `docs/research/idea-research.md` from the skill template, with the content below; every claim labelled Fact/Inference/Assumption with `[E#]`.
5. **Check** — `verify_evidence.py --file … --report docs/research/idea-research.md` must pass.
6. Present verdict + scorecard; leave files uncommitted (offer a `docs/` branch + commit).

## Report content (draft findings)

**Verdict: pivot (refocus), not kill.** The space is crowded and free — Superpowers ~303k★, Spec Kit ~142k★, OpenSpec ~73k★, BMAD ~54k★, planning-with-files ~28k★, Beads ~28k★, Backlog.md ~7k★ — so "another workflow kit" has no room. The gap nobody fills: **one repo-local, deterministic, low-ceremony path from verified idea research → recorded stack decisions → stack-aware rules + git guards → plan=branch=PR tracker, with continuity enforced by hooks rather than prose.** project-kit already has most pieces; robustness work is about enforcement, right-sizing and measurement.

**Recommendations, by lag area (each cites evidence):**
1. *Session continuity* — ship plugin-level hooks: SessionStart matcher `startup|resume|clear|compact` injecting a ≤10k-char `tracker current` brief via `additionalContext` (not `systemMessage`); a handoff/STATE section on the active plan written from git/test checks (verified vs recalled claims); optional Stop gate when a plan's tasks are open. Single fast process per hook (10s timeout lesson). Sources: planning-with-files, Clawket, Superpowers, handoff skills, GSD STATE.md, CC hooks docs; complaints #14258/#17428.
2. *Tracker friction* — right-size ceremony: a "lite" default (backlog + plans only); sprints/points/RAID/milestones opt-in; quick-fix path that needs no plan for small changes; `next` ready-queue; zero-token deterministic commands (CCPM); never auto-commit (Backlog.md #160); decisions as first-class records + "propose an ADR mid-coding" (adr-skill, Backlog.md). Allow several active plans.
3. *Kickoff/adopt weight* — express kickoff (≤3 questions + defaults, rest deferred); budget generated artifacts and load references lazily (BMAD 67% context complaint); keep tooling in the plugin, only state in the repo; `refresh` that regenerates without clobbering edits (OpenSpec update; Spec Kit #2612, BMAD #1728); adopt scans are confirmed, never trusted (ccpm #48).
4. *Reliability/drift* — `claude plugin eval` trigger-rate cases per skill in CI vs no-plugin baseline + `claude plugin validate`; descriptions ≤1,536 chars, key use first; must-hold rules → hooks; critical instructions in first 5k tokens of each SKILL.md (post-compaction re-attach budget); `doctor` that checks paths/symbols cited in CLAUDE.md/rules/docs still exist and reconciles merged plans vs shipped (Spec Kit converge/#1063); emit AGENTS.md alongside CLAUDE.md; note Auto Mode skips path-scoped rules (#90450).

**Packaging (Inference, user decides):** tracker and research are the parts with standalone pull (direct rivals Backlog.md/Beads and Spec Kit's idea assessment) → candidates for their own plugins in the same marketplace; kickoff/adopt/discover/guidelines/git-setup stay as the core kit; design and graph stay optional modules.

**Scorecard (draft):** Pain 4 · Frequency 5 · WTP 1 (all rivals free/OSS) · Saturation 2 · Differentiation 3 · Distribution 3 (marketplace, awesome-claude-code "Memory & Context" category) · Feasibility 5 → **23 → pivot**. Market-lite expressed as adoption (stars/installs), not revenue; Claude Code market signals ($2.5B run-rate, ~4% of public GitHub commits) as context only.

**What would change the verdict:** evidence that solo users want heavier PM (sprints/points) in-repo; a trigger-eval showing project-kit skills already fire reliably; an official Claude Code continuity feature making hook-based resume redundant.

**Mom Test** questions for: did you last resume work after /clear or a new session — what did you do; when did you last skip a tracker step and why; what made you abandon Spec Kit/BMAD/Task Master.

## Verification
- `verify_evidence.py --file docs/research/evidence.jsonl` — all kept records `yes|fuzzy|manual`.
- `verify_evidence.py … --report docs/research/idea-research.md` exits 0 (every `[E#]` exists & verified).
- Report contains all template sections; no competitor without a fetched URL.

## Progress log
- 2026-10-24: imported from plan mode (`~/.claude/plans/wild-napping-curry.md`); it predates the hub tracking plans, status dropped from git history

## Outcome
Never landed: `docs/research/` (the evidence file and report) was never committed. Dropped on 2026-10-24 at the executive's call when the plan-mode plans were imported.

Learnings: none
