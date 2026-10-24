/** research skill: evidence verification and report citation checks (network stubbed; the pytest suite
 * monkeypatched the Python module's fetch, these inject one into the TS port). */
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkReport, type Fetch, fetchPage, normalize, type Row, verify } from "../../src/tools/research/verify_evidence.js";
import { PY, Repo, script } from "../helpers/repo.js";

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

  it("normalize decodes entities like html.unescape, legacy forms included", () => {
    expect(normalize("Team&nbsp;plan &ampx &notit; &eacute;")).toBe("team plan &x ¬it; é");
  });

  it("a cited row without a url reads None, as the Python printed", () => {
    const report = join(mkdtempSync(join(tmpdir(), "research-")), "r.md");
    writeFileSync(report, "[E1]");
    expect(checkReport(report, [{ id: "E1", verified: "broken" }], "2026-10-14")[0]).toEqual(
      ["E1 is broken: None — fix, re-check manually, or drop the claim"]);
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

/** A local HTTP server; `handler` answers every request. */
async function serve(handler: Parameters<typeof createServer>[1]): Promise<[Server, string]> {
  const server = createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return [server, `http://127.0.0.1:${(server.address() as AddressInfo).port}`];
}

describe.skipIf(PY)("fetchPage (the real fetch, against local servers)", () => {
  const saved = { ...process.env };
  const restore = () => { for (const k of ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "NO_PROXY", "no_proxy"]) {
    if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } };

  it("goes through the proxy in HTTP_PROXY, and around it for NO_PROXY hosts", async () => {
    const [site, siteUrl] = await serve((_q, s) => s.end("<p>hello</p>"));
    const tunnels: string[] = [];
    const [proxy, proxyUrl] = await serve((q, s) => { // plain proxying, in case the client doesn't tunnel
      tunnels.push(q.url ?? "");
      const up = request(q.url!, { method: q.method, headers: q.headers }, (r) => { s.writeHead(r.statusCode!, r.headers); r.pipe(s); });
      q.pipe(up);
    });
    proxy.on("connect", (q, sock) => { // CONNECT tunnels
      tunnels.push(q.url ?? "");
      const [host, port] = (q.url ?? "").split(":");
      const up = connect(Number(port), host, () => { sock.write("HTTP/1.1 200 Connection Established\r\n\r\n"); up.pipe(sock); sock.pipe(up); });
    });
    try {
      restore();
      process.env.HTTP_PROXY = proxyUrl;
      delete process.env.NO_PROXY; delete process.env.no_proxy;
      expect(await fetchPage(`${siteUrl}/x`, 5)).toEqual([200, "<p>hello</p>"]);
      expect(tunnels.length).toBe(1);
      process.env.NO_PROXY = "127.0.0.1";
      expect(await fetchPage(`${siteUrl}/y`, 5)).toEqual([200, "<p>hello</p>"]);
      expect(tunnels.length).toBe(1); // bypassed
    } finally {
      restore();
      site.close(); proxy.close();
    }
  });

  it("reads at most 2 MB, and a redirect loop is a redirect status (broken), not a network failure", async () => {
    const [site, url] = await serve((q, s) => {
      if (q.url === "/loop") { s.writeHead(302, { Location: "/loop" }); s.end(); return; }
      s.write("a".repeat(3_000_000));
      s.end();
    });
    try {
      restore();
      const [status, body] = await fetchPage(`${url}/big`, 5);
      expect([status, body.length]).toEqual([200, 2_000_000]);
      expect((await fetchPage(`${url}/loop`, 5))[0]).toBe(302);
    } finally {
      site.close();
    }
  });
});

describe.skipIf(PY)("verify_evidence flags and errors", () => {
  it("only undici's redirect-loop reason counts as a redirect, not any error mentioning one", async () => {
    // a name with "redirect" in it that never resolves: a lookup failure (-1) or no network (0), never 302
    expect([-1, 0]).toContain((await fetchPage("https://redirect.invalid/", 5))[0]);
  });

  it("--timeout takes Python's float syntax; inf means no timeout, nan is refused", () => {
    const repo = Repo.create(false);
    repo.write("ev.jsonl", JSON.stringify({ id: "E1", url: "https://a.example/", verified: "yes", http_status: 200 }) + "\n");
    const run = (t: string) => repo.py(script("research", "verify_evidence"), ["--no-fetch", "--file", "ev.jsonl", "--timeout", t]);
    for (const t of ["inf", "Infinity", " 7 ", "1e1", "1_0", ".5"]) expect(run(t).returncode, t).toBe(0);
    const nan = run("nan");
    expect(nan.returncode).toBe(2);
    expect(nan.stderr).toContain("nan is not a timeout");
    for (const t of ["abc", "1__0", "0x10"]) expect(run(t).stderr, t).toContain(`invalid float value: '${t}'`);
  });
});
