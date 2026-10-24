import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assemble, Doc, fill } from "../src/hub/core/work/doc.js";
import { ITEM_TYPES, TEMPLATE_NAMES, TRIAGE_SECTIONS } from "../src/hub/core/work/model.js";

const TEMPLATES = new URL("../../../plugins/crew/skills/hub/templates/", import.meta.url);
const template = (name: string) => readFileSync(new URL(name, TEMPLATES), "utf8");

const TEXT = `---
id: P-001
title: Signup
touches: src/auth/**, web/signup.tsx
---

# P-001: Signup

## Context
<!-- why -->
Because.

## Scope
**In:**
-

## Tasks
- [x] T1: route → verify: test
- [ ] T2: service → verify: test

## Progress log
`;

describe("Doc", () => {
  it("reads frontmatter and sections", () => {
    const d = Doc.parse(TEXT);
    expect(d.id).toBe("P-001");
    expect(d.touches()).toEqual(["src/auth/**", "web/signup.tsx"]);
    expect(d.hasContent("Context")).toBe(true);
    expect(d.missing(["Scope", "Context", "Nope"])).toEqual(["Scope", "Nope"]);
    expect(d.tasks()).toEqual([[true, "T1: route → verify: test"], [false, "T2: service → verify: test"]]);
  });

  it("edits frontmatter in place and appends to sections", () => {
    const d = Doc.parse(TEXT);
    d.set("status", "ready");
    d.set("touches", "src/**");
    d.appendTo("Progress log", "- first");
    d.appendTo("Outcome", "Shipped.");
    expect(d.text).toContain("touches: src/**\nstatus: ready\n---");
    expect(d.section("Progress log")).toBe("- first\n\n");
    expect(d.text.trimEnd().endsWith("## Outcome\nShipped.")).toBe(true);
  });

  it("assembles a draft into the template's section order", () => {
    const out = assemble("---\nid: X\n---\n\n## Context\n\n## Risks & open questions\n-\n\n## Progress log\n",
      "## Risks\n- r\n\n## Extra\nkept\n\n## Context\nwhy\n");
    expect(out).toBe("---\nid: X\n---\n\n## Context\nwhy\n\n## Risks & open questions\n- r\n\n## Extra\nkept\n\n## Progress log\n");
  });
});

describe("templates", () => {
  it("are all listed and render with frontmatter", () => {
    const names = readdirSync(TEMPLATES).filter((n) => n.endsWith(".md")).sort();
    expect(names).toEqual([...TEMPLATE_NAMES].sort());
    for (const name of TEMPLATE_NAMES) {
      const text = fill(template(name), { id: "X-1", title: "T", date: "2026-01-01" });
      expect(text.startsWith("---\n"), name).toBe(true);
      expect(Object.keys(Doc.parse(text).meta).length, name).toBeGreaterThan(0);
    }
  });

  it("contain every section the triage gate checks", () => {
    for (const [type, sections] of Object.entries(TRIAGE_SECTIONS)) {
      const text = template(`item-${ITEM_TYPES[type]}.md`);
      for (const s of sections) expect(text, `${type}: ${s}`).toContain(`## ${s}\n`);
    }
  });
});
