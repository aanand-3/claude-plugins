/** Verify research evidence: every cited URL is fetched and its quote found on the page.
 *
 * Reads docs/research/evidence.jsonl (one JSON object per line: id, claim, url, quote, ...),
 * fetches each URL and writes back:
 *   verified      yes | fuzzy | mismatch | broken | blocked | unverified | manual
 *   http_status   final HTTP status (0 = network error)
 *   checked       today's date
 *   repo          {stars, pushed, archived} for github.com/<owner>/<repo> URLs (GitHub API)
 *
 *   yes        quote found verbatim (whitespace/case-insensitive) — or no quote and the page loads
 *   fuzzy      ≥ 80% of the quote's words appear on the page
 *   mismatch   page loads but the quote isn't there (JS-rendered page? re-check with WebFetch)
 *   broken     404/410/5xx or the domain doesn't resolve
 *   blocked    401/403/429 — the site refuses scripts (e.g. Reddit); re-check with WebFetch
 *   unverified network unavailable (offline/sandboxed); nothing was concluded
 *   manual     set by hand after checking with WebFetch; never overwritten unless --recheck
 *
 * With --report, also checks that every [E#] cited in the report exists and is usable
 * (yes/fuzzy/manual). Exit 1 when the report cites missing, broken or mismatched evidence.
 *
 * Usage: verify_evidence.mjs [--file docs/research/evidence.jsonl] [--report docs/research/idea-research.md]
 *                            [--recheck] [--timeout 15] [--no-fetch]
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { decodeHTML } from "entities";
import { cli } from "../cli.js";

export interface Row { id?: string; url?: string; quote?: string; verified?: string; http_status?: number; checked?: string;
  note?: string; repo?: { stars: number | null; pushed: string; archived: boolean }; [k: string]: unknown }
/** (status, body). Status 0 means the network itself failed, -1 that the name didn't resolve. */
export type Fetch = (url: string, timeout: number, headers?: Record<string, string>) => Promise<[number, string]>;

const UA = "Mozilla/5.0 (crew research verifier; +https://github.com)";
const USABLE = new Set(["yes", "fuzzy", "manual"]);
const REPO_URL = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/;
const NOT_REPOS = new Set(["orgs", "topics", "search", "marketplace", "features", "sponsors", "collections", "apps", "settings"]);
const MAX_BODY = 2_000_000;

export const fetchPage: Fetch = async (url, timeout, headers = {}) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en", ...headers }, signal: AbortSignal.timeout(timeout * 1000) });
    if (res.status >= 400) return [res.status, ""];
    const bytes = new Uint8Array(await res.arrayBuffer()).subarray(0, MAX_BODY);
    return [res.status, new TextDecoder("utf-8").decode(bytes)];
  } catch (e) {
    const code = ((e as { cause?: { code?: string } }).cause?.code ?? "").toUpperCase();
    return [code === "ENOTFOUND" || code === "EAI_NONAME" ? -1 : 0, ""];
  }
};

export function normalize(text: string): string {
  text = text.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ");
  text = decodeHTML(text.replace(/<[^>]+>/g, " "));
  text = text.replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"');
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function quoteStatus(quote: string, page: string): string {
  if (!quote) return "yes";
  const q = normalize(quote), p = normalize(page);
  if (p.includes(q)) return "yes";
  const words = (q.match(/[\p{L}\p{N}_$€£%.,'-]+/gu) ?? []).filter((w) => w.length > 2);
  if (words.length && words.filter((w) => p.includes(w)).length / words.length >= 0.8) return "fuzzy";
  return "mismatch";
}

export function classify(status: number, page: string, quote: string): string {
  if (status === 0) return "unverified";
  if (status === -1) return "dns"; // resolved after the run: broken if the network works, else unverified
  if (status === 404 || status === 410 || status >= 500) return "broken";
  if ([401, 403, 429, 451].includes(status)) return "blocked";
  return status >= 200 && status < 300 ? quoteStatus(quote, page) : "broken";
}

async function repoInfo(url: string, timeout: number, get: Fetch): Promise<Row["repo"] | null> {
  const m = REPO_URL.exec(url);
  if (!m || NOT_REPOS.has(m[1].toLowerCase())) return null;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const [status, body] = await get(`https://api.github.com/repos/${m[1]}/${m[2]}`, timeout, headers);
  if (status !== 200) return null;
  const data = JSON.parse(body);
  return { stars: data.stargazers_count ?? null, pushed: (data.pushed_at || "").slice(0, 10), archived: Boolean(data.archived) };
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function load(path: string): Row[] {
  const rows: Row[] = [];
  readFileSync(path, "utf8").split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try {
      rows.push(JSON.parse(line));
    } catch (e) {
      fail(`${path}:${i + 1}: invalid JSON (${(e as Error).message})`);
    }
  });
  return rows;
}

export async function verify(rows: Row[], timeout: number, recheck: boolean, today: string, get: Fetch = fetchPage): Promise<void> {
  for (const row of rows) {
    if (row.verified === "manual" && !recheck) continue;
    const url = row.url ?? "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      Object.assign(row, { verified: "broken", http_status: 0, checked: today, note: "missing or non-http url" });
      continue;
    }
    const [status, page] = await get(url, timeout);
    Object.assign(row, { verified: classify(status, page, row.quote ?? ""), http_status: Math.max(status, 0), checked: today });
    if (row.verified !== "unverified" && row.verified !== "dns") {
      const info = await repoInfo(url, timeout, get);
      if (info) row.repo = info;
    }
  }
  const networkOk = rows.some((r) => (r.http_status ?? 0) > 0);
  for (const row of rows) if (row.verified === "dns") row.verified = networkOk ? "broken" : "unverified";
}

/** today as YYYY-MM-DD; returns [errors, warnings]. */
export function checkReport(report: string, rows: Row[], today: string): [string[], string[]] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const errors: string[] = [], warnings: string[] = [];
  const cited = [...new Set([...readFileSync(report, "utf8").matchAll(/\[(E\d+)\]/g)].map((m) => m[1]))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  if (!cited.length) warnings.push("report cites no evidence ([E#])");
  for (const eid of cited) {
    const row = byId.get(eid);
    if (!row) errors.push(`${eid} is cited but not in the evidence file`);
    else if (row.verified === "broken" || row.verified === "mismatch") errors.push(`${eid} is ${row.verified}: ${row.url} — fix, re-check manually, or drop the claim`);
    else if (!USABLE.has(row.verified ?? "")) warnings.push(`${eid} is ${row.verified ?? "not checked"}: ${row.url}`);
    const repo = row?.repo;
    if (row && repo) {
      const pushed = repo.pushed || "";
      if (repo.archived) warnings.push(`${eid} ${row.url} is archived — don't count it as an active competitor`);
      else if (pushed && (Date.parse(today) - Date.parse(pushed)) / 86_400_000 > 365) warnings.push(`${eid} ${row.url} last pushed ${pushed} — possibly dead`);
    }
  }
  return [errors, warnings];
}

async function main(): Promise<void> {
  const { values: args } = cli("usage: verify_evidence.mjs [-h] [--file FILE] [--report REPORT] [--recheck] [--no-fetch] [--timeout TIMEOUT]", { options: {
    file: { type: "string", default: "docs/research/evidence.jsonl" }, report: { type: "string" }, recheck: { type: "boolean", default: false },
    "no-fetch": { type: "boolean", default: false }, timeout: { type: "string", default: "15" },
  } });
  const path = args.file!;
  if (!existsSync(path) || !statSync(path).isFile()) fail(`${path} not found`);
  const rows = load(path);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!args["no-fetch"]) {
    await verify(rows, Number(args.timeout), args.recheck!, today);
    writeFileSync(path, rows.map((r) => pyJsonLine(r) + "\n").join(""));
  }
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.verified ?? "unchecked", (counts.get(r.verified ?? "unchecked") ?? 0) + 1);
  console.log(`${rows.length} evidence entries: ` + [...counts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k} ${v}`).join(", "));
  for (const r of rows) if (!USABLE.has(r.verified ?? "")) console.log(`  ${r.id ?? "None"}: ${r.verified ?? "unchecked"} (HTTP ${r.http_status ?? "-"}) ${r.url ?? "None"}`);
  if (rows.length && counts.get("unverified") === rows.length) {
    console.log("  Network looks unavailable: nothing was concluded. Verify with WebFetch and mark entries `manual`.");
  }
  if (!args.report) return;
  const [errors, warnings] = checkReport(args.report, rows, today);
  for (const w of warnings) console.log(`⚠️  ${w}`);
  for (const e of errors) console.log(`✗  ${e}`);
  if (errors.length) process.exit(1);
  console.log(`✓ ${args.report}: every citation resolves to usable evidence`);
}

/** json.dumps(row, ensure_ascii=False): ", " and ": " separators, one line. */
function pyJsonLine(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(pyJsonLine).join(", ")}]`;
  if (v && typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyJsonLine(x)}`).join(", ")}}`;
  return JSON.stringify(v);
}

if (basename(process.argv[1] ?? "").startsWith("verify_evidence")) await main();
