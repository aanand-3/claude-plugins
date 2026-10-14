---
pack: react
description: React + TypeScript SPA — frontend architecture (feature modules + service layer), state, components, quality.
scope: frontend
requires: [base]
paths: ["**/*.tsx", "**/*.ts", "**/*.css", "vite.config.*", "index.html", "package.json", "tsconfig*.json"]
---

# React (TypeScript) frontend

## Why not hexagonal here
The SPA has no business core to protect — business rules live behind the API. Its job is presentation, interaction, and server-state synchronization. So the frontend uses **feature modules with a service layer**: same principle (boundaries + one place for I/O), lighter shape.

## Tooling
- **Vite** + React + TypeScript (`strict`, `noUncheckedIndexedAccess`). **pnpm**. ESLint (typescript-eslint, react-hooks, jsx-a11y, **eslint-plugin-boundaries**) + Prettier.
- One gate script `check` = typecheck + lint (incl. boundaries) + tests; CI runs the same.
- Meta-framework (Next.js / React Router framework mode) only if the brief requires SSR/SEO.

## Structure — feature modules
```
src/
├── app/                 # router, providers, shell/layout, cross-module pages & composition
├── shared/
│   ├── ui/              # design-system primitives (dumb atoms, e.g. shadcn/ui)
│   ├── components/      # generic composed components (no domain knowledge)
│   ├── hooks/           # generic hooks (useUrlState, useDebounce)
│   └── lib/             # api client, error types, config/env, utils, test-utils
└── <module>/            # one per domain area / backend bounded context (names in project.md)
    ├── components/      # product components for this module
    ├── hooks/           # TanStack Query hooks + module behavior
    ├── services/        # the ONLY network access for this module
    ├── types.ts         # API types (mirroring backend DTOs/enums)
    └── index.ts         # public surface for other modules
```
Modules mirror the backend's contexts/features so a concept has the same name end to end. The `src/` top level is declared in `.project/config.yaml → structure:` and checked on every commit (warns by default); create a module folder only when its first real code lands.

## Dependency rules (enforced by eslint-plugin-boundaries in CI)
- `shared` imports only `shared`.
- A module imports `shared` and other modules' **public `index.ts` only** (direction declared in `project.md`; no cycles).
- `app` may import everything; cross-module composition (dashboards, global search, layout) lives in `app`, not `shared`.
- Only `services/` (and `shared/lib/api`) touch the network. Components and hooks never call `fetch`/axios.
- Don't move domain-specific code into `shared` to make imports convenient.

## API & data flow
- One API client (`shared/lib/api`): base URL from env, auth header/refresh, timeouts, and **error normalization** — non-2xx → typed `ApiError { code, detail, status }`. UI branches on `error.code`, never on status numbers or message text.
- Services are typed functions (`runsService.list(params)`) that validate untrusted responses at the boundary (zod) where data shape matters.
- API types mirror backend DTOs and enums exactly; prefer generating them from the backend OpenAPI spec.

## State — four tiers, one owner each
| Tier | Tool | Holds |
|---|---|---|
| Local | `useState` / `useReducer` | ephemeral UI (dialog open, unsaved input) |
| URL | router params + search params | anything bookmarkable/shareable: selected entity, filters, sort, pagination, tab, search |
| Server | **TanStack Query** | all server data; the cache *is* the source of truth |
| Global | Context or Zustand | truly global UI only (session, theme) |

- Never copy one tier into another (no server data in Zustand; no filter in both state and URL).
- URL state goes through one typed helper (`useUrlState(schema)`); components don't parse `location.search`. Search-param names match API query-param names; query keys are built from them.
- Stable, structured query keys (`["runs", { status, page }]`) and deliberate invalidation after mutations.

## Components
- Function components, typed props, named exports. Small and single-purpose; no god components.
- **Reuse before create:** search the owning module, then `shared/components`, then compose `shared/ui` primitives. New generic component goes to `shared/` only if it has no domain imports.
- Pages compose; components render and handle interaction; hooks hold logic and data access. No business rules or large data transformations in components.
- Forms: react-hook-form + zod.
- Every async view handles **loading, empty, error** (and stale/partial where relevant) explicitly; error boundaries per route.

## Styling
- One approach per project (Tailwind + `cn()` helper by default). Use **semantic design tokens** (`bg-background`, `text-muted-foreground`), never hard-coded palette values; every component works in light and dark themes.
- No new UI library without an explicit decision.
- When the `design` pack is on, `docs/design/DESIGN.md` defines the tokens, layout shell and component inventory (see `design.md` rules).

## Live updates (if WebSockets/SSE are used)
- One socket service + hook per stream; components never manage connections.
- Handle reconnect, clean up on unmount, avoid duplicate subscriptions, don't assume exactly-once delivery; apply events to the Query cache (update or invalidate) deliberately.

## Security & auth
- `VITE_*` variables are public; nothing secret in the client.
- No unsanitized HTML; `dangerouslySetInnerHTML` only behind a reviewed sanitizer.
- Tokens are not kept in arbitrary component state or `localStorage` unless the architecture says so.
- UI permission checks are UX only; the backend is the authority.

## Accessibility & performance
- Semantic HTML, labels, keyboard operation, visible focus; never rely on color or hover alone.
- Server-side pagination/filtering for large data; virtualize long lists; lazy-load heavy routes/charts.
- Memoize only when measured or clearly needed.
