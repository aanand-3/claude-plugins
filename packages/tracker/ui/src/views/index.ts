/** The view registry: adding a page is adding a file and one entry here. */
import { CalendarRange, FileText, KanbanSquare, LayoutDashboard, ListTree, type LucideIcon, Network } from "lucide-react";
import type { ComponentType } from "react";
import { Board } from "./Board";
import { DocPage } from "./DocPage";
import { GraphView } from "./GraphView";
import { Overview } from "./Overview";
import { Roadmap } from "./Roadmap";
import { Tree } from "./Tree";

export interface ViewDef {
  route: string;
  title: string;
  icon: LucideIcon;
  component: ComponentType<{ arg: string }>;
  nav: boolean;           // listed in the sidebar
}

export const VIEWS: ViewDef[] = [
  { route: "overview", title: "Overview", icon: LayoutDashboard, component: Overview, nav: true },
  { route: "board", title: "Board", icon: KanbanSquare, component: Board, nav: true },
  { route: "tree", title: "Hierarchy", icon: ListTree, component: Tree, nav: true },
  { route: "roadmap", title: "Roadmap", icon: CalendarRange, component: Roadmap, nav: true },
  { route: "graph", title: "Graph", icon: Network, component: GraphView, nav: true },
  { route: "doc", title: "Document", icon: FileText, component: DocPage, nav: false },
];
