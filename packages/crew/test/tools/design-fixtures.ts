/** The DESIGN.md, config and studio spec the design tests share. */
export const DESIGN = `---
name: Demo — Ledger Calm
source: "Wada #214"
colors:
  background: "#fffaef"
  foreground: "#292316"
  muted-foreground: "#716a5d"
  primary: "#4f4086"
  primary-foreground: "#ffffff"
  ring: "{colors.primary}"
  dark-background: "#1d1911"
  dark-foreground: "#f7eddb"
typography:
  body:
    fontFamily: Source Sans 3
  display:
    fontFamily: Fraunces
rounded:
  md: 8px
---

# Demo design system
`;

export const CONFIG = (mode: string) =>
  `architecture:\n  frontend_dir: frontend/\ndesign:\n  file: docs/design/DESIGN.md\ndesign_check: ${mode}\npacks: [base, react, design]\n`;

export const FINAL = DESIGN.replace("source:", "status: final\nrevision: 1\nsource:");
export const ADR = (n: number) => `# 0002 Visual design\n\nRecords DESIGN.md revision ${n}.\n`;

export const SPEC = {
  project: "Habitly", surface: "app", moods: ["calm", "warm", "friendly"], avoid: ["#1da1f2"],
  directions: [{ name: "Ledger Calm", palette: "#214", pairing: "ledger", shape: "soft", density: "comfortable",
    elevation: "border", motion: "subtle", why: "Calm and trustworthy for a daily habit." }],
  screens: [
    { id: "today", name: "Today", purpose: "Check in on today's habits", shell: "sidebar-app", nav: ["Today", "Habits"],
      blocks: [{ type: "page-header", title: "Today", actions: ["Log check-in"] },
        { type: "stat-row", stats: [{ label: "Streak", value: "12 days" }] },
        { type: "split", left: [{ type: "list", items: [{ title: "Read 20 pages" }] }],
          right: [{ type: "detail-panel", title: "Read 20 pages", fields: [{ label: "Goal", value: "Daily" }] }] }] },
  ],
};
