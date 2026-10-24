/** Doc: one tracked document — a header with its actions, its sections (main ones as collapsible panels, reference
 * ones as tabs), and a details rail with its fields, spend, touches and relations. */
import { Check, Circle, GitBranch, X } from "lucide-react";
import { ActionForms, ActionMenu, Result, useActions } from "../components/Actions";
import { Markdown } from "../components/Markdown";
import {
  Card, Chip, CollapsiblePanel, Empty, FileList, fmtDate, fmtTokens, IdLink, PriorityChip, ProgressBar, StatusChip, Tabs,
} from "../components/primitives";
import { RelationsPanel } from "../components/Relations";
import { type GraphDoc, type Index, useData } from "../data";
import type { Task } from "../../../src/hub/graph-types";

const KIND_LABEL: Record<string, string> = { FEAT: "feature", BUG: "bug", CHORE: "chore", SPIKE: "spike" };
const NEXT_STATUS: Record<string, string> = { draft: "ready", new: "triaged", proposed: "decided" };
const GATE_NAME: Record<string, string> = { item: "Triage gate", plan: "Definition of Ready", idea: "Decision gate" };
/** Reference sections per kind: these go in the tab strip; every other section is a collapsible panel. */
const TABBED: Record<string, string[]> = {
  plan: ["Test plan", "Rollout & rollback", "Risks & open questions", "Handoff", "Progress log", "Outcome"],
  goal: ["Notes & decisions", "Progress log"],
  idea: ["Research", "Progress log"],
  item: ["Evidence", "Environment", "Notes", "Findings"],
};
/** Child issues sort by where they are in the flow: open work first, closed last. */
const STATUS_ORDER = ["in-progress", "in-review", "blocked", "ready", "planned", "triaged", "draft", "new", "done", "dropped", "wontfix", "duplicate"];
const LONG_VERIFY = 80;

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

/** The Spend row: tokens and runs for this document (a plan adds its items), broken down by role on hover. */
function spendOf(ix: Index, doc: GraphDoc): React.ReactNode {
  const own = ix.g.spend.byRef[doc.id];
  const items = doc.kind === "plan" ? doc.items.map((i) => ix.g.spend.byRef[i]).filter(Boolean) : [];
  if (!own && !items.length) return null;
  const roles = own ? Object.entries(own.roles).sort((a, b) => b[1] - a[1]).map(([r, t]) => `${r}: ${fmtTokens(t)} tokens`).join("\n") : "";
  const itemTokens = items.reduce((n, u) => n + u.tokens, 0);
  return (
    <span title={roles || undefined}>
      {own ? <>{fmtTokens(own.tokens)} tokens · {own.runs} run{own.runs === 1 ? "" : "s"}{own.cost > 0 && <> · ${own.cost.toFixed(2)}</>}</> : "—"}
      {items.length > 0 && <span className="muted"> (items: {fmtTokens(itemTokens)})</span>}
    </span>
  );
}

function Facts({ doc }: { doc: GraphDoc }) {
  const ix = useData();
  const rows: [string, React.ReactNode][] = [
    ["Status", <StatusChip status={doc.status} />],
    ["Priority", (doc.priority || doc.severity) && <PriorityChip priority={doc.priority} severity={doc.severity} />],
    ["Focus", doc.kind === "goal" && doc.id === ix.g.focus && <Chip tone="accent">focus goal</Chip>],
    ["Off focus", doc.kind === "plan" && !doc.onFocus && !["done", "dropped"].includes(doc.status) && <Chip tone="warning">does not serve {ix.g.focus}</Chip>],
    ["Owner", doc.owner && <span title={`${doc.owner.run} · since ${doc.owner.since}`}>{doc.owner.actor}</span>],
    ["Goal", doc.goal && <IdLink id={doc.goal} withTitle />],
    ["Plan", doc.plan && <IdLink id={doc.plan} withTitle />],
    ["Branch", doc.branch && <code>{doc.branch}</code>],
    ["Pull request", doc.pr && <a href={doc.pr} target="_blank" rel="noreferrer">{doc.pr}</a>],
    ["Spend", spendOf(ix, doc)],
    ["Questions", ix.g.questions.filter((x) => x.ref === doc.id).map((x) => `${x.id} → ${x.to}${x.blocking ? " (blocking)" : ""}: ${x.text}`).join(" · ") || null],
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

/** A task's verify command in mono; a long one collapses to its first line. */
function Verify({ cmd }: { cmd: string }) {
  if (cmd.length <= LONG_VERIFY) return <code className="tasks__verify">verify: {cmd}</code>;
  return (
    <details className="tasks__verify">
      <summary><code>verify: {cmd.slice(0, LONG_VERIFY)}…</code></summary>
      <code>{cmd}</code>
    </details>
  );
}

/** A plan's tasks by `###` phase: ✓/○, the mono id, the text and its verify command. */
function TaskList({ list }: { list: Task[] }) {
  const phases = new Map<string, Task[]>();
  for (const t of list) phases.set(t.phase ?? "", [...phases.get(t.phase ?? "") ?? [], t]);
  return (
    <div className="tasks">
      {[...phases].map(([phase, ts]) => (
        <section key={phase || "."} className="tasks__phase">
          {phase && <h4 className="tasks__phasehead">{phase} <span className="muted">{ts.filter((t) => t.done).length}/{ts.length}</span></h4>}
          <ul className="tasks__list">
            {ts.map((t, i) => (
              <li key={t.id ?? i} className={`tasks__row ${t.done ? "tasks__row--done" : ""}`}>
                {t.done ? <Check size={14} className="tone-success" aria-label="done" /> : <Circle size={14} className="muted" aria-label="open" />}
                <span className="id">{t.id ?? ""}</span>
                <div className="tasks__text">
                  <Markdown text={t.text} />
                  {t.verify && <Verify cmd={t.verify.replace(/`/g, "")} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** An epic's children: a goal's items and plans, or an item's plans. */
function childrenOf(ix: Index, doc: GraphDoc): GraphDoc[] {
  if (doc.kind === "goal") return ix.g.docs.filter((d) => (d.kind === "item" || d.kind === "plan") && d.goal === doc.id);
  if (doc.kind === "item") return ix.g.docs.filter((d) => d.kind === "plan" && (d.items.includes(doc.id) || d.id === doc.plan));
  return [];
}

function ChildIssues({ doc }: { doc: GraphDoc }) {
  const ix = useData();
  const rank = (s: string) => { const i = STATUS_ORDER.indexOf(s); return i < 0 ? STATUS_ORDER.length : i; };
  const kids = childrenOf(ix, doc).sort((a, b) => rank(a.status) - rank(b.status) || a.id.localeCompare(b.id));
  if (!kids.length) return null;
  const done = kids.filter((d) => d.status === "done").length;
  return (
    <CollapsiblePanel title={`Child issues ${kids.length}`}
      aside={<span className="docpage__progress"><ProgressBar value={done} total={kids.length} label="child issues done" /><span className="muted">{done}/{kids.length} done</span></span>}>
      <div className="table-scroll">
        <table className="table table--children">
          <thead><tr><th>Status</th><th>ID</th><th>Title</th><th>Type</th><th>Priority</th><th>Owner</th><th className="num">Tasks</th></tr></thead>
          <tbody>
            {kids.map((d) => (
              <tr key={d.id}>
                <td><StatusChip status={d.status} /></td>
                <td><IdLink id={d.id} /></td>
                <td className="table__title">{d.title}</td>
                <td>{d.kind === "plan" ? "plan" : KIND_LABEL[d.type ?? ""] ?? d.type}</td>
                <td><PriorityChip priority={d.priority} severity={d.severity} /></td>
                <td>{d.owner?.actor ?? <span className="muted">—</span>}</td>
                <td className="num">{d.tasks?.total ? `${d.tasks.done}/${d.tasks.total}` : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsiblePanel>
  );
}

function Doc({ doc }: { doc: GraphDoc }) {
  const act = useActions();
  const sections = doc.sections.filter((s) => s.markdown);
  const tabbed = TABBED[doc.kind] ?? [];
  const panels = sections.filter((s) => !tabbed.includes(s.heading));
  const tabs = sections.filter((s) => tabbed.includes(s.heading));
  const tasks = doc.kind === "plan" && doc.tasks?.list.length ? doc.tasks : null;
  return (
    <div className="docpage">
      <header className="docpage__head">
        <div className="docpage__headmain">
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
        </div>
        <ActionMenu doc={doc} act={act} />
        <div className="docpage__result"><Result r={act.result} /></div>
      </header>
      <article className="docpage__main">
        <Gate doc={doc} />
        <ChildIssues doc={doc} />
        {sections.length ? panels.map((s) => s.heading === "Tasks" && tasks ? (
          <CollapsiblePanel key={s.heading} title="Tasks"
            aside={<span className="docpage__progress"><ProgressBar value={tasks.done} total={tasks.total} label="tasks done" /><span className="muted">{tasks.done}/{tasks.total}</span></span>}>
            <TaskList list={tasks.list} />
          </CollapsiblePanel>
        ) : (
          <CollapsiblePanel key={s.heading} title={s.heading}>
            <div className="docpage__section"><Markdown text={s.markdown} /></div>
          </CollapsiblePanel>
        )) : <Empty>This document has no written sections yet.</Empty>}
        <Tabs label="Reference sections" tabs={tabs.map((s) => ({
          id: s.heading, label: s.heading, content: <div className="docpage__section"><Markdown text={s.markdown} /></div>,
        }))} />
      </article>
      <div className="docpage__side">
        <Card title="Details"><Facts doc={doc} /></Card>
        {doc.touches.length > 0 && (
          <Card title={<>{doc.kind === "knowledge" ? "Applies to" : "Touches"} <span className="muted">{doc.touches.length}</span></>}>
            <FileList files={doc.touches} />
          </Card>
        )}
        <RelationsPanel id={doc.id} />
        <ActionForms doc={doc} act={act} />
      </div>
    </div>
  );
}

export function DocPage({ arg }: { arg: string }) {
  const ix = useData();
  const doc = ix.byId.get(arg);
  if (!doc) return <Empty>No document called {arg} in this hub.</Empty>;
  return <Doc key={doc.id} doc={doc} />;
}
