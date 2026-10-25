/** The goal queue (core/work/queries.ts → goalQueue): active goals by priority, then ID, the focus first (P-033 AC1). */
import { describe, expect, it } from "vitest";
import { Doc } from "../src/hub/core/work/doc.js";
import { goalQueue } from "../src/hub/core/work/queries.js";

const goal = (id: string, status: string, priority = "") =>
  Doc.parse(`---\nid: ${id}\nstatus: ${status}\npriority: ${priority}\n---\n\n# ${id}\n`);
const goals = new Map([
  goal("G-001", "active", "P2"), goal("G-002", "active", "P1"), goal("G-003", "proposed", "P0"),
  goal("G-004", "done", "P0"), goal("G-005", "active"),
].map((g) => [g.id, g]));

describe("goalQueue", () => {
  it("orders the active goals by priority, then ID, with no priority last", () => {
    expect(goalQueue(goals, "")).toEqual(["G-002", "G-001", "G-005"]);
  });
  it("puts an active focus goal first", () => {
    expect(goalQueue(goals, "G-001")).toEqual(["G-001", "G-002", "G-005"]);
  });
  it("never queues a closed or proposed focus", () => {
    expect(goalQueue(goals, "G-004")).toEqual(["G-002", "G-001", "G-005"]);
    expect(goalQueue(goals, "G-003")).toEqual(["G-002", "G-001", "G-005"]);
  });
});
