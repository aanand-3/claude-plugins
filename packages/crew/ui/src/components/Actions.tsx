/** Actions (served mode only): the few commands the page may run. Gates apply exactly as in the CLI;
 * a refusal is shown with the CLI's own message. Starting a plan (branch) and creating documents stay in the CLI.
 * The moves sit in the page header as a split button (ActionMenu); triage and the log form are a rail card. */
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FLOWS, type Kind } from "../../../src/hub/core/work/model";
import { type ActionResult, runAction } from "../api";
import { docsOf, type GraphDoc, useData } from "../data";
import { Card } from "./primitives";

const MOVABLE = new Set<Kind>(["plan", "item", "goal", "idea"]);
const CLI_ONLY: Record<string, string> = { "ready>in-progress": "start" }; // needs a branch: `crew.mjs start`
const FORWARD = new Set(["ready", "in-review", "done", "active", "researching", "proposed", "decided"]); // the one primary action

export interface Act { busy: boolean; result: ActionResult | null; run: (name: string, body: Record<string, unknown>) => Promise<void> }

/** The state one document page shares between its ActionMenu, its rail card and the result under the header. */
export function useActions(): Act {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = async (name: string, body: Record<string, unknown>) => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await runAction(name, body));
    } catch (e) {
      setResult({ output: [], error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return { busy, result, run };
}

export function Result({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  if (r.error) return <pre className="result result--error" role="alert">{r.error}</pre>;
  return r.output.length ? <pre className="result" role="status">{r.output.join("\n")}</pre> : null;
}

function moves(doc: GraphDoc): string[] {
  // Items linked to a plan follow the plan; their stored status is not moved by hand.
  return doc.kind === "item" && doc.plan ? [] : (FLOWS[doc.kind as Kind][doc.status] ?? []).filter((s) => s !== "triaged");
}

/** A split button: the forward move, and a menu with the other moves, focus and the CLI-only start. */
export function ActionMenu({ doc, act }: { doc: GraphDoc; act: Act }) {
  const ix = useData();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])")?.focus();
    const outside = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  if (!ix.served || !MOVABLE.has(doc.kind as Kind)) return null;
  const all = moves(doc);
  const primary = all.find((s) => FORWARD.has(s) && !CLI_ONLY[`${doc.status}>${s}`]);
  const rest = all.filter((s) => s !== primary);
  const focusable = doc.kind === "goal" && doc.id !== ix.g.focus && !["done", "dropped"].includes(doc.status) && docsOf(ix, "idea").length > 0;
  if (!primary && !rest.length && !focusable) return null;
  const move = (s: string) => act.run("move", { id: doc.id, status: s });
  const pick = (fn: () => void) => { setOpen(false); fn(); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>(".actionmenu__toggle")?.focus();
      return;
    }
    if (!open) return;
    const items = [...menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? []];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined || !items.length) return;
    e.preventDefault();
    items[(to + items.length) % items.length].focus();
  };
  const hasMenu = rest.length > 0 || focusable;
  return (
    <div className="actionmenu" ref={root} onKeyDown={onKey}>
      {primary && <button className="btn actionmenu__primary" disabled={act.busy} onClick={() => move(primary)}>Move to {primary}</button>}
      {hasMenu && (
        <button className={`btn ${primary ? "" : "btn--ghost"} actionmenu__toggle`} aria-haspopup="menu" aria-expanded={open}
          aria-label={primary ? "More actions" : undefined} disabled={act.busy} onClick={() => setOpen(!open)}>
          {!primary && "Actions"}<ChevronDown size={16} aria-hidden />
        </button>
      )}
      {open && (
        <div className="actionmenu__menu" role="menu" ref={menu} aria-label={`Actions for ${doc.id}`}>
          {rest.map((s) => CLI_ONLY[`${doc.status}>${s}`]
            ? <button key={s} role="menuitem" disabled className="actionmenu__item" title="creates the plan branch: run it in the CLI">
                Move to {s}<code>crew.mjs start {doc.id}</code></button>
            : <button key={s} role="menuitem" className="actionmenu__item" onClick={() => pick(() => move(s))}>Move to {s}</button>)}
          {focusable && (
            <button role="menuitem" className="actionmenu__item" onClick={() => pick(() => act.run("focus", { goal: doc.id }))}>
              Make this the focus goal</button>
          )}
        </div>
      )}
    </div>
  );
}

/** The inputs: triage selects (items) and a log note. */
export function ActionForms({ doc, act }: { doc: GraphDoc; act: Act }) {
  const ix = useData();
  const [note, setNote] = useState("");
  const [tri, setTri] = useState({ priority: doc.priority ?? "", severity: doc.severity ?? "" });
  if (!ix.served || !MOVABLE.has(doc.kind as Kind)) return null;
  const triageable = doc.kind === "item" && (doc.status === "new" || doc.status === "triaged");
  return (
    <Card title={triageable ? "Triage & log" : "Log"} className="actions">
      {triageable && (
        <form className="actions__row" onSubmit={(e) => { e.preventDefault(); act.run("triage", { id: doc.id, priority: tri.priority || undefined,
          severity: tri.severity || undefined }); }}>
          <select className="select" value={tri.priority} aria-label="Priority" onChange={(e) => setTri({ ...tri, priority: e.target.value })}>
            <option value="">Priority</option>{["P0", "P1", "P2", "P3"].map((p) => <option key={p}>{p}</option>)}
          </select>
          {doc.type === "BUG" && (
            <select className="select" value={tri.severity} aria-label="Severity" onChange={(e) => setTri({ ...tri, severity: e.target.value })}>
              <option value="">Severity</option>{["S1", "S2", "S3", "S4"].map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <button className="btn btn--ghost" disabled={act.busy}>{doc.status === "new" ? "Triage" : "Re-triage"}</button>
        </form>
      )}
      <form className="actions__row" onSubmit={(e) => { e.preventDefault(); if (note.trim()) act.run("log", { id: doc.id, text: note.trim() }).then(() => setNote("")); }}>
        <input className="input actions__note" placeholder="Log a decision, deviation or blocker…" value={note} aria-label="Log note"
          onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn--ghost" disabled={act.busy || !note.trim()}>Log</button>
      </form>
    </Card>
  );
}
