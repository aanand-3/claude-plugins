/** `migrate --gather`: bring the hub documents that other checkouts hold back to the main checkout, their one home since
 * BUG-018 — plans, items, goals, knowledge and the idea written in plan worktrees before hub state had one home. */
import { existsSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import * as git from "../../core/git.js";
import { Doc } from "../../core/work/doc.js";
import { STATE_RE } from "../../core/work/hubstate.js";
import type { DirKind, Store } from "../../core/store.js";
import { kindOf } from "../../core/text.js";
import { restore } from "./planning.js";

interface Copy { wt: string; f: string; text: string; mtime: number; committed: boolean }

const real = (p: string) => (existsSync(p) ? realpathSync(p) : p);
const mtimeOf = (p: string) => statSync(p, { throwIfNoEntry: false })?.mtimeMs ?? 0;

/** Each other checkout's hub documents that differ from the home's: uncommitted, or committed on its branch only. */
function copies(store: Store): Copy[] {
  const out: Copy[] = [], base = store.baseBranch();
  for (const { path: wt } of git.worktrees()) {
    if (!existsSync(wt) || real(wt) === real(store.home)) continue;
    const dirty = new Set(git.dirty(wt, ".crew").filter((f) => STATE_RE.test(f)));
    const ahead = (git.git(["-C", wt, "diff", "--name-only", "--diff-filter=AM", `${base}...HEAD`, "--", ".crew"]) ?? "")
      .split("\n").filter((f) => STATE_RE.test(f) && !dirty.has(f));
    for (const f of [...dirty, ...ahead]) {
      const text = store.ws.read(join(wt, f));
      if (text !== null && text !== store.ws.read(join(store.home, f))) {
        out.push({ wt, f, text, mtime: mtimeOf(join(wt, f)), committed: !dirty.has(f) });
      }
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime); // newest first: the copy that wins
}

/** The home's plan, item or goal with this ID, if any, whatever its file name (staged writes included). */
function homeDoc(store: Store, id: string): Doc | null {
  const kind = kindOf(id);
  return kind && kind !== "idea" ? store.docs(kind).get(id) ?? null : null;
}

export function gather(store: Store): void {
  store.require();
  const seen = new Map<string, string>(); // path, or ID and title → where its winning copy came from
  let n = 0;
  for (const c of copies(store)) {
    const from = `${store.ws.rel(c.wt) || c.wt}`, target = join(store.home, c.f);
    const doc = Doc.parse(c.text, target), key = `${doc.id} ${doc.get("title")}`;
    const prior = seen.get(c.f) ?? (doc.id ? seen.get(key) : undefined);
    if (prior) {
      store.say(`kept ${c.f} from ${prior}; an older, different copy in ${from} was dropped`);
    } else {
      const same = doc.id ? homeDoc(store, doc.id) : null;
      const onDisk = store.ws.read(target);
      if (onDisk !== null && mtimeOf(target) > c.mtime) {
        store.say(`kept ${c.f} in the main checkout (newer); the copy in ${from} differs and was dropped`);
      } else if (same && same.path !== target && same.get("title") !== doc.get("title")) {
        const id = store.nextId(doc.id.replace(/-\d+$/, ""), kindOf(doc.id) as DirKind);
        const text = c.text.replace(new RegExp(`^id: ${doc.id}$`, "m"), `id: ${id}`)
          .replace(new RegExp(`^# ${doc.id}:`, "m"), `# ${id}:`);
        const path = join(dirname(target), basename(target).replace(doc.id, id));
        store.ws.write(path, text);
        store.say(`${doc.id} in ${from} clashes with ${same.id} "${same.get("title")}": gathered as ${id} (${store.rel(path)}); `
          + `check what refers to ${doc.id}`);
      } else {
        if (same && same.path && same.path !== target) store.ws.remove(same.path); // the same document under an older name
        store.ws.write(target, c.text);
        store.say(`${onDisk === null ? "gathered" : "updated"} ${c.f} from ${from}`);
      }
      seen.set(c.f, from);
      if (doc.id) seen.set(key, from);
      n++;
    }
    if (c.committed) store.say(`  ${c.f} is committed on ${from}'s branch: drop it there before that branch merges`);
    else restore(store, c.f, c.wt); // the worktree carries code only from now on
  }
  store.say(n ? `Gathered ${n} hub document(s) into ${store.rel(store.dir)}/.` : "Nothing to gather: every hub document is in the main checkout.");
}
