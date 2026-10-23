/** Previews of a variant: the project's screens (shell + blocks from studio.json), the component set and a type
 * specimen. Everything inside reads the variant's CSS variables, so a preview is exactly what the tokens say. */
import { AlertTriangle, Bell, Home, Inbox, Search } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { type Block, cssVars, type Mode, pairingOf, type Screen, sizes, type StudioFile, type Variant } from "./model";

export type DataState = "normal" | "loading" | "empty" | "error";

const loaded = new Set<string>();
/** Preview fonts come from Google Fonts (the families are OFL); offline they fall back to the system stack. */
export function useFonts(pairings: string[]) {
  useEffect(() => {
    for (const id of pairings) {
      const href = pairingOf(id).google;
      if (loaded.has(href)) continue;
      loaded.add(href);
      const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
      document.head.append(link);
    }
  }, [pairings.join(",")]);
}

export function Frame({ variant, mode, studio, children, className = "" }:
  { variant: Variant; mode: Mode; studio: StudioFile | null; children: ReactNode; className?: string }) {
  useFonts([variant.pairing]);
  return <div className={`pv ${className}`} data-mode={mode} style={cssVars(variant, mode, studio) as CSSProperties}>{children}</div>;
}

/** Renders a fixed-width canvas (1280 or 375) scaled to fit its container. */
export function Viewport({ width, children, maxHeight }: { width: number; children: ReactNode; maxHeight?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setZoom(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div className="viewport" ref={outer} style={maxHeight ? { maxHeight } : undefined}>
      <div className="viewport__canvas" style={{ width, zoom }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- blocks
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const txt = (v: unknown) => (v === undefined || v === null ? "" : String(v));

function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="pv-skeleton" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <i key={i} />)}</div>;
}

function Empty({ title, body, action }: { title: string; body?: string; action?: string }) {
  return (
    <div className="pv-empty">
      <Inbox size={22} aria-hidden />
      <p className="pv-h3">{title}</p>
      {body && <p className="pv-muted">{body}</p>}
      {action && <button className="pv-btn">{action}</button>}
    </div>
  );
}

function ErrorBox({ what }: { what: string }) {
  return (
    <div className="pv-alert" role="alert">
      <AlertTriangle size={16} aria-hidden />
      <span>Couldn't load {what}. Check your connection and try again.</span>
      <button className="pv-btn pv-btn--ghost pv-btn--sm">Retry</button>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="pv-chip"><i />{children}</span>;
}

function Actions({ labels }: { labels: string[] }) {
  return <div className="pv-actions">{labels.map((l, i) => <button key={l} className={`pv-btn ${i ? "pv-btn--ghost" : ""}`}>{l}</button>)}</div>;
}

function stateOf(b: Block, state: DataState, defs: Record<string, string[]>): DataState {
  return state !== "normal" && (defs[b.type] ?? []).includes(state) ? state : "normal";
}

export function BlockView({ b, state, states }: { b: Block; state: DataState; states: Record<string, string[]> }) {
  const s = stateOf(b, state, states);
  const what = txt(b.title) || b.type.replace("-", " ");
  if (s === "loading") return <section className="pv-card"><Skeleton rows={b.type === "stat-row" ? 1 : 4} /></section>;
  if (s === "error" && b.type !== "form") return <ErrorBox what={what.toLowerCase()} />;
  if (s === "empty") return <section className="pv-card"><Empty title={`No ${what.toLowerCase()} yet`} body="They'll appear here as soon as there are some." action={list<string>(b.actions)[0]} /></section>;
  switch (b.type) {
    case "page-header":
      return (
        <header className="pv-pagehead">
          <div><h1 className="pv-h1">{txt(b.title)}</h1>{!!b.subtitle && <p className="pv-muted">{txt(b.subtitle)}</p>}</div>
          <Actions labels={list<string>(b.actions)} />
        </header>
      );
    case "stat-row":
      return (
        <div className="pv-stats">
          {list<{ label: string; value: string; delta?: string }>(b.stats).map((st) => (
            <section key={st.label} className="pv-card pv-stat">
              <span className="pv-muted pv-small">{st.label}</span>
              <span className="pv-stat__value">{st.value}</span>
              {st.delta && <span className="pv-small pv-delta">{st.delta}</span>}
            </section>
          ))}
        </div>
      );
    case "filter-bar":
      return (
        <div className="pv-filters">
          {!!b.search && <label className="pv-search"><Search size={14} aria-hidden /><input className="pv-input" placeholder={txt(b.search)} /></label>}
          {list<string>(b.filters).map((f, i) => <button key={f} className={`pv-pill ${i === 0 ? "pv-pill--on" : ""}`}>{f}</button>)}
        </div>
      );
    case "data-table": {
      const numeric = list<number>(b.numeric), status = typeof b.status === "number" ? b.status : -1;
      return (
        <section className="pv-card pv-card--flush">
          <table className="pv-table">
            <thead><tr>{list<string>(b.columns).map((c, i) => <th key={c} className={numeric.includes(i) ? "num" : ""}>{c}</th>)}</tr></thead>
            <tbody>
              {list<unknown[]>(b.rows).map((row, r) => (
                <tr key={r}>{row.map((cell, i) => (
                  <td key={i} className={numeric.includes(i) ? "num" : ""}>{i === status ? <Chip>{txt(cell)}</Chip> : txt(cell)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </section>
      );
    }
    case "list":
      return (
        <section className="pv-card pv-card--flush">
          <ul className="pv-list">
            {list<{ title: string; meta?: string; status?: string }>(b.items).map((it, i) => (
              <li key={i} className={i === 0 ? "pv-list__on" : ""}>
                <div><p className="pv-strong">{it.title}</p>{it.meta && <p className="pv-muted pv-small">{it.meta}</p>}</div>
                {it.status && <Chip>{it.status}</Chip>}
              </li>
            ))}
          </ul>
        </section>
      );
    case "detail-panel":
      return (
        <section className="pv-card">
          <h2 className="pv-h2">{txt(b.title)}</h2>
          <dl className="pv-fields">
            {list<{ label: string; value: string }>(b.fields).map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
          {list<string>(b.actions).length > 0 && <Actions labels={list<string>(b.actions)} />}
        </section>
      );
    case "form":
      return (
        <section className="pv-card pv-form">
          {!!b.title && <h2 className="pv-h2">{txt(b.title)}</h2>}
          {list<{ label: string; type?: string; placeholder?: string; help?: string }>(b.fields).map((f) => (
            <label key={f.label} className={f.type === "checkbox" ? "pv-check" : "pv-field"}>
              {f.type === "checkbox" ? <><input type="checkbox" defaultChecked /> {f.label}</> : <>
                <span className="pv-label">{f.label}</span>
                {f.type === "select" ? <select className="pv-input"><option>{f.placeholder ?? "Choose…"}</option></select>
                  : f.type === "textarea" ? <textarea className="pv-input pv-textarea" placeholder={f.placeholder} />
                    : <input className="pv-input" type={f.type ?? "text"} placeholder={f.placeholder} />}
                {f.help && <span className="pv-muted pv-small">{f.help}</span>}
              </>}
            </label>
          ))}
          {s === "error" && <p className="pv-error pv-small">Fix the highlighted field: this email is already in use.</p>}
          <div><button className="pv-btn">{txt(b.submit) || "Save"}</button></div>
        </section>
      );
    case "chart": {
      const series = list<number>(b.series), labels = list<string>(b.labels), max = Math.max(1, ...series);
      return (
        <section className="pv-card">
          <h2 className="pv-h3">{txt(b.title)}</h2>
          {b.kind === "line" ? (
            <svg className="pv-chart" viewBox={`0 0 ${Math.max(1, series.length - 1) * 40} 100`} preserveAspectRatio="none" role="img" aria-label={txt(b.title)}>
              <polyline fill="none" stroke="var(--chart-1)" strokeWidth="3" vectorEffect="non-scaling-stroke"
                points={series.map((v, i) => `${i * 40},${100 - (v / max) * 90}`).join(" ")} />
            </svg>
          ) : (
            <div className="pv-bars" role="img" aria-label={txt(b.title)}>
              {series.map((v, i) => <div key={i}><i style={{ height: `${(v / max) * 100}%` }} /><span>{labels[i] ?? ""}</span></div>)}
            </div>
          )}
        </section>
      );
    }
    case "empty-state":
      return <section className="pv-card"><Empty title={txt(b.title)} body={txt(b.body)} action={txt(b.action) || undefined} /></section>;
    case "tabs": {
      const active = typeof b.active === "number" ? b.active : 0;
      return <nav className="pv-tabs">{list<string>(b.tabs).map((t, i) => <span key={t} className={i === active ? "pv-tabs__on" : ""}>{t}</span>)}</nav>;
    }
    case "split": {
      const [l, r] = String(b.ratio ?? "2:1").split(":").map(Number);
      return (
        <div className="pv-split" style={{ gridTemplateColumns: `${l || 1}fr ${r || 1}fr` }}>
          <div className="pv-stack">{list<Block>(b.left).map((x, i) => <BlockView key={i} b={x} state={state} states={states} />)}</div>
          <div className="pv-stack">{list<Block>(b.right).map((x, i) => <BlockView key={i} b={x} state={state} states={states} />)}</div>
        </div>
      );
    }
    case "hero":
      return (
        <section className="pv-hero">
          {!!b.eyebrow && <span className="pv-eyebrow">{txt(b.eyebrow)}</span>}
          <h1 className="pv-display">{txt(b.headline)}</h1>
          {!!b.body && <p className="pv-lead">{txt(b.body)}</p>}
          <Actions labels={list<string>(b.actions)} />
        </section>
      );
    case "feature-section":
      return (
        <section className="pv-section">
          <h2 className="pv-h1">{txt(b.title)}</h2>
          <div className="pv-features">
            {list<{ title: string; body: string }>(b.items).map((it) => <div key={it.title}><p className="pv-h3">{it.title}</p><p className="pv-muted">{it.body}</p></div>)}
          </div>
        </section>
      );
    case "pricing":
      return (
        <section className="pv-section pv-pricing">
          {list<{ name: string; price: string; features?: string[]; cta?: string }>(b.plans).map((p, i) => (
            <section key={p.name} className={`pv-card ${i === 1 ? "pv-card--accent" : ""}`}>
              <p className="pv-h3">{p.name}</p><p className="pv-stat__value">{p.price}</p>
              <ul className="pv-ticks">{(p.features ?? []).map((f) => <li key={f}>{f}</li>)}</ul>
              <button className={`pv-btn ${i === 1 ? "" : "pv-btn--ghost"}`}>{p.cta ?? "Choose"}</button>
            </section>
          ))}
        </section>
      );
    case "footer":
      return <footer className="pv-footer"><span>{txt(b.text)}</span><span>{list<string>(b.links).join(" · ")}</span></footer>;
    default:
      return <p className="pv-muted">Unknown block {b.type}</p>;
  }
}

// ---------------------------------------------------------------- screens
export function ScreenView({ screen, project, state = "normal", states }:
  { screen: Screen; project: string; state?: DataState; states: Record<string, string[]> }) {
  const blocks = screen.blocks.map((b, i) => <BlockView key={i} b={b} state={state} states={states} />);
  const nav = screen.nav?.length ? screen.nav : [screen.name];
  const brand = <span className="pv-brand"><i />{project}</span>;
  if (screen.shell === "marketing") {
    return (
      <div className="pv-shell pv-shell--marketing">
        <header className="pv-mhead">{brand}<nav>{nav.map((n) => <span key={n}>{n}</span>)}</nav><button className="pv-btn pv-btn--sm">Get started</button></header>
        <main className="pv-mmain">{blocks}</main>
      </div>
    );
  }
  if (screen.shell === "topbar-app") {
    return (
      <div className="pv-shell pv-shell--top">
        <header className="pv-tophead">{brand}<nav>{nav.map((n) => <span key={n} className={n === screen.name ? "on" : ""}>{n}</span>)}</nav><Bell size={16} aria-hidden /></header>
        <main className="pv-topmain pv-stack">{blocks}</main>
      </div>
    );
  }
  return (
    <div className="pv-shell pv-shell--side">
      <aside className="pv-side">{brand}<nav>{nav.map((n, i) => (
        <span key={n} className={n === screen.name ? "on" : ""}>{i === 0 ? <Home size={15} aria-hidden /> : <i className="pv-navdot" />}{n}</span>
      ))}</nav></aside>
      <div className="pv-sidemain">
        <header className="pv-sidebar-top"><label className="pv-search"><Search size={14} aria-hidden /><input className="pv-input" placeholder="Search" /></label><span className="pv-avatar">AK</span></header>
        <main className="pv-stack pv-content">{blocks}</main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- components and type
export function ComponentSheet({ primary = "Save changes" }: { primary?: string }) {
  return (
    <div className="pv-sheet">
      <section className="pv-row">
        <button className="pv-btn">{primary}</button>
        <button className="pv-btn pv-btn--ghost">Cancel</button>
        <button className="pv-btn pv-btn--secondary">Secondary</button>
        <button className="pv-btn pv-btn--destructive">Delete</button>
        <button className="pv-btn" disabled>Disabled</button>
      </section>
      <section className="pv-row">
        <input className="pv-input" placeholder="Search or type a command" />
        <select className="pv-input"><option>All statuses</option></select>
        <label className="pv-check"><input type="checkbox" defaultChecked /> Remember me</label>
      </section>
      <section className="pv-row"><Chip>Active</Chip><Chip>Pending</Chip><span className="pv-badge">New</span><code className="pv-code">P-014</code></section>
      <div className="pv-alert" role="alert"><AlertTriangle size={16} aria-hidden /><span>Sync failed two minutes ago.</span><button className="pv-btn pv-btn--ghost pv-btn--sm">Retry</button></div>
      <div className="pv-split" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="pv-card"><p className="pv-h3">Card title</p><p className="pv-muted">A card on the card surface, with the large radius and the first elevation level.</p></section>
        <section className="pv-card pv-card--raised"><p className="pv-h3">Raised card</p><p className="pv-muted">The second shadow level, for menus and dialogs.</p></section>
      </div>
      <div className="pv-swatches">{["primary", "secondary", "accent", "muted", "destructive", "chart-1", "chart-2", "chart-3"].map((r) => (
        <span key={r}><i style={{ background: `var(--${r})` }} />{r}</span>
      ))}</div>
    </div>
  );
}

export function TypeSpecimen({ variant, headline }: { variant: Variant; headline: string }) {
  const f = pairingOf(variant.pairing);
  const s = sizes(variant);
  return (
    <div className="pv-type">
      <p className="pv-muted pv-small">{f.display.family} {f.display.weight} · {f.body.family} · {f.mono.family} · scale {variant.scale}</p>
      {[...s].reverse().slice(0, 4).map((px, i) => <p key={px} className="pv-display" style={{ fontSize: px }}>{i === 0 ? headline : `Heading ${px}px`}</p>)}
      <p style={{ fontSize: s[2], maxWidth: "68ch" }}>Body text at {s[2]}px. Good type sets the reading pace: about 60–75 characters a line, a line height of 1.5, and hierarchy shown with size and weight together.</p>
      <p className="pv-muted" style={{ fontSize: s[1] }}>Caption and metadata at {s[1]}px · Tabular numbers 1,240.00 · 86.50</p>
      <code className="pv-code">const streak = await habits.check("read-20-pages");</code>
    </div>
  );
}
