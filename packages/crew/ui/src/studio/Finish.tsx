/** Stages 4–6: Finalise (Claude writes the rationale, the user locks the design), Project screens (each of the
 * project's screens rendered with the final tokens: approve, request a change, or drop — or skip for now), Done. */
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, MessageSquare, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Mode, Review } from "./model";
import { type DataState, Frame, ScreenView, Viewport } from "./Preview";
import { useStudio } from "./Studio";
import { ModeToggle, STATES } from "./Directions";

function Waiting({ children }: { children: string }) {
  return <div className="waiting"><Loader2 size={18} className="spin" aria-hidden /><span>{children}</span></div>;
}

export function Finalise() {
  const { design, locked, waitingOn, update, save } = useStudio();
  const writing = waitingOn("finalise");
  const lock = async () => {
    if (await save("lock")) void update({ stage: "screens" });
  };
  return (
    <div className="stage stage--narrow">
      <header className="stage__head">
        <div>
          <h1>Finalise the design</h1>
          <p className="muted">Claude writes the rationale into DESIGN.md: why this direction suits your users, how each token is used, the layout shell, components, do's and don'ts. Read it, then lock the design. Once locked, it changes only through a recorded revision.</p>
        </div>
      </header>
      {writing && <Waiting>{`Claude is writing the rationale into ${design?.path ?? "DESIGN.md"}. Keep this page open; it updates by itself.`}</Waiting>}
      {design && <article className="card md prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{design.body}</ReactMarkdown></article>}
      <div className="row">
        <button className="btn btn--ghost" onClick={() => void update({ stage: "tune" })}><ArrowLeft size={16} /> Back to tuning</button>
        <span className="tray__spacer" />
        {locked ? <button className="btn" onClick={() => void update({ stage: "screens" })}>Project screens <ArrowRight size={16} /></button> : (
          <button className="btn" disabled={writing || !design} onClick={() => void lock()}><Lock size={16} /> Lock the design</button>
        )}
      </div>
    </div>
  );
}

const REVIEW_LABEL: Record<Review["status"], string> = { approved: "Approved", change: "Change requested", dropped: "Dropped", revised: "Revised — review again" };
const REVIEW_TONE: Record<Review["status"], string> = { approved: "success", change: "warning", dropped: "muted", revised: "accent" };

export function Screens() {
  const { studio, project, current, update, waitingOn } = useStudio();
  const screens = studio.screens ?? [];
  const reviews = studio.reviews ?? {};
  const [started, setStarted] = useState(Object.keys(reviews).length > 0);
  const [mode, setMode] = useState<Mode>("light");
  const [device, setDevice] = useState<1280 | 375>(1280);
  const [state, setState] = useState<Record<string, DataState>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState("");
  const review = (id: string, r: Review) => void update({ reviews: { ...reviews, [id]: r } });
  const open = screens.filter((s) => !reviews[s.id] || ["change", "revised"].includes(reviews[s.id].status));
  const skip = () => void update({ stage: "done", handoff: { kind: "screens-skipped" } });
  const finish = () => {
    const by = (st: string) => screens.filter((s) => reviews[s.id]?.status === st).map((s) => s.id);
    void update({ stage: "done", handoff: { kind: "screens-done", note: `approved: ${by("approved").join(", ") || "none"}; dropped: ${by("dropped").join(", ") || "none"}` } });
  };

  if (!current) return <div className="stage"><p className="muted">Save a design first.</p></div>;
  if (!started) {
    return (
      <div className="stage stage--narrow">
        <header className="stage__head"><div>
          <h1>Lay out the project's screens?</h1>
          <p className="muted">{screens.length
            ? `Claude drafted ${screens.length} screen${screens.length > 1 ? "s" : ""} from the brief and the backlog (${screens.map((s) => s.name).join(", ")}). Review each one in the final design: approve it, ask for a change, or drop it. Approved screens are recorded in DESIGN.md and become backlog items.`
            : "No project screens were drafted. Skip for now and build them later with /crew:design page <name>, or ask Claude to draft them."}</p>
        </div></header>
        <div className="row">
          {screens.length > 0 && <button className="btn" onClick={() => setStarted(true)}>Build the project layouts <ArrowRight size={16} /></button>}
          <button className="btn btn--ghost" onClick={skip}>Skip for now</button>
        </div>
      </div>
    );
  }
  return (
    <div className="stage">
      <header className="stage__head">
        <div>
          <h1>Project screens</h1>
          <p className="muted">Each screen in the final design, with real content. Preview its loading, empty and error states, at desktop and phone width.</p>
        </div>
        <div className="row">
          <div className="segmented" role="group" aria-label="Device">
            <button className={`segmented__btn ${device === 1280 ? "segmented__btn--on" : ""}`} onClick={() => setDevice(1280)}><Monitor size={14} /> 1280</button>
            <button className={`segmented__btn ${device === 375 ? "segmented__btn--on" : ""}`} onClick={() => setDevice(375)}><Smartphone size={14} /> 375</button>
          </div>
          <ModeToggle value={mode} onChange={(m) => setMode(m === "split" ? "light" : m)} />
        </div>
      </header>
      <div className="screens">
        {screens.map((s) => {
          const r = reviews[s.id];
          const st = state[s.id] ?? "normal";
          const changing = waitingOn("screen-change", s.id);
          return (
            <section key={s.id} className={`screen ${r?.status === "dropped" ? "screen--dropped" : ""}`}>
              <header className="screen__head">
                <div><h2>{s.name}</h2>{s.purpose && <p className="muted">{s.purpose}</p>}</div>
                {r && <span className={`chip chip--${REVIEW_TONE[r.status]}`}>{REVIEW_LABEL[r.status]}</span>}
                {changing && <Waiting>Claude is revising this screen</Waiting>}
              </header>
              <div className="row">
                <div className="segmented" role="group" aria-label={`${s.name} data state`}>
                  {(["normal", "loading", "empty", "error"] as DataState[]).map((x) => (
                    <button key={x} className={`segmented__btn ${st === x ? "segmented__btn--on" : ""}`} onClick={() => setState({ ...state, [s.id]: x })}>{x}</button>
                  ))}
                </div>
              </div>
              <Frame variant={current} mode={mode} studio={studio} className={device === 375 ? "pv--phone" : ""}>
                <Viewport width={device}><ScreenView screen={s} project={project} state={st} states={STATES} /></Viewport>
              </Frame>
              {asking === s.id ? (
                <div className="row row--wrap">
                  <textarea className="input screen__note" rows={2} placeholder="What should change? (e.g. put the streak first, drop the chart)" value={note[s.id] ?? ""}
                    onChange={(e) => setNote({ ...note, [s.id]: e.target.value })} />
                  <button className="btn" disabled={!note[s.id]?.trim()} onClick={() => {
                    void update({ reviews: { ...reviews, [s.id]: { status: "change", note: note[s.id] } }, handoff: { kind: "screen-change", screen: s.id, note: note[s.id] } });
                    setAsking("");
                  }}>Send to Claude</button>
                  <button className="btn btn--ghost" onClick={() => setAsking("")}>Cancel</button>
                </div>
              ) : (
                <div className="row">
                  <button className="btn" onClick={() => review(s.id, { status: "approved" })} disabled={changing}><Check size={16} /> Approve</button>
                  <button className="btn btn--ghost" onClick={() => setAsking(s.id)} disabled={changing}><MessageSquare size={16} /> Request a change</button>
                  <button className="btn btn--ghost" onClick={() => review(s.id, { status: "dropped" })} disabled={changing}><Trash2 size={16} /> Drop</button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="tray">
        <span className="muted">{screens.length - open.length} of {screens.length} reviewed{open.length ? ` · ${open.map((s) => s.name).join(", ")} still open` : ""}</span>
        <span className="tray__spacer" />
        <button className="btn btn--ghost" onClick={skip}>Skip the rest</button>
        <button className="btn" disabled={open.length > 0} onClick={finish}>Done: record the screens <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

export function Done() {
  const { studio, design, waitingOn, update } = useStudio();
  const approved = (studio.screens ?? []).filter((s) => studio.reviews?.[s.id]?.status === "approved");
  const recording = waitingOn("screens-done");
  return (
    <div className="stage stage--narrow">
      <header className="stage__head"><div>
        <h1>The design is set</h1>
        <p className="muted">{design?.path ?? "DESIGN.md"} is the one home of visual decisions. Every page is built from its tokens, shell and components; `check_design.py` flags drift.</p>
      </div></header>
      {recording && <Waiting>Claude is recording the approved screens in DESIGN.md and adding a backlog item for each.</Waiting>}
      <article className="card">
        <h2>What happens next</h2>
        <ul className="ticks">
          {approved.length ? approved.map((s) => <li key={s.id}><b>{s.name}</b>: build it with <code>/crew:design page {s.id}</code></li>)
            : <li>Build screens when you need them with <code>/crew:design page &lt;name&gt;</code>.</li>}
          <li>To change the design later, open this studio and start a revision (it records an ADR and a CHORE for the code that drifts).</li>
        </ul>
      </article>
      <div className="row"><button className="btn btn--ghost" onClick={() => void update({ stage: "screens" })}><ArrowLeft size={16} /> Project screens</button></div>
    </div>
  );
}
