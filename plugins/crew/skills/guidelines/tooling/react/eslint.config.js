// crew reference ESLint config for the React SPA (flat config). Copy to <frontend_dir>/ in P-001.
// devDependencies: eslint @eslint/js typescript-eslint globals eslint-plugin-react-hooks
//   eslint-plugin-jsx-a11y eslint-plugin-boundaries eslint-import-resolver-typescript eslint-config-prettier
// Verify against the installed plugin versions when P-001 runs `pnpm lint`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "coverage", "playwright-report", "src/**/*.gen.ts"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y, boundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      // Order matters: first match wins. Modules = every other folder under src/.
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "shared", pattern: "src/shared" },
        { type: "test", pattern: "src/test" },
        { type: "module", pattern: "src/*", capture: ["module"] },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-floating-promises": "error",

      // Architecture (react pack): shared ← module ← app, no reverse imports.
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["app", "shared", "module"] },
            { from: "module", allow: ["shared", "module"] },
            { from: "shared", allow: ["shared"] },
            { from: "test", allow: ["app", "shared", "module", "test"] },
          ],
        },
      ],
      // Other modules are reached only through their public index.ts.
      "boundaries/entry-point": [
        "error",
        {
          default: "allow",
          rules: [{ target: ["module"], disallow: ["**"] }, { target: ["module"], allow: ["index.ts"] }],
        },
      ],

      // Only services/ touch the network.
      "no-restricted-globals": ["error", { name: "fetch", message: "Use the module's services/ layer." }],
      "no-restricted-imports": ["error", { paths: [{ name: "axios", message: "Use the shared API client in shared/lib/api." }] }],

      // No god modules / components (base pack: Modules & size). Warnings: split by responsibility.
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }], // components run longer
      complexity: ["warn", 10],
      "max-params": ["warn", 4],
      "max-depth": ["warn", 3],
    },
  },
  {
    files: ["src/*/services/**", "src/shared/lib/api/**"],
    rules: { "no-restricted-globals": "off", "no-restricted-imports": "off" },
  },
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**", "src/test/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off", "max-lines-per-function": "off" }, // describe() blocks
  },
  prettier,
);
