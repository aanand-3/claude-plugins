/** The design studio's files: docs/design/DESIGN.md (tokens in front matter, prose below) and studio.json (the
 * page's stage, shortlist, variants, screen reviews and hand-offs to Claude). The page saves through these
 * functions (server.ts); `design show|wait|done` and the MCP `design` tool read them. A final design changes only
 * through a revision: the revision number goes up, a CHORE tracks the code that now drifts, and Claude is handed
 * the ADR to write. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { type Store, yamlBlock } from "../../core/store.js";
import { fail } from "../../core/text.js";
import { newItem } from "../work/backlog.js";

export type Tokens = Record<string, unknown>;
export interface DesignInfo { path: string; tokens: Tokens; body: string }
export const HANDOFF_KINDS = ["finalise", "locked", "revision", "screen-change", "screens-done", "screens-skipped"] as const;
export interface Handoff { id: string; kind: (typeof HANDOFF_KINDS)[number]; note?: string; screen?: string; at: string }
export type Studio = Record<string, unknown> & { stage?: string; handoffs?: Handoff[]; handoff_seq?: number };

const STAGES = ["palette", "directions", "tune", "finalise", "screens", "done"];
const STATE_KEYS = ["stage", "shortlist", "variants", "current", "reviews"]; // what the page may change
const REQUIRED_COLORS = ["background", "foreground", "primary", "primary-foreground"];
const FRONT = /^---\n([\s\S]*?)\n---\n/;

/** DESIGN.md's path: `design.file` in .crew/config.yaml, else docs/design/DESIGN.md. */
export function designPath(store: Store): string {
  const cfg = store.ws.read(join(store.dir, "config.yaml")) ?? "";
  return join(store.ws.root, yamlBlock(cfg, "design").file ?? "docs/design/DESIGN.md");
}

const studioPath = (store: Store) => join(dirname(designPath(store)), "studio.json");

export function readDesign(store: Store): DesignInfo | null {
  const path = designPath(store);
  const text = store.ws.read(path);
  if (text === null) return null;
  const m = FRONT.exec(text);
  const tokens = m ? (parse(m[1]) as Tokens | null) ?? {} : {};
  return { path: store.rel(path), tokens, body: m ? text.slice(m[0].length) : text };
}

export function readStudio(store: Store): Studio | null {
  const text = store.ws.read(studioPath(store));
  if (text === null) return null;
  try {
    return JSON.parse(text) as Studio;
  } catch {
    fail(`${store.rel(studioPath(store))} is not valid JSON.`);
  }
}

/** What the page loads: the design, the studio state, and whether a server is behind it. */
export const designPayload = (store: Store) => ({ design: readDesign(store), studio: readStudio(store), served: true });

const revisionOf = (t: Tokens) => (Number.isInteger(Number(t.revision)) ? Number(t.revision) : 0);

function writeDesign(store: Store, tokens: Tokens, body: string): void {
  store.ws.write(designPath(store), `---\n${stringify(tokens, { lineWidth: 0 })}---\n${body}`);
}

function writeStudio(store: Store, studio: Studio): void {
  store.ws.write(studioPath(store), `${JSON.stringify(studio, null, 2)}\n`);
}

function checkTokens(tokens: unknown): Tokens {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) fail("tokens must be an object.");
  const t = tokens as Tokens;
  if (typeof t.name !== "string" || !t.name) fail("tokens need a `name`.");
  const colors = (t.colors ?? {}) as Record<string, unknown>;
  const missing = REQUIRED_COLORS.filter((c) => typeof colors[c] !== "string");
  if (missing.length) fail(`colors are missing ${missing.join(", ")}.`);
  return t;
}

/** Order the keys like the template: identity, lock, then the token groups. */
function ordered(t: Tokens, status: string, revision: number): Tokens {
  const { version, name, description, status: _s, revision: _r, source, ...rest } = t;
  return { version: version ?? "alpha", name, ...(description ? { description } : {}), status, revision,
    ...(source ? { source } : {}), ...rest };
}

const DEFAULT_BODY = (name: string) => `\n# ${name}\n\nDraft from the design studio. Claude writes the rationale (Overview, Colors, Typography, Layout, `
  + "Elevation & Depth, Shapes, Components, Screens, Do's and Don'ts, Motion, Voice) at the Finalise step.\n";

export interface SaveRequest { tokens?: unknown; kind?: unknown; reason?: unknown }

/** Save from the page. draft: any time before the design is final. lock: the saved draft becomes revision 1.
 * revision: a final design changes, revision +1, with a CHORE for the drift and a hand-off for the ADR. */
export function saveDesign(store: Store, req: SaveRequest): void {
  const current = readDesign(store);
  const status = String(current?.tokens.status ?? "draft");
  const reason = typeof req.reason === "string" ? req.reason.trim() : "";
  if (req.kind === "draft") {
    if (status === "final") fail(`${current!.path} is final (revision ${revisionOf(current!.tokens)}). Start a revision to change it.`);
    const t = checkTokens(req.tokens);
    writeDesign(store, ordered(t, "draft", 0), current?.body ?? DEFAULT_BODY(String(t.name)));
    store.say(`Saved a draft of ${store.rel(designPath(store))}`);
  } else if (req.kind === "lock") {
    if (!current) fail("There is no draft to lock yet. Save a draft first.");
    if (status === "final") fail(`${current.path} is already final.`);
    checkTokens(current.tokens);
    writeDesign(store, ordered(current.tokens, "final", 1), current.body);
    handoff(store, { kind: "locked", note: "Design locked at revision 1: write the ADR (mention `DESIGN.md revision 1`) and the design block in config.yaml." });
    store.say(`Locked ${current.path} at revision 1`);
  } else if (req.kind === "revision") {
    if (!current || status !== "final") fail("Only a final design is revised. Save a draft instead.");
    if (!reason) fail("A revision needs a reason (it goes into the ADR and the CHORE).");
    const n = revisionOf(current.tokens) + 1;
    writeDesign(store, ordered(checkTokens(req.tokens), "final", n), current.body);
    if (store.ws.isDir(store.dirs.item)) { // the hub's backlog exists (the hub module is on)
      newItem(store, "chore", `Bring the UI onto design revision ${n}`, undefined,
        `DESIGN.md revision ${n}: ${reason}. Run \`check_design.py --all\` for the code that now drifts and move it onto the new tokens.`);
    }
    handoff(store, { kind: "revision", note: `Revision ${n}: ${reason}. Write the ADR (mention \`DESIGN.md revision ${n}\`).` });
    store.say(`Saved ${current.path} as revision ${n}`);
  } else {
    fail("kind must be draft, lock or revision.");
  }
}

/** Page state from the page (stage, shortlist, variants, current, reviews) plus an optional new hand-off. */
export function updateStudio(store: Store, patch: Record<string, unknown>): void {
  const studio = readStudio(store) ?? {};
  for (const key of STATE_KEYS) if (key in patch) studio[key] = patch[key];
  if (studio.stage !== undefined && !STAGES.includes(String(studio.stage))) fail(`stage must be one of ${STAGES.join(", ")}.`);
  writeStudio(store, studio);
  const h = patch.handoff as Partial<Handoff> | undefined;
  if (h) handoff(store, h);
}

function handoff(store: Store, h: Partial<Handoff>): void {
  if (!HANDOFF_KINDS.includes(h.kind as Handoff["kind"])) fail(`handoff kind must be one of ${HANDOFF_KINDS.join(", ")}.`);
  const studio = readStudio(store) ?? {};
  const list = studio.handoffs ?? [];
  const next = Math.max(studio.handoff_seq ?? 0, ...list.map((x) => Number(x.id.slice(1)) || 0)) + 1; // ids never repeat
  list.push({ id: `h${next}`, kind: h.kind as Handoff["kind"], ...(h.note ? { note: String(h.note) } : {}),
    ...(h.screen ? { screen: String(h.screen) } : {}), at: new Date().toISOString() });
  writeStudio(store, { ...studio, handoffs: list, handoff_seq: next });
}

const HANDOFF_HELP: Record<Handoff["kind"], string> = {
  finalise: "write the prose sections of DESIGN.md for the saved draft",
  locked: "write the ADR and set the design block in .crew/config.yaml",
  revision: "write the ADR for the revision",
  "screen-change": "revise this screen in studio.json → screens",
  "screens-done": "write DESIGN.md → Screens for the approved screens and create one FEAT item per screen",
  "screens-skipped": "tell the user `/crew:design page <name>` builds screens later",
};

function describe(h: Handoff): string {
  return `${h.id}  ${h.kind}${h.screen ? ` (${h.screen})` : ""} — ${HANDOFF_HELP[h.kind]}${h.note ? `\n     note: ${h.note}` : ""}`;
}

export function designShow(store: Store, json: boolean): void {
  const design = readDesign(store);
  const studio = readStudio(store);
  if (json) return store.say(JSON.stringify({ design, studio }, null, 2));
  if (!design && !studio) return store.say("No design yet. Start with /crew:design init.");
  if (design) {
    const t = design.tokens;
    const typo = (t.typography ?? {}) as Record<string, { fontFamily?: string }>;
    store.say(`${design.path}: ${t.name ?? "(no name)"} — ${t.status ?? "draft"}, revision ${revisionOf(t)}, source ${t.source ?? "?"}`);
    store.say(`  type ${[typo.display?.fontFamily, typo.body?.fontFamily].filter(Boolean).join(" / ") || "?"} · shape `
      + `${(t.rounded as Tokens | undefined)?.preset ?? "?"} · density ${(t.density as Tokens | undefined)?.preset ?? "?"}`);
  }
  if (studio) {
    const reviews = Object.entries((studio.reviews ?? {}) as Record<string, { status?: string }>);
    store.say(`studio: stage ${studio.stage ?? "palette"} · shortlist ${(studio.shortlist as string[] | undefined)?.join(", ") || "—"} · `
      + `${(studio.variants as unknown[] | undefined)?.length ?? 0} pinned variant(s) · `
      + `screens ${reviews.map(([id, r]) => `${id}=${r.status}`).join(", ") || "not reviewed"}`);
    for (const h of studio.handoffs ?? []) store.say(`  waiting on Claude: ${describe(h)}`);
  }
}

/** Remove hand-offs Claude has dealt with: one id, or all. */
export function designDone(store: Store, id: string): void {
  const studio = readStudio(store) ?? fail("No studio.json yet.");
  const list = studio.handoffs ?? [];
  const left = id === "all" ? [] : list.filter((h) => h.id !== id);
  if (left.length === list.length && list.length) fail(`No hand-off '${id}' (open: ${list.map((h) => h.id).join(", ")}).`);
  writeStudio(store, { ...studio, handoffs: left });
  store.say(`Done: ${id === "all" ? `${list.length} hand-off(s)` : id}. The studio updates by itself.`);
}

/** Block until the page hands something to Claude (or the timeout), then print it. Run in the background. */
export function designWait(store: Store, timeoutSec: number): void {
  const path = studioPath(store);
  const pending = (): Handoff[] => {
    try {
      return existsSync(path) ? ((JSON.parse(readFileSync(path, "utf8")) as Studio).handoffs ?? []) : [];
    } catch {
      return []; // mid-write: try again
    }
  };
  const started = Date.now();
  const tick = () => {
    const list = pending();
    if (list.length) {
      process.stdout.write(`The studio handed ${list.length} step(s) to Claude:\n${list.map((h) => `  ${describe(h)}`).join("\n")}\n`
        + "Do each, then `crew.mjs design done <id>` (the page updates live) and run `design wait` again.\n");
      process.exit(0);
    }
    if (Date.now() - started > timeoutSec * 1000) {
      process.stdout.write(`No hand-off from the studio in ${timeoutSec}s. Run \`design wait\` again to keep listening.\n`);
      process.exit(3);
    }
    setTimeout(tick, 500);
  };
  tick();
}
