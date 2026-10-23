#!/usr/bin/env node
// Builds a realistic sample project ("Habitly") with the hub CLI, for UI development, tests and screenshots.
//   node scripts/sample-project.mjs <dir> [path/to/crew.mjs]
// An idea with success criteria, three goals (one in focus), every plan status, bugs, a spike, a dependency
// chain and live plan branches. Deterministic: dates come from HUB_TODAY.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? "sample-project");
const hub = resolve(process.argv[3] ?? new URL("../../../plugins/crew/skills/hub/dist/crew.mjs", import.meta.url).pathname);
const env = { ...process.env, GIT_AUTHOR_NAME: "Sample", GIT_AUTHOR_EMAIL: "sample@example.com",
  GIT_COMMITTER_NAME: "Sample", GIT_COMMITTER_EMAIL: "sample@example.com", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: dir, env, encoding: "utf8" });
const git = (...a) => sh("git", a);
const tr = (...a) => sh("node", [hub, ...a]);
const day = (d) => { env.HUB_TODAY = d; };
const file = (sub, id) => join(dir, ".crew", sub, readdirSync(join(dir, ".crew", sub)).find((n) => n.startsWith(`${id}-`) || n === `${id}.md`));
const edit = (path, fn) => writeFileSync(path, fn(readFileSync(path, "utf8")));
const draft = (name, text) => { const p = join(dir, ".crew/drafts", `${name}.md`); writeFileSync(p, text); return p; };
const commit = (msg) => { git("add", "-A"); if (git("status", "--porcelain").trim()) git("commit", "-q", "-m", msg); };

const plan = (context, inScope, ac, tasks, extra = "") => `## Context\n${context}\n\n## Scope\n**In:**\n- ${inScope}\n\n**Out:**\n- anything else\n\n`
  + `## Acceptance criteria\n${ac.map((a) => `- [ ] ${a}`).join("\n")}\n\n## Approach\nSmall vertical slice: route, service, repository, UI.\n\n`
  + `## Tasks\n${tasks.map((t, i) => `- [ ] T${i + 1}: ${t} → verify: test`).join("\n")}\n\n`
  + `## Test plan\nUnit tests for the service; API test per acceptance criterion; regression test where a bug is fixed.\n\n`
  + `## Rollout & rollback\nn/a — behind the pilot flag.\n\n## Risks & open questions\n- none known${extra}\n`;

function newPlan(title, items, touches, body, ...extra) {
  return tr("new-plan", title, "--from", draft("plan", body), "--items", items, "--touches", touches, ...extra).trim();
}
function ship(pid, outcome) { // start → tick → review → done on the branch, squash-merge to main
  commit(`chore(hub): before ${pid}`);
  tr("start", pid);
  const learnings = outcome.includes("Learnings:") ? "" : "\nLearnings: none";
  edit(file("plans", pid), (t) => t.replace(/- \[ \] T/g, "- [x] T").trimEnd() + `\n${outcome}${learnings}\n`);
  tr("checkpoint", pid, "--run", "true", "--ac", "all", "--note", "the developer's own run");
  tr("move", pid, "in-review");
  const qa = { ...env, CREW_RUN: "qa", CREW_ACTOR: "qa", CREW_ROLE: "qa" };
  execFileSync("node", [hub, "checkpoint", pid, "--run", "true", "--ac", "all"], { cwd: dir, env: qa, encoding: "utf8" });
  execFileSync("node", [hub, "move", pid, "done"], { cwd: dir, env: qa, encoding: "utf8" });
  commit(`feat(${pid}): done`);
  const branch = git("branch", "--show-current").trim();
  git("switch", "-q", "main");
  git("merge", "-q", "--squash", branch);
  commit(`${pid}: squash`);
  git("branch", "-q", "-D", branch);
}

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
git("init", "-q", "-b", "main");
git("commit", "-q", "--allow-empty", "-m", "init");
day("2026-10-05");
tr("init");
writeFileSync(join(dir, ".crew/config.yaml"), "hub:\n  wip_limit: 2\n");
for (const src of ["src/auth/login.py", "src/auth/signup.py", "src/checkins/time.py", "src/habits/models.py", "web/home/index.tsx"]) {
  mkdirSync(join(dir, src, ".."), { recursive: true });
  writeFileSync(join(dir, src), "# sample\n");
}
writeFileSync(join(dir, ".crew/policy.yaml"), "mode: ai-native   # agents run the work; the idea's decision stays with the executive\n"
  + "budgets:\n  max_agents: 3\n");

tr("new-idea", "Habitly", "--from", draft("idea", `## Problem
People who want a daily habit (exercise, reading, language practice) give up within two weeks: nothing reminds them
and nothing shows them progress. Generic to-do apps don't make a streak feel worth keeping.

## Outcome
Pilot users build a daily habit within two weeks of signing up, and small teams keep habits together.

## Success criteria
- [ ] 60% of pilot users check in on 10 of their first 14 days
- [ ] 3 pilot teams active by January
- [ ] no open S1/S2 bugs at pilot launch

## Research
docs/research/idea-research.md: streak apps retain well when check-in takes one tap; reminders matter more than badges.

## Direction
Mobile-first web app (PWA) with email reminders; native apps only if the pilot works. Rejected: a chat bot (too little control over reminders).

## Constraints
One developer plus agents; pilot by mid-November; Postgres.
`));
tr("move", "IDEA", "researching"); tr("move", "IDEA", "proposed"); tr("move", "IDEA", "decided", "--note", "go: pilot by mid-November", "--approved-by", "Asha (executive)");
tr("new-goal", "Accounts", "--priority", "P1", "--from", draft("e1", `## Outcome
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
- Signup endpoint — POST /signup with validation
- Email verification — signed link, 24 h expiry
- Password reset — token by email
- Profile page — edit name and timezone
`));
tr("new-goal", "Habit tracking", "--priority", "P1", "--from", draft("e2", `## Outcome
Users create habits, check in each day and see streaks that make them want to come back.

## Scope
**In:**
- habits, daily check-in, streaks, reminders

**Out:**
- social sharing (G-003)

## Acceptance criteria
- [ ] a user creates a habit and checks in from the home screen in two taps
- [ ] streaks are correct across timezones and DST changes

## Breakdown
- Create habit — name, schedule, colour
- Daily check-in — one tap from home, undo for 10 s
- Streaks — current and best, timezone-aware
- Reminders — email at the user's chosen time
`));
tr("new-goal", "Team spaces", "--priority", "P2", "--from", draft("e3", `## Outcome
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
- Invite teammates — email invite with role
- Shared habits — habits owned by the team
- Team dashboard — who checked in today
`));
tr("focus", "G-001");
tr("move", "G-001", "active");
tr("new-item", "spike", "Email provider fallback", "--priority", "P1", "--from", draft("s1", `## Question
Can we fail over from Postmark to SES without users noticing?

## Timebox
1 day

## Output
An ADR choosing the fallback.
`));
tr("new-item", "chore", "Upgrade to Node 22 LTS", "--why", "Node 20 leaves active LTS; CI images already ship 22.");
commit("chore(hub): idea and goals");

// ---- Accounts: signup + verification
newPlan("Signup endpoint", "FEAT-001", "src/auth/**, web/signup/**", plan("First slice of G-001: create accounts.", "POST /signup",
  ["201 with a session cookie on valid input", "409 on a duplicate email"], ["route and DTOs", "service and repository", "UI form"]));
newPlan("Email verification", "FEAT-002", "src/auth/verify/**, templates/email/**", plan("Verify the address before a user can create habits.",
  "signed verification link", ["link verifies within 24 h", "expired link offers a resend"], ["token service", "email template", "verify route"]));
tr("move", "P-001", "ready"); tr("move", "P-002", "ready");
day("2026-10-07"); ship("P-001", "Shipped POST /signup; PR #12.");
day("2026-10-10"); ship("P-002", "Shipped verification; Postmark templates in infra repo.");

// ---- habits + a login bug
day("2026-10-12");
tr("new-item", "bug", "Login returns 500 on an empty email", "--severity", "S2", "--goal", "G-001", "--from", draft("b1", `## Environment
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
newPlan("Create habit", "FEAT-005", "src/habits/**, web/habits/**", plan("First slice of G-002.", "create habit form and API",
  ["a habit with name, schedule and colour is saved", "validation errors are shown inline"], ["schema and migration", "API", "form"]));
newPlan("Fix login 500 on empty email", "BUG-001", "src/auth/login.py, tests/auth/**", plan("Fixes BUG-001 found in pilot onboarding.",
  "validate email before lookup", ["regression test: empty email returns 422", "valid logins unaffected"], ["regression test", "validation fix"]));
tr("move", "P-003", "ready"); tr("move", "P-004", "ready");
day("2026-10-13");
const gotcha = tr("learn", "gotcha", "Validate request bodies before any repository lookup", "--why",
  "An empty email reached the user lookup and raised KeyError, so login answered 500 instead of 422 (BUG-001).",
  "--scope", "src/auth/**", "--source", "P-004").trim().split("/").pop().replace(".md", "");
ship("P-004", `Fixed; regression test in auth suite.\nLearnings: ${gotcha}`);
day("2026-10-16"); ship("P-003", "Shipped habit creation; colour picker uses design tokens.");

// ---- reset, check-in, streaks; the focus moves to habit tracking
day("2026-10-19");
tr("new-item", "bug", "Streak resets at midnight UTC instead of local midnight", "--severity", "S2", "--goal", "G-002", "--from", draft("b2", `## Environment
staging, user timezone Asia/Kolkata

## Steps to reproduce
1. Check in at 23:30 local time
2. Look at the streak at 00:10 local time

## Expected
Streak continues until local midnight of the next day

## Actual
Streak shows 0 after 05:30 local (midnight UTC)

## Impact
Every user outside UTC loses streaks; blocks P-007 (streaks).
`));
newPlan("Password reset", "FEAT-003", "src/auth/reset/**, web/reset/**", plan("Last core slice of G-001; depends on P-002's token service.",
  "reset by emailed token", ["reset link works once and expires in 1 h", "old sessions are revoked"], ["reset token", "email", "reset form", "revoke sessions"]),
  "--depends", "P-002");
tr("move", "P-005", "ready");
day("2026-10-20"); ship("P-005", "Shipped password reset; sessions revoked on reset.");
tr("learn", "decision", "Streaks are computed in the user's timezone, never UTC", "--why",
  "BUG-002: users outside UTC lost streaks at UTC midnight. Store the timezone on the user; compute days locally.",
  "--scope", "src/checkins/**, src/habits/**", "--source", "BUG-002");
tr("learn", "risk", "Email provider rate limits block verification at launch", "--why", "Postmark caps sends per minute; SPIKE-001 evaluates a fallback.",
  "--likelihood", "H", "--impact", "H", "--owner", "Asha");
tr("focus", "G-002");
tr("move", "G-002", "active");
newPlan("Daily check-in", "FEAT-006", "src/checkins/**, web/home/**", plan("The core loop of G-002.", "one-tap check-in from home",
  ["check-in in one tap", "undo within 10 s", "works offline and syncs"], ["API", "home button", "undo toast", "offline queue"]));
newPlan("Streaks", "FEAT-007", "src/streaks/**, web/home/streak*", plan("Make progress visible; needs timezone-correct check-ins (BUG-002).",
  "current and best streak", ["streak is correct across DST", "best streak never decreases"], ["streak service", "timezone tests", "UI badge"]),
  "--depends", "P-006");
newPlan("Fix streak reset at UTC midnight", "BUG-002", "src/checkins/time.py, tests/checkins/**", plan("Fixes BUG-002 before streaks ship.",
  "use the user's timezone", ["regression test: check-in at 23:30 IST keeps the streak", "DST change does not break streaks"], ["regression test", "timezone fix"]));
for (const p of ["P-006", "P-007", "P-008"]) tr("move", p, "ready");
// P-006 in progress on its branch, half the tasks done
commit("chore(hub): check-in and streak plans");
tr("start", "P-006");
edit(file("plans", "P-006"), (t) => t.replace("- [ ] T1", "- [x] T1").replace("- [ ] T2", "- [x] T2"));
tr("log", "P-006", "offline queue needs the service worker from the PWA spike — see SPIKE-001 notes");
tr("checkpoint", "P-006", "--attempt", "background sync API", "--why", "not available in Safari; the queue needs the service worker");
commit("feat(P-006): API and home button");
git("switch", "-q", "main");
// P-008 blocked on its branch
tr("start", "P-008");
edit(file("plans", "P-008"), (t) => t.replace("- [ ] T1", "- [x] T1"));
tr("move", "P-008", "blocked", "--note", "waiting for product decision on the DST edge case");
commit("fix(P-008): regression test");
git("switch", "-q", "main");
day("2026-10-21");
// A draft plan that is not ready yet, and an untriaged idea
newPlan("Profile page", "FEAT-004", "web/profile/**", `## Context
Users need to set their timezone (BUG-002).

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
tr("escalate", "FEAT-008", "Reminders need Postmark's paid tier ($20/month): approve the spend, or ship push notifications later?");
tr("status", "--write");
commit("chore(hub): day 3 of the check-in loop");
console.log(`sample project ready: ${dir}`);
