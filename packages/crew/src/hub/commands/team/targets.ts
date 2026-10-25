/** What a shell command writes, and whether it runs a script the guard can't see (P-051: BUG-033, BUG-021, BUG-011,
 * BUG-013). Built on parse(), so quoted text and heredoc bodies are never targets. Targets are redirections and the operands
 * of common writing commands; every `$NAME`/`${NAME}` in one is expanded from the command's own assignments, `for` lists,
 * `$(mktemp …)` or the environment, one value per combination. What can't be resolved stays as text holding `$` or a
 * backtick, which the guard refuses. Best effort, not a shell: the only I/O is listing the directory of a `for` glob. */
import { readdirSync, realpathSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { ASSIGN, PREFIX, parse, type Word } from "./hubcall.js";

/** A path a command writes; `restore` marks a `git checkout`/`git restore` operand, which puts back committed content. */
export interface Target { path: string; restore: boolean }

/** A variable's possible values, or null when the guard can't know them. */
type Values = string[] | null;

const MAX = 64; // expansions per target before it counts as unresolved
const WRITERS = /^(rm|mv|cp|ln|chmod|chown|truncate|tee|install|touch|mkdir)$/;
const DECLARE = /^(export|local|declare|readonly|typeset)$/;
const GLOB = /[*?[]/;
const MKTEMP = /^\s*mktemp(?:\s+(?:-[dqu]+|-t\s+[^\s-]\S*))*\s*$/;

function realTmp(): string {
  try {
    return realpathSync(tmpdir());
  } catch {
    return tmpdir();
  }
}

/** The index of the `)` closing the `$(` whose body starts at `i`. */
function closing(s: string, i: number): number {
  for (let depth = 1; i < s.length; i++) {
    const c = s[i];
    if (c === "'") {
      i = s.indexOf("'", i + 1);
      if (i < 0) return s.length;
    } else if (c === "\\") i++;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return i;
  }
  return s.length;
}

/** A raw shell word's values with its variables expanded (no word splitting), whether it holds an unquoted glob, or null
 * when some part can't be resolved. */
export function expand(raw: string, look: (name: string) => Values): { values: string[]; glob: boolean } | null {
  let parts = [""], glob = false, quoted = false;
  const add = (vs: string[]) => {
    parts = parts.flatMap((p) => vs.map((v) => p + v));
    return parts.length <= MAX;
  };
  for (let i = 0; i < raw.length;) {
    const c = raw[i];
    if (c === "'" && !quoted) {
      const j = raw.indexOf("'", i + 1) < 0 ? raw.length : raw.indexOf("'", i + 1);
      add([raw.slice(i + 1, j)]);
      i = j + 1;
    } else if (c === '"') {
      quoted = !quoted;
      i++;
    } else if (c === "\\") {
      add([quoted && !'$`"\\'.includes(raw[i + 1] ?? "") ? `\\${raw[i + 1] ?? ""}` : raw[i + 1] ?? ""]);
      i += 2;
    } else if (c === "`") return null;
    else if (raw.startsWith("$(", i)) {
      const j = closing(raw, i + 2);
      if (!MKTEMP.test(raw.slice(i + 2, j))) return null;
      add([join(realTmp(), "mktemp.XXXXXX")]);
      i = j + 1;
    } else if (c === "$") {
      const m = /^\{([A-Za-z_]\w*)\}|^([A-Za-z_]\w*)/.exec(raw.slice(i + 1));
      if (!m) {
        if (/^[{\w@*#?$!-]/.test(raw.slice(i + 1))) return null; // ${…} with an operator, positional or special parameter
        add(["$"]);
        i++;
        continue;
      }
      const v = look(m[1] ?? m[2]);
      if (!v || !add(v)) return null;
      i += 1 + m[0].length;
    } else {
      if (!quoted && GLOB.test(c)) glob = true;
      add([c]);
      i++;
    }
    if (parts.length > MAX) return null;
  }
  return { values: parts, glob };
}

/** A shell glob (one path segment) as a regex. */
function globRe(g: string): RegExp {
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else if (c === "[" && g.indexOf("]", i + 2) > 0) {
      const j = g.indexOf("]", i + 2);
      re += `[${g.slice(i + 1, j).replace(/^!/, "^").replace(/\\/g, "\\\\")}]`;
      i = j;
    } else re += c.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

/** A `for` word's glob matches, listed in `base`; the word itself when nothing matches (as bash does); null for a glob in
 * an earlier segment. */
function globbed(v: string, base: string): string[] | null {
  const d = dirname(v), last = basename(v);
  if (GLOB.test(d)) return null;
  if (!GLOB.test(last)) return [v];
  const re = globRe(last);
  try {
    const names = readdirSync(resolve(base, d.replace(/^~(?=\/|$)/, homedir())))
      .filter((n) => re.test(n) && (last.startsWith(".") || !n.startsWith("."))).sort();
    return names.length ? names.map((n) => (d === "." && !v.startsWith("./") ? n : join(d, n))) : [v];
  } catch {
    return [v];
  }
}

/** The values a `for NAME in WORDS` loop gives NAME (globs listed in `base`), or null when one can't be known. */
function forList(words: Word[], look: (name: string) => Values, base: string): Values {
  const values: string[] = [];
  for (const w of words) {
    const r = expand(w.raw, look);
    if (!r) return null;
    for (const v of r.values) {
      const vs = r.glob ? globbed(v, base) : [v];
      if (!vs) return null;
      values.push(...vs);
    }
    if (values.length > MAX) return null;
  }
  return values;
}

/** Paths a shell command writes to (best effort): redirection targets, the destination of cp/ln/install, the operands of
 * the other writing commands, `sed -i` files and `git checkout/restore/rm/mv` operands. A relative target after `cd DIR`
 * is DIR/target. `cwd` is where a `for` glob is listed from. */
export function writeTargets(cmd: string, cwd: string): Target[] {
  const vars = new Map<string, Values>();
  const look = (n: string): Values => (vars.has(n) ? vars.get(n)! : n in process.env ? [process.env[n]!] : null);
  const ex = (w: Word): string[] => expand(w.raw, look)?.values ?? [w.value];
  const assign = (w: Word) => {
    const name = w.raw.slice(0, w.raw.indexOf("="));
    vars.set(name, expand(w.raw.slice(name.length + 1), look)?.values ?? null);
  };
  const rooted = (t: string) => /^(\/|~|\$)/.test(t);
  let dir = "";
  const at = (t: string) => (!dir || rooted(t) ? t : join(dir, t));
  const out: Target[] = [];
  const push = (ws: Word[], restore = false) => {
    for (const w of ws) for (const t of ex(w)) if (t) out.push({ path: at(t), restore });
  };

  for (const c of parse(cmd)) {
    const words = c.words;
    let h = 0;
    for (; h < words.length && (ASSIGN.test(words[h].raw) || PREFIX.has(words[h].raw)); h++) {
      if (ASSIGN.test(words[h].raw)) assign(words[h]);
    }
    push(c.targets);
    if (h >= words.length) continue;
    const head = basename(words[h].value), args = words.slice(h + 1);
    const operands = (head === "git" ? args.slice(1) : args).filter((a) => !a.value.startsWith("-"));
    if (DECLARE.test(head)) {
      for (const a of args) if (ASSIGN.test(a.raw)) assign(a);
    } else if (head === "for") {
      vars.set(args[0]?.value ?? "", args[1]?.raw === "in" ? forList(args.slice(2), look, resolve(cwd, dir)) : null);
    } else if (head === "read") {
      for (const a of operands) vars.set(a.value, null);
    } else if (head === "cd" || head === "pushd") {
      const to = operands[0] ? ex(operands[0])[0] : "~";
      dir = rooted(to) ? to : join(dir, to);
    } else if (/^(cp|ln|install)$/.test(head)) {
      const t = args.findIndex((a) => a.value === "-t" || a.value === "--target-directory");
      if (t >= 0) push(args.slice(t + 1, t + 2));
      // `ln -s TARGET` alone makes the link in the current directory, named after the target
      else if (head === "ln" && operands.length === 1) for (const v of ex(operands[0])) out.push({ path: at(basename(v)), restore: false });
      else push(operands.slice(-1));
    } else if (WRITERS.test(head)) push(operands);
    else if (head === "sed" && args.some((a) => a.value.startsWith("-i") || a.value === "--in-place")) {
      // the files: operands past the script (the first operand unless -e/-f gives it), skipping BSD's `-i ''`
      const files: Word[] = [];
      let script = false;
      for (let k = 0; k < args.length; k++) {
        const v = args[k].value;
        if (/^(-e|-f|--expression|--file)$/.test(v)) { script = true; k++; } else if (/^(--expression|--file)=/.test(v)) script = true;
        else if (v && !v.startsWith("-")) files.push(args[k]);
      }
      push(script ? files : files.slice(1));
    } else if (head === "git" && /^(checkout|restore|rm|mv)$/.test(args[0]?.value ?? "")) {
      push(operands, /^(checkout|restore)$/.test(args[0].value));
    }
  }
  return out.map((t) => ({ ...t, path: t.path.replace(/^\.\//, "") }));
}

const INTERPRETER = /^(python[23]?(\.\d+)?|node|nodejs|bun|deno|perl|ruby|php)$/;
const SHELL = /^(sh|bash|zsh|dash|ksh)$/;
const WRAPPER = /^(env|nohup|nice|exec|timeout|xargs)$/;
/** A wrapper's options that take the next word as their value. */
const OPTION_ARG: Record<string, RegExp> = { env: /^-[uSC]$/, nice: /^-n$/, timeout: /^-[sk]$/, xargs: /^-[IndPLsEa]$/ };

/** The head (`python3`, `node`, `bash`, `eval`, …) of the first command that runs an inline or stdin script, whose writes
 * no parser can see, or null. A script file is no inline script (`node x.js`, `bash x.sh`), nor is `-m`, `--version`,
 * `-V`, `-h` or `--help`. */
export function inlineScript(cmd: string): string | null {
  for (const c of parse(cmd)) {
    const w = c.words.map((x) => x.value);
    let h = 0;
    while (h < w.length) {
      const b = basename(w[h]);
      if (WRAPPER.test(b)) {
        for (h++; h < w.length && (w[h].startsWith("-") || ASSIGN.test(c.words[h].raw));) h += OPTION_ARG[b]?.test(w[h]) ? 2 : 1;
        if (b === "timeout") h++; // the duration
      } else if (ASSIGN.test(c.words[h].raw) || PREFIX.has(c.words[h].raw)) h++;
      else break;
    }
    if (h >= w.length) continue;
    const head = basename(w[h]), args = w.slice(h + 1);
    if (head === "eval") return head;
    const k = args.findIndex((a) => a === "-" || !a.startsWith("-"));
    const operand = k < 0 ? undefined : args[k], opts = k < 0 ? args : args.slice(0, k);
    const has = (re: RegExp) => opts.some((a) => re.test(a));
    if (INTERPRETER.test(head)) {
      const inline = head.startsWith("python") ? has(/^-[A-Za-z]*c[A-Za-z]*$/)
        : head === "deno" ? operand === "eval"
          : head === "php" ? has(/^-r$/)
            : /^(perl|ruby)$/.test(head) ? has(/^-[A-Za-z]*[eE]/)
              : has(/^(-[ep]|-pe|--eval|--print)(=|$)/);
      if (inline || operand === "-" || (!operand && !has(/^(-m|--version|-V|-h|--help)$/))) return head;
    }
    if (SHELL.test(head) && (has(/^-[A-Za-z]*c[A-Za-z]*$/) || !operand || operand === "-")) return head;
  }
  return null;
}
