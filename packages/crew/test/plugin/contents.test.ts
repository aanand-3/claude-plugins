/** Static checks on the plugin: manifests, skills, packs, templates. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { parse as parseToml } from "smol-toml";
import { expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { PLUGIN, ROOT, SKILLS } from "../helpers/repo.js";

const PACKS = join(SKILLS, "guidelines", "stacks");
const read = (p: string) => readFileSync(p, "utf8");
/** Every file under a directory, at any depth. */
const walk = (dir: string): string[] => readdirSync(dir, { recursive: true, encoding: "utf8" })
  .map((f) => join(dir, f)).filter((f) => statSync(f).isFile());

function frontmatter(text: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  expect(m, "missing frontmatter").toBeTruthy();
  return Object.fromEntries(m![1].split("\n").filter((l) => l.includes(":")).map((l) => {
    const i = l.indexOf(":");
    return [l.slice(0, i), l.slice(i + 1)];
  }));
}

it("manifest names crew", () => {
  expect(JSON.parse(read(join(PLUGIN, ".claude-plugin", "plugin.json"))).name).toBe("crew");
});

it("every skill has a name and a description", () => {
  const skills = readdirSync(SKILLS).map((d) => join(SKILLS, d, "SKILL.md")).filter((f) => { try { return statSync(f).isFile(); } catch { return false; } });
  expect(skills.length).toBeGreaterThanOrEqual(8);
  for (const s of skills) {
    const fm = frontmatter(read(s));
    expect(fm.name.trim()).toBe(basename(dirname(s)));
    expect(fm.description.trim().length).toBeGreaterThan(50);
  }
});

it("packs have the required fields and resolvable requires", () => {
  const packs = readdirSync(PACKS).filter((f) => f.endsWith(".md"));
  const names = new Set(packs.map((f) => f.slice(0, -3)));
  const mapping = read(join(SKILLS, "discover", "references", "questions.md"));
  for (const f of packs) {
    const stem = f.slice(0, -3), fm = frontmatter(read(join(PACKS, f)));
    expect(fm.pack.trim()).toBe(stem);
    expect(["any", "backend", "frontend"], stem).toContain(fm.scope.trim());
    for (const dep of fm.requires.match(/[\w-]+/g) ?? []) expect(names.has(dep), `${stem} requires unknown ${dep}`).toBe(true);
    expect(mapping, `${stem} missing from discover pack mapping`).toContain(`\`${stem}\``);
  }
});

it("json templates parse", () => {
  for (const f of walk(SKILLS).filter((p) => p.endsWith(".json"))) expect(() => JSON.parse(read(f)), f).not.toThrow();
});

it("the settings template wires the hooks", () => {
  const s = JSON.parse(read(join(SKILLS, "guidelines", "templates", "settings.json")));
  const sessionStart = s.hooks.SessionStart[0].hooks.map((h: { command: string }) => h.command).join("\n") as string;
  expect(s.plansDirectory).toBe(".crew/drafts");
  expect(sessionStart).toContain("core.hooksPath .githooks");
  expect(s.hooks.PostToolUse[0].hooks[0].command).toContain("format_on_edit.mjs");
  const planHook = s.hooks.PostToolUse.find((h: { matcher: string }) => h.matcher === "ExitPlanMode");
  expect(planHook.hooks[0].command).toContain("track_plan_draft.mjs");
  expect(sessionStart).toContain("track_plan_draft.mjs\" --session");
  const activity = s.hooks.PostToolUse.at(-1);
  expect(activity.matcher).toBe("*");
  expect(activity.hooks[0].command).toBe("cd \"$CLAUDE_PROJECT_DIR\" 2>/dev/null || exit 0; [ -f .crew/bin/crew.mjs ] && "
    + "node .crew/bin/crew.mjs activity --hook >/dev/null 2>&1; exit 0");
  expect(s.hooks.PostToolUse.findIndex((h: { hooks: { command: string }[] }) => h.hooks[0].command.includes("activity --hook")))
    .toBe(s.hooks.PostToolUse.length - 1); // after format_on_edit and the plan hook
});

it("the developer checkpoints when it starts a task, and the command reference lists the live commands", () => {
  expect(read(join(SKILLS, "hub", "agents", "developer.md"))).toMatch(/checkpoint P-### --step T<n> --note "starting: /);
  const commands = read(join(SKILLS, "hub", "references", "commands.md"));
  expect(commands).toContain("| `watch` |");
  expect(commands).toContain("| `activity` |");
  expect(commands).toContain("watch [--ref ID] [--limit 20]");
  expect(commands).toContain("activity --hook");
});

it("yaml and toml templates parse", () => {
  const workflows = join(ROOT, ".github", "workflows");
  let ci: string[] = [];
  try { ci = readdirSync(workflows).filter((f) => f.endsWith(".yml")).map((f) => join(workflows, f)); } catch { /* no CI yet */ }
  for (const f of [...walk(SKILLS).filter((p) => /\.ya?ml$/.test(p)), ...ci]) {
    if (basename(f) === "config.yaml") continue; // the discover template contains <placeholders>
    expect(parseYaml(read(f)), f).not.toBeNull();
  }
  for (const f of walk(SKILLS).filter((p) => p.endsWith(".toml"))) expect(() => parseToml(read(f)), f).not.toThrow();
});

it("the plugin ships no Python scripts (the skill scripts are built from packages/crew)", () => {
  expect(walk(PLUGIN).filter((f) => f.endsWith(".py")).map((f) => relative(PLUGIN, f))).toEqual([]);
});

it("templates have no module blocks", () => {
  // Nothing is optional: templates are copied as-is, so no module switch (a mustache-style block) is left in them.
  for (const f of walk(SKILLS)) {
    if ([".py", ".mjs", ".json", ".gif", ".png"].some((x) => f.endsWith(x)) || f.split("/").includes("dist")) continue;
    expect(/\{\{[#^/]\w+\}\}/.test(readFileSync(f, "latin1")), f).toBe(false);
  }
  expect(read(join(SKILLS, "guidelines", "templates", "CLAUDE.project.md"))).toContain("**Code map:**");
});
