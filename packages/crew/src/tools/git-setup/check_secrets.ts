/** Lightweight secret scan of staged changes — works from day one, no install needed.
 *
 * High-confidence patterns (cloud keys, tokens, private keys) and staged `.env` files
 * BLOCK the commit. Generic `password = "..."`-style assignments only WARN.
 * gitleaks (via pre-commit and CI) adds a much broader scan once P-001 lands.
 *
 * Allow a known-safe line by adding the marker `pk:allow-secret` to it.
 *
 * Usage: check_secrets.mjs --staged
 */
import { spawnSync } from "node:child_process";

// The same high-confidence patterns as the hub's knowledge check (src/hub/core/memory/knowledge.ts).
const BLOCK: Record<string, RegExp> = {
  "AWS access key": /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "GitHub token": /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  "Slack token": /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  "Anthropic API key": /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  "OpenAI API key": /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Stripe live key": /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/,
  "HubSpot private app token": /\bpat-(na|eu)\d-[0-9a-f]{8}-[0-9a-f-]{27}\b/,
  "credentials in URL": /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)/,
};
const WARN: Record<string, RegExp> = {
  "hard-coded secret-looking value": /\b(password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i,
};
const SKIP_FILES = /(\.lock$|lock\.json$|lock\.yaml$|\.svg$|\.min\.js$)/;
const ALLOW = "pk:allow-secret";

function stagedAdditions(): Map<string, string[]> {
  const diff = spawnSync("git", ["diff", "--cached", "-U0", "--diff-filter=AM", "--no-color"], { encoding: "utf8" }).stdout ?? "";
  const out = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      current = line.slice(6);
      if (!out.has(current)) out.set(current, []);
    } else if (line.startsWith("+") && !line.startsWith("+++") && current) {
      out.get(current)!.push(line.slice(1));
    }
  }
  return out;
}

function main(): void {
  if (!process.argv.slice(2).includes("--staged")) {
    console.error("usage: check_secrets.mjs --staged");
    process.exit(1);
  }
  const blocked: string[] = [], warned: string[] = [];
  for (const [path, lines] of stagedAdditions()) {
    const name = path.split("/").at(-1)!;
    if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") {
      blocked.push(`${path}: .env files must never be committed`);
      continue;
    }
    if (SKIP_FILES.test(path)) continue;
    for (const line of lines) {
      if (line.includes(ALLOW)) continue;
      for (const [label, re] of Object.entries(BLOCK)) if (re.test(line)) blocked.push(`${path}: ${label}`);
      for (const [label, re] of Object.entries(WARN)) if (re.test(line)) warned.push(`${path}: ${label}`);
    }
  }
  for (const w of [...new Set(warned)].sort()) {
    console.error(`⚠️  crew secrets: ${w} — use settings/env instead (or mark the line \`${ALLOW}\` if it's a fake)`);
  }
  if (blocked.length) {
    console.error("✋ crew secrets: likely secret in staged changes:");
    for (const b of [...new Set(blocked)].sort()) console.error(`   ${b}`);
    console.error(`   Remove it (rotate it if it was real), load it from env/settings, or mark a known fake with \`${ALLOW}\`.`);
    process.exit(1);
  }
}

main();
