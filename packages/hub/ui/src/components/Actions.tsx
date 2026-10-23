/** Actions (served mode only): the few commands the page may run. Gates apply exactly as in the CLI;
 * a refusal is shown with the CLI's own message. Starting a plan (branch) and creating documents stay in the CLI. */
import { useState } from "react";
import { FLOWS, type Kind } from "../../../src/core/model";
import { type ActionResult, runAction } from "../api";
import { docsOf, type GraphDoc, useData } from "../data";
import { Card } from "./primitives";

const MOVABLE = new Set<Kind>(["plan", "item", "goal", "idea"]);
const CLI_ONLY: Record<string, string> = { "ready>in-progress": "start" }; // needs a branch: `crew.mjs start`
const FORWARD = new Set(["ready", "in-review", "done", "active", "researching", "proposed", "decided"]); // the one primary action; the rest are ghost

function Result({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  if (r.error) return <pre className="result result--error" role="alert">{r.error}</pre>;
  return r.output.length ? <pre className="result" role="status">{r.output.join("\n")}</pre> : null;
}

export function Actions({ doc }: { doc: GraphDoc }) {
  const ix = useData();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [note, setNote] = useState("");
  const [tri, setTri] = useState({ priority: doc.priority ?? "", severity: doc.severity ?? "" });
  if (!ix.served || !MOVABLE.has(doc.kind as Kind)) return null;
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
  const flow = FLOWS[doc.kind as Kind];
  // Items linked to a plan follow the plan; their stored status is not moved by hand.
  const moves = doc.kind === "item" && doc.plan ? [] : (flow[doc.status] ?? []).filter((s) => s !== "triaged");
  const focusable = doc.kind === "goal" && doc.id !== ix.g.focus && !["done", "dropped"].includes(doc.status) && docsOf(ix, "idea").length > 0;
  const triageable = doc.kind === "item" && (doc.status === "new" || doc.status === "triaged");
  return (
    <Card title="Actions" className="actions">
      {moves.length > 0 && (
        <div className="actions__row" aria-label="Move to">
          {moves.map((s) => CLI_ONLY[`${doc.status}>${s}`]
            ? <code key={s} title="creates the plan branch">crew.mjs start {doc.id}</code>
            : <button key={s} className={`btn ${FORWARD.has(s) ? "" : "btn--ghost"}`} disabled={busy}
                onClick={() => run("move", { id: doc.id, status: s, note: note || undefined })}>Move to {s}</button>)}
        </div>
      )}
      {triageable && (
        <form className="actions__row" onSubmit={(e) => { e.preventDefault(); run("triage", { id: doc.id, priority: tri.priority || undefined,
          severity: tri.severity || undefined }); }}>
          <select className="select" value={tri.priority} aria-label="Priority" onChange={(e) => setTri({ ...tri, priority: e.target.value })}>
            <option value="">Priority</option>{["P0", "P1", "P2", "P3"].map((p) => <option key={p}>{p}</option>)}
          </select>
          {doc.type === "BUG" && (
            <select className="select" value={tri.severity} aria-label="Severity" onChange={(e) => setTri({ ...tri, severity: e.target.value })}>
              <option value="">Severity</option>{["S1", "S2", "S3", "S4"].map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <button className="btn btn--ghost" disabled={busy}>{doc.status === "new" ? "Triage" : "Re-triage"}</button>
        </form>
      )}
      {focusable && (
        <div className="actions__row">
          <button className="btn btn--ghost" disabled={busy} onClick={() => run("focus", { goal: doc.id })}>Make this the focus goal</button>
        </div>
      )}
      <form className="actions__row" onSubmit={(e) => { e.preventDefault(); if (note.trim()) run("log", { id: doc.id, text: note.trim() }).then(() => setNote("")); }}>
        <input className="input actions__note" placeholder="Log a decision, deviation or blocker…" value={note} aria-label="Log note"
          onChange={(e) => setNote(e.target.value)} />
        <button className="btn btn--ghost" disabled={busy || !note.trim()}>Log</button>
      </form>
      <Result r={result} />
    </Card>
  );
}
