/** `learn` (write a knowledge entry) and `recall` (the entries that apply to some paths, a plan, or a topic). */
import { join } from "node:path";
import * as git from "../../core/git.js";
import { type Entry, entryText, KNOWLEDGE_TYPES, knowledgeId, recall as match, RISK_LEVELS, secretsIn, TIERS } from "../../core/memory/knowledge.js";
import type { Store } from "../../core/store.js";
import { fail, stripComments } from "../../core/text.js";

export interface LearnOptions {
  why?: string; from?: string; scope?: string; source?: string; supersedes?: string; candidate?: boolean;
  likelihood?: string; impact?: string; owner?: string; keep?: boolean;
}

export function learn(store: Store, type: string, title: string, o: LearnOptions = {}): string {
  store.require();
  if (!(KNOWLEDGE_TYPES as readonly string[]).includes(type)) fail(`Unknown type '${type}'. Use ${KNOWLEDGE_TYPES.join(", ")}.`);
  if (Boolean(o.why) === Boolean(o.from)) fail("Give exactly one of --why TEXT or --from DRAFT: the reason or evidence behind the fact.");
  const [draftFile, why] = o.from ? store.readDraft(o.from, "knowledge entry") : [null, o.why!];
  if (!stripComments(why).trim()) fail("The entry has no content. Nothing was written.");
  const found = secretsIn(`${title}\n${why}`, store.policy.policy.secrets.patterns);
  if (found.length) fail(`Refused: the entry looks like it contains a secret (${found.join(", ")}). Knowledge is committed; describe it instead.`);
  const entries = store.knowledge(false);
  const supersedes = (o.supersedes ?? "").trim();
  if (supersedes && !entries.some((e) => e.id === supersedes)) fail(`--supersedes ${supersedes}: no such entry.`);
  const risk = type === "risk" ? { likelihood: o.likelihood?.toUpperCase(), impact: o.impact?.toUpperCase(), owner: o.owner } : undefined;
  if (risk && (!RISK_LEVELS.includes(risk.likelihood ?? "") || !RISK_LEVELS.includes(risk.impact ?? ""))) {
    fail("A risk needs --likelihood and --impact (H, M or L).");
  }
  const id = knowledgeId(title, (k) => store.ws.isFile(join(store.knowledgeDir, `${k}.md`)));
  const branch = /^plan\/(P-\d+)/.exec(git.currentBranch() ?? "")?.[1];
  const text = entryText({ id, type, title, why, risk, supersedes, tier: o.candidate ? TIERS[1] : TIERS[0],
    scope: (o.scope ?? "").split(",").map((s) => s.trim()).filter(Boolean), source: o.source?.toUpperCase() ?? branch ?? "" });
  store.ws.write(join(store.knowledgeDir, `${id}.md`), text);
  if (draftFile) store.consume(draftFile, o.keep);
  store.ledger.record("learn", id, { kind: type, title, ...(supersedes ? { supersedes } : {}) });
  store.say(store.rel(join(store.knowledgeDir, `${id}.md`)));
  return id;
}

export interface RecallOptions { paths?: string; plan?: string; topic?: string; type?: string; all?: boolean; json?: boolean }

export function recallCmd(store: Store, o: RecallOptions = {}): void {
  store.require();
  let globs: string[] = [];
  if (o.plan) {
    const plan = store.plans(true).get(o.plan.toUpperCase()) ?? fail(`No plan ${o.plan.toUpperCase()}.`);
    globs = plan.touches();
    if (!globs.length) store.say(`note: ${plan.id} declares no touches: — showing everything`);
  }
  const paths = (o.paths ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const hits = match(store.knowledge(), { paths, globs, topic: o.topic, type: o.type, all: o.all });
  if (o.json) {
    for (const e of hits) store.say(JSON.stringify(view(e, store)));
    return;
  }
  if (!hits.length) store.say("Nothing recalled.");
  for (const e of hits) {
    const where = e.scope.length ? e.scope.join(", ") : "everywhere";
    store.say(`${e.id}  [${e.type}${e.origin === "playbook" ? ", playbook" : ""}${e.supersededBy ? `, superseded by ${e.supersededBy}` : ""}]  ${e.title}  (${where})`);
  }
}

function view(e: Entry, store: Store) {
  return { id: e.id, type: e.type, title: e.title, scope: e.scope, source: e.source, tier: e.tier, origin: e.origin,
    supersededBy: e.supersededBy, path: e.doc.path ? store.rel(e.doc.path) : null,
    body: stripComments(e.doc.text.replace(/^---\n[\s\S]*?\n---\n/, "")).replace(/^# .*\n/m, "").trim() };
}
