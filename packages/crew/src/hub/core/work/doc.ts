/** A tracked markdown document: flat `key: value` frontmatter plus `## ` sections. */
import { TASK_RE } from "./model.js";
import { idList, mdTable, norm, rstrip, stripComments, today } from "../text.js";

const EMPTY_LINES = new Set(["-", "- [ ]", "1."]);
const END = "(?![\\s\\S])"; // Python's \Z

/** Where a document is saved: set by the store that loaded or created it. */
export type Sink = (path: string, text: string) => void;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionRe(name: string): RegExp {
  return new RegExp(`^## ${escapeRe(name)}\\s*\\n([\\s\\S]*?)(?=^## |${END})`, "md");
}

export class Doc {
  constructor(
    public path: string | null,
    public text: string,
    public meta: Record<string, string | null> = {},
    public source = "worktree",
    public sink: Sink | null = null,
  ) {}

  static parse(text: string, path: string | null = null, source = "worktree"): Doc {
    const meta: Record<string, string | null> = {};
    const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (m) {
      for (const line of m[1].split("\n")) {
        if (line.includes(":") && !line.startsWith(" ")) {
          const i = line.indexOf(":");
          meta[line.slice(0, i).trim()] = line.slice(i + 1).trim() || null;
        }
      }
    }
    return new Doc(path, text, meta, source);
  }

  // -- frontmatter
  get id(): string {
    return this.get("id") ?? "";
  }

  get(key: string): string | null {
    return this.meta[key] ?? null;
  }

  set(key: string, value: string | null): void {
    this.meta[key] = value;
    const at = this.text.indexOf("\n---\n");
    let head = at < 0 ? this.text : this.text.slice(0, at);
    const rest = at < 0 ? "" : this.text.slice(at);
    const line = rstrip(`${key}: ${value ?? ""}`);
    const re = new RegExp(`^${escapeRe(key)}:.*$`, "m");
    head = re.test(head) ? head.replace(re, () => line) : `${head}\n${line}`;
    this.text = head + rest;
  }

  /** Paths (globs) a plan expects to change, as written: not upper-cased like IDs. */
  touches(): string[] {
    return (this.get("touches") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  }

  dependsOn(): string[] {
    return idList(this.get("depends_on"));
  }

  // -- sections
  section(name: string): string {
    return sectionRe(name).exec(this.text)?.[1] ?? "";
  }

  /** True if a section has real content beyond template comments, labels and empty bullets. */
  hasContent(name: string): boolean {
    const body = stripComments(this.section(name));
    if (mdTable(body).length) return true;
    return body.split("\n").map((l) => l.trim()).some((line) =>
      line && !EMPTY_LINES.has(line) && !line.startsWith("|") && !/^\*\*[^*]+:\*\*$/.test(line));
  }

  missing(names: readonly string[]): string[] {
    return names.filter((n) => !this.hasContent(n));
  }

  bullets(name: string): string[] {
    return stripComments(this.section(name)).split("\n").map((l) => l.trim())
      .filter((l) => l.startsWith("- ") && l !== "-").map((l) => l.slice(2).trim());
  }

  /** Top-level `N. ` / `N) ` items (at column 0); indented continuations and nested items are not items. */
  numbered(name: string): string[] {
    return stripComments(this.section(name)).split("\n").map((l) => /^\d+[.)] +(.*)$/.exec(l)?.[1].trim())
      .filter((t): t is string => !!t);
  }

  checklist(name: string): [boolean, string][] {
    const out: [boolean, string][] = [];
    for (const line of stripComments(this.section(name)).split("\n")) {
      const m = TASK_RE.exec(line);
      const label = m?.[2].trim();
      if (m && label && label !== "T1: … → verify: …") out.push([m[1] !== " ", label]);
    }
    return out;
  }

  tasks(): [boolean, string][] {
    return this.checklist("Tasks");
  }

  /** The checklist like `checklist()`, each line with the `###` subheading it sits under (null before any). */
  taskGroups(name = "Tasks"): [boolean, string, string | null][] {
    const out: [boolean, string, string | null][] = [];
    let phase: string | null = null;
    for (const line of stripComments(this.section(name)).split("\n")) {
      const h = /^###\s+(.+?)\s*$/.exec(line);
      if (h) phase = h[1];
      const m = TASK_RE.exec(line);
      const label = m?.[2].trim();
      if (m && label && label !== "T1: … → verify: …") out.push([m[1] !== " ", label, phase]);
    }
    return out;
  }

  appendTo(name: string, entry: string): void {
    const m = sectionRe(name).exec(this.text);
    if (!m) {
      this.text = `${rstrip(this.text)}\n\n## ${name}\n${entry}\n`;
      return;
    }
    const [start, end] = m.indices![1]!;
    const block = rstrip(m[1]);
    this.text = this.text.slice(0, start) + (block ? `${block}\n` : "") + `${entry}\n\n` + this.text.slice(end);
  }

  /** Replace a section's body (a generated section such as Handoff); add the section before `before` when it's missing. */
  replaceSection(name: string, body: string, before = "Progress log"): void {
    const m = sectionRe(name).exec(this.text);
    const block = `${rstrip(body)}\n\n`;
    if (m) {
      const [start, end] = m.indices![1]!;
      this.text = this.text.slice(0, start) + block + this.text.slice(end);
      return;
    }
    const at = new RegExp(`^## ${escapeRe(before)}\\s*$`, "m").exec(this.text);
    if (at) this.text = `${this.text.slice(0, at.index)}## ${name}\n${block}${this.text.slice(at.index)}`;
    else this.text = `${rstrip(this.text)}\n\n## ${name}\n${block}`;
  }

  appendLog(note: string, section = "Progress log"): void {
    this.appendTo(section, `- ${today()}: ${note}`);
  }

  save(): void {
    if (!this.path || !this.sink) throw new Error(`${this.id || "document"} has no place to be saved`);
    this.sink(this.path, `${rstrip(this.text)}\n`);
  }
}

/** Python's str.format_map with unknown fields rendered empty. */
export function fill(template: string, fields: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => fields[k] ?? "");
}

/** Return [preamble, [heading, body][]] for `## ` sections. */
export function splitSections(text: string): [string, [string, string][]] {
  const parts = text.split(/^## (.+?)\s*$/m);
  const sections: [string, string][] = [];
  for (let i = 1; i < parts.length; i += 2) sections.push([parts[i].trim(), parts[i + 1] ?? ""]);
  return [parts[0], sections];
}

/** Fill the template's sections with the draft's sections (matched by name, tolerant of
 * 'Risks' vs 'Risks & open questions'); unknown draft sections are kept before the log/notes. */
export function assemble(template: string, draft: string): string {
  const [pre, tmplSections] = splitSections(template);
  let remaining = splitSections(draft)[1];

  const take = (name: string): string | null => {
    const i = remaining.findIndex(([h]) => norm(name).startsWith(norm(h)) || norm(h).startsWith(norm(name)));
    if (i < 0) return null;
    const [[, body]] = remaining.splice(i, 1);
    return body.trim() ? body : null;
  };

  const out = [`${rstrip(pre)}\n`];
  const filled = tmplSections.map(([h, b]) => [h, take(h) ?? b] as const);
  const extra = () => remaining.map(([eh, eb]) => `\n## ${eh}\n${eb.trim()}\n`);
  for (const [h, body] of filled) {
    if (["Progress log", "Notes & decisions", "Notes", "Daily log"].includes(h) && remaining.length) {
      out.push(...extra());
      remaining = [];
    }
    out.push(body.trim() ? `\n## ${h}\n${body.trim()}\n` : `\n## ${h}\n`);
  }
  out.push(...extra());
  return `${rstrip(out.join(""))}\n`;
}
