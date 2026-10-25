/** Where the guard puts a crew agent's identity in a shell command (BUG-017, CHORE-020). A small shell tokenizer finds the
 * simple commands (top level, in `$(…)`, backticks, `<(…)` and subshells) and, in each, the word that is the executed hub
 * program; the identity flags go right after that word and nowhere else, never into argument text, quoted strings or
 * heredoc bodies. Hub calls the guard can see but can't give identity to (a hub path in a variable, nested shell code, a
 * git `!` alias, a heredoc fed to a shell) are refused. Best effort, not a full shell parser. Pure: no I/O. */
import { basename } from "node:path";

/** One shell word: its raw offsets in the command and its dequoted value. */
interface Word { start: number; end: number; value: string; raw: string }
/** One simple command: its words (redirections left out) and the heredoc / here-string bodies fed to it. */
interface Simple { words: Word[]; bodies: string[] }

const HUB = /\bcrew\.mjs\b/;
const ASSIGN = /^[A-Za-z_]\w*=/;
/** Words that can come before the command itself. */
const PREFIX = new Set(["{", "!", "if", "then", "else", "elif", "do", "while", "until", "time", "builtin", "command", "exec", "env", "nohup"]);
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const RUNTIMES = new Set(["node", "bun", "deno"]);
/** Commands whose arguments are themselves run as code or as a command. */
const WRAPPERS = new Set(["eval", "xargs", "parallel", "watch", "timeout", "nice", "sudo", "ssh"]);
const BREAK = " \t\n;&|()<>";

const VARIABLE = "a hub path held in a shell variable can't be given your identity; call the hub literally (node .crew/bin/crew.mjs …)";
const NESTED = "the guard can't give your identity to a hub call inside nested shell code; call the hub directly as its own command";

/** The simple commands of a shell command line, nested ones included (their offsets are offsets into `s`). */
export function parse(s: string): Simple[] {
  const all: Simple[] = [];
  const pending: { delim: string; strip: boolean; cmd: Simple }[] = [];
  const n = s.length;
  let i = 0;

  /** The bodies of the heredocs opened on the line just ended; `i` is at the start of the next line. */
  const heredocs = () => {
    for (const h of pending.splice(0)) {
      const from = i;
      let body = s.slice(from);
      while (i < n) {
        const e = s.indexOf("\n", i) < 0 ? n : s.indexOf("\n", i);
        const line = s.slice(i, e);
        if ((h.strip ? line.replace(/^\t+/, "") : line) === h.delim) {
          body = s.slice(from, i);
          i = Math.min(e + 1, n);
          break;
        }
        i = e + 1;
      }
      if (i > n) i = n;
      h.cmd.bodies.push(body);
    }
  };

  /** A `$(…)`, backtick or `(…)` body: its commands go to `all`; `i` ends past the closing `)` or backtick. */
  const nested = (stop: string) => list(stop);

  const word = (stop: string): Word => {
    const start = i;
    let value = "";
    while (i < n) {
      const c = s[i];
      if (BREAK.includes(c) || c === stop) break;
      if (c === "\\") {
        if (s[i + 1] !== "\n") value += s[i + 1] ?? "";
        i += 2;
      } else if (c === "'") {
        const j = s.indexOf("'", i + 1) < 0 ? n : s.indexOf("'", i + 1);
        value += s.slice(i + 1, j);
        i = j + 1;
      } else if (c === '"') {
        for (i++; i < n && s[i] !== '"';) {
          if (s[i] === "\\" && '$`"\\\n'.includes(s[i + 1] ?? "")) {
            value += s[i + 1];
            i += 2;
          } else if (s.startsWith("$(", i) || s[i] === "`") {
            const from = i;
            i += s[i] === "`" ? 1 : 2;
            nested(s[from] === "`" ? "`" : ")");
            value += s.slice(from, i);
          } else value += s[i++];
        }
        i++;
      } else if (s.startsWith("$(", i) || c === "`") {
        const from = i;
        i += c === "`" ? 1 : 2;
        nested(c === "`" ? "`" : ")");
        value += s.slice(from, i);
      } else if (s.startsWith("${", i)) {
        const j = s.indexOf("}", i) < 0 ? n : s.indexOf("}", i) + 1;
        value += s.slice(i, j);
        i = j;
      } else value += s[i++];
    }
    i = Math.min(i, n);
    return { start, end: i, value, raw: s.slice(start, i) };
  };

  /** A redirection at `i` (`>`, `>>`, `>|`, `>&N`, `&>`, `<`, `<&N`, `<(…)`, `>(…)`, `<<WORD`, `<<-WORD`, `<<<word`):
   * its target is no word of the command; a heredoc body or here-string is fed to `cmd`. */
  const redirect = (cmd: Simple, stop: string) => {
    if (s[i] === "&") i++;
    const op = s[i++];
    let heredoc = false, herestring = false, strip = false;
    if (op === "<" && s[i] === "<") {
      i++;
      if (s[i] === "<") { herestring = true; i++; } else heredoc = true;
      if (heredoc && s[i] === "-") { strip = true; i++; }
    } else if (s[i] === "(") {
      i++;
      nested(")");
      return;
    } else if (s[i] === ">" || s[i] === "|" || s[i] === "&") {
      if (s[i++] === "&" && /[\d-]/.test(s[i] ?? "")) {
        while (i < n && /[\d-]/.test(s[i])) i++;
        return;
      }
    }
    while (s[i] === " " || s[i] === "\t") i++;
    if (i >= n || BREAK.includes(s[i])) return;
    const target = word(stop);
    if (heredoc) pending.push({ delim: target.value, strip, cmd });
    else if (herestring) cmd.bodies.push(target.value);
  };

  function list(stop: string): void {
    let cur: Simple = { words: [], bodies: [] };
    all.push(cur);
    const end = () => {
      cur = { words: [], bodies: [] };
      all.push(cur);
    };
    while (i < n) {
      const c = s[i];
      if (stop && c === stop) {
        i++;
        return;
      }
      if (c === " " || c === "\t") i++;
      else if (c === "\\" && s[i + 1] === "\n") i += 2;
      else if (c === "\n") {
        i++;
        end();
        heredocs();
      } else if (c === "#") {
        while (i < n && s[i] !== "\n") i++;
      } else if (c === "<" || c === ">" || (c === "&" && s[i + 1] === ">")) redirect(cur, stop);
      else if (c === "(") {
        i++;
        end();
        nested(")");
        end();
      } else if (";&|)".includes(c)) {
        i++;
        end();
      } else {
        const w = word(stop);
        // a file descriptor right before a redirection (`2>`, `1>>`) is part of it
        if (/^\d+$/.test(w.raw) && (s[i] === "<" || s[i] === ">")) continue;
        cur.words.push(w);
      }
    }
  }

  list("");
  return all.filter((c) => c.words.length || c.bodies.length);
}

const base = (w: Word | undefined) => (w ? basename(w.value) : "");

/** The index of a simple command's head: past `NAME=value` assignments and prefix words. */
function headAt(c: Simple): number {
  let h = 0;
  while (h < c.words.length && (ASSIGN.test(c.words[h].raw) || PREFIX.has(c.words[h].raw))) h++;
  return h;
}

/** The word of a simple command that is the executed hub program, or null. */
function hubWord(c: Simple): Word | null {
  const h = headAt(c), head = c.words[h];
  if (base(head) === "crew.mjs") return head;
  if (!RUNTIMES.has(base(head))) return null;
  const script = c.words.slice(h + 1).find((w) => !w.value.startsWith("-"));
  return base(script) === "crew.mjs" ? script! : null;
}

/** Why the guard can't give a simple command's hub call identity, or null. */
function refusal(c: Simple): string | null {
  const h = headAt(c), head = c.words[h];
  if (!head) return null;
  if (/^"?\$[A-Za-z_{]/.test(head.raw)) return VARIABLE;
  const name = base(head), rest = c.words.slice(h + 1);
  const later = (k: number) => rest.slice(k).some((w) => HUB.test(w.value));
  const opt = (re: RegExp) => rest.findIndex((w) => re.test(w.value));
  if (SHELLS.has(name)) {
    const k = opt(/^-[A-Za-z]*c[A-Za-z]*$/);
    if (k >= 0 && later(k + 1)) return NESTED;
    if (c.bodies.some((b) => HUB.test(b))) return NESTED;
  }
  if (WRAPPERS.has(name) && later(0)) return NESTED;
  if (name === "find" || name === "fd") {
    const k = opt(/^(-exec|-execdir|-ok|-okdir|-x|--exec|-X|--exec-batch)$/);
    if (k >= 0 && later(k + 1)) return NESTED;
  }
  if (RUNTIMES.has(name)) {
    const k = opt(/^(-[ep]|-pe|--eval|--print)(=|$)/);
    if (k >= 0 && later(k)) return NESTED;
  }
  if (name === "git" && rest.some((w) => /^!|=!/.test(w.value) && HUB.test(w.value))) return NESTED;
  return null;
}

/** The command with `flags` inserted once right after the executed hub program of each simple command that runs the hub,
 * or the reason the guard refuses it. A command that doesn't name the hub comes back unchanged. */
export function withIdentity(cmd: string, flags: string): { command: string } | { deny: string } {
  if (!HUB.test(cmd)) return { command: cmd };
  const cmds = parse(cmd);
  for (const c of cmds) {
    const why = refusal(c);
    if (why) return { deny: why };
  }
  const at = [...new Set(cmds.map(hubWord).filter((w): w is Word => !!w).map((w) => w.end))].sort((a, b) => b - a);
  let command = cmd;
  for (const e of at) command = `${command.slice(0, e)} ${flags}${command.slice(e)}`;
  return { command };
}
