/** Claude Code PostToolUse hook: format a file right after Claude edits it.
 *
 * Reads the hook payload from stdin, finds the edited file, and runs the project's own
 * formatter if it is installed — ruff for Python (nearest pyproject.toml's .venv, else PATH),
 * prettier for web files (nearest package.json's node_modules). Does nothing when the
 * tools aren't installed yet (e.g. before P-001). Never fails the hook.
 */
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { delimiter, dirname, extname, join, resolve, sep } from "node:path";

const PRETTIER_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".html", ".yaml", ".yml"]);

const real = (p: string) => { try { return realpathSync(p); } catch { return resolve(p); } };

/** The first directory from start upwards that holds marker, stopping at stop. */
function nearest(start: string, marker: string, stop: string): string | null {
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, marker))) return d;
    if (d === stop || dirname(d) === d) return null;
  }
}

/** shutil.which: the first executable of that name on PATH. */
function which(name: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    try {
      accessSync(join(dir, name), constants.X_OK);
      return join(dir, name);
    } catch { /* not here */ }
  }
  return null;
}

const run = (cmd: string, args: string[], cwd: string) => { spawnSync(cmd, args, { cwd, stdio: "ignore", timeout: 30_000 }); };

function main(): void {
  let payload: { tool_input?: { file_path?: string }; cwd?: string };
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }
  const filePath = (payload.tool_input || {}).file_path;
  if (!filePath) return;
  const project = real(process.env.CLAUDE_PROJECT_DIR ?? (payload.cwd || "."));
  if (!existsSync(filePath) || !statSync(filePath).isFile() || !real(filePath).startsWith(project + sep)) return;

  const ext = extname(filePath);
  if (ext === ".py") {
    const root = nearest(dirname(filePath), "pyproject.toml", project);
    if (!root) return;
    const ruff = join(root, ".venv", "bin", "ruff");
    const exe = existsSync(ruff) ? ruff : which("ruff");
    if (exe) {
      run(exe, ["check", "--fix", "--select", "I", "--quiet", filePath], root); // import order
      run(exe, ["format", "--quiet", filePath], root);
    }
  } else if (PRETTIER_EXT.has(ext)) {
    const root = nearest(dirname(filePath), "package.json", project);
    const prettier = root ? join(root, "node_modules", ".bin", "prettier") : null;
    if (prettier && existsSync(prettier)) run(prettier, ["--write", "--log-level", "silent", filePath], root!);
  }
}

try {
  main();
} catch { /* a formatter hiccup must never interrupt Claude's work */ }
