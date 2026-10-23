/** DocCard: the compact board card for a plan or item. The whole card links to the document page. */
import { GitBranch, Hourglass } from "lucide-react";
import { useEffect } from "react";
import type { GraphDoc } from "../data";
import { docHref } from "../router";
import { Chip, PriorityChip, ProgressBar } from "./primitives";

/** Last status seen per document, so a card that moved columns (and remounted) can mark the change. */
const seen = new Map<string, string>();

export function DocCard({ doc }: { doc: GraphDoc }) {
  const state = doc.status === "in-progress" ? "active" : doc.status === "blocked" ? "blocked" : "";
  const changed = seen.has(doc.id) && seen.get(doc.id) !== doc.status;
  useEffect(() => { seen.set(doc.id, doc.status); }, [doc.id, doc.status]);
  const related = doc.kind === "plan" ? doc.items.join(", ") : doc.plan ?? "";
  return (
    <a className={`doccard ${state ? `doccard--${state}` : ""} ${changed ? "doccard--changed" : ""}`} href={docHref(doc.id)}>
      <div className="doccard__top">
        <span className="id">{doc.id}</span>
        <PriorityChip priority={doc.priority} severity={doc.severity} />
      </div>
      <div className="doccard__title">{doc.title}</div>
      {doc.tasks && doc.tasks.total > 0 && <ProgressBar value={doc.tasks.done} total={doc.tasks.total} label="tasks done" />}
      <div className="doccard__meta">
        {doc.goal && <Chip tone="accent">{doc.goal}</Chip>}
        {related && <Chip>{related}</Chip>}
        {doc.waitsFor.length > 0 && <Chip tone="warning"><Hourglass size={12} aria-hidden />waits {doc.waitsFor.join(", ")}</Chip>}
        {doc.gate && doc.gate.length > 0 && (
          <Chip tone="neutral" title={doc.gate.join("\n")}>{doc.gate.length} to {doc.kind === "item" ? "triage" : doc.kind === "idea" ? "decide" : "ready"}</Chip>
        )}
        {doc.source !== "worktree" && <Chip title={`live copy from ${doc.source}`}><GitBranch size={12} aria-hidden />live</Chip>}
        {doc.tasks && doc.tasks.total > 0 && <span className="doccard__pts">{doc.tasks.done}/{doc.tasks.total} tasks</span>}
      </div>
    </a>
  );
}
