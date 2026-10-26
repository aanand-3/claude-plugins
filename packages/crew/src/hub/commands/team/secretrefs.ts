/** Whether a shell command touches a secrets file (P-063, BUG-042). Built on parse(): every place the shell names a file
 * (words, option and assignment values, output and input redirect targets, globs) is matched as a whole path, so quoted
 * prose is no path. Where text may be code or may become arguments, the old token scan stays: the arguments of every
 * command but a few prose ones, the `--run` command of a hub call, and heredoc / here-string bodies unless they are fed to
 * a data command in a line where nothing runs stdin or text (an unquoted-delimiter heredoc holding `$(`, `${` or a
 * backtick is code the shell runs, never data: it gets a token scan that also splits on shell operators). Fail closed:
 * what the guard can't interpret keeps the old rule. Best effort, not a shell: the only I/O is listing the directory of a glob. */
import { basename, resolve } from "node:path";
import { globRe } from "../../core/memory/knowledge.js";
import { hubWord, parse, type Simple, type Word } from "./hubcall.js";
import { expand, globbed, headIndex, INTERPRETER, SHELL } from "./targets.js";

/** The old rule's tokens: the text split on whitespace, quotes and `=`, a leading `>` or `./` dropped. */
export const words = (text: string) => text.split(/[\s"'=]+/).map((w) => w.replace(/^>+/, "").replace(/^\.\//, "")).filter(Boolean);

/** Commands whose arguments are text, not code or paths to open (their words still get path mode). */
const PROSE = new Set(["echo", "printf", "grep", "egrep", "fgrep", "rg"]);
/** Commands that only read their stdin as data. */
const DATA = new Set(["cat", "tee", "head", "tail", "wc", "sort", "uniq", "tr", "cut", "grep", "base64"]);
/** Commands that run stdin or text as code or as arguments. */
const RUNS = new Set(["xargs", "parallel", "eval", "source", ".", "read"]);

/** A command or parameter substitution the shell runs in an unquoted-delimiter heredoc body. */
const SUBST = /\$[({]|`/;
/** Tokens of such a body: split like `words()`, and also on the shell's operators and the backtick, since in a heredoc
 * body quotes and `#` are plain text and only the substitutions run (`it's $(cat FILE)`, `$(<FILE)`, `` `cat FILE` ``). */
const codeWords = (text: string) => text.split(/[\s"'=(){}<>|;&`]+/).map((w) => w.replace(/^\.\//, "")).filter(Boolean);

const look = (n: string) => (n in process.env ? [process.env[n]!] : null);

/** The paths a word's value may name: itself, after the first `=`, after a leading `@`, after the last `:`. */
function candidates(v: string): string[] {
  const out = [v];
  if (v.includes("=")) out.push(v.slice(v.indexOf("=") + 1));
  if (v.startsWith("@")) out.push(v.slice(1));
  if (v.includes(":")) out.push(v.slice(v.lastIndexOf(":") + 1));
  return out.map((p) => p.replace(/^\.\//, "")).filter(Boolean);
}

/** The words of `c` exempt from the token scan: all of a prose command's or the hub's (bar a hub `--run` value), and a
 * `git commit`/`git tag` message. Words before the head (wrappers, assignments) are never exempt. */
function exempt(c: Simple, h: number): Set<Word> {
  const head = c.words[h], name = head ? basename(head.value) : "", args = c.words.slice(h + 1);
  if (PROSE.has(name) || hubWord(c)) {
    const run = (k: number) => args[k].value === "--run" ? args[k + 1] : args[k].value.startsWith("--run=") ? args[k] : undefined;
    const code = new Set(args.map((_, k) => run(k)));
    return new Set([head, ...args].filter((w) => !code.has(w)));
  }
  const out = new Set<Word>();
  if (name !== "git") return out;
  let k = 0;
  while (k < args.length && args[k].value.startsWith("-")) k += /^-[Cc]$/.test(args[k].value) ? 2 : 1;
  if (!/^(commit|tag)$/.test(args[k]?.value ?? "")) return out;
  for (k++; k < args.length; k++) {
    const v = args[k].value;
    if (v === "-m" || v === "--message") out.add(args[++k]);
    else if (/^(-m|--message)=/.test(v)) out.add(args[k]);
  }
  return out;
}

/** Whether a command runs stdin or text as code or as arguments: a shell, an interpreter (the hub excepted), xargs,
 * parallel, eval, source, `.` or read, as its head or a wrapper before it. */
function runner(c: Simple): boolean {
  const h = headIndex(c);
  return c.words.slice(0, h + 1).some((w, k) => {
    const b = basename(w.value);
    return RUNS.has(b) || SHELL.test(b) || (k === h && INTERPRETER.test(b) && !hubWord(c));
  });
}

/** Whether the command `cmd`, run in `cwd`, would access a file that `hit` says is a secret; `globs` (secrets.files) give
 * the sample names an unlistable glob is checked against. */
export function touchesSecret(cmd: string, cwd: string, globs: string[], hit: (p: string) => boolean): boolean {
  const cmds = parse(cmd);
  const samples = globs.map((g) => basename(g).replace(/[*?]/g, "x"));
  const named = (w: Word): boolean => {
    const r = expand(w.raw, look);
    for (const v of r?.values ?? [w.value]) {
      if (candidates(v).some(hit)) return true;
      if (!r?.glob) continue;
      const m = globbed(v, resolve(cwd));
      if (m ? m.some((x) => candidates(x).some(hit)) : samples.some((n) => globRe(basename(v)).test(n))) return true;
    }
    return false;
  };
  const tokens = (text: string) => words(text).some(hit);
  const running = cmds.some(runner);
  for (const c of cmds) {
    if ([...c.words, ...c.targets, ...c.inputs].some(named)) return true;
    const h = headIndex(c), skip = exempt(c, h);
    if (c.words.some((w) => !skip.has(w) && tokens(w.raw))) return true;
    const head = c.words[h], data = !!head && (DATA.has(basename(head.value)) || !!hubWord(c));
    if (c.live.some((b) => SUBST.test(b) && codeWords(b).some(hit))) return true;
    if (!(data && !running) && c.bodies.some(tokens)) return true;
  }
  return false;
}
