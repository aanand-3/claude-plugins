/** The hub, end to end — goal links belong to triage (P-055, FEAT-048, BUG-037): capture records an origin and a goal
 * hint, triage suggests and links the goal (and clears it), `regoal` moves items and plans with their items. */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { BUG_DRAFT, GOAL_DRAFT } from "./fixtures.js";
import { init, item, newBug, newGoal, newPlan, planFile, read, tr } from "./helpers.js";
import { mcpCall } from "./sections.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

/** A goal whose Breakdown creates no items, so the tests number their own. */
const BARE_GOAL = GOAL_DRAFT.replace(/## Candidate plans[\s\S]*?## Notes/, "## Breakdown\n- ~~none yet~~\n\n## Notes");
const front = (text: string, key: string) => new RegExp(`^${key}:(.*)$`, "m").exec(text)?.[1].trim() ?? null;

/** A committed hub with G-001 and P-001 (on G-001, with its own worktree when `worktrees`). */
function hub({ worktrees = false } = {}): void {
  init(repo, { commit: true });
  if (worktrees) repo.write(".crew/config.yaml", "hub:\n  plan_worktrees: true\n");
  expect(newGoal(repo, "Accounts", BARE_GOAL).returncode).toBe(0);
  const r = newPlan(repo, "Signup endpoint", undefined, "--goal", "G-001");
  expect(r.returncode, r.stderr).toBe(0);
  repo.commit("chore(hub): goal and plan");
}

function planWorktree(id: string): Repo {
  const dir = join(repo.path, ".claude/worktrees");
  const name = readdirSync(dir).find((f) => f.startsWith(`${id}-`));
  if (!name) throw new Error(`no worktree for ${id}`);
  const wt = new Repo(join(dir, name));
  wt.env = repo.env;
  return wt;
}

describe("capture", () => {
  it("records the origin from the plan's worktree, with no goal (AC1)", () => {
    hub({ worktrees: true });
    const r = tr(planWorktree("P-001"), "new-item", "feat", "Rate limit", "--why", "found while building signup");
    expect(r.returncode, r.stderr).toBe(0);
    const text = item(repo, "FEAT-001");
    expect(front(text, "goal")).toBe("");
    expect(front(text, "origin")).toBe("P-001");
  });

  it("records the origin from this run's one open claim (AC1)", () => {
    hub({ worktrees: true }); // the main checkout stays on main: only the claim names the plan
    expect(tr(repo, "move", "P-001", "ready").returncode).toBe(0);
    repo.commit("chore(hub): ready");
    expect(tr(repo, "start", "P-001").returncode).toBe(0);
    repo.env.CREW_RUN = "other-run"; // another run holds no claim: no origin
    expect(tr(repo, "new-item", "feat", "Other", "--why", "y").returncode).toBe(0);
    expect(front(item(repo, "FEAT-001"), "origin")).toBeNull();
    delete repo.env.CREW_RUN;
    expect(tr(repo, "new-item", "feat", "Rate limit", "--why", "y").returncode).toBe(0);
    expect(front(item(repo, "FEAT-002"), "origin")).toBe("P-001");
  });

  it("--origin wins over detection and must exist; without any there is no origin (AC1)", () => {
    hub({ worktrees: true });
    expect(newBug(repo, "Login 500").returncode).toBe(0);
    let r = tr(planWorktree("P-001"), "new-item", "feat", "Retry", "--why", "y", "--origin", "bug-001");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-001"), "origin")).toBe("BUG-001");
    for (const bad of ["FEAT-009", "G-001", "nonsense"]) {
      r = tr(repo, "new-item", "feat", "Nope", "--why", "y", "--origin", bad);
      expect(r.returncode, bad).not.toBe(0);
      expect(r.stderr).toContain(`Origin ${bad.toUpperCase()} does not exist.`);
    }
    expect(front(item(repo, "BUG-001"), "origin")).toBeNull();
    expect(front(item(repo, "BUG-001"), "goal")).toBe("");
  });

  it("--goal is checked, then kept only as a hint in Notes (AC1)", () => {
    hub();
    let r = tr(repo, "new-item", "feat", "Nope", "--why", "y", "--goal", "G-009");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("Goal G-009 does not exist.");
    r = tr(repo, "new-item", "feat", "Dark mode", "--why", "users asked", "--goal", "g-001", "--priority", "P2");
    expect(r.returncode, r.stderr).toBe(0);
    const text = item(repo, "FEAT-001");
    expect(front(text, "goal")).toBe("");
    expect(text).toMatch(/- \d{4}-\d\d-\d\d: goal hint G-001 \(by .+\)/);
    expect(text).toContain("status: triaged"); // intake triage still runs, without a goal
  });

  it("a goal's Breakdown still links the items it creates", () => {
    init(repo);
    expect(newGoal(repo).returncode).toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
    expect(front(item(repo, "FEAT-002"), "goal")).toBe("G-001");
  });

  it("triage suggests the origin's goal, else the hint, else nothing (AC1b)", () => {
    hub();
    expect(tr(repo, "new-item", "feat", "From plan", "--why", "y", "--origin", "P-001").returncode).toBe(0);
    let r = tr(repo, "triage", "FEAT-001", "--priority", "P2");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("");
    expect(r.stdout).toContain("suggested goal: G-001 (origin P-001's goal) — confirm with `triage FEAT-001 --goal G-001` or pick another");

    expect(tr(repo, "new-item", "feat", "From item", "--why", "y", "--origin", "FEAT-001").returncode).toBe(0);
    expect(tr(repo, "triage", "FEAT-001", "--goal", "G-001").returncode).toBe(0);
    r = tr(repo, "triage", "FEAT-002", "--priority", "P2");
    expect(r.stdout).toContain("suggested goal: G-001 (origin FEAT-001's goal)");

    expect(tr(repo, "new-item", "feat", "Hinted", "--why", "y", "--goal", "G-001").returncode).toBe(0);
    r = tr(repo, "triage", "FEAT-003", "--priority", "P2");
    expect(r.stdout).toContain("suggested goal: G-001 (goal hint) — confirm with `triage FEAT-003 --goal G-001`");

    expect(tr(repo, "new-item", "feat", "Plain", "--why", "y").returncode).toBe(0);
    r = tr(repo, "triage", "FEAT-004", "--priority", "P2");
    expect(r.returncode, r.stderr).toBe(0);
    expect(r.stdout).not.toContain("suggested goal");

    r = tr(repo, "triage", "FEAT-004", "--goal", "G-001");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-004"), "goal")).toBe("G-001");
    expect(r.stdout).not.toContain("suggested goal");
  });

  it("a bug needs Steps to reproduce, Expected and Actual (AC2)", () => {
    init(repo);
    let r = tr(repo, "new-item", "bug", "Crash", "--why", "500 on login");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("A bug needs Steps to reproduce, Expected and Actual; empty: Steps to reproduce, Expected, Actual. Nothing was created.");
    repo.write(".crew/drafts/bug.md", BUG_DRAFT.replace("500 Internal Server Error", ""));
    r = tr(repo, "new-item", "bug", "Crash", "--from", ".crew/drafts/bug.md");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("empty: Actual. Nothing was created.");
    expect(repo.read(".crew/drafts/bug.md")).toContain("## Actual"); // the draft is kept
    expect(readdirSync(join(repo.path, ".crew/items")).filter((f) => f.endsWith(".md"))).toEqual([]);
    r = newBug(repo, "Crash");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-001")).toContain("500 Internal Server Error");
  });
});

const logs = (id: string) => tr(repo, "ledger", "--ref", id, "--json").stdout.trim().split("\n").filter(Boolean)
  .map((l) => JSON.parse(l) as Record<string, any>).filter((e) => e.type === "log");

/** FEAT-001 triaged onto G-001 (and G-002, a second goal). */
function linked(): void {
  hub();
  expect(newGoal(repo, "Billing", BARE_GOAL).returncode).toBe(0);
  expect(tr(repo, "new-item", "feat", "Dark mode", "--why", "users asked").returncode).toBe(0);
  const r = tr(repo, "triage", "FEAT-001", "--priority", "P2", "--goal", "G-001");
  expect(r.returncode, r.stderr).toBe(0);
  expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
}

describe("triage", () => {
  it("--goal none clears the goal with a note and logs it (AC3, BUG-037)", () => {
    linked();
    let r = tr(repo, "triage", "FEAT-001", "--goal", "none");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("is a re-goal: give --note");
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
    r = tr(repo, "triage", "FEAT-001", "--goal", "none", "--note", "off G-001");
    expect(r.returncode, r.stderr).toBe(0);
    const text = item(repo, "FEAT-001");
    expect(front(text, "goal")).toBe("");
    expect(text).toMatch(/- \d{4}-\d\d-\d\d: re-goaled G-001 → none by .+: off G-001/);
    expect(logs("FEAT-001").at(-1)!.text).toMatch(/^re-goaled G-001 → none by .+: off G-001$/);
    r = tr(repo, "triage", "FEAT-001", "--goal", "none", "--note", "again");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("FEAT-001 has no goal to clear. Nothing was changed.");
  });

  it('--goal "" clears like none, never "updated" with no change (AC3)', () => {
    linked();
    const r = tr(repo, "triage", "FEAT-001", "--goal", "", "--note", "not this goal");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("");
    expect(item(repo, "FEAT-001")).toContain("re-goaled G-001 → none");
  });

  it("changing a goal at triage is a re-goal; linking a goal-less item needs no note (AC4)", () => {
    linked();
    let r = tr(repo, "triage", "FEAT-001", "--goal", "G-002");
    expect(r.returncode).not.toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
    r = tr(repo, "triage", "FEAT-001", "--goal", "G-002", "--note", "billing owns it");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-002");
    expect(item(repo, "FEAT-001")).toContain("re-goaled G-001 → G-002");
    expect(tr(repo, "triage", "FEAT-001", "--goal", "G-002").returncode).toBe(0); // the same goal: no re-goal
  });
});

describe("regoal", () => {
  it("moves an item with a required note, logged on the document and the ledger (AC4)", () => {
    linked();
    let r = tr(repo, "regoal", "FEAT-001", "G-002");
    expect(r.returncode).not.toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
    r = tr(repo, "regoal", "feat-001", "g-002", "--note", "billing owns it");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-002");
    expect(item(repo, "FEAT-001")).toMatch(/re-goaled G-001 → G-002 by .+: billing owns it/);
    expect(logs("FEAT-001").at(-1)!.text).toMatch(/^re-goaled G-001 → G-002 by .+: billing owns it$/);
    r = tr(repo, "regoal", "FEAT-001", "none", "--note", "nobody's");
    expect(r.returncode, r.stderr).toBe(0);
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("");
    r = tr(repo, "regoal", "FEAT-001", "G-001", "--note", "back");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "FEAT-001")).toContain("re-goaled none → G-001");
  });

  it("the MCP tool does the same; new_item detects the origin and keeps --goal as a hint (AC1, AC4)", () => {
    linked();
    let res = mcpCall(repo, "regoal", { id: "FEAT-001", goal: "G-002", note: "over MCP" });
    expect(res.isError, JSON.stringify(res)).toBeFalsy();
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-002");
    expect(item(repo, "FEAT-001")).toContain("re-goaled G-001 → G-002 by");
    res = mcpCall(repo, "new_item", { type: "feat", title: "Over MCP", why: "y", goal: "G-001" });
    expect(res.isError, JSON.stringify(res)).toBeFalsy();
    expect(front(item(repo, "FEAT-002"), "goal")).toBe("");
    expect(item(repo, "FEAT-002")).toContain("goal hint G-001");
  });

  it("refuses frozen work: closed documents, done or dropped goals (AC5)", () => {
    linked();
    expect(tr(repo, "move", "G-002", "dropped", "--note", "not now").returncode).toBe(0);
    let r = tr(repo, "regoal", "FEAT-001", "G-002", "--note", "x");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("the target goal G-002 is dropped");
    expect(tr(repo, "new-item", "feat", "Old", "--why", "y").returncode).toBe(0);
    expect(tr(repo, "triage", "FEAT-002", "--priority", "P2", "--goal", "G-002").returncode).toBe(0);
    r = tr(repo, "regoal", "FEAT-002", "G-001", "--note", "x");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("its goal G-002 is dropped");
    expect(tr(repo, "move", "FEAT-001", "wontfix", "--note", "no").returncode).toBe(0);
    r = tr(repo, "regoal", "FEAT-001", "none", "--note", "x");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("FEAT-001 is wontfix");
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
    expect(front(item(repo, "FEAT-002"), "goal")).toBe("G-002");
  });

  it("an item in an open plan moves only with its plan, all or nothing (AC6)", () => {
    linked();
    expect(tr(repo, "new-item", "feat", "Second", "--why", "y").returncode).toBe(0);
    expect(tr(repo, "triage", "FEAT-002", "--priority", "P2", "--goal", "G-001").returncode).toBe(0);
    const r0 = newPlan(repo, "Dark mode", undefined, "--goal", "G-001", "--items", "FEAT-001,FEAT-002");
    expect(r0.returncode, r0.stderr).toBe(0);
    let r = tr(repo, "regoal", "FEAT-001", "G-002", "--note", "x");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("FEAT-001 is in P-002: re-goal the plan, which moves its items with it");
    expect(tr(repo, "move", "FEAT-002", "done").returncode).toBe(0); // a closed item blocks the whole move
    r = tr(repo, "regoal", "P-002", "G-002", "--note", "x");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("FEAT-002 is done");
    expect(front(item(repo, "FEAT-001"), "goal")).toBe("G-001");
    expect(read(planFile(repo, "P-002"))).toContain("goal: G-001");
    r = tr(repo, "move", "FEAT-002", "triaged", "--force");
    expect(r.returncode, r.stderr).toBe(0);
    r = tr(repo, "regoal", "P-002", "G-002", "--note", "billing owns dark mode");
    expect(r.returncode, r.stderr).toBe(0);
    const plan = read(planFile(repo, "P-002"));
    expect(plan).toContain("goal: G-002");
    expect(plan).toMatch(/## Progress log[\s\S]*re-goaled G-001 → G-002 by .+: billing owns dark mode/);
    for (const id of ["FEAT-001", "FEAT-002"]) {
      expect(front(item(repo, id), "goal")).toBe("G-002");
      expect(item(repo, id)).toContain("re-goaled G-001 → G-002");
      expect(logs(id).at(-1)!.text).toContain("re-goaled G-001 → G-002");
    }
    expect(logs("P-002").at(-1)!.text).toContain("re-goaled G-001 → G-002");
  });
});
