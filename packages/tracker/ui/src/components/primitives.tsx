/** Small building blocks from the DESIGN.md inventory: Chip, StatusChip, IdLink, ProgressBar, Card, Kpi, Empty. */
import type { ReactNode } from "react";
import { type GraphDoc, useData } from "../data";
import { docHref } from "../router";

export type Tone = "neutral" | "accent" | "primary" | "success" | "warning" | "destructive" | "muted";

const STATUS_TONE: Record<string, Tone> = {
  draft: "neutral", ready: "accent", "in-progress": "primary", blocked: "destructive", "in-review": "warning",
  done: "success", dropped: "muted", new: "neutral", triaged: "accent", planned: "accent", wontfix: "muted",
  duplicate: "muted", proposed: "neutral", active: "primary", released: "success", closed: "muted",
  "on-track": "success", "at-risk": "warning", late: "destructive", "no-target": "neutral", "no-scope": "neutral",
};
const HEALTH_LABEL: Record<string, string> = {
  "on-track": "on track", "at-risk": "at risk", late: "late", released: "released", dropped: "dropped",
  "no-target": "no target", "no-scope": "no scope",
};

export const toneOf = (status: string): Tone => STATUS_TONE[status] ?? "neutral";
export const healthLabel = (h: string) => HEALTH_LABEL[h] ?? h;

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

/** A tracker ID that links to its document page; shows the title on hover. */
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
