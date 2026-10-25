/** ui: its CLI commands, help lines and MCP tools (moved verbatim from cli.ts and mcp.ts). */
import { serve } from "../../server.js";
import { type Registration } from "../../registry.js";

export const registration: Registration = {
  usage: [
    "  ui [--port 8765] [--no-open] [--design]       serve the view live on 127.0.0.1 (updates as files change);",
    "                                                --design opens the design studio (/design)",
  ],
  cli: {
    ui: { pos: [], int: ["port"], flag: ["no-open", "design"], run: (s, a) => {
      serve(s, { port: a.num.port ?? 8765, open: !a.opt["no-open"], page: a.opt.design ? "design" : undefined }).then(
        ({ url }) => process.stdout.write(`Hub UI at ${url} — live while this runs (Ctrl-C to stop)\n`),
        (e: Error) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
    } },
  },
};
