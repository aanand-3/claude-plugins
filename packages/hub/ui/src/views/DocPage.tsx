/** Doc: one tracked document — its fields, the gate it is waiting on, its sections and everything it relates to. */
import { Check, GitBranch, X } from "lucide-react";
import { Actions } from "../components/Actions";
import { Markdown } from "../components/Markdown";
import { Card, Chip, Empty, fmtDate, IdLink, PriorityChip, ProgressBar, StatusChip } from "../components/primitives";
import { RelationsPanel } from "../components/Relations";
import { type GraphDoc, useData } from "../data";

const KIND_LABEL: Record<string, string> = { FEAT: "feature", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
const NEXT_STATUS: Record<string, string> = { draft: "ready", new: "triaged", proposed: "decided" };
const GATE_NAME: Record<string, string> = { item: "Triage gate", plan: "Definition of Ready", idea: "Decision gate" };

function Gate({ doc }: { doc: GraphDoc }) {
  if (!doc.gate) return null;
  const target = NEXT_STATUS[doc.status];
  const name = GATE_NAME[doc.kind];
  const cmd = doc.kind === "item" ? `crew.mjs triage ${doc.id} --priority P2` : `crew.mjs move ${doc.id} ${target}`;
  return (
    <Card title={doc.gate.length ? `${name}: ${doc.gate.length} to fix` : `${name}: passes`}>
      {doc.gate.length ? (
        <ul className="checklist">
          {doc.gate.map((p) => <li key={p} className="checklist__fail"><X size={14} aria-hidden /><Markdown text={p} /></li>)}
        </ul>
      ) : (
        <p className="checklist__pass"><Check size={14} aria-hidden />
          {target ? <>Ready to move to <b>{target}</b>: <code>{cmd}</code></> : "Every check passes."}</p>
      )}
    </Card>
  );
}

function Facts({ doc }: { doc: GraphDoc }) {
  const ix = useData();
  const rows: [string, React.ReactNode][] = [
    ["Status", <StatusChip status={doc.status} />],
    ["Priority", (doc.priority || doc.severity) && <PriorityChip priority={doc.priority} severity={doc.severity} />],
    ["Focus", doc.kind === "goal" && doc.id === ix.g.focus && <Chip tone="accent">focus goal</Chip>],
    ["Off focus", doc.kind === "plan" && !doc.onFocus && !["done", "dropped"].includes(doc.status) && <Chip tone="warning">does not serve {ix.g.focus}</Chip>],
    ["Goal", doc.goal && <IdLink id={doc.goal} withTitle />],
    ["Plan", doc.plan && <IdLink id={doc.plan} withTitle />],
    ["Touches", doc.touches.length > 0 && <code>{doc.touches.join(", ")}</code>],
    ["Branch", doc.branch && <code>{doc.branch}</code>],
    ["Pull request", doc.pr && <a href={doc.pr} target="_blank" rel="noreferrer">{doc.pr}</a>],
    ...Object.entries(doc.dates).map(([k, v]) => [k[0].toUpperCase() + k.slice(1), fmtDate(v)] as [string, string]),
  ];
  return (
    <dl className="facts">
      {rows.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false).map(([k, v]) => (
        <div key={k} className="facts__row"><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

export function DocPage({ arg }: { arg: string }) {
  const ix = useData();
  const doc = ix.byId.get(arg);
  if (!doc) return <Empty>No document called {arg} in this hub.</Empty>;
  const sections = doc.sections.filter((s) => s.markdown);
  return (
    <div className="docpage">
      <article className="docpage__main">
        <header className="docpage__head">
          <p className="docpage__kicker">
            <span className="id">{doc.id}</span> · {doc.type ? KIND_LABEL[doc.type] : doc.kind.replace("-", " ")}
            {doc.source !== "worktree" && <Chip><GitBranch size={12} aria-hidden />live on {doc.source}</Chip>}
          </p>
          <h2 className="docpage__title">{doc.title}</h2>
          {doc.tasks && doc.tasks.total > 0 && (
            <div className="docpage__progress">
              <ProgressBar value={doc.tasks.done} total={doc.tasks.total} label={doc.kind === "idea" ? "success criteria met" : "tasks done"} />
              <span className="muted">{doc.tasks.done}/{doc.tasks.total} {doc.kind === "idea" ? "success criteria" : "tasks"}</span>
            </div>
          )}
          {doc.path && <p className="muted docpage__path">{doc.path}</p>}
        </header>
        <Gate doc={doc} />
        {sections.length ? sections.map((s) => (
          <section key={s.heading} className="docpage__section">
            <h3>{s.heading}</h3>
            <Markdown text={s.markdown} />
          </section>
        )) : <Empty>This document has no written sections yet.</Empty>}
      </article>
      <div className="docpage__side">
        <Actions key={doc.id} doc={doc} />
        <Card><Facts doc={doc} /></Card>
        <RelationsPanel id={doc.id} />
      </div>
    </div>
  );
}
