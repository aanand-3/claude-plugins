#!/usr/bin/env node
// Generated from packages/crew by `npm run build`. Do not edit.
import { createRequire as __crewRequire } from "node:module"; const require = __crewRequire(import.meta.url);

// src/tools/git-setup/check_secrets.ts
import { spawnSync } from "node:child_process";
var BLOCK = {
  "AWS access key": /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "GitHub token": /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  "Slack token": /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  "Anthropic API key": /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  "OpenAI API key": /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Stripe live key": /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/,
  "HubSpot private app token": /\bpat-(na|eu)\d-[0-9a-f]{8}-[0-9a-f-]{27}\b/,
  "credentials in URL": /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)/
};
var WARN = {
  "hard-coded secret-looking value": /\b(password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i
};
var SKIP_FILES = /(\.lock$|lock\.json$|lock\.yaml$|\.svg$|\.min\.js$)/;
var ALLOW = "pk:allow-secret";
function stagedAdditions() {
  const diff = spawnSync("git", ["diff", "--cached", "-U0", "--diff-filter=AM", "--no-color"], { encoding: "utf8" }).stdout ?? "";
  const out = /* @__PURE__ */ new Map();
  let current = null;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      current = line.slice(6);
      if (!out.has(current)) out.set(current, []);
    } else if (line.startsWith("+") && !line.startsWith("+++") && current) {
      out.get(current).push(line.slice(1));
    }
  }
  return out;
}
function main() {
  if (!process.argv.slice(2).includes("--staged")) {
    console.error("usage: check_secrets.mjs --staged");
    process.exit(1);
  }
  const blocked = [], warned = [];
  for (const [path, lines] of stagedAdditions()) {
    const name = path.split("/").at(-1);
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
    console.error(`\u26A0\uFE0F  crew secrets: ${w} \u2014 use settings/env instead (or mark the line \`${ALLOW}\` if it's a fake)`);
  }
  if (blocked.length) {
    console.error("\u270B crew secrets: likely secret in staged changes:");
    for (const b of [...new Set(blocked)].sort()) console.error(`   ${b}`);
    console.error(`   Remove it (rotate it if it was real), load it from env/settings, or mark a known fake with \`${ALLOW}\`.`);
    process.exit(1);
  }
}
main();
