/** The hub, end to end — items close (BUG-024): stored `done`, closing from any status, items following their plan to
 * done, closing never blocking its plan, and the PM owning closure under `preset: lifecycle`. */
import { beforeEach, describe, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { finish, init, item, newBug, newPlan, planFile, read, tr } from "./helpers.js";
import { as, lifecycle, ship } from "./team-helpers.js";
import { PLAN_DRAFT } from "./fixtures.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });
const today = () => new Date().toISOString().slice(0, 10);

describe("flow", () => {
  it("an item is stored done, closes from any status, and done is a valid status (BUG-024)", () => {
    init(repo);
    expect(newBug(repo, "Login 500", "--severity", "S2").returncode).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: triaged");
    expect(tr(repo, "next", "--role", "architect").stdout).toContain("write a plan for BUG-001");
    let r = tr(repo, "move", "BUG-001", "done");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: done");
    expect(item(repo, "BUG-001")).toContain(`closed: ${today()}`);

    expect(tr(repo, "new-item", "feat", "Dark mode", "--why", "users asked").returncode).toBe(0);
    expect(item(repo, "FEAT-001")).toContain("status: new");
    r = tr(repo, "move", "FEAT-001", "done");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "FEAT-001")).toContain("status: done");

    r = tr(repo, "move", "BUG-001", "bogus");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toMatch(/Valid: .*\bdone\b/);
    expect(tr(repo, "check").stdout + tr(repo, "check").stderr).not.toContain("invalid status");
    expect(tr(repo, "next", "--role", "architect").stdout).not.toContain("write a plan for BUG-001");

    r = tr(repo, "move", "BUG-001", "duplicate", "--note", "same as FEAT-001");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: duplicate");
  });
});

const BUG_PLAN = PLAN_DRAFT.replace("- [ ] 201 on valid input", "- [ ] regression test: empty email → 422; 201 on valid input");
const moves = (id: string) => tr(repo, "ledger", "--ref", id, "--json").stdout.trim().split("\n")
  .map((l) => JSON.parse(l) as Record<string, any>).filter((e) => e.type === "move");

/** BUG-001 and BUG-002 (triaged) and P-001 delivering both, ready and committed. */
function twoBugsPlanned(): void {
  init(repo, { commit: true });
  expect(newBug(repo, "Login 500", "--severity", "S2").returncode).toBe(0);
  expect(newBug(repo, "Signup 500", "--severity", "S2").returncode).toBe(0);
  const r = newPlan(repo, "Fix 500s", BUG_PLAN, "--items", "BUG-001,BUG-002");
  expect(r.returncode, r.stderr).toBe(0);
  expect(tr(repo, "move", "P-001", "ready").returncode).toBe(0);
  repo.commit("chore(hub): plan P-001");
}

describe("follow", () => {
  it("a plan's items are stored done when the plan is done", () => {
    twoBugsPlanned();
    expect(tr(repo, "start", "P-001").returncode).toBe(0);
    finish(repo, "P-001");
    for (const id of ["BUG-001", "BUG-002"]) {
      const text = item(repo, id);
      expect(text).toContain("status: done");
      expect(text).toContain(`closed: ${today()}`);
      expect(text).toContain("status triaged → done — delivered by P-001");
    }
    const m = moves("BUG-001");
    expect(m.at(-1)).toMatchObject({ from: "triaged", to: "done", via: "plan.done" });
  });

  it("… also when the plan is moved done --force", () => {
    twoBugsPlanned();
    expect(tr(repo, "start", "P-001").returncode).toBe(0);
    ship(repo, "P-001");
    repo.write("src/P-001.txt", "P-001");
    repo.commit("feat(P-001): work");
    expect(tr(repo, "move", "P-001", "in-review").returncode).toBe(0);
    expect(tr(repo, "move", "P-001", "done", "--force").returncode).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: done");
    expect(item(repo, "BUG-001")).toContain("delivered by P-001");
    expect(moves("BUG-001").at(-1)).toMatchObject({ from: "triaged", to: "done", via: "plan.done" });
  });

  it("… and under preset: lifecycle, when the PM moves it done --force", () => {
    lifecycle(repo);
    repo.write(".crew/drafts/bug.md", "## Steps to reproduce\n1. POST /login {}\n\n## Expected\n422\n\n## Actual\n500\n");
    let r = as(repo, "pm", "new-item", "bug", "Login 500", "--from", ".crew/drafts/bug.md", "--severity", "S2");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: triaged");
    expect(newPlan(repo, "Fix 500", BUG_PLAN, "--items", "BUG-001").returncode).toBe(0);
    expect(as(repo, "architect", "move", "P-001", "ready").returncode).toBe(0);
    expect(as(repo, "pm", "assign", "P-001", "--to", "developer").returncode).toBe(0);
    repo.commit("chore(hub): plan");
    r = as(repo, "developer", "start", "P-001");
    expect(r.returncode, r.stderr).toBe(0);
    ship(repo, "P-001");
    repo.write("src/auth/fix.py", "ok\n");
    repo.commit("feat(P-001): fix");
    expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
    r = as(repo, "pm", "move", "P-001", "done", "--force");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: done");
    expect(item(repo, "BUG-001")).toContain("delivered by P-001");
    expect(moves("BUG-001").at(-1)).toMatchObject({ from: "triaged", to: "done", via: "plan.done" });
  });
});

describe("never blocks", () => {
  it("an item closed while its plan is in progress doesn't stop the plan, and keeps its closure", () => {
    twoBugsPlanned();
    expect(tr(repo, "start", "P-001").returncode).toBe(0);
    const r = tr(repo, "move", "BUG-002", "duplicate", "--note", "same as BUG-001");
    expect(r.returncode, r.stderr).toBe(0);
    const closed = item(repo, "BUG-002").match(/^closed: (.+)$/m)![1];
    finish(repo, "P-001"); // in-review and done, each asserted to exit 0
    const bug2 = item(repo, "BUG-002");
    expect(bug2).toContain("status: duplicate");
    expect(bug2).toContain(`closed: ${closed}`);
    expect(bug2).not.toContain("delivered by P-001");
    expect(moves("BUG-002").at(-1)).toMatchObject({ from: "triaged", to: "duplicate" });
    expect(item(repo, "BUG-001")).toContain("status: done");
  });

  it("a plan whose only item was closed while ready still starts and reaches done; the item stays wontfix", () => {
    init(repo, { commit: true });
    expect(newBug(repo, "Login 500", "--severity", "S2").returncode).toBe(0);
    expect(newPlan(repo, "Fix 500", BUG_PLAN, "--items", "BUG-001").returncode).toBe(0);
    expect(tr(repo, "move", "P-001", "ready").returncode).toBe(0);
    let r = tr(repo, "move", "BUG-001", "wontfix", "--note", "not worth it");
    expect(r.returncode, r.stderr).toBe(0);
    repo.commit("chore(hub): plan P-001");
    r = tr(repo, "start", "P-001");
    expect(r.returncode, r.stderr).toBe(0);
    finish(repo, "P-001");
    expect(read(planFile(repo, "P-001"))).toContain("status: done");
    expect(item(repo, "BUG-001")).toContain("status: wontfix");
    expect(item(repo, "BUG-001")).not.toContain("delivered by P-001");
  });
});

describe("pm owns", () => {
  it("under preset: lifecycle only the PM closes an item", () => {
    lifecycle(repo);
    for (const title of ["Login 500", "Signup 500"]) {
      repo.write(".crew/drafts/bug.md", "## Steps to reproduce\n1. POST /login {}\n\n## Expected\n422\n\n## Actual\n500\n");
      expect(as(repo, "pm", "new-item", "bug", title, "--from", ".crew/drafts/bug.md", "--severity", "S2").returncode).toBe(0);
    }
    let r = as(repo, "developer", "move", "BUG-001", "done");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("for the pm role");
    r = as(repo, "developer", "triage", "BUG-001", "--reject", "wontfix", "--note", "x");
    expect(r.returncode).not.toBe(0);
    expect(r.stderr).toContain("for the pm role");
    expect(item(repo, "BUG-001")).toContain("status: triaged");
    r = as(repo, "pm", "move", "BUG-001", "done");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-001")).toContain("status: done");
    r = as(repo, "pm", "triage", "BUG-002", "--reject", "wontfix", "--note", "x");
    expect(r.returncode, r.stderr).toBe(0);
    expect(item(repo, "BUG-002")).toContain("status: wontfix");
    const gates = JSON.parse(tr(repo, "policy", "show", "--json").stdout).policy.role_gates;
    expect(gates).toMatchObject({ "item.done": "pm", "item.wontfix": "pm", "item.duplicate": "pm" });
  });
});
