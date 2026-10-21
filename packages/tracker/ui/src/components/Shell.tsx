/** AppShell: sidebar nav, top bar with search and theme toggle, and the content area every view renders into. */
import { Menu, Moon, Search, Sun } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../data";
import { docHref, go } from "../router";
import type { ViewDef } from "../views";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("tracker-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* storage blocked: follow the OS */ }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = () => setTheme((t) => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("tracker-theme", next); } catch { /* not persisted */ }
    return next;
  });
  return [theme, toggle];
}

function SearchBox() {
  const { g } = useData();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? g.docs.filter((d) => d.id.toLowerCase().includes(s) || d.title.toLowerCase().includes(s)).slice(0, 8) : [];
  }, [q, g]);
  const pick = (id: string) => { go(docHref(id)); setQ(""); setOpen(false); input.current?.blur(); };
  return (
    <div className="search">
      <Search size={16} className="search__icon" aria-hidden />
      <input ref={input} className="input search__input" placeholder="Search plans, items, epics…  /" value={q}
        aria-label="Search documents" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) pick(hits[0].id); if (e.key === "Escape") input.current?.blur(); }} />
      {open && hits.length > 0 && (
        <ul className="search__results" role="listbox">
          {hits.map((d) => (
            <li key={d.id} role="option" aria-selected={false} onMouseDown={() => pick(d.id)}>
              <span className="id">{d.id}</span> {d.title} <span className="muted">{d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Shell({ views, current, title, children }: { views: ViewDef[]; current: string; title: string; children: ReactNode }) {
  const { g, served } = useData();
  const [theme, toggleTheme] = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [current]);
  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? "sidebar--open" : ""}`}>
        <a className="sidebar__brand" href="#/"><i className="sidebar__mark" aria-hidden />{g.project.name}</a>
        <nav aria-label="Views">
          {views.map((v) => (
            <a key={v.route} href={`#/${v.route}`} className={`navlink ${current === v.route ? "navlink--active" : ""}`}
              aria-current={current === v.route ? "page" : undefined}>
              <v.icon size={16} aria-hidden />{v.title}
            </a>
          ))}
        </nav>
        <footer className="sidebar__foot">
          <span>{served ? "Live from" : "Snapshot of"} <code>{g.project.branch ?? "detached"}</code></span>
          <span>{served ? "updates as files change" : `exported ${new Date(g.generatedAt).toLocaleString()}`}</span>
        </footer>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn--ghost btn--icon topbar__menu" aria-label="Open navigation" onClick={() => setNavOpen((o) => !o)}>
            <Menu size={18} />
          </button>
          <h1 className="topbar__title">{title}</h1>
          <SearchBox />
          <button className="btn btn--ghost btn--icon" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
