/** `withIdentity` (P-042, BUG-017, CHORE-020): identity goes right after the executed hub program, nowhere else. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withIdentity } from "../../src/hub/commands/team/hubcall.js";

const F = "--as qa --run-id qa:a1";
const HUB = "node .crew/bin/crew.mjs";
const ID = `${HUB} ${F}`;
const rewrite = (cmd: string) => {
  const r = withIdentity(cmd, F);
  expect("command" in r, `${cmd} → ${JSON.stringify(r)}`).toBe(true);
  return (r as { command: string }).command;
};
const deny = (cmd: string) => {
  const r = withIdentity(cmd, F);
  expect("deny" in r, `${cmd} → ${JSON.stringify(r)}`).toBe(true);
  return (r as { deny: string }).deny;
};

describe("the executed hub program gets identity once", () => {
  it("quoted argument text naming the hub is left as typed (AC1)", () => {
    for (const tail of [
      'learn decision "X" --why "rebuild dist/crew.mjs and dist/mcp.mjs"',
      'checkpoint P-001 --step T1 --note "ran node .crew/bin/crew.mjs next && crew.mjs log; a | b"',
      "log P-001 'node .crew/bin/crew.mjs next; node .crew/bin/crew.mjs ledger'",
      'checkpoint P-001 --note "he said \\"crew.mjs && x\\" then left"',
      "learn gotcha it\\'s\\ crew.mjs --why x",
    ]) expect(rewrite(`${HUB} ${tail}`)).toBe(`${ID} ${tail}`);
  });

  it("each chained call is rewritten (AC6)", () => {
    expect(rewrite(`${HUB} next && ${HUB} log; ${HUB} a | ${HUB} b\n${HUB} c || ${HUB} d & ${HUB} e`))
      .toBe(`${ID} next && ${ID} log; ${ID} a | ${ID} b\n${ID} c || ${ID} d & ${ID} e`);
  });

  it("prefixes, runtimes and direct execution (AC6)", () => {
    for (const [cmd, out] of [
      [`FOO=1 BAR="a b" ${HUB} next`, `FOO=1 BAR="a b" ${ID} next`],
      [`{ ${HUB} next; }`, `{ ${ID} next; }`],
      [`( ${HUB} next )`, `( ${ID} next )`],
      [`(${HUB} next)`, `(${ID} next)`],
      [`if ${HUB} next; then echo ok; fi`, `if ${ID} next; then echo ok; fi`],
      [`time ${HUB} next`, `time ${ID} next`],
      [`command ${HUB} next`, `command ${ID} next`],
      ["node --no-warnings .crew/bin/crew.mjs next", `node --no-warnings .crew/bin/crew.mjs ${F} next`],
      [".crew/bin/crew.mjs next", `.crew/bin/crew.mjs ${F} next`],
      ["/abs/repo/.crew/bin/crew.mjs next", `/abs/repo/.crew/bin/crew.mjs ${F} next`],
      ['node ".crew/bin/crew.mjs" next', `node ".crew/bin/crew.mjs" ${F} next`],
      [`${HUB} next > out.txt 2>&1`, `${ID} next > out.txt 2>&1`],
      [`${HUB} next # crew.mjs in a comment`, `${ID} next # crew.mjs in a comment`],
      [`# ${HUB} next\necho hi`, `# ${HUB} next\necho hi`],
    ]) expect(rewrite(cmd), cmd).toBe(out);
  });

  it("calls inside $(…), backticks and double quotes (AC6)", () => {
    for (const [cmd, out] of [
      [`cd "$(${HUB} context P-001)"`, `cd "$(${ID} context P-001)"`],
      [`cd $(${HUB} context P-001)`, `cd $(${ID} context P-001)`],
      [`echo \`${HUB} next\``, `echo \`${ID} next\``],
      [`echo "now: \`${HUB} next\`"`, `echo "now: \`${ID} next\`"`],
      [`diff <(${HUB} ledger) x`, `diff <(${ID} ledger) x`],
      [`X=$(${HUB} next) && ${HUB} log "$X"`, `X=$(${ID} next) && ${ID} log "$X"`],
    ]) expect(rewrite(cmd), cmd).toBe(out);
  });

  it("heredocs and here-strings stay opaque (AC3)", () => {
    for (const cmd of [
      `cat > /tmp/x.sh <<'EOF'\n${HUB} next\nEOF`,
      `cat > /tmp/x.sh <<EOF\n${HUB} next && ${HUB} log\nEOF`,
      `cat > /tmp/x.sh <<-EOF\n\t${HUB} next\n\tEOF`,
      `cat <<"EOF" | wc -l\n${HUB} next\nEOF`,
      `cat <<< "${HUB} next"`,
    ]) expect(rewrite(cmd), cmd).toBe(cmd);
    expect(rewrite(`cat > f <<'EOF'\n${HUB} next\nEOF\n${HUB} log`)).toBe(`cat > f <<'EOF'\n${HUB} next\nEOF\n${ID} log`);
    expect(rewrite(`cat <<A <<B\n${HUB} a\nA\n${HUB} b\nB\n${HUB} c`)).toBe(`cat <<A <<B\n${HUB} a\nA\n${HUB} b\nB\n${ID} c`);
  });

  it("the hub named as an argument is left alone (AC2)", () => {
    for (const cmd of [
      "bash .crew/drafts/x.sh /abs/.crew/bin/crew.mjs P-001", "X=1 QA_DIR=/x bash .crew/drafts/x.sh /abs/.crew/bin/crew.mjs P-001",
      "sh x.sh .crew/bin/crew.mjs", "node script.js .crew/bin/crew.mjs",
      "git log -- .crew/bin/crew.mjs", "ls -l .crew/bin/crew.mjs", "grep -n crew.mjs README.md", "echo node .crew/bin/crew.mjs",
      "cmp .crew/bin/crew.mjs dist/crew.mjs", "node dist/crew.mjs.map", "npm test",
    ]) expect(rewrite(cmd), cmd).toBe(cmd);
  });
});

describe("hub calls the guard can't give identity to are refused", () => {
  it("a hub path in a shell variable (AC4)", () => {
    for (const cmd of [`C="${HUB}"; $C next`, `C="${HUB}"; "$C" next`, `H=.crew/bin/crew.mjs; node $H next; \${H} x`]) {
      expect(deny(cmd), cmd).toContain("variable");
    }
    expect(rewrite('D=/tmp; echo "$D"; $EDITOR x')).toBe('D=/tmp; echo "$D"; $EDITOR x'); // no hub named: not refused
  });

  it("a runtime running a hub path held in a variable (BUG-031)", () => {
    for (const cmd of [
      "C=/x/.crew/bin/crew.mjs; node $C checkpoint P-1", "C=/x/.crew/bin/crew.mjs; bun $C next", "C=/x/.crew/bin/crew.mjs; deno $C next",
      'C=/x/.crew/bin/crew.mjs; node "$C" next', "C=/x/.crew/bin/crew.mjs; node ${C} next", 'C=/x/.crew/bin/crew.mjs; node "${C}" next',
      "C=/x/.crew/bin/crew.mjs\nnode --no-warnings $C next", "C=/x/.crew/bin/crew.mjs && cd /y && node $C next",
    ]) expect(deny(cmd), cmd).toContain("variable");
    for (const cmd of ["node $X build.js", 'X=dist/b.js; node "$X" build'])
      expect(rewrite(cmd), cmd).toBe(cmd); // no hub named: not refused
    for (const [cmd, out] of [
      [`cd /repo && ${HUB} next`, `cd /repo && ${ID} next`],
      ["node /abs/repo/.crew/bin/crew.mjs next", `node /abs/repo/.crew/bin/crew.mjs ${F} next`],
      [`for p in P-1 P-2; do ${HUB} context $p; done`, `for p in P-1 P-2; do ${ID} context $p; done`],
    ]) expect(rewrite(cmd), cmd).toBe(out);
  });

  it("nested shell code (AC5)", () => {
    for (const cmd of [
      `bash -c '${HUB} next'`, `sh -c "${HUB} next"`, `zsh -lc '${HUB} next'`, `eval "${HUB} next"`,
      `echo next | xargs ${HUB}`, `find . -name x -exec ${HUB} next \\;`, `fd x -x ${HUB} next`,
      `node -e "require('child_process').execSync('${HUB} next')"`, `node --eval='x("crew.mjs")'`,
      `timeout 10 ${HUB} next`, `sudo ${HUB} next`, `ssh host '${HUB} next'`, `nice ${HUB} next`,
      `bash <<EOF\n${HUB} next\nEOF`, `sh <<< "${HUB} next"`, `cd x && $(bash -c '${HUB} next')`,
    ]) expect(deny(cmd), cmd).toContain("directly");
    // their non-nested neighbours go through
    for (const cmd of ["bash -c 'npm test'", "bash script.sh .crew/bin/crew.mjs", "node -e 'console.log(1)'", "find . -name crew.mjs",
      `cat <<EOF\n${HUB} next\nEOF`, "xargs echo < list.txt"]) {
      expect(rewrite(cmd), cmd).toBe(cmd);
    }
  });

  it("a git alias with ! running the hub (CHORE-020)", () => {
    for (const cmd of [`git -c 'alias.x=!${HUB} next' x`, `git config alias.n '!${HUB} next'`]) {
      expect(deny(cmd), cmd).toContain("directly");
    }
    expect(rewrite("git -c 'alias.x=!echo hi' x")).toBe("git -c 'alias.x=!echo hi' x");
  });
});

it("hubcall.ts is pure and small (AC10)", () => {
  const src = readFileSync(new URL("../../src/hub/commands/team/hubcall.ts", import.meta.url), "utf8");
  expect([...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1])).toEqual(["node:path"]);
  expect(src.split("\n").length).toBeLessThan(300);
});

describe("hub calls behind subshells, function heads and case arms (P-058, BUG-012)", () => {
  it("still get identity (AC5)", () => {
    for (const [cmd, out] of [
      [`( ( ${HUB} next ) )`, `( ( ${ID} next ) )`],
      [`f() { ${HUB} next; }; f`, `f() { ${ID} next; }; f`],
      [`function f { ${HUB} next; }; f`, `function f { ${ID} next; }; f`],
      [`function f() { ${HUB} next; }; f`, `function f() { ${ID} next; }; f`],
      [`case x in x) ${HUB} next;; esac`, `case x in x) ${ID} next;; esac`],
      [`case x in a|b) echo y;; *) ${HUB} next;; esac`, `case x in a|b) echo y;; *) ${ID} next;; esac`],
    ]) expect(rewrite(cmd), cmd).toBe(out);
  });
});
