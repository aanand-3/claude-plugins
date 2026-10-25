---
id: G-006
title: Documentation: how crew works
status: active
priority: P2
created: 2026-10-25
completed:
integration_branch:
---

# G-006: Documentation: how crew works

## Outcome
Contributors, people using crew and the role agents can each find out how crew works behind the scenes — agent lifecycle, context and memory, the plan lifecycle and its gates, policy — from one doc set that stays true to the code, readable on GitHub and browsable in the hub UI.

## Scope
**In:**
- a doc set in `plugins/crew/docs/` (architecture, plan lifecycle, agent team, context and memory, policy, reference, contributing)
- diagrams and inventories generated from the code's own tables (flows, role gates, policy layers, commands, MCP tools, hooks), with a freshness test
- a `/docs` view in the hub UI with interactive state diagrams, bundled into `ui.html` so it works in `ui`, `export` and the vendored copy
- fixing the stale parts of `model.md`, `hub/SKILL.md` and `docs/vision.md`, and pointing skills and agent templates at the docs

**Out:**
- live, project-aware overlays in the docs view (which gate blocks your plan); a later goal if wanted
- a docs site generator; copying the docs into user projects

## Acceptance criteria
- [ ] every flow in the doc set (plan, goal, idea and item lifecycles and their gates, agent team, hooks and context, policy layering) is documented with `file:function` pointers that resolve
- [ ] generated diagrams and tables match the code: the freshness test fails when a flow, role gate, command or MCP tool changes without regenerating the docs
- [ ] the docs are browsable at `crew.mjs ui` and in `crew.mjs export` opened from `file://`, with the plan lifecycle as an interactive diagram
- [ ] the hub and team skills and every role agent template point to the page that role needs

## Success metrics

## Breakdown
- FEAT-029: Generated diagrams and inventories — diagram data and reference tables built from the code tables, `npm run docs`, and a freshness test
- FEAT-030: How crew works: the doc set — architecture, plan lifecycle, agent team, context and memory, policy, reference and contributing pages
- FEAT-031: Docs view in the hub UI — a `/docs` route rendering the bundled pages with interactive state diagrams

## Notes & decisions
- Decided with the executive (2026-10-25): markdown in the repo is the source of truth; the UI renders it at `/docs`; readers are contributors, users and the agents.
- Plans are written just in time: the generator plan first; the doc-set and UI plans depend on it.
- Pages in `plugins/crew/docs/`: README (map by reader), architecture (CLI/MCP/UI → Store → workspace flush → ledger; build and vendoring), plan-lifecycle (flows, `move()` order, gates, questions, worktree → one commit → squash-merge), agent-team (Director loop, staffing, rendered agents, guard, run/pause/notify, usage), context-and-memory (hook timeline, `context` per role, learn/recall, playbook, checkpoint/resume/handoff, ledger), policy (layers and merge rules, modes, lifecycle role matrix), reference (generated), contributing. Each opens with "what happens when…" for users, then `file:symbol` pointers for contributors.
- FEAT-030 plan (after P-025): write the pages from the code; fix CHORE-016; link the docs from the README, the hub and team skills, and one line per `agents/*.md` naming the page that role should read (agents read on demand; `context` budget unchanged); re-render `.claude/agents/`.
- FEAT-031 plan (after P-025, parallel to FEAT-030): `ui/src/views/Docs.tsx` at `#/docs/<page>`, pages bundled with `import.meta.glob(..., {query: "?raw"})` like `studio/model.ts` does, so `ui`, `export` and the vendored copy all work; generated Mermaid blocks swapped for React Flow diagrams from `src/docs/diagrams.ts` via a `FlowDiagram` component pulled out of `GraphView.tsx` (no Mermaid dependency); `Markdown` gets `linkIds={false}`; a separate "Docs" entry in `Shell`.
- Out: live project-aware overlays (which gate blocks your plan), a docs site generator, copying docs into user projects.

## Progress log
- 2026-10-25: status proposed → active — Executive approved making G-006 active and the focus; P-025 starts once P-023 lands (approved by Arpit Anand)
