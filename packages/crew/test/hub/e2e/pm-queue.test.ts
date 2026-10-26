/** The hub, end to end — the PM's queue shows the goal triage would suggest for each untriaged item (P-059, FEAT-051). */
import { beforeEach, describe, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { GOAL_DRAFT } from "./fixtures.js";
import { init, newBug, newGoal, newPlan, tr } from "./helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

/** A goal whose Breakdown creates no items, so the test numbers its own. */
const BARE_GOAL = GOAL_DRAFT.replace(/## Candidate plans[\s\S]*?## Notes/, "## Breakdown\n- ~~none yet~~\n\n## Notes");

describe("next --role pm", () => {
  it("appends triage's goal suggestion to untriaged items that have one, and nothing to the rest (AC1-AC4)", () => {
    init(repo, { commit: true });
    expect(newGoal(repo, "Accounts", BARE_GOAL).returncode).toBe(0);
    expect(newPlan(repo, "Signup endpoint", undefined, "--goal", "G-001").returncode).toBe(0);
    repo.commit("chore(hub): goal and plan");
    for (const args of [["From plan", "--origin", "P-001"], ["Hinted", "--goal", "G-001"], ["Plain"]]) {
      const r = tr(repo, "new-item", "feat", args[0], "--why", "y", ...args.slice(1));
      expect(r.returncode, r.stderr).toBe(0);
    }
    expect(newBug(repo, "Login 500", "--origin", "P-001").returncode).toBe(0);

    const r = tr(repo, "--as", "pm", "next", "--role", "pm");
    expect(r.returncode, r.stderr).toBe(0);
    const lines = r.stdout.split("\n");
    const line = (prefix: string) => lines.find((l) => l.includes(prefix)) ?? "";
    expect(line("triage FEAT-001:")).toMatch(/triage FEAT-001: From plan — suggested goal: G-001 \(origin P-001's goal\)$/);
    expect(line("triage FEAT-002:")).toMatch(/triage FEAT-002: Hinted — suggested goal: G-001 \(goal hint\)$/);
    expect(line("triage bug BUG-001:")).toMatch(/triage bug BUG-001: Login 500 — suggested goal: G-001 \(origin P-001's goal\)$/);
    expect(line("triage FEAT-003:")).toMatch(/triage FEAT-003: Plain$/);

    const suggestion = / — (suggested goal: .*)$/.exec(line("triage FEAT-002:"))![1];
    const t = tr(repo, "triage", "FEAT-002", "--priority", "P3");
    expect(t.returncode, t.stderr).toBe(0);
    expect(t.stdout).toContain(`${suggestion} — confirm with \`triage FEAT-002 --goal G-001\``);
  });
});
