// project-kit reference ESLint config for a Node + TypeScript backend (flat config).
// devDependencies: eslint @eslint/js typescript-eslint globals eslint-plugin-boundaries
//   eslint-import-resolver-typescript eslint-config-prettier
// Set the element patterns to match the arch pack in use (hexagonal shown; layered in comments).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain" },
        { type: "application", pattern: "src/application" },
        { type: "adapters", pattern: "src/adapters" },
        { type: "entrypoints", pattern: "src/entrypoints" },
        // layered: routes / services / repositories / lib
      ],
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      // No god modules (base pack: Modules & size). Warnings: split by responsibility.
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 10],
      "max-params": ["warn", 5],
      "max-depth": ["warn", 3],
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "domain", allow: ["domain"] },
            { from: "application", allow: ["application", "domain"] },
            { from: "adapters", allow: ["adapters", "domain"] },
            { from: "entrypoints", allow: ["entrypoints", "application", "domain", "adapters"] },
          ],
        },
      ],
    },
  },
  prettier,
);
