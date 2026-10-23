/** Project memory: short knowledge entries (.crew/knowledge/K-<date>-<slug>.md), each one fact plus why, scoped to the
 * paths it applies to, so the next agent touching those paths recalls it. Pure helpers; commands live in commands/knowledge.ts. */
import { Doc } from "./doc.js";
import { slugify, stripComments, today } from "./text.js";

export const KNOWLEDGE_TYPES = ["decision", "learning", "gotcha", "convention", "risk"] as const;
export const TIERS = ["project", "playbook-candidate"] as const;
export const K_ID_RE = /\bK-\d{4}-\d{2}-\d{2}-[a-z0-9-]+\b/g;
export const RISK_LEVELS = ["H", "M", "L"];

/** High-confidence secret patterns, the same as git-setup's check_secrets.py; `pk:allow-secret` on a line exempts it. */
const SECRET_PATTERNS: Record<string, RegExp> = {
  "AWS access key": /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
  "private key": /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  "GitHub token": /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/,
  "Slack token": /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  "Anthropic API key": /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  "OpenAI API key": /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/,
  "Google API key": /\bAIza[0-9A-Za-z_-]{35}\b/,
  "Stripe live key": /\b(sk|rk)_live_[0-9A-Za-z]{20,}\b/,
  "credentials in URL": /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]{8,}@(?!localhost|127\.0\.0\.1|postgres|redis|db\b)/,
};

/** Names of the secret patterns found in text (plus the policy's own `secrets.patterns`). */
export function secretsIn(text: string, extra: string[] = []): string[] {
  const lines = text.split("\n").filter((l) => !l.includes("pk:allow-secret")).join("\n");
  const custom = Object.fromEntries(extra.flatMap((p, i) => {
    try {
      return [[`policy secrets.patterns[${i}]`, new RegExp(p)]];
    } catch {
      return [];
    }
  }));
  return Object.entries({ ...SECRET_PATTERNS, ...custom }).filter(([, re]) => re.test(lines)).map(([name]) => name);
}

/** A path glob as a regex: `**` any depth, `*` within one segment, `?` one character. A bare directory matches below it. */
export function globRe(glob: string): RegExp {
  const g = glob.replace(/^\.\//, "").replace(/\/$/, "/**");
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      re += g[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += g[i + 2] === "/" ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}(?:/.*)?$`);
}

/** The literal part of a glob before its first wildcard. */
const stem = (glob: string) => glob.replace(/^\.\//, "").split(/[*?[]/)[0];

/** Whether two globs can match a common path (conservative: compares their literal stems). */
export function globsOverlap(a: string, b: string): boolean {
  const [x, y] = [stem(a), stem(b)];
  return x.startsWith(y) || y.startsWith(x) || globRe(a).test(stem(b)) || globRe(b).test(stem(a));
}

export interface Entry { doc: Doc; id: string; type: string; title: string; scope: string[]; tier: string; source: string;
  supersedes: string | null; supersededBy: string | null; origin: "project" | "playbook" }

export function toEntry(doc: Doc, origin: Entry["origin"]): Entry {
  return { doc, id: doc.id, type: doc.get("type") ?? "", title: doc.get("title") ?? "", origin,
    scope: (doc.get("scope") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    tier: doc.get("tier") || "project", source: doc.get("source") ?? "", supersedes: (doc.get("supersedes") || "").trim() || null,
    supersededBy: null };
}

/** Mark each entry that a later one supersedes. */
export function linkSupersession(entries: Entry[]): Entry[] {
  const by = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) if (e.supersedes && by.has(e.supersedes)) by.get(e.supersedes)!.supersededBy = e.id;
  return entries;
}

export interface RecallQuery { paths?: string[]; globs?: string[]; topic?: string; type?: string; all?: boolean }

/** Entries that apply: unscoped ones always, scoped ones when a path or glob of the work falls under their scope. */
export function recall(entries: Entry[], q: RecallQuery): Entry[] {
  const words = (q.topic ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (!q.all && e.supersededBy) return false;
    if (q.type && e.type !== q.type) return false;
    if (words.length) {
      const text = `${e.title}\n${stripComments(e.doc.text)}`.toLowerCase();
      if (!words.every((w) => text.includes(w))) return false;
    }
    if (!q.paths?.length && !q.globs?.length) return true;
    if (!e.scope.length) return true;
    return e.scope.some((s) => (q.paths ?? []).some((p) => globRe(s).test(p)) || (q.globs ?? []).some((g) => globsOverlap(s, g)));
  });
}

/** One entry's text: the fact (title), why, and for risks likelihood, impact and owner. */
export function entryText(f: { id: string; type: string; title: string; scope: string[]; source: string; supersedes: string;
  tier: string; why: string; risk?: { likelihood?: string; impact?: string; owner?: string } }): string {
  const risk = f.type === "risk" ? `likelihood: ${f.risk?.likelihood ?? ""}\nimpact: ${f.risk?.impact ?? ""}\nowner: ${f.risk?.owner ?? ""}\n` : "";
  return `---\nid: ${f.id}\ntype: ${f.type}\ntitle: ${f.title}\nscope: ${f.scope.join(", ")}\nsource: ${f.source}\n`
    + `supersedes: ${f.supersedes}\ntier: ${f.tier}\n${risk}created: ${today()}\n---\n\n# ${f.title}\n\n${f.why.trim()}\n`
    .replace(/: \n/g, ":\n");
}

/** `K-<today>-<slug>`, with -2, -3… when that ID is taken. */
export function knowledgeId(title: string, taken: (id: string) => boolean): string {
  const base = `K-${today()}-${slugify(title).slice(0, 40).replace(/-+$/, "")}`;
  let id = base, n = 2;
  while (taken(id)) id = `${base}-${n++}`;
  return id;
}
