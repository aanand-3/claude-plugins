/** Hash routing (`#/board`, `#/doc/P-012`): works from file:// with no server. */
import { useEffect, useState } from "react";

export interface Route { view: string; arg: string }

function parse(hash: string): Route {
  const [view = "", arg = ""] = decodeURIComponent(hash.replace(/^#\/?/, "")).split("/");
  return { view: view || "overview", arg };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const docHref = (id: string) => `#/doc/${encodeURIComponent(id)}`;

export function go(href: string): void {
  location.hash = href.replace(/^#/, "");
}
