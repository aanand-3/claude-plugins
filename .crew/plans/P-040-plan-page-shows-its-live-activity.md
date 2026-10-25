---
id: P-040
title: Plan page shows its live activity
goal: G-007
items: FEAT-046
touches: packages/crew/src/hub/server.ts, packages/crew/src/hub/commands/team/activity.ts, packages/crew/ui/src/api.ts, packages/crew/ui/src/views/DocPage.tsx, packages/crew/ui/src/components/PlanActivity.tsx, packages/crew/ui/src/styles/views.css, packages/crew/test/hub/e2e/live-ui.test.ts
depends_on:
status: ready
branch: plan/P-040-plan-page-shows-its-live-activity
pr:
created: 2026-10-25
started:
completed:
assignee: developer
---

# P-040: Plan page shows its live activity

## Context
Raised by the executive on 2026-10-25, after P-027: the hub UI shows live agent activity only on the overview. Each plan's page, and its tasks, should show the same feed filtered to that plan, updating live: who is working on it, the current task (from the starting checkpoint), and recent tool calls and ledger events (what `watch --ref P-###` prints). It reuses readActivity/liveRuns (activity.ts) and /api/activity with a ref filter. UI-only.

Goal G-007 (Autonomous parallel delivery); builds on P-027 (merged, ba366a1). Draft opened by the PM. The Architect specs scope, acceptance criteria, tasks, test plan, touches and depends_on, and keeps touches narrow.

## Scope
**In:**
- `GET /api/activity?ref=ID`: the live runs and recent activity for that one document, plus a merged feed of its tool calls and ledger events — the entries `watch --ref ID` prints, as data. `/api/activity` without `ref` is unchanged (the Overview's LivePanel).
- One source for feed entries: `watch` and the server both build them from a shared function in `commands/team/activity.ts`; `watch` output stays the same.
- A plan's page, when served, gets a "Live activity" card (who is working on it, their task, last action and age, idle marked, and the plan's feed), and its Tasks panel marks the task a live run is on.

**Out (explicitly not doing):**
- Item, goal and idea pages (the component takes any ID, so this is a follow-up of a line or two once wanted).
- New data in the graph or the static `export` page (no schema change; nothing live without the server).
- Any change to the hook, the activity file, `liveRuns` (core/memory/activity.ts) or the Overview's LivePanel.
- Generated bundles: Release builds them.

## Acceptance criteria
- [ ] AC1 · `GET /api/activity?ref=P-001` returns `{ running, recent, feed }`: `running` and `recent` hold only runs and activity events whose ref is P-001; `feed` is the last 30 entries for P-001 — activity events and ledger events merged by time, oldest first, each `{ ts, type, run, ref, text }` with `type` `"tool"` for an activity event (text = tool and target) or the ledger event type (text = the same detail `ledger` and `watch` print). A ref is matched case-insensitively; a value that isn't a hub ID (`/^[A-Z]+-\d+$/i`) gets 400. Without `ref` the response is exactly `{ running, recent }` as before.
- [ ] AC2 · `watch` prints the same lines as before (its existing e2e tests pass unchanged), built from the same entry function as AC1's `feed`.
- [ ] AC3 · On a plan's page, when served, a "Live activity" card lists each live run on the plan — role, run, task (else "—"), last action, how long ago, an idle or live chip — or says no agent is working on it; below, the plan's feed, newest first (time, type, run, text, one line each, long text truncated with the full text on hover).
- [ ] AC4 · In the plan's Tasks panel, the task whose id equals a live run's task carries a chip with that run's role (idle-toned when the run is idle); no other task is marked.
- [ ] AC5 · The card and the task marker refresh on each hub change event and every 30 s, without a reload. The static `export` page and non-plan pages show no card and log no errors.
- [ ] AC6 · Checked at full size at desktop and 375 px widths: no overflow, long runs and targets wrap or truncate inside the card.

## Approach
- `commands/team/activity.ts`: add `feedEntries(store, ref?, limit?)` → `{ ts, type, run, ref, text }[]` (activity + ledger, sorted by time); `watch`'s `fromActivity`/`fromLedger` format those entries, so the text has one source. The file stays under 300 lines (102 now).
- `server.ts`: parse the query on `/api/activity`; with `ref`, filter `running(s)` and `readActivity(...)` by ref and add `feed: feedEntries(s, ref, 30)`. Keep the edit inside that one route (P-035 also edits this file, in other routes).
- UI: `PlanActivity.tsx` (new) loads `api/activity?ref=<id>` the way LivePanel does (`onHubChange` + 30 s timer) and renders the card; `DocPage` renders it for `doc.kind === "plan"` when `ix.served`, and passes the live runs' tasks to `TaskList` for the marker (one shared fetch: PlanActivity exposes the data through a small hook `usePlanActivity(id)` that both use). `api.ts` gains the `ref` parameter and the `FeedEntry` type. Reuse `Card`, `Chip`, `IdLink`, `Empty` and the `live__*` styles from P-027; new CSS only where needed. DocPage (225 lines) stays under 300.

## Tasks
- [ ] T1: `feedEntries` in commands/team/activity.ts; `watch` built on it. → verify: `npx vitest run test/hub/e2e/activity.test.ts` (watch cases unchanged) — AC2.
- [ ] T2: `/api/activity?ref=` in server.ts. → verify: new cases in `test/hub/e2e/live-ui.test.ts` — ref filter excludes another plan's activity, `feed` holds a tool entry and a ledger checkpoint entry in time order with the expected text, lower-case ref works, `?ref=bad` is 400, no-ref response unchanged — AC1.
- [ ] T3: `api.ts` + `PlanActivity.tsx` + DocPage card and task marker + CSS. → verify: `npm run typecheck`; manual check below — AC3–AC6.

## Test plan
**Targeted checks:** (the e2e suites drive the built bundle: `cd packages/crew && npm run build` first, then discard the generated output, which Release builds)
- `cd packages/crew && npm run typecheck` — T1–T3.
- `npx vitest run test/hub/e2e/live-ui.test.ts` — AC1.
- `npx vitest run test/hub/e2e/activity.test.ts test/activity.test.ts` — AC2 (watch and the feed rules unchanged).
- `npx vitest run test/view.test.ts test/structure.test.ts` — export page and server still pass; 300-line rule.
- Manual (QA), AC3–AC6: in a scratch repo from `scripts/sample-project.mjs`, run `ui --no-open`, open a plan's page; feed `activity --hook` payloads for that plan (one naming the current task through a `crew.mjs --as architect --run-id architect:a136db6240e5552a7 checkpoint P-### --step T2` command) and for another plan; the card shows only this plan's run and feed, T2 carries the role chip, all without a reload; a `usage --hook` stop removes the run. Make the run idle (an activity line 30 minutes old) and see the idle chip. Full-size screenshots at desktop and 375 px; the `export` HTML shows no card and no console errors.

## Rollout & rollback
- n/a beyond the plugin release: read-only UI and one read-only API parameter. Rollback is reverting the plan; nothing is stored.

## Risks & open questions
- `server.ts` is also in P-035's touches (other routes); the edit is confined to the `/api/activity` route, so the merge queue resolves it — no `depends_on`.

## Handoff

## Progress log

- 2026-10-25: status draft → ready
- 2026-10-25: assigned to the developer role

## Outcome
