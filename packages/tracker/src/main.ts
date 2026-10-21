/** Entry point of the bundled tracker.mjs. */
import { main } from "./cli.js";

const major = parseInt(process.versions.node.split(".")[0], 10);
if (major < 20) {
  process.stderr.write(`project-kit tracker needs Node.js ≥ 20 (found ${process.versions.node}).\n`);
  process.exit(1);
}
process.exitCode = main(process.argv.slice(2));
