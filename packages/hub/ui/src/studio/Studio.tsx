/** The design studio: Palette → Directions → Tune → Finalise → Project screens, one page, no dead ends, served by
 * `crew.mjs ui` beside the hub's view. Steps that need Claude (the rationale, the ADR, screen changes, recording
 * screens) become hand-offs in studio.json: `crew.mjs design wait` wakes Claude and the page updates live. */
import { Check, LayoutGrid, Loader2, Moon, Sun } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadPayload, onDesignChange, patchStudio, type Payload, saveDesign, type StatePatch } from "./api";
import { type DesignInfo, fromTokens, type Handoff, type Stage, STAGES, type StudioFile, toTokens, type Variant } from "./model";
import { Directions } from "./Directions";
import { Done, Finalise, Screens } from "./Finish";
import { Palette } from "./Palette";
import { Tune } from "./Tune";

const LABELS: Record<Stage, string> = { palette: "Palette", directions: "Directions", tune: "Tune", finalise: "Finalise", screens: "Project screens", done: "Done" };

export interface Ctx {
  studio: StudioFile;
  design: DesignInfo | null;
  project: string;
  locked: boolean;                 // DESIGN.md is final
  current: Variant | null;
  setCurrent: (v: Variant) => void;
  update: (patch: StatePatch) => Promise<void>;
  save: (kind: "draft" | "lock" | "revision", reason?: string) => Promise<boolean>;
  waitingOn: (kind: string, screen?: string) => boolean;
  notice: (text: string) => void;
}

const StudioContext = createContext<Ctx | null>(null);
export function useStudio(): Ctx {
  const c = useContext(StudioContext);
  if (!c) throw new Error("useStudio outside the studio");
  return c;
}

function useChromeTheme(): [string, () => void] {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("hub-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch { return "light"; }
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return [theme, () => setTheme((t) => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("hub-theme", next); } catch { /* not persisted */ }
    return next;
  })];
}

export function Studio() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [studio, setStudio] = useState<StudioFile>({});
  const [current, setCurrentState] = useState<Variant | null>(null);
  const [toast, setToast] = useState("");
  const [theme, toggleTheme] = useChromeTheme();
  const editing = useRef<number | null>(null);   // a pending save of `current`: don't overwrite it from the server

  const reload = useCallback(() => loadPayload().then((p) => {
    setPayload(p);
    const s = p.studio ?? {};
    setStudio(s);
    if (editing.current === null) {
      setCurrentState(s.current ?? (p.design ? fromTokens(p.design.tokens, s) : null));
    }
  }, (e: Error) => setError(e.message)), []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => onDesignChange(() => void reload()), [reload]);

  const design = payload?.design ?? null;
  const project = studio.project ?? String(design?.tokens.name ?? "Project").split(" — ")[0];
  const locked = design?.tokens.status === "final";
  const stage: Stage = studio.stage ?? (locked ? "screens" : "palette");

  // A screen sent back for changes becomes "revised" once Claude has dealt with its hand-off.
  const prevHandoffs = useRef<Handoff[]>([]);
  useEffect(() => {
    const now = studio.handoffs ?? [];
    const cleared = prevHandoffs.current.filter((h) => h.kind === "screen-change" && !now.some((x) => x.id === h.id));
    prevHandoffs.current = now;
    const reviews = { ...(studio.reviews ?? {}) };
    let changed = false;
    for (const h of cleared) {
      if (h.screen && reviews[h.screen]?.status === "change") { reviews[h.screen] = { status: "revised", note: reviews[h.screen].note }; changed = true; }
    }
    if (changed) void update({ reviews });
  }, [studio.handoffs]);

  const notice = (text: string) => { setToast(text); setTimeout(() => setToast(""), 3500); };

  const update = useCallback(async (patch: StatePatch) => {
    const { handoff: _, ...state } = patch;
    setStudio((s) => ({ ...s, ...state }));
    const err = await patchStudio(patch);
    if (err) notice(err);
  }, []);

  const setCurrent = (v: Variant) => {
    setCurrentState(v);
    if (editing.current !== null) clearTimeout(editing.current);
    editing.current = window.setTimeout(() => { editing.current = null; void update({ current: v }); }, 400);
  };

  const save = async (kind: "draft" | "lock" | "revision", reason?: string) => {
    const err = await saveDesign(kind, current ? toTokens(current, project, studio) : undefined, reason);
    if (err) { notice(err); return false; }
    return true;
  };

  const waitingOn = (kind: string, screen?: string) => (studio.handoffs ?? []).some((h) => h.kind === kind && (!screen || h.screen === screen));

  const ctx: Ctx = { studio, design, project, locked, current, setCurrent, update, save, waitingOn, notice };
  const at = STAGES.indexOf(stage);
  // The furthest stage the saved state supports, so going back never locks you out of later steps.
  const reached = Math.max(at, studio.shortlist?.length ? 1 : 0, studio.current ? 2 : 0, design ? 3 : 0, locked ? 4 : 0,
    Object.keys(studio.reviews ?? {}).length ? 5 : 0);
  const pending = studio.handoffs ?? [];

  const body = useMemo(() => {
    switch (stage) {
      case "palette": return <Palette />;
      case "directions": return <Directions />;
      case "tune": return <Tune />;
      case "finalise": return <Finalise />;
      case "screens": return <Screens />;
      default: return <Done />;
    }
  }, [stage]);

  if (error) return <div className="fullpage"><h1>Couldn't load the design studio</h1><p className="muted">{error}</p></div>;
  if (!payload) return <div className="fullpage"><p className="muted">Loading the design studio…</p></div>;

  return (
    <StudioContext.Provider value={ctx}>
      <div className="studio">
        <header className="studio__bar">
          <span className="studio__brand"><i aria-hidden />{project} <span className="muted">design studio</span></span>
          <a className="btn btn--ghost btn--sm" href="/" title="The hub: overview, board, plans"><LayoutGrid size={14} /> Hub</a>
          <ol className="stepper" aria-label="Steps">
            {STAGES.map((s, i) => {
              const state = i === at ? "current" : i <= reached ? "done" : "todo";
              return (
                <li key={s} className={`stepper__step stepper__step--${state}`}>
                  <button disabled={i > reached} aria-current={i === at ? "step" : undefined} onClick={() => void update({ stage: s })}>
                    <span className="stepper__dot">{state === "done" ? <Check size={12} /> : i + 1}</span>{LABELS[s]}
                  </button>
                </li>
              );
            })}
          </ol>
          {locked && <span className="chip chip--success">Final · revision {String(design?.tokens.revision ?? 1)}</span>}
          {pending.length > 0 && <span className="chip chip--warning" title={pending.map((h) => h.kind).join(", ")}><Loader2 size={12} className="spin" /> Claude: {pending.length} step(s)</span>}
          <button className="btn btn--ghost btn--icon" onClick={toggleTheme} aria-label={`Switch the studio to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="studio__main">{body}</main>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </StudioContext.Provider>
  );
}
