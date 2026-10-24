/** Entry point of the bundled crew.mjs. */
import { main } from "./cli.js";

const major = parseInt(process.versions.node.split(".")[0], 10);
if (major < 20) {
  process.stderr.write(`crew hub needs Node.js ≥ 20 (found ${process.versions.node}).\n`);
  process.exit(1);
}
process.exitCode = main(process.argv.slice(2));
