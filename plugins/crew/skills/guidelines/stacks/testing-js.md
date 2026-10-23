---
pack: testing-js
description: TypeScript testing for React frontends and Node backends — Vitest, Testing Library, MSW, Playwright.
scope: any
requires: [base]
paths: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/e2e/**", "**/tests/**/*.ts", "**/vitest.config.*", "**/playwright.config.*"]
---

# Testing — TypeScript

## Stack
- **Vitest** for unit/integration; **React Testing Library** + `user-event` for components; **MSW** to fake HTTP at the network layer; **Playwright** for a few end-to-end journeys.
- One shared `render` helper (`shared/lib/test-utils`) wrapping QueryClient (retries off), Router and other providers.

## What to test
- **Services:** against MSW handlers — success mapping, error normalization to `ApiError`, response validation failures.
- **Hooks:** query keys, invalidation after mutations, URL-state parsing/serialization.
- **Components:** behavior as a user sees it — query by role/label/text, interact with `user-event`, assert loading/empty/error/success states.
- **Page smoke tests:** every route renders with mocked services without crashing (one table-driven test; adding a page adds a case).
- **E2E (Playwright):** only critical journeys; run separately (`test:e2e`).
- Node backends: API tests via `app.inject()` / supertest against the built app (no listening port) with real Postgres/Redis.

## Rules
- Co-locate tests (`foo.ts` → `foo.test.ts`); E2E in `e2e/`.
- Test behavior, not implementation: no snapshot tests of large trees, no asserting internal state or hook call counts.
- Never hit real endpoints; mock at the network (MSW) or service boundary.
- Fake timers for time-dependent code. Every bug fix adds a regression test.
- The `check` gate passes from a clean checkout.
