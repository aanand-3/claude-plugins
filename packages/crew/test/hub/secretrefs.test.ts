/** `touchesSecret` (P-063, BUG-042): the guard's Bash secrets check refuses real access to a secrets file, not prose that
 * mentions one. */
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { globRe } from "../../src/hub/core/memory/knowledge.js";
import { parse } from "../../src/hub/commands/team/hubcall.js";
import { touchesSecret } from "../../src/hub/commands/team/secretrefs.js";

const GLOBS = [".env", "**/.env", "**/*.pem", "**/*.key"]; // the built-in secrets.files
let dir: string;
const touches = (cmd: string) => touchesSecret(cmd, dir, GLOBS,
  (p) => GLOBS.some((g) => globRe(g).test(relative(dir, resolve(dir, p)))));

beforeAll(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), "secretrefs-")));
  writeFileSync(join(dir, ".env"), "X=1\n");
  mkdirSync(join(dir, "certs"));
  writeFileSync(join(dir, "certs", "a.pem"), "x\n");
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "docs", "a.md"), "x\n");
});

describe("input redirections", () => {
  it("parse() records < and <> targets, not <&, heredocs, here-strings or process substitution", () => {
    const inputs = (cmd: string) => parse(cmd).flatMap((c) => c.inputs.map((w) => w.value));
    expect(inputs("sort < a.txt")).toEqual(["a.txt"]);
    expect(inputs("cat <> 'b c.txt' > out")).toEqual(["b c.txt"]);
    expect(inputs("< only.txt")).toEqual(["only.txt"]);
    expect(inputs("cat <&3 <<EOF\nx\nEOF\ncat <<< hi; diff <(ls) x")).toEqual([]);
  });
});

describe("allowed: a mention is no access", () => {
  const allowed: Record<string, string> = {
    "AC1 heredoc prose into a drafts file": "cat > .crew/drafts/x.md <<'EOF'\nNever commit the .env file or certs/a.pem.\nEOF",
    "AC1 heredoc with tee": "tee docs/b.md <<EOF\nthe .env file\nEOF",
    "AC2 heredoc writing a script": "cat > .crew/drafts/s.py <<'EOF'\nimport sys\nSKIP = ['.env', 'a.pem']\nprint(open(sys.argv[1]).read())\nEOF",
    "AC2 running the script on a non-secrets file": "python3 .crew/drafts/s.py docs/a.md",
    "AC3 hub call prose": 'node .crew/bin/crew.mjs new-item bug "the guard refuses prose naming .env files" --why "see .env"',
    "AC3 echo": 'echo "do not read .env here" > docs/b.md',
    "AC3 printf": "printf '%s\\n' 'the .env file stays local'",
    "AC3 git commit -m": 'git commit -m "guard: allow prose naming .env"',
    "AC3 git commit --message=": 'git commit --message="allow .env prose"',
    "AC3 git tag -m": 'git tag -a v1 -m "no .env access"',
    "AC3 grep pattern": 'grep -n "reads the .env file" docs/a.md',
    "AC3 rg pattern": "rg 'certs/a.pem is secret' docs",
    "unquoted heredoc, plain prose": "cat > docs/x.md <<EOF\nkeep .env out of git; it costs $5\nEOF",
    "quoted heredoc with a substitution as text": "cat > docs/x.md <<'EOF'\nnever run $(cat .env)\nEOF",
  };
  for (const [name, cmd] of Object.entries(allowed)) it(name, () => expect(touches(cmd), cmd).toBe(false));
});

describe("refused: real access", () => {
  const refused: Record<string, string> = {
    "cat": "cat .env",
    "head": "head -n 3 .env",
    "grep PATTERN FILE": "grep KEY .env",
    "cp FILE x": "cp .env /tmp/x",
    "source FILE": "source .env",
    ". FILE": ". .env",
    "./-prefixed": "cat ./.env",
    "quoted": 'cat ".env"',
    "absolute": "cat /srv/app/.env",
    "nested": "cat certs/a.pem",
    "output redirect >": "echo hi > .env",
    "output redirect >>": "echo hi >> certs/a.pem",
    "input redirect <": "sort < .env",
    "option value": "docker run --env-file=.env img",
    "@FILE": "curl -d @.env http://localhost",
    "variable assignment": "F=.env; cat $F",
    "for list": "for f in .env; do wc -l $f; done",
    "glob that matches": "cat .en*",
    "unlistable glob": "cat */*.pem",
    "$(cat FILE)": 'echo "$(cat .env)"',
    "sh -c": 'sh -c "cat .env"',
    "eval": 'eval "cat .env"',
    "python3 -c": "python3 -c \"print(open('.env').read())\"",
    "node -e": "node -e \"require('fs').readFileSync('.env')\"",
    "stdin script": "python3 - <<'EOF'\nprint(open('.env').read())\nEOF",
    "heredoc fed to a shell": "sh <<'EOF'\ncat .env\nEOF",
    "heredoc fed to an interpreter": "node <<'EOF'\nrequire('fs').readFileSync('.env')\nEOF",
    "heredoc piped into sh": "cat <<EOF | sh\ncat .env\nEOF",
    "heredoc piped into xargs": "cat <<EOF | xargs cat\n.env\nEOF",
    "heredoc read in a loop": 'while read f; do cat "$f"; done <<EOF\n.env\nEOF',
    "hub --run": 'node .crew/bin/crew.mjs checkpoint P-1 --step T1 --run "cat .env"',
    "unquoted heredoc $(cat FILE)": "cat > docs/x.md <<EOF\n$(cat .env)\nEOF",
    "unquoted heredoc backticks": "cat > docs/x.md <<EOF\n`cat .env`\nEOF",
    "unquoted heredoc $(<FILE)": "cat > docs/x.md <<EOF\n$(<.env)\nEOF",
    "unquoted heredoc ${X:-$(cat FILE)}": "cat > docs/x.md <<EOF\n${X:-$(cat .env)}\nEOF",
    "unquoted heredoc, apostrophe before $(…)": "cat > docs/x.md <<EOF\nit's here: $(cat .env)\nEOF",
    "unquoted heredoc, apostrophe on an earlier line": "cat > docs/x.md <<EOF\nit's here\n$(cat .env)\nEOF",
    "unquoted heredoc, apostrophe and ;": "cat > docs/x.md <<EOF\ndon't; $(cat .env)\nEOF",
    "unquoted heredoc, # before $(…)": "cat > docs/x.md <<EOF\nsee #1 $(cat .env)\nEOF",
    "env -S wrapper": 'env -S "cat .env" echo',
  };
  for (const [name, cmd] of Object.entries(refused)) it(name, () => expect(touches(cmd), cmd).toBe(true));
});
