---
pack: node
description: Node.js + TypeScript backend conventions. Directory structure comes from the arch pack.
scope: backend
requires: [base]
paths: ["**/*.ts", "**/*.mts", "package.json", "tsconfig*.json"]
---

# Node.js (TypeScript)

## Tooling
- **TypeScript only**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`; `unknown` + narrowing.
- **pnpm** (lockfile committed). Node version pinned in `.nvmrc` and `package.json#engines` (current LTS). ESM (`"type": "module"`).
- **ESLint** (typescript-eslint, type-aware) + **Prettier**, or **Biome** if chosen — one formatter.
- Scripts are the interface: `dev`, `build`, `test`, `lint`, `typecheck`, and one gate `check` running them all.

## Framework & validation
- Default **Fastify** (Express or NestJS only if config says so).
- **zod** schemas at every boundary (requests, responses, env, external API responses); types are inferred from schemas, never duplicated.

## Conventions
- `app.ts` builds the server (testable without listening); `server.ts` loads config, starts, and shuts down gracefully on `SIGTERM` (stop accepting, drain, close DB/Redis).
- `config.ts` parses env once with zod into a typed, frozen object; injected, not imported ad hoc.
- Dependencies passed explicitly (factory functions); no module-level singletons for stateful clients.
- `async/await` only; no floating promises (`no-floating-promises`).
- Typed error classes with stable codes, mapped to HTTP in one error handler.
- Logging: **pino**, JSON, request ID bound per request; stable event names.
