/** `migrate`: turn a project-kit `.project/` directory into `.crew/` in one staged step (nothing is written if it refuses).
 * Epics become goals (EP- → G-); points, milestones and sprints are dropped from documents; milestone exit criteria join
 * their goals' acceptance criteria; RAID rows become knowledge entries (open issues become CHORE items); the rest is archived. */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Doc } from "../core/doc.js";
import * as git from "../core/git.js";
import type { Store } from "../core/store.js";
import { fail, mdTable, slugify, today } from "../core/text.js";
import { createItem } from "./backlog.js";
import { init } from "./planning.js";

const DROPPED = /^(bin|templates|view)\/|^(ROADMAP|BACKLOG|STATUS|README)\.md$/;
const ARCHIVED = /^(milestones|sprints|releases)\/|^(project-plan|raid)\.md$/;
const DOCS: Record<string, string> = { epics: "goals", items: "items", plans: "plans" };
const RAID_TYPES: [string, string][] = [["Decisions", "decision"], ["Assumptions", "decision"], ["Risks", "risk"]];
/** Root files that usually mention the old paths; `/crew:guidelines --refresh` and git-setup re-render them. */
const OLD_REFS = ["CLAUDE.md", ".claude/settings.json", ".gitignore", ".gitattributes", ".githooks/pre-commit",
  ".githooks/commit-msg", ".github/pull_request_template.md", ".github/workflows/ci.yml"];

function walk(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory()
    ? walk(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]);
}

/** Text that is valid in the new layout: IDs, paths and tool names. */
function renamed(text: string): string {
  return text.replace(/\bEP-(\d+)/g, "G-$1").replace(/\.project\//g, ".crew/").replace(/\btracker\.mjs\b/g, "crew.mjs")
    .replace(/project-kit:tracker/g, "crew:hub");
}

/** Front matter of the lean model: `epic:` → `goal:`, no points or milestone, plans gain `touches:`. */
function leanDoc(text: string, kind: string): string {
  let t = renamed(text).replace(/^epic:/m, "goal:").replace(/^(points|milestone):.*\n/gm, "");
  if (kind === "plans" && !/^touches:/m.test(t)) t = t.replace(/^(depends_on:.*)$/m, "$1\ntouches:");
  return t;
}

export function migrate(store: Store): void {
  const root = store.ws.root, old = join(root, ".project");
  if (!existsSync(old) || !statSync(old).isDirectory()) fail("No .project/ directory to migrate.");
  if (existsSync(store.dir)) fail(`${store.rel(store.dir)}/ already exists — move it aside first; nothing was changed.`);
  const files = walk(old);
  const read = (rel: string) => store.ws.read(join(old, rel)) ?? "";
  const exitCriteria = milestoneCriteria(files.filter((f) => f.startsWith("milestones/")).map(read));
  let counts = { docs: 0, archived: 0, knowledge: 0, issues: 0, drafted: 0 };

  for (const rel of files) {
    if (DROPPED.test(rel) || rel.endsWith(".gitkeep")) continue;
    const [dir, name] = [rel.split("/")[0], rel.split("/").pop()!];
    if (ARCHIVED.test(rel)) {
      store.ws.write(join(store.dir, "archive", rel), renamed(read(rel)));
      counts.archived++;
    } else if (DOCS[dir] && name.endsWith(".md")) {
      const doc = Doc.parse(leanDoc(read(rel), dir));
      if (dir === "epics") addExitCriteria(doc, Doc.parse(read(rel)).get("milestone"), exitCriteria);
      if (dir === "plans" && doc.get("status") === "ready" && !doc.touches().length) {
        doc.set("status", "draft"); // the Definition of Ready now asks for touches:
        doc.appendLog("status ready → draft — migrated to crew: declare `touches:` before moving it back to ready");
        counts.drafted++;
      }
      store.ws.write(join(store.dir, DOCS[dir], name.replace(/^EP-/, "G-")), `${doc.text.trimEnd()}\n`);
      counts.docs++;
    } else if (rel === "config.yaml") {
      store.ws.write(join(store.dir, rel), renamed(read(rel)).replace(/^(\s+)tracker:/m, "$1hub:"));
    } else {
      store.ws.write(join(store.dir, rel), renamed(read(rel)));
    }
  }
  if (files.includes("project-plan.md")) {
    const config = join(store.dir, "config.yaml");
    store.ws.write(config, hubSettings(store.ws.read(config) ?? "", read("project-plan.md")));
  }
  store.ws.remove(old);
  if (files.includes("raid.md")) counts = { ...counts, ...raid(store, read("raid.md")) };
  init(store);
  store.say(`Migrated .project/ → .crew/: ${counts.docs} goals/items/plans, ${counts.knowledge} knowledge entries from RAID, `
    + `${counts.issues} open issues → CHORE items, ${counts.archived} files archived in .crew/archive/.`);
  if (counts.drafted) store.say(`note: ${counts.drafted} ready plan(s) went back to draft until they declare touches:`);
  if (files.includes("project-plan.md")) {
    store.say("next: write the idea (`new-idea TITLE --from DRAFT`) from .crew/archive/project-plan.md (objectives, success measures)");
  }
  const branches = git.planBranches().filter((b) => !b.startsWith("origin/"));
  if (branches.length) {
    store.say(`note: plan branches still hold .project/ (${branches.join(", ")}) — finish them on the old layout, or merge this commit `
      + "into each and run `crew.mjs migrate` there too; until then their live status is not visible from main");
  }
  const stale = OLD_REFS.filter((f) => /\.project\/|tracker\.mjs/.test(store.ws.read(join(root, f)) ?? ""));
  if (stale.length) {
    store.say(`next: these still mention .project/ or tracker.mjs — re-render them (/crew:guidelines --refresh, /crew:git-setup): ${stale.join(", ")}`);
  }
}

/** Milestone ID → its unmet exit criteria; taken (emptied) by the first goal of that milestone so they land once. */
function milestoneCriteria(texts: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const text of texts) {
    const m = Doc.parse(text);
    if (m.id) out.set(m.id.toUpperCase(), m.checklist("Exit criteria").filter(([done]) => !done).map(([, c]) => c));
  }
  return out;
}

function addExitCriteria(goal: Doc, milestone: string | null, criteria: Map<string, string[]>): void {
  const mid = (milestone ?? "").toUpperCase();
  for (const c of criteria.get(mid) ?? []) goal.appendTo("Acceptance criteria", `- [ ] ${c} (from ${mid} exit criteria)`);
  criteria.delete(mid);
}

/** Carry the WIP limit from project-plan.md into config.yaml's `hub:` block (the other settings are gone). */
function hubSettings(config: string, projectPlan: string | null): string {
  const wip = projectPlan ? Doc.parse(projectPlan).get("wip_limit") : null;
  if (!wip || /^hub:/m.test(config)) return config;
  return `${config.trimEnd()}${config.trim() ? "\n\n" : ""}hub:                    # crew hub settings\n  wip_limit: ${wip}\n`;
}

/** RAID rows → knowledge entries (decisions, assumptions, risks); open issues → CHORE items. */
function raid(store: Store, text: string): { knowledge: number; issues: number } {
  const doc = Doc.parse(renamed(text));
  let knowledge = 0, issues = 0;
  for (const [section, type] of RAID_TYPES) {
    for (const row of mdTable(doc.section(section))) {
      const title = row.decision || row.assumption || row.risk || Object.values(row).find((v) => v && !/^[A-Z]+-?\d+$/.test(v)) || "";
      if (!title) continue;
      const fields = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
      const id = uniqueId(store, `K-${today()}-${slugify(title).slice(0, 40)}`);
      store.ws.write(join(store.dir, "knowledge", `${id}.md`), `---\nid: ${id}\ntype: ${type}\ntitle: ${title}\nscope:\n`
        + `source: raid.md (${section.toLowerCase()}, migrated)\nsupersedes:\ntier: project\ncreated: ${today()}\n---\n\n`
        + `# ${title}\n\n${section === "Assumptions" ? "Assumption, not yet confirmed.\n\n" : ""}${fields}\n`);
      knowledge++;
    }
  }
  for (const row of mdTable(doc.section("Issues"))) {
    if (["closed", "resolved", "done"].includes((row.status ?? "").toLowerCase())) continue;
    const title = row.issue || Object.values(row).find(Boolean) || "";
    if (!title) continue;
    const details = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
    createItem(store, "CHORE", title.slice(0, 80), `## Summary\n${title}\n\nFrom the RAID log (migrated):\n${details}\n`, {});
    issues++;
  }
  return { knowledge, issues };
}

function uniqueId(store: Store, base: string): string {
  let id = base, n = 2;
  while (store.ws.isFile(join(store.dir, "knowledge", `${id}.md`))) id = `${base}-${n++}`;
  return id;
}
