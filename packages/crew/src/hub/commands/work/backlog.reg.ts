/** backlog: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { newItem, regoal, triage } from "./backlog.js";
import { overlaps } from "./overlap.js";
import { ITEM_FIELDS, obj, type Registration, s, str, text, up } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  new-item feat|bug|chore|spike TITLE (--from DRAFT | --why TEXT) [--goal] [--priority] [--severity]",
    "  new-item … --origin P-###|ID                       record where the item was found (else the caller's plan worktree or claim)",
    "  triage ID [--priority P1] [--severity S2] [--goal G-001] [--approved-by NAME]",
    "  triage ID --reject wontfix|duplicate --note TXT",
    "  overlaps ID [--json]                          similar open items and plans in flight whose touches cover the item's paths (PM, at triage)",
    "  regoal ID G-###|none --note TXT                  move an item or plan (with its items) to another goal, or off it (PM)",
  ],
  cli: {
    "new-item": { pos: ["type", "title"], str: ["from", "why", "goal", "origin", "priority", "severity"], flag: ["keep-draft"],
      run: (s, a) => newItem(s, a.pos[0], a.pos[1], str(a, "from"), str(a, "why"), {
        goal: str(a, "goal"), origin: str(a, "origin"), priority: str(a, "priority"), severity: str(a, "severity"),
        keep: !!a.opt["keep-draft"] }) },
    triage: { pos: ["id"], str: ["priority", "severity", "goal", "note", "reject", "approved-by"],
      choices: { reject: ["duplicate", "wontfix"] },
      run: (s, a) => triage(s, a.pos[0].toUpperCase(), {
        priority: str(a, "priority"), severity: str(a, "severity"), goal: str(a, "goal"), reject: str(a, "reject"),
        note: str(a, "note"), approvedBy: str(a, "approved-by") }) },
    overlaps: { pos: ["id"], flag: ["json"], run: (s, a) => overlaps(s, a.pos[0].toUpperCase(), !!a.opt.json) },
    regoal: { pos: ["id", "goal"], str: ["note"],
      run: (s, a) => regoal(s, a.pos[0].toUpperCase(), a.pos[1], str(a, "note")) },
  },
  tools: {
    new_item: { description: "Capture a backlog item (`crew.mjs new-item`). Give exactly one of `from` (a draft file with the item template's sections) or `why` (one-paragraph summary). Priority or severity at intake triage it if the triage gate passes.",
      input: obj({ type: { type: "string", enum: ["feat", "bug", "chore", "spike"] }, title: text("short title"),
        from: text("path to a draft file"), why: text("summary, instead of a draft"), ...ITEM_FIELDS }, ["type", "title"]),
      run: (st, a) => newItem(st, s(a, "type")!, s(a, "title")!, s(a, "from"), s(a, "why"), {
        goal: s(a, "goal"), priority: s(a, "priority"), severity: s(a, "severity") }) },
    triage: { description: "Triage a new item (`crew.mjs triage`): set priority/severity/goal, or reject it with a note.",
      input: obj({ id: text("e.g. FEAT-003"), ...ITEM_FIELDS, reject: { type: "string", enum: ["duplicate", "wontfix"] },
        note: text("required with reject") }, ["id"]),
      run: (st, a) => triage(st, up(a, "id"), { priority: s(a, "priority"), severity: s(a, "severity"), goal: s(a, "goal"),
        reject: s(a, "reject"), note: s(a, "note") }) },
    overlaps: { description: "Overlap candidates for an item (`crew.mjs overlaps`), read-only: open items with similar titles and plans in flight whose touches cover a path the item names; `architect` is set when the hub flags a technical question.",
      input: obj({ id: text("e.g. FEAT-003"), json: { type: "boolean" } }, ["id"]),
      run: (st, a) => overlaps(st, up(a, "id"), a.json === true) },
    regoal: { description: "Move an item, or a plan with all its items, to another goal or off any (`crew.mjs regoal`, the PM's): `goal` is G-### or `none`, `note` says why. Refused for closed work, done or dropped goals, and an item in an open plan.",
      input: obj({ id: text("e.g. FEAT-003 or P-004"), goal: text("G-### or none"), note: text("why it moves") }, ["id", "goal", "note"]),
      run: (st, a) => regoal(st, up(a, "id"), s(a, "goal") ?? "", s(a, "note")) },
  },
};
