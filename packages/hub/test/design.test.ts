/** The design studio's files: saving drafts, locking, revisions, page state and hand-offs (commands/design.ts). */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { designDone, readDesign, readStudio, saveDesign, updateStudio } from "../src/commands/design.js";
import { Store } from "../src/core/store.js";
import { HubError } from "../src/core/text.js";

let root = "";
const open = () => Store.open(root);
/** Run like the server does: writes land only if the call succeeds. */
function run(fn: (s: Store) => void): string[] {
  const s = open();
  fn(s);
  s.ws.flush();
  return s.ws.output;
}
const TOKENS = { name: "Habitly — Loam Calm", source: "Wada #165",
  colors: { background: "#fff7f8", foreground: "#321f20", primary: "#e36484", "primary-foreground": "#111111", ring: "{colors.primary}" },
  typography: { pairing: "workshop", display: { fontFamily: "Bricolage Grotesque", fontWeight: 600 } }, rounded: { preset: "soft", md: "8px" } };
const file = () => readFileSync(join(root, "docs/design/DESIGN.md"), "utf8");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "hub-design-"));
  mkdirSync(join(root, ".crew"));
});

describe("saving DESIGN.md", () => {
  it("writes a draft with the tokens in template order and keeps the prose on later saves", () => {
    run((s) => saveDesign(s, { kind: "draft", tokens: TOKENS }));
    expect(file()).toMatch(/^---\nversion: alpha\nname: Habitly — Loam Calm\nstatus: draft\nrevision: 0\nsource: "Wada #165"\ncolors:\n  background: "#fff7f8"/);
    expect(file()).toContain('ring: "{colors.primary}"');
    const prose = "\n# Habitly design system\n\n## Overview\nWarm and calm.\n";
    writeFileSync(join(root, "docs/design/DESIGN.md"), file().replace(/\n---\n[\s\S]*$/, `\n---\n${prose}`));
    run((s) => saveDesign(s, { kind: "draft", tokens: { ...TOKENS, name: "Habitly — Loam Bold" } }));
    expect(file().endsWith(`---\n${prose}`)).toBe(true);
    expect(readDesign(open())!.tokens.name).toBe("Habitly — Loam Bold");
  });

  it("refuses tokens without a name or the required colours", () => {
    expect(() => run((s) => saveDesign(s, { kind: "draft", tokens: { colors: {} } }))).toThrow(HubError);
    expect(() => run((s) => saveDesign(s, { kind: "draft", tokens: { name: "x", colors: { background: "#fff" } } }))).toThrow(/primary-foreground/);
  });

  it("locks a draft at revision 1, then refuses drafts and only takes revisions with a reason", () => {
    expect(() => run((s) => saveDesign(s, { kind: "lock" }))).toThrow(/no draft/);
    run((s) => saveDesign(s, { kind: "draft", tokens: TOKENS }));
    run((s) => saveDesign(s, { kind: "lock" }));
    expect(readDesign(open())!.tokens).toMatchObject({ status: "final", revision: 1 });
    expect(readStudio(open())!.handoffs!.map((h) => h.kind)).toEqual(["locked"]);
    expect(() => run((s) => saveDesign(s, { kind: "draft", tokens: TOKENS }))).toThrow(/is final \(revision 1\)/);
    expect(() => run((s) => saveDesign(s, { kind: "revision", tokens: TOKENS }))).toThrow(/needs a reason/);
    const sharp = { ...TOKENS, rounded: { preset: "sharp", md: "4px" } };
    run((s) => saveDesign(s, { kind: "revision", tokens: sharp, reason: "sharper tables" }));
    expect(readDesign(open())!.tokens).toMatchObject({ status: "final", revision: 2, rounded: { preset: "sharp" } });
    expect(readStudio(open())!.handoffs!.at(-1)).toMatchObject({ kind: "revision", note: expect.stringContaining("DESIGN.md revision 2") });
  });

  it("files a CHORE for the drift when the hub's backlog exists", () => {
    run((s) => saveDesign(s, { kind: "draft", tokens: TOKENS }));
    run((s) => saveDesign(s, { kind: "lock" }));
    run((s) => saveDesign(s, { kind: "revision", tokens: TOKENS, reason: "no change" }));
    expect(readdirSync(join(root, ".crew"))).not.toContain("items"); // hub module off: no backlog to file into
    mkdirSync(join(root, ".crew/items"));
    cpSync(new URL("../../../plugins/crew/skills/hub/templates", import.meta.url).pathname, join(root, ".crew/templates"), { recursive: true });
    run((s) => saveDesign(s, { kind: "revision", tokens: TOKENS, reason: "darker primary" }));
    const [chore] = readdirSync(join(root, ".crew/items"));
    expect(chore).toBe("CHORE-001-bring-the-ui-onto-design-revision-3.md");
    expect(readFileSync(join(root, ".crew/items", chore), "utf8")).toContain("darker primary");
  });

  it("follows design.file in config.yaml", () => {
    writeFileSync(join(root, ".crew/config.yaml"), "design:\n  file: web/DESIGN.md\n");
    run((s) => saveDesign(s, { kind: "draft", tokens: TOKENS }));
    expect(readDesign(open())!.path).toBe("web/DESIGN.md");
    run((s) => updateStudio(s, { stage: "tune" }));
    expect(readFileSync(join(root, "web/studio.json"), "utf8")).toContain('"stage": "tune"');
  });
});

describe("studio state and hand-offs", () => {
  it("takes only page fields, validates the stage, and never reuses a hand-off id", () => {
    run((s) => updateStudio(s, { stage: "directions", shortlist: ["165"], screens: [], handoff: { kind: "finalise" } }));
    const st = readStudio(open())!;
    expect(st).toMatchObject({ stage: "directions", shortlist: ["165"] });
    expect(st.screens).toBeUndefined(); // Claude's spec is not the page's to change
    expect(() => run((s) => updateStudio(s, { stage: "later" }))).toThrow(/stage must be/);
    expect(() => run((s) => updateStudio(s, { handoff: { kind: "nap" } }))).toThrow(/handoff kind/);
    run((s) => designDone(s, "all"));
    run((s) => updateStudio(s, { handoff: { kind: "screen-change", screen: "today", note: "streak first" } }));
    expect(readStudio(open())!.handoffs).toMatchObject([{ id: "h2", kind: "screen-change", screen: "today" }]);
    expect(() => run((s) => designDone(s, "h9"))).toThrow(/No hand-off 'h9'/);
    run((s) => designDone(s, "h2"));
    expect(readStudio(open())!.handoffs).toEqual([]);
  });
});
