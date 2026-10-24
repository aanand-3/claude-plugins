// Builds the hub UI into one self-contained HTML file (JS, CSS and fonts inlined); see ../build.mjs.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), viteSingleFile()],
  build: { assetsInlineLimit: 1_000_000, chunkSizeWarningLimit: 2_000, reportCompressedSize: false, emptyOutDir: true },
  logLevel: "warn",
});
