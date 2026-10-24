import { describe, expect, it } from "vitest";
import { asDate, byKey, firstParagraph, fixed, idList, kindOf, mdTable, pyRound, slugify } from "../src/hub/core/text.js";

describe("slugify", () => {
  it("keeps slugs short, readable and ASCII", () => {
    expect(slugify("Run planner & MigrationWorkflow with checkpoints and IdXref")).toBe("run-planner-migrationworkflow");
    expect(slugify("Fix README typo")).toBe("fix-readme-typo");
    expect(slugify("a ".repeat(50) + "end").length).toBeLessThanOrEqual(40);
    expect(slugify("Ünïcode & symbols!!")).toMatch(/^[a-z0-9-]+$/);
    expect(slugify("!!!")).toBe("untitled");
  });
  it("keeps a trailing stopword unless the title was truncated", () => {
    expect(slugify("Sign up and sign in")).toBe("sign-up-and-sign-in");
    expect(slugify("Daily check-in")).toBe("daily-check-in");
  });
});

describe("ids and dates", () => {
  it("parses ID lists and kinds", () => {
    expect(idList("p-001, P-002  FEAT-3")).toEqual(["P-001", "P-002", "FEAT-3"]);
    expect(kindOf("g-001")).toBe("goal");
    expect(kindOf("ADR-1")).toBeNull();
  });
  it("accepts only real ISO dates", () => {
    expect(asDate("2026-02-28")).toBe("2026-02-28");
    expect(asDate("2026-02-30")).toBeNull();
    expect(asDate("20260228")).toBeNull();
  });
});

describe("python parity helpers", () => {
  it("rounds half to even like Python", () => {
    expect([0.5, 1.5, 2.5, 12.5].map((x) => pyRound(x))).toEqual([0, 2, 2, 12]);
    expect(fixed(12.5)).toBe("12");
    expect(fixed(6.666, 1)).toBe("6.7");
  });
  it("sorts tuples like Python", () => {
    const rows: [boolean, number, string][] = [[true, 0, "b"], [false, 2, "a"], [false, 1, "z"]];
    expect(rows.sort(byKey((r) => r))).toEqual([[false, 1, "z"], [false, 2, "a"], [true, 0, "b"]]);
  });
  it("reads markdown tables by lower-cased header", () => {
    const t = "<!-- c -->\n| ID | Risk |\n|---|---|\n| R1 | Loss |\n|  |  |\n";
    expect(mdTable(t)).toEqual([{ id: "R1", risk: "Loss" }]);
  });
  it("joins a wrapped first paragraph into one line", () => {
    expect(firstParagraph("<!-- guide -->\nUsers sign up\n  and verify.\n\nSecond paragraph.")).toBe("Users sign up and verify.");
  });
});
