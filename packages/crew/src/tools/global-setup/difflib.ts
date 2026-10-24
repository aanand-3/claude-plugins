/** Python's difflib.unified_diff for lists of lines, ported step for step (SequenceMatcher with no junk function and
 * autojunk on), so `install_global --check` shows the same hunks the Python script showed. */

type Opcode = [tag: "equal" | "replace" | "delete" | "insert", i1: number, i2: number, j1: number, j2: number];

class SequenceMatcher {
  private b2j = new Map<string, number[]>();

  constructor(private a: string[], private b: string[]) {
    b.forEach((elt, i) => {
      if (!this.b2j.has(elt)) this.b2j.set(elt, []);
      this.b2j.get(elt)!.push(i);
    });
    if (b.length >= 200) { // autojunk: drop elements that make up over 1% of b
      const ntest = Math.floor(b.length / 100) + 1;
      for (const [elt, idxs] of this.b2j) if (idxs.length > ntest) this.b2j.delete(elt);
    }
  }

  private findLongestMatch(alo: number, ahi: number, blo: number, bhi: number): [number, number, number] {
    const { a, b } = this;
    let besti = alo, bestj = blo, bestsize = 0;
    let j2len = new Map<number, number>();
    for (let i = alo; i < ahi; i++) {
      const next = new Map<number, number>();
      for (const j of this.b2j.get(a[i]) ?? []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) ?? 0) + 1;
        next.set(j, k);
        if (k > bestsize) [besti, bestj, bestsize] = [i - k + 1, j - k + 1, k];
      }
      j2len = next;
    }
    // no junk function, so only the popular elements autojunk removed can extend the match
    while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) { besti--; bestj--; bestsize++; }
    while (besti + bestsize < ahi && bestj + bestsize < bhi && a[besti + bestsize] === b[bestj + bestsize]) bestsize++;
    return [besti, bestj, bestsize];
  }

  private matchingBlocks(): [number, number, number][] {
    const la = this.a.length, lb = this.b.length;
    const queue: [number, number, number, number][] = [[0, la, 0, lb]];
    const blocks: [number, number, number][] = [];
    while (queue.length) {
      const [alo, ahi, blo, bhi] = queue.pop()!;
      const [i, j, k] = this.findLongestMatch(alo, ahi, blo, bhi);
      if (!k) continue;
      blocks.push([i, j, k]);
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
    blocks.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    const merged: [number, number, number][] = [];
    let [i1, j1, k1] = [0, 0, 0];
    for (const [i2, j2, k2] of blocks) {
      if (i1 + k1 === i2 && j1 + k1 === j2) k1 += k2;
      else {
        if (k1) merged.push([i1, j1, k1]);
        [i1, j1, k1] = [i2, j2, k2];
      }
    }
    if (k1) merged.push([i1, j1, k1]);
    merged.push([la, lb, 0]);
    return merged;
  }

  private opcodes(): Opcode[] {
    let i = 0, j = 0;
    const out: Opcode[] = [];
    for (const [ai, bj, size] of this.matchingBlocks()) {
      const tag = i < ai && j < bj ? "replace" : i < ai ? "delete" : j < bj ? "insert" : "";
      if (tag) out.push([tag, i, ai, j, bj]);
      [i, j] = [ai + size, bj + size];
      if (size) out.push(["equal", ai, i, bj, j]);
    }
    return out;
  }

  groupedOpcodes(n = 3): Opcode[][] {
    const codes = this.opcodes();
    if (!codes.length) codes.push(["equal", 0, 1, 0, 1]);
    const first = codes[0], last = codes.at(-1)!;
    if (first[0] === "equal") codes[0] = ["equal", Math.max(first[1], first[2] - n), first[2], Math.max(first[3], first[4] - n), first[4]];
    if (last[0] === "equal") codes[codes.length - 1] = ["equal", last[1], Math.min(last[2], last[1] + n), last[3], Math.min(last[4], last[3] + n)];
    const groups: Opcode[][] = [];
    let group: Opcode[] = [];
    for (let [tag, i1, i2, j1, j2] of codes) {
      if (tag === "equal" && i2 - i1 > 2 * n) {
        group.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)]);
        groups.push(group);
        group = [];
        [i1, j1] = [Math.max(i1, i2 - n), Math.max(j1, j2 - n)];
      }
      group.push([tag, i1, i2, j1, j2]);
    }
    if (group.length && !(group.length === 1 && group[0][0] === "equal")) groups.push(group);
    return groups;
  }
}

const range = (start: number, stop: number) => {
  const length = stop - start;
  return length === 1 ? `${start + 1}` : `${length ? start + 1 : start},${length}`;
};

export function unifiedDiff(a: string[], b: string[], from: string, to: string): string {
  const out: string[] = [];
  for (const group of new SequenceMatcher(a, b).groupedOpcodes()) {
    if (!out.length) out.push(`--- ${from}\n`, `+++ ${to}\n`);
    const first = group[0], last = group.at(-1)!;
    out.push(`@@ -${range(first[1], last[2])} +${range(first[3], last[4])} @@\n`);
    for (const [tag, i1, i2, j1, j2] of group) {
      if (tag === "equal") { out.push(...a.slice(i1, i2).map((l) => " " + l)); continue; }
      if (tag !== "insert") out.push(...a.slice(i1, i2).map((l) => "-" + l));
      if (tag !== "delete") out.push(...b.slice(j1, j2).map((l) => "+" + l));
    }
  }
  return out.join("");
}
