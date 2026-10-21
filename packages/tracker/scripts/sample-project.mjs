#!/usr/bin/env node
// Builds a realistic sample project ("Habitly") with the tracker CLI, for UI development, tests and screenshots.
//   node scripts/sample-project.mjs <dir> [path/to/tracker.mjs]
// Three sprints (two closed, one active), two milestones, three epics, every plan status, bugs, a spike,
// risks, a dependency chain and live plan branches. Deterministic: dates come from TRACKER_TODAY.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "sample-project");
const tracker = resolve(process.argv[3] ?? new URL("../../../plugins/project-kit/skills/tracker/dist/tracker.mjs", import.meta.url).pathname);
const env = { ...process.env, GIT_AUTHOR_NAME: "Sample", GIT_AUTHOR_EMAIL: "sample@example.com",
  GIT_COMMITTER_NAME: "Sample", GIT_COMMITTER_EMAIL: "sample@example.com", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: dir, env, encoding: "utf8" });
const git = (...a) => sh("git", a);
const tr = (...a) => sh("node", [tracker, ...a]);
const day = (d) => { env.TRACKER_TODAY = d; };
const file = (sub, id) => join(dir, ".project", sub, readdirSync(join(dir, ".project", sub)).find((n) => n.startsWith(`${id}-`) || n === `${id}.md`));
const edit = (path, fn) => writeFileSync(path, fn(readFileSync(path, "utf8")));
const draft = (name, text) => { const p = join(dir, ".project/drafts", `${name}.md`); writeFileSync(p, text); return p; };
const commit = (msg) => { git("add", "-A"); if (git("status", "--porcelain").trim()) git("commit", "-q", "-m", msg); };

const plan = (context, inScope, ac, tasks, extra = "") => `## Context\n${context}\n\n## Scope\n**In:**\n- ${inScope}\n\n**Out:**\n- anything else\n\n`
  + `## Acceptance criteria\n${ac.map((a) => `- [ ] ${a}`).join("\n")}\n\n## Approach\nSmall vertical slice: route, service, repository, UI.\n\n`
  + `## Tasks\n${tasks.map((t, i) => `- [ ] T${i + 1}: ${t} → verify: test`).join("\n")}\n\n`
  + `## Test plan\nUnit tests for the service; API test per acceptance criterion; regression test where a bug is fixed.\n\n`
  + `## Rollout & rollback\nn/a — behind the pilot flag.\n\n## Risks & open questions\n- none known${extra}\n`;

function newPlan(title, items, body, ...extra) {
  return tr("new-plan", title, "--from", draft("plan", body), "--items", items, ...extra).trim();
}
function ship(pid, outcome) { // start → tick → review → done on the branch, squash-merge to main
  commit(`chore(tracker): before ${pid}`);
  tr("start", pid);
  edit(file("plans", pid), (t) => t.replace(/- \[ \] T/g, "- [x] T").trimEnd() + `\n${outcome}\n`);
  tr("move", pid, "in-review");
  tr("move", pid, "done");
  commit(`feat(${pid}): done`);
  const branch = git("branch", "--show-current").trim();
  git("switch", "-q", "main");
  git("merge", "-q", "--squash", branch);
  commit(`${pid}: squash`);
  git("branch", "-q", "-D", branch);
}
function closeSprint(sid, review, tryLine) {
  edit(file("sprints", sid), (t) => t.replace("## Review\n", `## Review\n${review}\n`).replace("**Try:**\n", `**Try:**\n- ${tryLine}\n`)
    .replace("**Keep:**\n-", "**Keep:**\n- Small plans that ship in two days"));
  tr("sprint", "close", sid);
}

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
git("init", "-q", "-b", "main");
git("commit", "-q", "--allow-empty", "-m", "init");
day("2026-10-05");
tr("init");

tr("new-doc", "project-plan", "--capacity", "13", "--from", draft("pp", `## Objectives
- Pilot users build a daily habit with Habitly within two weeks of signing up.
- Teams can share habits by the end of Q1.

## Success measures
- 60% of pilot users check in on 10 of their first 14 days.
- 3 pilot teams active by January.

## Milestones
| Milestone | Goal | Target date | Exit criteria (summary) |
|---|---|---|---|
| M-01 | MVP pilot | 2026-11-15 | sign up, habits, check-ins, streaks |
| M-02 | Teams | 2027-01-15 | invite, shared habits |

## Cadence & capacity
1-week sprints starting Monday; 13 points per sprint (one developer + Claude).
`));
edit(join(dir, ".project/project-plan.md"), (t) => t.replace("wip_limit: 1", "wip_limit: 2"));
tr("new-doc", "raid", "--from", draft("raid", `## Risks
| ID | Risk | Probability | Impact | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | Email provider rate limits block verification at launch | H | H | Asha | Batch sends; second provider ready (SPIKE-001) | open |
| R2 | Push notifications rejected by app store review | M | H | Ravi | Ship email reminders first | open |
| R3 | Pilot users churn before streaks feel rewarding | M | M | Asha | Interview 5 pilot users in sprint 3 | open |
| R4 | Timezone bugs in streak calculation | M | M | | | open |

## Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-10-05 | Postgres over SQLite | multi-user from day one |
`));
tr("new-milestone", "MVP pilot", "--target", "2026-11-15", "--from", draft("m1", `## Goal
Pilot users sign up, create habits, check in daily and see their streaks.

## Scope
**In:**
- EP-001 Accounts, EP-002 Habit tracking

## Exit criteria
- [ ] 20 pilot users onboarded in staging
- [ ] no open S1/S2 bugs
- [ ] deployed, monitored, rollback tested
- [ ] user guide published
`));
tr("new-milestone", "Teams", "--target", "2027-01-15", "--from", draft("m2", `## Goal
Small teams share habits and see each other's progress.

## Scope
**In:**
- EP-003 Team spaces

## Exit criteria
- [ ] 3 pilot teams active
- [ ] team data isolated per tenant (security review)
`));
tr("new-epic", "Accounts", "--milestone", "M-01", "--priority", "P1", "--from", draft("e1", `## Outcome
A pilot user can create an account, verify their email and get back in when they forget the password.

## Scope
**In:**
- signup, verification, password reset, profile

**Out:**
- SSO, social login

## Acceptance criteria
- [ ] a new user signs up and verifies their email in under a minute
- [ ] a user who forgot their password is back in within five minutes

## Breakdown
- Signup endpoint — POST /signup with validation (5 pts)
- Email verification — signed link, 24 h expiry (3 pts)
- Password reset — token by email (5 pts) (after Email verification)
- Profile page — edit name and timezone (3 pts)
`));
tr("new-epic", "Habit tracking", "--milestone", "M-01", "--priority", "P1", "--from", draft("e2", `## Outcome
Users create habits, check in each day and see streaks that make them want to come back.

## Scope
**In:**
- habits, daily check-in, streaks, reminders

**Out:**
- social sharing (EP-003)

## Acceptance criteria
- [ ] a user creates a habit and checks in from the home screen in two taps
- [ ] streaks are correct across timezones and DST changes

## Breakdown
- Create habit — name, schedule, colour (3 pts)
- Daily check-in — one tap from home, undo for 10 s (5 pts)
- Streaks — current and best, timezone-aware (3 pts) (after Daily check-in)
- Reminders — email at the user's chosen time (8 pts)
`));
tr("new-epic", "Team spaces", "--milestone", "M-02", "--priority", "P2", "--from", draft("e3", `## Outcome
A team lead invites teammates and the team tracks shared habits together.

## Scope
**In:**
- invites, shared habits, team dashboard

**Out:**
- billing

## Acceptance criteria
- [ ] a lead invites three teammates and they join in one click
- [ ] team members see each other's check-ins for shared habits only

## Breakdown
- Invite teammates — email invite with role (5 pts)
- Shared habits — habits owned by the team (8 pts)
- Team dashboard — who checked in today
`));
tr("new-item", "spike", "Email provider fallback", "--priority", "P1", "--points", "2", "--milestone", "M-01", "--from", draft("s1", `## Question
Can we fail over from Postmark to SES without users noticing (R1)?

## Timebox
1 day

## Output
An ADR choosing the fallback, linked from RAID R1.
`));
tr("triage", "SPIKE-001");
tr("new-item", "chore", "Upgrade to Node 22 LTS", "--why", "Node 20 leaves active LTS; CI images already ship 22.");
commit("chore(tracker): release plan M-01, M-02");

// ---- Sprint 1 (Oct 5–11): signup + verification
newPlan("Signup endpoint", "FEAT-001", plan("First slice of EP-001: create accounts.", "POST /signup",
  ["201 with a session cookie on valid input", "409 on a duplicate email"], ["route and DTOs", "service and repository", "UI form"]));
newPlan("Email verification", "FEAT-002", plan("Verify the address before a user can create habits (R1 risk on the provider).",
  "signed verification link", ["link verifies within 24 h", "expired link offers a resend"], ["token service", "email template", "verify route"]));
tr("move", "P-001", "ready"); tr("move", "P-002", "ready");
tr("sprint", "new", "--goal", "A pilot user can sign up and verify their email");
tr("sprint", "add", "S-01", "P-001", "P-002");
tr("sprint", "start", "S-01");
day("2026-10-07"); ship("P-001", "Shipped POST /signup; PR #12.");
day("2026-10-10"); ship("P-002", "Shipped verification; Postmark templates in infra repo.");
day("2026-10-11"); closeSprint("S-01", "Signup and verification shipped and demoed. Goal met.", "Write the test plan before the tasks");

// ---- Sprint 2 (Oct 12–18): habits + login bug
day("2026-10-12");
tr("new-item", "bug", "Login returns 500 on an empty email", "--severity", "S2", "--epic", "EP-001", "--from", draft("b1", `## Environment
staging, commit 4f2c9e1

## Steps to reproduce
1. POST /login with {"email": "", "password": "x"}

## Expected
422 with a validation message

## Actual
500 Internal Server Error; stack trace in logs

## Impact
Pilot users who tab past the email field see a crash page.
`));
tr("triage", "BUG-001", "--points", "1");
newPlan("Create habit", "FEAT-005", plan("First slice of EP-002.", "create habit form and API",
  ["a habit with name, schedule and colour is saved", "validation errors are shown inline"], ["schema and migration", "API", "form"]));
newPlan("Fix login 500 on empty email", "BUG-001", plan("Fixes BUG-001 found in pilot onboarding.", "validate email before lookup",
  ["regression test: empty email returns 422", "valid logins unaffected"], ["regression test", "validation fix"]), "--points", "1");
tr("move", "P-003", "ready"); tr("move", "P-004", "ready");
tr("sprint", "new", "--goal", "Users create their first habit; no crash on login");
tr("sprint", "add", "S-02", "P-003", "P-004");
tr("sprint", "start", "S-02");
day("2026-10-13"); ship("P-004", "Fixed; regression test in auth suite.");
day("2026-10-16"); ship("P-003", "Shipped habit creation; colour picker uses design tokens.");
day("2026-10-18"); closeSprint("S-02", "Habits shipped; login fix landed day 2. Goal met, 4 pts spare.", "Pull the next ranked item when the sprint has slack");

// ---- Sprint 3 (Oct 19–25, active): reset, check-in, streaks
day("2026-10-19");
tr("new-item", "bug", "Streak resets at midnight UTC instead of local midnight", "--severity", "S2", "--epic", "EP-002", "--from", draft("b2", `## Environment
staging, user timezone Asia/Kolkata

## Steps to reproduce
1. Check in at 23:30 local time
2. Look at the streak at 00:10 local time

## Expected
Streak continues until local midnight of the next day

## Actual
Streak shows 0 after 05:30 local (midnight UTC)

## Impact
Every user outside UTC loses streaks; blocks P-007 (streaks). See RAID R4.
`));
tr("triage", "BUG-002", "--points", "2");
newPlan("Password reset", "FEAT-003", plan("Last core slice of EP-001; depends on P-002's token service.", "reset by emailed token",
  ["reset link works once and expires in 1 h", "old sessions are revoked"], ["reset token", "email", "reset form", "revoke sessions"]), "--depends", "P-002");
newPlan("Daily check-in", "FEAT-006", plan("The core loop of EP-002.", "one-tap check-in from home",
  ["check-in in one tap", "undo within 10 s", "works offline and syncs"], ["API", "home button", "undo toast", "offline queue"]));
newPlan("Streaks", "FEAT-007", plan("Make progress visible; needs timezone-correct check-ins (BUG-002).", "current and best streak",
  ["streak is correct across DST", "best streak never decreases"], ["streak service", "timezone tests", "UI badge"]), "--depends", "P-006");
newPlan("Fix streak reset at UTC midnight", "BUG-002", plan("Fixes BUG-002 before streaks ship (R4).", "use the user's timezone",
  ["regression test: check-in at 23:30 IST keeps the streak", "DST change does not break streaks"], ["regression test", "timezone fix"]));
for (const p of ["P-005", "P-006", "P-007", "P-008"]) tr("move", p, "ready");
tr("sprint", "new", "--goal", "Password reset and the daily check-in loop are live");
tr("sprint", "add", "S-03", "P-005", "P-006", "P-007", "P-008");
tr("sprint", "start", "S-03");
day("2026-10-20"); ship("P-005", "Shipped password reset; sessions revoked on reset.");
// P-006 in progress on its branch, half the tasks done
commit("chore(tracker): sprint 3 under way");
tr("start", "P-006");
edit(file("plans", "P-006"), (t) => t.replace("- [ ] T1", "- [x] T1").replace("- [ ] T2", "- [x] T2"));
tr("log", "P-006", "offline queue needs the service worker from the PWA spike — see SPIKE-001 notes");
commit("feat(P-006): API and home button");
git("switch", "-q", "main");
// P-008 blocked on its branch
tr("start", "P-008");
edit(file("plans", "P-008"), (t) => t.replace("- [ ] T1", "- [x] T1"));
tr("move", "P-008", "blocked", "--note", "waiting for product decision on DST edge case (R4)");
commit("fix(P-008): regression test");
git("switch", "-q", "main");
day("2026-10-21");
tr("log", "S-03", "P-005 shipped early; P-008 blocked on a DST decision, raised with product");
// A draft plan that is not ready yet, and an untriaged idea
newPlan("Profile page", "FEAT-004", `## Context
Users need to set their timezone (BUG-002, R4).

## Scope
**In:**
- edit name and timezone

## Acceptance criteria
- [ ] timezone change takes effect on the next check-in

## Tasks
- [ ] T1: profile API
- [ ] T2: form → verify: UI test
`);
tr("new-item", "feat", "Weekly summary email", "--why", "Three pilot users asked for a Sunday recap.");
tr("roadmap", "--write");
commit("chore(tracker): sprint 3 day 3");
console.log(`sample project ready: ${dir}`);
