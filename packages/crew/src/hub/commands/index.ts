/** Every command's registration, in help order: cli.ts builds COMMANDS and the help text from these, mcp.ts builds TOOLS.
 * Adding a command: a new command in an existing module goes in that module and its `.reg.ts`; a new module adds its
 * `<module>.reg.ts` beside it and one import and one line here. A command or tool name registered twice fails at load. */
import { registration as work_planning } from "./work/planning.reg.js";
import { registration as work_migrate } from "./work/migrate.reg.js";
import { registration as work_backlog } from "./work/backlog.reg.js";
import { registration as work_workflow } from "./work/workflow.reg.js";
import { registration as team_policy } from "./team/policy.reg.js";
import { registration as team_activity } from "./team/activity.reg.js";
import { registration as team_autonomy } from "./team/autonomy.reg.js";
import { registration as memory_ledger } from "./memory/ledger.reg.js";
import { registration as memory_knowledge } from "./memory/knowledge.reg.js";
import { registration as work_execution } from "./work/execution.reg.js";
import { registration as work_review } from "./work/review.reg.js";
import { registration as work_release } from "./work/release.reg.js";
import { registration as work_suite } from "./work/suite.reg.js";
import { registration as work_land } from "./work/land.reg.js";
import { registration as memory_context } from "./memory/context.reg.js";
import { registration as views_advisor } from "./views/advisor.reg.js";
import { registration as team_guard } from "./team/guard.reg.js";
import { registration as team_team } from "./team/team.reg.js";
import { registration as team_dispatch } from "./team/dispatch.reg.js";
import { registration as team_liveness } from "./team/liveness.reg.js";
import { registration as team_agents } from "./team/agents.reg.js";
import { registration as team_questions } from "./team/questions.reg.js";
import { registration as views_export } from "./views/export.reg.js";
import { registration as views_ui } from "./views/ui.reg.js";
import { registration as views_design } from "./views/design.reg.js";
import { registration as views_checks } from "./views/checks.reg.js";
import { registration as views_doctor } from "./views/doctor.reg.js";
import { registration as views_reports } from "./views/reports.reg.js";
import { registration as views_graph } from "./views/graph.reg.js";
import { load, type Registration } from "../registry.js";

export const REGISTRATIONS: [file: string, registration: Registration][] = [
  ["work/planning.reg.ts", work_planning],
  ["work/migrate.reg.ts", work_migrate],
  ["work/backlog.reg.ts", work_backlog],
  ["work/workflow.reg.ts", work_workflow],
  ["team/policy.reg.ts", team_policy],
  ["team/activity.reg.ts", team_activity],
  ["team/autonomy.reg.ts", team_autonomy],
  ["memory/ledger.reg.ts", memory_ledger],
  ["memory/knowledge.reg.ts", memory_knowledge],
  ["work/execution.reg.ts", work_execution],
  ["work/review.reg.ts", work_review],
  ["work/release.reg.ts", work_release],
  ["work/suite.reg.ts", work_suite],
  ["work/land.reg.ts", work_land],
  ["memory/context.reg.ts", memory_context],
  ["views/advisor.reg.ts", views_advisor],
  ["team/guard.reg.ts", team_guard],
  ["team/team.reg.ts", team_team],
  ["team/dispatch.reg.ts", team_dispatch],
  ["team/liveness.reg.ts", team_liveness],
  ["team/agents.reg.ts", team_agents],
  ["team/questions.reg.ts", team_questions],
  ["views/export.reg.ts", views_export],
  ["views/ui.reg.ts", views_ui],
  ["views/design.reg.ts", views_design],
  ["views/checks.reg.ts", views_checks],
  ["views/doctor.reg.ts", views_doctor],
  ["views/reports.reg.ts", views_reports],
  ["views/graph.reg.ts", views_graph],
];

export const REGISTRY = load(REGISTRATIONS);

/** Register one more module's commands into the loaded registry (the CLI, its help text and the MCP tools see them at
 * once); returns a function that removes them again. */
export function register(file: string, registration: Registration): () => void {
  load([[file, registration]], REGISTRY);
  return () => {
    for (const kind of ["cli", "tools"] as const) {
      for (const name of Object.keys(registration[kind] ?? {})) {
        delete REGISTRY[kind][name];
        delete REGISTRY.from[kind][name];
      }
    }
    for (const line of registration.usage ?? []) REGISTRY.usage.splice(REGISTRY.usage.lastIndexOf(line), 1);
  };
}
