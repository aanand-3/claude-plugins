/** The layout sweep's in-page scan: what counts as a box, which areas scroll on purpose, and the check itself. `scanLayout`
 * runs inside the page (serialised with toString and evaluated over CDP), so it uses nothing from this module's scope. */

/** Containers whose content must stay inside them: cards, chips, rails, panels, rows. */
export const BOX_SELECTORS = [".doccard", ".card", ".chip", ".panel", ".docpage__side", ".docpage__main", ".docpage__head",
  ".relations", ".facts", ".tasks", ".tree__row", ".live__row", ".spend__row", ".topbar", ".sidebar", ".toolbar", ".empty"];
/** Areas that scroll or clip on purpose (tables, code, the board, the graph, menus): nothing inside them is a finding. */
export const SKIP_SELECTORS = [".board", ".table-scroll", ".table", "pre", ".md table", ".tabs__list", ".filelist__box", ".graph",
  ".react-flow", ".search__results", "[role=menu]", ".actionmenu", "select", "input", "textarea", "svg"];
/** Pixels of slack before an edge counts as crossed (sub-pixel rounding). */
export const TOLERANCE = 1;

export interface Finding { kind: "sideways scroll" | "overflow"; element: string; detail: string }

export function scanLayout(boxes: string[], skips: string[], tol: number): Finding[] {
  const skip = skips.join(",");
  const describe = (el: Element) => {
    const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join("");
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text.length > 40 ? `${text.slice(0, 40)}…` : text}"` : ""}`;
  };
  const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const clips = (el: Element) => getComputedStyle(el).overflowX !== "visible";
  /** How far right an element reaches: its box, or its own text when that runs past it (a long unbroken word) and the
   * element doesn't clip it (an ellipsis keeps the text's range wide but shows nothing past the box). */
  const right = (el: Element) => {
    let r = el.getBoundingClientRect().right;
    if (clips(el)) return r;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      r = Math.max(r, range.getBoundingClientRect().right);
    }
    return r;
  };
  /** Clipped on the way up to `top` (exclusive): its overflow is hidden or scrolls, on purpose. */
  const clippedBelow = (el: Element, top: Element | null) => {
    for (let a = el.parentElement; a && a !== top; a = a.parentElement) if (clips(a)) return true;
    return false;
  };
  const deepest = (els: Element[]) => els.filter((el) => !els.some((o) => o !== el && el.contains(o)));
  const out: Finding[] = [];
  const seen = new Set<Element>();
  const add = (kind: Finding["kind"], el: Element, detail: string) => {
    if (seen.has(el)) return;
    seen.add(el);
    out.push({ kind, element: describe(el), detail });
  };
  // overflow: an element reaching past its box's right edge, unless something between clips it; boxes inside an area that
  // scrolls on purpose (a card on the board) are still boxes, but what sits in such an area inside the box is not checked
  for (const box of document.querySelectorAll(boxes.join(","))) {
    if (!visible(box) || clips(box)) continue;
    const edge = box.getBoundingClientRect().right + tol;
    const past = [...box.querySelectorAll("*")].filter((el) => {
      const area = el.closest(skip);
      return !(area && box.contains(area)) && visible(el) && right(el) > edge && !clippedBelow(el, box);
    });
    for (const el of deepest(past)) add("overflow", el, `${Math.round(right(el) - edge + tol)}px past ${describe(box).split(" ")[0]}`);
    if (!past.length && right(box) > edge) add("overflow", box, `its text ${Math.round(right(box) - edge + tol)}px past its edge`);
  }
  // sideways scroll: the page is wider than the viewport; name the deepest elements reaching past its right edge
  const vw = document.documentElement.clientWidth;
  const page = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (page > vw + tol) {
    const past = deepest([...document.body.querySelectorAll("*")].filter((el) => !el.closest(skip) && visible(el)
      && right(el) > vw + tol && !clippedBelow(el, null)));
    const detail = `page ${page}px wide in a ${vw}px viewport`;
    for (const el of past.slice(0, 3)) {
      seen.delete(el); // also an overflow: the page scroll is reported in its own right
      add("sideways scroll", el, detail);
    }
    if (!past.length) add("sideways scroll", document.body, detail);
  }
  return out;
}
