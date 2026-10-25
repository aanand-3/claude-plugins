/** The guard, end to end, on what Bash commands write (P-051): paths.write binds Bash targets (BUG-033), inline scripts are
 * refused for roles with paths.write (BUG-021), variables resolve anywhere in a target or are refused (BUG-011, BUG-013),
 * and no subagent runs `crew.mjs init` (BUG-002). pm and qa write `.crew/drafts/**` only (`preset: lifecycle`). */
import { mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { Repo } from "../../helpers/repo.js";
import { init } from "./helpers.js";
import { agent, bash, hook } from "./sections.js";

let repo: Repo;
beforeEach(() => {
  repo = Repo.create();
  init(repo, { commit: true, mode: "" });
  repo.write(".crew/policy.yaml", "mode: ai-native\npreset: lifecycle\n");
  for (const [name, role] of [["crew-pm", "pm"], ["crew-qa", "qa"], ["crew-developer", "developer"]]) agent(repo, name, role);
});

const DRAFTS = "may only write .crew/drafts/** (paths.write)";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = (who: string, cmd: string, cwd?: string): any => hook(repo, { ...bash(who, cmd), ...(cwd ? { cwd } : {}) });
const denied = (who: string, cmd: string, ...why: string[]) => {
  const out = run(who, cmd);
  expect(out?.permissionDecision, `${who}: ${cmd}`).toBe("deny");
  for (const w of why) expect(out.permissionDecisionReason, `${who}: ${cmd}`).toContain(w);
};
const allowed = (who: string, cmd: string, cwd?: string) => {
  const out = run(who, cmd, cwd);
  expect(out?.permissionDecision, `${who}: ${cmd} → ${out?.permissionDecisionReason}`).toBeUndefined();
  return out;
};
const PY_ITEM = "python3 - <<'PY'\nopen('.crew/items/x.md','w').write('x')\nPY";

it("paths.write binds Bash writes (BUG-033)", () => {
  const worktree = join(realpathSync(repo.path), ".claude", "worktrees", "P-001-x");
  repo.git("worktree", "add", "-q", worktree, "-b", "plan/P-001-x");
  for (const cmd of ["echo x > .crew/items/BUG-999-x.md", "cat > .crew/items/BUG-999-x.md <<'EOF'\nx\nEOF",
    "echo x | tee .crew/items/BUG-999-x.md", "cp .crew/drafts/x.md .crew/items/BUG-999-x.md",
    "sed -i '' 's/a/b/' .crew/items/BUG-999-x.md", "echo x > docs/notes.md"]) denied("crew-pm", cmd, DRAFTS);
  const out = run("crew-pm", "echo x > src/a.ts", worktree);
  expect(out?.permissionDecision).toBe("deny");
  expect(out.permissionDecisionReason).toContain(DRAFTS);
  allowed("crew-pm", "echo x > .crew/drafts/a.md");
  allowed("crew-pm", "echo x > .crew/drafts/a.md", worktree);
  for (const cmd of ["ls 2>/dev/null", "node x.js > /dev/null 2>&1", "echo x > /tmp/a.txt", `echo x > ${join(tmpdir(), "a.txt")}`,
    "git checkout -- docs/a.md"]) allowed("crew-pm", cmd);
  expect(allowed("crew-pm", "node .crew/bin/crew.mjs next 2>/dev/null").updatedInput.command)
    .toBe("node .crew/bin/crew.mjs --as pm --run-id pm:a1 next 2>/dev/null");
  allowed("crew-developer", "echo x > docs/notes.md");
  const write = hook(repo, { tool_name: "Write", agent_type: "crew-pm", agent_id: "a1", tool_input: { file_path: join(tmpdir(), "a.txt") } });
  expect(write?.permissionDecisionReason).toContain(DRAFTS); // the Edit/Write path is unchanged
});

it("inline scripts are refused for roles with paths.write (BUG-021)", () => {
  for (const who of ["crew-pm", "crew-qa"]) {
    for (const cmd of [PY_ITEM, "python3 - <<'PY'\nopen('.crew/policy.yaml','w').write('x')\nPY", 'python3 -c "print(1)"',
      "node -e \"require('fs').writeFileSync('.crew/items/x.md','x')\"", "node -p 1", "perl -pi -e 's/a/b/' docs/a.md",
      "ruby -e 'File.write(\"x\",\"y\")'", "cat s.py | python3", 'python3 <<< "print(1)"', "bash -c 'echo x > .crew/items/x.md'",
      "sh <<'EOF'\necho x\nEOF", 'eval "echo x > a"', "timeout 5 node -e 1"]) denied(who, cmd, "inline", "(paths.write)");
    for (const cmd of ["node script.js", "python3 -m json.tool .crew/drafts/a.json", "node --version", "python3 --version",
      "bash .crew/drafts/x.sh"]) allowed(who, cmd);
  }
  allowed("crew-developer", "node -e 1");
  allowed("crew-developer", PY_ITEM);
});

it("mid-path variables are expanded or refused (BUG-011)", () => {
  for (const cmd of ["X=policy.yaml; echo x > .crew/$X", "X=policy.yaml; echo x > .crew/${X}",
    "for f in policy.yaml; do echo x > .crew/$f; done", "X=policy.yaml; cp evil .crew/$X"]) denied("crew-developer", cmd, "protected");
  for (const cmd of ["X=../Users/aanand; echo hi > /tmp/$X/x", "X=../../../..; echo hi > docs/$X/x",
    "for f in ../../../../x; do echo hi > docs/$f; done"]) denied("crew-developer", cmd, "outside the repository");
  denied("crew-developer", "echo hi > docs/$CREW_TEST_UNSET/x", "can't resolve");
  allowed("crew-developer", "for f in a b; do echo hi > docs/$f.md; done");
  allowed("crew-developer", "X=a; echo hi > docs/$X.md");
  denied("crew-pm", "X=items; echo x > .crew/$X/a.md", DRAFTS);
  allowed("crew-pm", "X=drafts; echo x > .crew/$X/a.md");
});

it("mktemp and for-loop targets resolve per value (BUG-013)", () => {
  mkdirSync(join(repo.path, "src"));
  repo.write("src/a.ts", "a\n");
  repo.write("src/b.ts", "b\n");
  for (const cmd of ['tmp=$(mktemp -d) && echo x > "$tmp/a"', 'echo x > "$(mktemp)"', 'tmp=$(mktemp -d); cp README.md "$tmp/"',
    'for f in a b; do touch "$f"; done', "for f in src/*.ts; do sed -i '' s/a/b/ \"$f\"; done"]) allowed("crew-developer", cmd);
  denied("crew-developer", 'for f in .crew/bin/*; do echo x > "$f"; done', "protected");
  denied("crew-developer", 'for f in a.md .crew/policy.yaml; do echo x > "$f"; done', "protected");
  denied("crew-developer", 'for f in $(ls); do touch "$f"; done', "can't resolve");
  denied("crew-developer", 'tmp=$(mktemp -d .crew/bin/x.XXXX); echo x > "$tmp/a"', "can't resolve");
  allowed("crew-pm", 'tmp=$(mktemp -d) && echo x > "$tmp/a"');
});

it("subagents can't run crew.mjs init (BUG-002)", () => {
  for (const who of ["crew-pm", "crew-developer", "Explore"]) {
    for (const cmd of ["node .crew/bin/crew.mjs init", "node plugins/crew/skills/hub/dist/crew.mjs init",
      "node ~/.claude/plugins/cache/x/crew/skills/hub/dist/crew.mjs init"]) denied(who, cmd, "init");
  }
  expect(allowed("crew-developer", "node .crew/bin/crew.mjs next").updatedInput.command)
    .toBe("node .crew/bin/crew.mjs --as developer --run-id developer:a1 next");
  expect(hook(repo, bash(null, "node .crew/bin/crew.mjs init"))).toBeNull(); // the main session is the human's own
});

it("heredoc bodies and quoted text are not write targets", () => {
  expect(run("crew-developer", "cat > /tmp/x.ts <<'EOF'\nconst f = (a) => a > b;\necho > ~/x\nEOF")).toBeNull();
  expect(allowed("crew-developer", 'node .crew/bin/crew.mjs log P-001 "wrote > ~/x"').updatedInput.command)
    .toBe('node .crew/bin/crew.mjs --as developer --run-id developer:a1 log P-001 "wrote > ~/x"');
});
