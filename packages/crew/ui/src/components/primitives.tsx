/** Small building blocks from the DESIGN.md inventory: Chip, StatusChip, IdLink, ProgressBar, Card, Kpi, Empty,
 * CollapsiblePanel, Tabs, FileList. */
import { ChevronRight } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { type GraphDoc, useData } from "../data";
import { docHref } from "../router";

export type Tone = "neutral" | "accent" | "primary" | "success" | "warning" | "destructive" | "muted";

const STATUS_TONE: Record<string, Tone> = {
  draft: "neutral", ready: "accent", "in-progress": "primary", blocked: "destructive", "in-review": "warning",
  done: "success", dropped: "muted", new: "neutral", triaged: "accent", planned: "accent", wontfix: "muted",
  duplicate: "muted", proposed: "neutral", active: "primary", exploring: "neutral", researching: "accent",
  decided: "success", killed: "muted", superseded: "muted",
};

export const toneOf = (status: string): Tone => STATUS_TONE[status] ?? "neutral";

export function Chip({ tone = "neutral", dot, children, title }: { tone?: Tone; dot?: boolean; children: ReactNode; title?: string }) {
  return <span className={`chip chip--${tone}`} title={title}>{dot && <i className="chip__dot" />}{children}</span>;
}

export function StatusChip({ status, label }: { status: string; label?: string }) {
  if (!status) return null;
  return <Chip tone={toneOf(status)} dot>{label ?? status}</Chip>;
}

export function PriorityChip({ priority, severity }: { priority: string | null; severity?: string | null }) {
  const tone: Tone = priority === "P0" || severity === "S1" || severity === "S2" ? "destructive"
    : priority === "P1" || severity === "S3" ? "warning" : "neutral";
  if (!priority && !severity) return null;
  return <Chip tone={tone}>{[severity, priority].filter(Boolean).join(" · ")}</Chip>;
}

/** A hub ID that links to its document page; shows the title on hover. */
export function IdLink({ id, withTitle }: { id: string; withTitle?: boolean }) {
  const doc = useData().byId.get(id);
  if (!doc) return <span className="id">{id}</span>;
  return (
    <a className="idlink" href={docHref(id)} title={doc.title}>
      <span className="id">{id}</span>{withTitle && <span className="idlink__title">{doc.title}</span>}
    </a>
  );
}

export function ProgressBar({ value, total, label }: { value: number; total: number; label?: string }) {
  const pct = total ? Math.round((100 * value) / total) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={total} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && <header className="card__head"><h3 className="card__title">{title}</h3>{aside}</header>}
      {children}
    </section>
  );
}

export function Kpi({ value, caption, tone }: { value: ReactNode; caption: ReactNode; tone?: Tone }) {
  return (
    <div className="card kpi">
      <b className={`kpi__value ${tone ? `tone-${tone}` : ""}`}>{value}</b>
      <span className="kpi__caption">{caption}</span>
    </div>
  );
}

/** Why it's empty, and the command that fills it. */
export function Empty({ children, command }: { children: ReactNode; command?: string }) {
  return <div className="empty"><p>{children}</p>{command && <code>{command}</code>}</div>;
}

export function DocTitle({ doc }: { doc: GraphDoc }) {
  return <a className="doctitle" href={docHref(doc.id)}><span className="id">{doc.id}</span> {doc.title}</a>;
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

/** 12.4k, 3.1M: token counts at a glance. */
export const fmtTokens = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n));

/** A section that collapses (native details, open by default). */
export function CollapsiblePanel({ title, aside, children, open = true }: { title: ReactNode; aside?: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="panel" open={open}>
      <summary className="panel__head">
        <ChevronRight size={16} className="panel__chev" aria-hidden />
        <h3 className="panel__title">{title}</h3>
        {aside && <span className="panel__aside">{aside}</span>}
      </summary>
      <div className="panel__body">{children}</div>
    </details>
  );
}

export interface Tab { id: string; label: ReactNode; content: ReactNode }

/** A tab strip: arrow keys, Home and End move between tabs; the first tab starts selected. */
export function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [current, setCurrent] = useState(tabs[0]?.id);
  if (!tabs.length) return null;
  const at = Math.max(tabs.findIndex((t) => t.id === current), 0);
  const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = tabs[(to + tabs.length) % tabs.length];
    setCurrent(next.id);
    document.getElementById(`tab-${slug(next.id)}`)?.focus();
  };
  const tab = tabs[at];
  return (
    <section className="tabs">
      <div className="tabs__list" role="tablist" aria-label={label} onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button key={t.id} id={`tab-${slug(t.id)}`} role="tab" aria-selected={i === at} aria-controls={`tabpanel-${slug(t.id)}`}
            tabIndex={i === at ? 0 : -1} className={`tabs__tab ${i === at ? "tabs__tab--on" : ""}`} onClick={() => setCurrent(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabs__panel" role="tabpanel" id={`tabpanel-${slug(tab.id)}`} aria-labelledby={`tab-${slug(tab.id)}`}>{tab.content}</div>
    </section>
  );
}

const FILES_SHOWN = 10;

/** Paths one per line, grouped by top-level directory: the first 10, then "Show all"; a filter when there are many. */
export function FileList({ files }: { files: string[] }) {
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const hits = q ? files.filter((f) => f.toLowerCase().includes(q.toLowerCase())) : files;
  const shown = all || q ? hits : hits.slice(0, FILES_SHOWN);
  const groups = new Map<string, string[]>();
  for (const f of shown) {
    const top = f.includes("/") ? `${f.split("/")[0]}/` : "";
    groups.set(top, [...groups.get(top) ?? [], f]);
  }
  return (
    <div className="filelist">
      {files.length > 20 && (
        <input className="input filelist__filter" type="search" placeholder={`Filter ${files.length} paths…`} value={q}
          aria-label="Filter paths" onChange={(e) => setQ(e.target.value)} />
      )}
      <div className="filelist__box">
        {[...groups].map(([top, fs]) => (
          <div key={top || "."} className="filelist__group">
            {top && groups.size > 1 && <span className="filelist__dir">{top}</span>}
            <ul>{fs.map((f) => <li key={f}><code>{f}</code></li>)}</ul>
          </div>
        ))}
        {q && !hits.length && <p className="muted">No path matches.</p>}
      </div>
      {!q && hits.length > FILES_SHOWN && (
        <button className="btn btn--ghost btn--sm" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${hits.length}`}</button>
      )}
    </div>
  );
}
