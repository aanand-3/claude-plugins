/** Graph: milestones, epics, items and plans as a left-to-right dependency graph (dagre layout, React Flow canvas).
 * Unfinished dependencies are highlighted; hovering a node dims everything it isn't connected to. */
import dagre from "@dagrejs/dagre";
import { Background, Controls, type Edge, Handle, MarkerType, type Node, type NodeProps, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useMemo, useState } from "react";
import { FilterBar, useFilters } from "../components/FilterBar";
import { Empty, StatusChip } from "../components/primitives";
import { type GraphDoc, type GraphEdge, matches, useData } from "../data";
import { docHref, go } from "../router";

const W = 220, H = 64;
const KINDS = new Set(["milestone", "epic", "item", "plan"]);

type DocNode = Node<{ doc: GraphDoc; dim: boolean }, "doc">;

function DocNodeView({ data }: NodeProps<DocNode>) {
  const { doc, dim } = data;
  return (
    <div className={`gnode gnode--${doc.kind} ${dim ? "gnode--dim" : ""} ${doc.status === "blocked" ? "gnode--blocked" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="gnode__top"><span className="id">{doc.id}</span><StatusChip status={doc.status} /></div>
      <div className="gnode__title">{doc.title}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { doc: DocNodeView };

/** Parent → child direction for layout and drawing (milestone → epic → item → plan; dependency → dependent). */
function oriented(e: GraphEdge): [string, string] {
  return e.type === "delivers" ? [e.to, e.from] : e.type === "mentions" ? [e.from, e.to] : [e.to, e.from];
}

export function GraphView() {
  const ix = useData();
  const [f] = useFilters();
  const [mentions, setMentions] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => {
    const docs = ix.g.docs.filter((d) => KINDS.has(d.kind) && !["dropped", "wontfix", "duplicate"].includes(d.status));
    const shown = new Set(docs.filter((d) => matches(d, f)).map((d) => d.id));
    const types = new Set<GraphEdge["type"]>(["in-milestone", "in-epic", "delivers", "depends-on", ...(mentions ? ["mentions" as const] : [])]);
    const es = ix.g.edges.filter((e) => types.has(e.type) && shown.has(e.from) && shown.has(e.to));
    const layout = new dagre.graphlib.Graph();
    layout.setGraph({ rankdir: "LR", nodesep: 16, ranksep: 64, marginx: 16, marginy: 16 });
    layout.setDefaultEdgeLabel(() => ({}));
    for (const id of shown) layout.setNode(id, { width: W, height: H });
    for (const e of es) if (e.type !== "mentions") layout.setEdge(...oriented(e));
    dagre.layout(layout);
    const near = new Set(hover ? [hover, ...es.filter((e) => e.from === hover || e.to === hover).flatMap((e) => [e.from, e.to])] : []);
    const nodes: DocNode[] = [...shown].map((id) => {
      const p = layout.node(id);
      return { id, type: "doc", position: { x: p.x - W / 2, y: p.y - H / 2 }, data: { doc: ix.byId.get(id)!, dim: hover !== null && !near.has(id) } };
    });
    const edges: Edge[] = es.map((e) => {
      const [source, target] = oriented(e);
      const waiting = e.type === "depends-on" && ix.byId.get(e.to)?.status !== "done";
      return { id: `${e.from}-${e.type}-${e.to}`, source, target, className: `gedge gedge--${e.type} ${waiting ? "gedge--waiting" : ""}`,
        animated: waiting, markerEnd: e.type === "depends-on" ? { type: MarkerType.ArrowClosed, width: 16, height: 16 } : undefined,
        label: e.type === "depends-on" ? (waiting ? "waits for" : "after") : undefined };
    });
    return { nodes, edges };
  }, [ix, f, mentions, hover]);
  return (
    <div className="stack">
      <div className="toolbar">
        <FilterBar show={["milestone", "epic", "type", "priority"]} />
        <label className="check"><input type="checkbox" checked={mentions} onChange={(e) => setMentions(e.target.checked)} /> Show mentions</label>
      </div>
      {nodes.length ? (
        <div className="graph" aria-label="Dependency graph">
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} nodesDraggable={false}
            nodesConnectable={false} onNodeClick={(_, n) => go(docHref(n.id))}
            onNodeMouseEnter={(_, n) => setHover(n.id)} onNodeMouseLeave={() => setHover(null)}>
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      ) : <Empty>Nothing matches these filters.</Empty>}
      <ul className="chart__legend">
        <li><i className="legend__line" />belongs to / delivers</li>
        <li><i className="legend__line legend__line--dep" />depends on (animated while waiting)</li>
        {mentions && <li><i className="legend__line legend__line--mention" />mentioned in text</li>}
      </ul>
    </div>
  );
}
