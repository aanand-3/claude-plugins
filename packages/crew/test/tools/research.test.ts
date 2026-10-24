/** research skill: evidence verification and report citation checks (network stubbed; the pytest suite
 * monkeypatched the Python module's fetch, these inject one into the TS port). */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkReport, type Fetch, type Row, verify } from "../../src/tools/research/verify_evidence.js";
import { PY } from "../helpers/repo.js";

const PAGES: Record<string, [number, string]> = {
  "https://acme.example/pricing": [200, "<html><script>x</script><p>Team&nbsp;plan: <b>$29 per user</b> / month</p></html>"],
  "https://moved.example/": [200, "<p>Totally different page</p>"],
  "https://gone.example/": [404, ""],
  "https://www.reddit.com/r/x/comments/1": [403, ""],
  "https://github.com/acme/tool": [200, "<title>acme/tool</title>"],
  "https://api.github.com/repos/acme/tool": [200, JSON.stringify({ stargazers_count: 1200, pushed_at: "2024-01-02T00:00:00Z", archived: false })],
};
const pages: Fetch = async (url) => PAGES[url];

const rows = (): Row[] => [
  { id: "E1", url: "https://acme.example/pricing", quote: "Team plan: $29 per user" },
  { id: "E2", url: "https://acme.example/pricing", quote: "team plan 29 per user month extra" },
  { id: "E3", url: "https://moved.example/", quote: "unlimited seats for free" },
  { id: "E4", url: "https://gone.example/", quote: "x" },
  { id: "E5", url: "https://www.reddit.com/r/x/comments/1", quote: "I wish" },
  { id: "E6", url: "https://github.com/acme/tool", quote: "" },
  { id: "E7", url: "https://acme.example/pricing", quote: "nope", verified: "manual" },
];

describe.skipIf(PY)("verify_evidence", () => {
  it("verify classifies each case", async () => {
    const data = rows();
    await verify(data, 5, false, "2026-10-14", pages);
    expect(Object.fromEntries(data.map((r) => [r.id, r.verified]))).toEqual(
      { E1: "yes", E2: "fuzzy", E3: "mismatch", E4: "broken", E5: "blocked", E6: "yes", E7: "manual" });
    expect(data[5].repo).toEqual({ stars: 1200, pushed: "2024-01-02", archived: false });
  });

  it("offline marks unverified, not broken", async () => {
    const data = rows();
    await verify(data, 5, false, "2026-10-14", async () => [-1, ""]); // every lookup fails
    expect(new Set(data.filter((r) => r.id !== "E7").map((r) => r.verified))).toEqual(new Set(["unverified"]));
  });

  it("a DNS failure is broken when the network works", async () => {
    const data = [...rows(), { id: "E8", url: "https://made-up-competitor.example/", quote: "x" }];
    await verify(data, 5, false, "2026-10-14", async (url) => PAGES[url] ?? [-1, ""]);
    expect(data.at(-1)!.verified).toBe("broken");
  });

  it("the report check flags missing and unusable citations", async () => {
    const data = rows();
    await verify(data, 5, false, "2026-10-14", pages);
    const report = join(mkdtempSync(join(tmpdir(), "research-")), "idea-research.md");
    writeFileSync(report, "Acme costs $29 [E1][E2]. Seats [E3]. Users wish [E5]. OSS [E6]. Rival [E9].");
    const [errors, warnings] = checkReport(report, data, "2026-10-14");
    expect(errors.some((e) => e.includes("E9 is cited but not"))).toBe(true);
    expect(errors.some((e) => e.startsWith("E3 is mismatch"))).toBe(true);
    expect(warnings.some((w) => w.startsWith("E5 is blocked"))).toBe(true);
    expect(warnings.some((w) => w.includes("possibly dead"))).toBe(true);
    writeFileSync(report, "Acme costs $29 [E1][E2].");
    expect(checkReport(report, data, "2026-10-14")[0]).toEqual([]);
  });
});
