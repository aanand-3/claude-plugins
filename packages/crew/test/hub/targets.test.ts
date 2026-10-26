/** `writeTargets` and `inlineScript` (P-051: BUG-033, BUG-021, BUG-011, BUG-013): what a Bash command writes, from source. */
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inlineScript, writeTargets } from "../../src/hub/commands/team/targets.js";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "targets-"));
  for (const f of ["src/a.ts", "src/b.ts", "src/c.md", "src/.hidden.ts", ".crew/bin/crew.mjs", ".crew/bin/mcp.mjs"]) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), "x");
  }
  process.env.CREW_TARGETS_TEST = "env-dir";
  delete process.env.CREW_TEST_UNSET;
});
afterAll(() => { delete process.env.CREW_TARGETS_TEST; });

const paths = (cmd: string) => writeTargets(cmd, dir).map((t) => t.path);
const TMP = join(realpathSync(tmpdir()), "mktemp.XXXXXX");

describe("writeTargets", () => {
  it("redirections and writing commands", () => {
    expect(paths("echo x > a.md")).toEqual(["a.md"]);
    expect(paths("ls >> a 2> b &> c >| d >& e 2>&1 >&- >&2 < in")).toEqual(["a", "b", "c", "d", "e"]);
    expect(paths("echo x | tee -a out.txt")).toEqual(["out.txt"]);
    expect(paths("cp a b dest/")).toEqual(["dest/"]);
    expect(paths("cp -t dest a b")).toEqual(["dest"]);
    expect(paths("ln -s /opt/node")).toEqual(["node"]);
    expect(paths("rm -rf x y")).toEqual(["x", "y"]);
    expect(paths("sed -i '' 's/a/b/' f.md")).toEqual(["f.md"]);
    expect(paths("sed -i -e s/a/b/ f.md g.md")).toEqual(["f.md", "g.md"]);
    expect(paths("sed 's/a/b/' f.md")).toEqual([]);
    expect(paths("cd docs && touch ./b.md")).toEqual(["docs/b.md"]);
    expect(paths("env X=1 rm a")).toEqual(["a"]);
  });

  it("git restores are marked", () => {
    expect(writeTargets("git checkout -- a.md; git rm b.md", dir)).toEqual([{ path: "a.md", restore: true }, { path: "b.md", restore: false }]);
    expect(writeTargets("git restore c.md", dir)).toEqual([{ path: "c.md", restore: true }]);
  });

  it("heredoc bodies and quoted text are not targets", () => {
    expect(paths("cat > /tmp/x.ts <<'EOF'\nconst f = (a) => a > b;\necho > ~/x\nEOF")).toEqual(["/tmp/x.ts"]);
    expect(paths('node .crew/bin/crew.mjs log P-001 "wrote > ~/x"')).toEqual([]);
    expect(paths("echo 'a > b' \"c > d\"")).toEqual([]);
  });

  it("variable targets are expanded anywhere, or left unresolved (BUG-011)", () => {
    expect(paths("X=policy.yaml; echo x > .crew/$X")).toEqual([".crew/policy.yaml"]);
    expect(paths("X=policy.yaml; echo x > .crew/${X}")).toEqual([".crew/policy.yaml"]);
    expect(paths("export X=a; echo x > \"docs/$X.md\"")).toEqual(["docs/a.md"]);
    expect(paths("X=../../../..; echo hi > docs/$X/x")).toEqual(["docs/../../../../x"]);
    expect(paths("echo x > /tmp/$CREW_TARGETS_TEST/x")).toEqual(["/tmp/env-dir/x"]);
    expect(paths("echo hi > docs/$CREW_TEST_UNSET/x")).toEqual(["docs/$CREW_TEST_UNSET/x"]);
    expect(paths("echo x > ${X:-a}")).toEqual(["${X:-a}"]);
    expect(paths("echo x > $1")).toEqual(["$1"]);
    expect(paths("echo x > $(pwd)/a")).toEqual(["$(pwd)/a"]);
    expect(paths("echo x > `pwd`/a")).toEqual(["`pwd`/a"]);
    expect(paths("read X; echo x > $X")).toEqual(["$X"]);
    expect(paths("echo x > '$X'")).toEqual(["$X"]); // single-quoted: literal, and so unresolved for the guard
    expect(paths("cd $CREW_TEST_UNSET && echo x > a.md")).toEqual(["$CREW_TEST_UNSET/a.md"]);
  });

  it("mktemp substitutions are temp paths (BUG-013)", () => {
    expect(paths('tmp=$(mktemp -d) && echo x > "$tmp/a"')).toEqual([`${TMP}/a`]);
    expect(paths('echo x > "$(mktemp)"')).toEqual([TMP]);
    expect(paths('t=$(mktemp -q -t pre); cp README.md "$t/"')).toEqual([`${TMP}/`]);
    expect(paths('tmp=$(mktemp -d .crew/bin/x.XXXX); echo x > "$tmp/a"')).toEqual(["$tmp/a"]);
    expect(paths('tmp=$(mktemp -p /x); echo x > "$tmp"')).toEqual(["$tmp"]);
  });

  it("for loops resolve per value, globs per match (BUG-013)", () => {
    expect(paths('for f in a b; do touch "$f"; done')).toEqual(["a", "b"]);
    expect(paths("for f in a b; do echo hi > docs/$f.md; done")).toEqual(["docs/a.md", "docs/b.md"]);
    expect(paths("for f in src/*.ts; do sed -i '' s/a/b/ \"$f\"; done")).toEqual(["src/a.ts", "src/b.ts"]);
    expect(paths('for f in .crew/bin/*; do echo x > "$f"; done')).toEqual([".crew/bin/crew.mjs", ".crew/bin/mcp.mjs"]);
    expect(paths('cd src && for f in *.md; do touch "$f"; done')).toEqual(["src/c.md"]);
    expect(paths('for f in src/*.none; do touch "$f"; done')).toEqual(["src/*.none"]); // no match: the word itself
    expect(paths('for f in "src/*.ts"; do touch "$f"; done')).toEqual(["src/*.ts"]); // quoted: no glob
    expect(paths('for f in */a.ts; do touch "$f"; done')).toEqual(["$f"]);
    expect(paths('for f in $(ls); do touch "$f"; done')).toEqual(["$f"]);
    expect(paths('for f; do touch "$f"; done')).toEqual(["$f"]);
    expect(paths(`for f in ${Array.from({ length: 70 }, (_, i) => `f${i}`).join(" ")}; do touch "$f"; done`)).toEqual(["$f"]);
  });
});

describe("inlineScript", () => {
  it("inline and stdin interpreter scripts are found", () => {
    for (const [cmd, head] of [
      ["python3 - <<'PY'\nopen('x','w').write('x')\nPY", "python3"], ['python3 -c "print(1)"', "python3"],
      ["python3.12 -Bc 1", "python3.12"], ["node -e 1", "node"], ["node -p 1", "node"], ["node --eval=1", "node"],
      ["bun -e 1", "bun"], ["deno eval 1", "deno"], ["perl -pi -e 's/a/b/' a", "perl"], ["perl -ne 1", "perl"],
      ["ruby -e 'File.write(1)'", "ruby"], ["php -r 1", "php"], ["cat s.py | python3", "python3"],
      ['python3 <<< "print(1)"', "python3"], ["node < x.js", "node"], ["timeout 5 node -e 1", "node"],
      ["env -u X FOO=1 nice -n 5 nohup python3 -c 1", "python3"], ["echo x | xargs -I {} node -e 1", "node"],
      ["ls; exec perl -e 1", "perl"],
    ]) expect(inlineScript(cmd), cmd).toBe(head);
  });

  it("inline shell scripts and eval are found", () => {
    for (const [cmd, head] of [["bash -c 'echo x > a'", "bash"], ["sh <<'EOF'\necho x\nEOF", "sh"], ["zsh -ec x", "zsh"],
      ["echo x | dash", "dash"], ["bash -s", "bash"], ['eval "echo x > a"', "eval"], ["if true; then eval x; fi", "eval"]]) {
      expect(inlineScript(cmd), cmd).toBe(head);
    }
  });

  it("script files, modules and version checks are no inline script", () => {
    for (const cmd of ["node script.js", "node script.js -e x", "python3 -m json.tool .crew/drafts/a.json", "node --version",
      "python3 --version", "python3 -V", "perl --version", "ruby -v x.rb", "bash .crew/drafts/x.sh", "sh x.sh -c",
      "node .crew/bin/crew.mjs next", "deno run x.ts", "php x.php", "echo python3 -c 1", "npm test", "timeout 5 node x.js"]) {
      expect(inlineScript(cmd), cmd).toBeNull();
    }
  });
});

describe("cd behind subshells, function heads and case arms (P-058, BUG-012)", () => {
  it("is tracked (AC4)", () => {
    for (const cmd of [
      "( ( cd ~; echo hi > x.md ) )",
      "f() { cd ~; echo hi > x.md; }; f",
      "function f { cd ~; echo hi > x.md; }; f",
      "function f() { cd ~; echo hi > x.md; }; f",
      "case x in x) cd ~; echo hi > x.md;; esac",
      "case x in a|b) echo y;; *) cd ~; echo hi > x.md;; esac",
    ]) expect(paths(cmd), cmd).toEqual(["~/x.md"]);
  });

  it("harmless forms stay in place (AC4)", () => {
    expect(paths("( echo hi > x.md )")).toEqual(["x.md"]);
    expect(paths("f() { echo hi > x.md; }; f")).toEqual(["x.md"]);
    expect(paths("function f { touch x.md; }; f")).toEqual(["x.md"]);
    expect(paths("case $x in a) echo hi > x.md;; esac")).toEqual(["x.md"]);
    expect(paths("case $x in a) rm y.md;; esac")).toEqual(["y.md"]);
  });
});

describe("install operands (P-058, BUG-012)", () => {
  it("install -d creates every operand, install src dest only dest (AC4)", () => {
    expect(paths("install -d ~/a docs/b")).toEqual(["~/a", "docs/b"]);
    expect(paths("install --directory docs/a docs/b")).toEqual(["docs/a", "docs/b"]);
    expect(paths("install src dest")).toEqual(["dest"]);
    expect(paths("install -m 644 src dest")).toEqual(["dest"]);
  });
});

describe("inlineScript behind function heads and case arms (P-058 review)", () => {
  it("finds the interpreter, and nothing in a harmless body", () => {
    expect(inlineScript("function f { python3 -c x; }; f")).toBe("python3");
    expect(inlineScript("case x in x) node -e y;; esac")).toBe("node");
    expect(inlineScript("function f { echo hi; }; f")).toBeNull();
  });
});
