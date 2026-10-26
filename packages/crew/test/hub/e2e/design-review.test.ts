/** The designer role (P-021): UI plans from `design.ui_paths`, the `## Design` part of the Definition of Ready, the design
 * review (`review --design`) and its part of accepting a plan, and the designer's queue. */
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { isUiPlan } from "../../../src/hub/core/work/footprint.js";
import { Store } from "../../../src/hub/core/store.js";
import { init, newPlan, planFile, read, tr, write } from "./helpers.js";
import { mcpCall } from "./sections.js";
import { as, events, inReview, LIFECYCLE, lifecycle, ship } from "./team-helpers.js";

let repo: Repo;
beforeEach(() => { repo = Repo.create(); });

const UI_CONFIG = "design:\n  ui_paths: [ui/**]\n";

// ------------------------------------------------------------------ T1: the role, the gate, UI plans
it("isUiPlan: touches overlapping design.ui_paths; none without ui_paths (AC1)", () => {
  init(repo);
  for (const [title, touches] of [["Board", "ui/src/Board.tsx, src/api.ts"], ["Api", "src/api.ts, tests/**"], ["All", "**"]]) {
    const r = newPlan(repo, title, undefined, "--touches", touches);
    expect(r.returncode, r.stderr).toBe(0);
  }
  const ui = () => { const s = Store.open(repo.path); return [...s.plans().values()].map((p) => [p.id, isUiPlan(s, p)]); };
  expect(ui()).toEqual([["P-001", false], ["P-002", false], ["P-003", false]]); // no ui_paths: no UI plan
  repo.write(".crew/config.yaml", UI_CONFIG);
  expect(ui()).toEqual([["P-001", true], ["P-002", false], ["P-003", true]]);
  repo.write(".crew/config.yaml", "design:\n  ui_paths: ui/**\n"); // not a list: ignored
  expect(ui()).toEqual([["P-001", false], ["P-002", false], ["P-003", false]]);
});

it("the lifecycle preset gates plan.design-reviewed on the designer (AC1)", () => {
  init(repo, { mode: "" });
  repo.write(".crew/policy.yaml", LIFECYCLE);
  const r = tr(repo, "policy", "show");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout).toMatch(/plan\.design-reviewed\s+designer\s+\(preset lifecycle\)/);
  expect(tr(repo, "check").stdout).not.toContain("design-reviewed");
});

// ------------------------------------------------------------------ T2: ## Design in the Definition of Ready
const DESIGN = "The board: shell + Card list; states empty/loading; 375/900/1440 light and dark.\n";

it("a UI plan needs a ## Design section to be ready; a non-UI plan, or no ui_paths, doesn't (AC2)", () => {
  init(repo);
  repo.write(".crew/config.yaml", UI_CONFIG);
  expect(newPlan(repo, "Board", undefined, "--touches", "ui/src/Board.tsx, src/api.ts").returncode).toBe(0);
  expect(newPlan(repo, "Api", undefined, "--touches", "src/api.ts").returncode).toBe(0);
  let r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("empty section: Design (a UI plan: touches overlap design.ui_paths)");
  r = tr(repo, "move", "P-002", "ready");
  expect(r.returncode, r.stderr).toBe(0);
  repo.write(".crew/config.yaml", ""); // no ui_paths: no UI plan
  r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode, r.stderr).toBe(0);
  expect(tr(repo, "move", "P-001", "draft").returncode).toBe(0);
  repo.write(".crew/config.yaml", UI_CONFIG);
  const p = planFile(repo, "P-001");
  expect(read(p)).toMatch(/## Design\n\n## Tasks/); // the template's section, comment stripped
  write(p, read(p).replace("## Design\n", `## Design\n${DESIGN}`));
  r = tr(repo, "move", "P-001", "ready");
  expect(r.returncode, r.stderr).toBe(0);
});

// ------------------------------------------------------------------ T3: review --design and accepting a UI plan
/** A lifecycle project with ui_paths, and UI plan P-001 in review: implemented by run "dev", QA's evidence in, the code approved. */
function uiInReview(r: Repo): void {
  lifecycle(r);
  r.write(".crew/config.yaml", UI_CONFIG);
  r.commit("chore(hub): ui paths");
  expect(newPlan(r, "Board", undefined, "--touches", "ui/**, src/auth/**").returncode).toBe(0);
  const p = planFile(r, "P-001");
  write(p, read(p).replace("## Design\n", `## Design\n${DESIGN}`));
  expect(as(r, "architect", "move", "P-001", "ready").returncode).toBe(0);
  as(r, "pm", "assign", "P-001", "--to", "developer");
  r.commit("chore(hub): plan");
  r.env.CREW_RUN = "dev";
  expect(as(r, "developer", "start", "P-001").returncode).toBe(0);
  r.write("ui/board.tsx", "export const Board = () => null;\n");
  ship(r, "P-001");
  r.commit("feat(P-001): board");
  expect(as(r, "developer", "move", "P-001", "in-review").returncode).toBe(0);
  r.env.CREW_RUN = "qa";
  expect(as(r, "qa", "checkpoint", "P-001", "--run", "true", "--ac", "all").returncode).toBe(0);
  r.env.CREW_RUN = "arch";
  expect(as(r, "architect", "review", "P-001", "--approve").returncode).toBe(0);
}

const NO_DESIGN = "no design review yet: `review P-001 --design --approve` by the designer";

it("accepting a UI plan needs the designer's approval of the current code (AC3)", () => {
  uiInReview(repo);
  const d = tr(repo, "dispatch", "--json");
  expect(d.returncode, d.stderr).toBe(0);
  expect(JSON.stringify(JSON.parse(d.stdout))).toMatch(/"role":"designer"[^}]*design review P-001|design review P-001[^}]*"role":"designer"/);
  repo.env.CREW_RUN = "pm";
  let r = as(repo, "pm", "move", "P-001", "accepted");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain(NO_DESIGN);
  expect(r.stderr).not.toContain("no code review yet");
  repo.env.CREW_RUN = "des";
  r = as(repo, "designer", "review", "P-001", "--design", "--approve");
  expect(r.returncode, r.stderr).toBe(0);
  expect(r.stdout).toContain("P-001: design approved");
  repo.commit("chore(hub): reviewed");
  repo.write("ui/board.tsx", "export const Board = () => 1;\n");
  repo.commit("feat(P-001): after the reviews");
  repo.env.CREW_RUN = "pm";
  r = as(repo, "pm", "move", "P-001", "accepted");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("the code changed since the approving design review");
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  Object.assign(repo.env, { CREW_RUN: "des", CREW_ROLE: "designer" }); // over MCP this time
  const res = mcpCall(repo, "design_review", { id: "P-001", approve: true });
  expect(res.isError, JSON.stringify(res)).toBeFalsy();
  delete repo.env.CREW_ROLE;
  repo.env.CREW_RUN = "pm";
  r = as(repo, "pm", "move", "P-001", "accepted");
  expect(r.returncode, r.stderr).toBe(0);
  expect(events(repo, "--type", "review").map((e) => `${e.kind ?? "code"} ${e.verdict}`))
    .toEqual(["code approve", "design approve", "code approve", "design approve"]);
});

it("a non-UI plan never needs a design review, and can't get one (AC3)", () => {
  repo.write(".crew/config.yaml", UI_CONFIG); // written before init: kept
  inReview(repo); // touches src/auth/**
  repo.env.CREW_RUN = "des";
  const r = as(repo, "designer", "review", "P-001", "--design", "--approve");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("P-001 is not a UI plan");
  repo.env.CREW_RUN = "arch";
  expect(as(repo, "architect", "review", "P-001", "--approve").returncode).toBe(0);
  repo.env.CREW_RUN = "pm";
  const a = as(repo, "pm", "move", "P-001", "accepted");
  expect(a.returncode, a.stderr).toBe(0);
});

it("design verdicts: changes send the plan back; implementer, role and usage refusals; code review as before (AC4)", () => {
  uiInReview(repo);
  repo.env.CREW_RUN = "des";
  let r = as(repo, "designer", "review", "P-001", "--design");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("usage: review P-### --design --approve | --changes TXT");
  r = as(repo, "architect", "review", "P-001", "--design", "--approve");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("for the designer role");
  repo.env.CREW_RUN = "dev"; // the implementing run, even in the designer role
  r = as(repo, "designer", "review", "P-001", "--design", "--approve");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("implemented P-001");
  repo.env.CREW_RUN = "des";
  r = as(repo, "designer", "review", "P-001", "--design", "--changes", "style the Goal select");
  expect(r.returncode, r.stderr).toBe(0);
  const plan = read(planFile(repo, "P-001"));
  expect(plan).toContain("status: in-progress");
  expect(plan).toContain("design review: changes requested — style the Goal select");
  expect(events(repo, "--type", "review").at(-1)).toMatchObject({ kind: "design", verdict: "changes", text: "style the Goal select" });
  expect(events(repo, "--type", "claim").filter((e) => e.ref === "P-001").at(-1).run).toBe("dev"); // still the developer's
  repo.env.CREW_RUN = "dev";
  expect(as(repo, "developer", "move", "P-001", "in-review").returncode).toBe(0);
  repo.env.CREW_RUN = "pm";
  r = as(repo, "pm", "move", "P-001", "accepted");
  expect(r.returncode).not.toBe(0);
  expect(r.stderr).toContain("the last design review asked for changes: style the Goal select");
  expect(r.stderr).not.toContain("code review"); // the code approval still stands
});

// ------------------------------------------------------------------ T4: the designer's queue
it("next --role designer: UI plans awaiting its design review, then draft UI plans with no ## Design (AC1)", () => {
  uiInReview(repo); // P-001
  repo.env.CREW_RUN = "arch";
  for (const [title, touches] of [["Filters", "ui/src/Filters.tsx"], ["Api", "src/api.ts"], ["Rail", "ui/src/Rail.tsx"]]) {
    expect(newPlan(repo, title, undefined, "--touches", touches).returncode).toBe(0);
  }
  const p4 = planFile(repo, "P-004"); // a UI draft already shaped
  write(p4, read(p4).replace("## Design\n", `## Design\n${DESIGN}`));
  repo.env.CREW_RUN = "des";
  const lines = as(repo, "designer", "next").stdout.trim().split("\n");
  expect(lines.map((l) => l.replace(/:.*/, ""))).toEqual(["NEXT         design review P-001", "THEN         shape P-002"]);
  expect(lines[0]).toContain("review P-001 --design --approve");
  repo.env.CREW_RUN = "dev"; // never a plan its run implemented
  expect(as(repo, "designer", "next").stdout).not.toContain("P-001");
  repo.env.CREW_RUN = "des";
  expect(as(repo, "designer", "review", "P-001", "--design", "--approve").returncode).toBe(0);
  expect(as(repo, "designer", "next").stdout).not.toContain("P-001");
});
