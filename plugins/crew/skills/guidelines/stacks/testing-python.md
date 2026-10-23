---
pack: testing-python
description: Python testing strategy with pytest — pyramid, boundaries, handoffs, isolation.
scope: backend
requires: [python]
paths: ["tests/**/*.py", "**/test_*.py", "**/*_test.py", "**/conftest.py"]
---

# Testing — Python

**Aim: tests that catch broken boundaries and handoffs, not just wrong logic.**

## Stack
- **pytest**, `pytest-cov`, `pytest-asyncio` (or anyio), `httpx.AsyncClient` for API tests.
- `respx`/`pytest-httpx` for outbound HTTP; `time-machine` for time; factories (polyfactory or builder functions) over large shared fixtures.
- Real Postgres/Redis for integration tests (testcontainers or the compose services) — a dedicated test database and Redis DB index, cleaned between runs.

## Layout
```
tests/
├── conftest.py      # test composition root, fixtures
├── unit/            # pure core: no I/O, no mocks needed — the bulk of tests
├── contract/        # port conformance suites run against every adapter + fake
├── integration/     # adapters against real infra; handoffs between components
├── api/             # endpoint validation, auth, error envelope
└── scenarios/       # few end-to-end business workflows
```
Markers: `integration`, `scenario`, `live` (opt-in tests against real external sandboxes; never in CI by default).

## Rules
- Names state behavior: `test_<unit>_<behavior>_<condition>`. Arrange/Act/Assert; one behavior per test; `parametrize` over loops.
- **Inject, don't patch.** Build the app/use cases from a test composition root with fakes or ephemeral infra; override FastAPI dependencies. No "set env vars before import" tricks, no patching module globals.
- Mock only at system boundaries (external HTTP, clock, randomness) — never the code under test or the ORM.
- **Parse-don't-validate tests:** feed adapters malformed/partial payloads; assert a typed error at ingress, never a raw dict propagating inward.
- **Port conformance:** one suite per port, executed against every implementation (real adapter with fixtures, and the in-memory fake).
- **Handoff rule:** when a component publishes to a queue/stream/workflow or writes for another component to consume, the integration test asserts the handoff actually happened (message on the stream, workflow started, row written) — not only the local effect.
- **Cache contracts:** miss → source read → write; hit → no source read; TTL/key format; invalidation on each mutation; fallback when the cache is down.
- External APIs: recorded fixtures (VCR-style or JSON fixtures). No live calls in unit tests or CI.
- Every bug fix adds a regression test. Coverage ≥ 80% on core/application code; coverage is a signal, not the goal.
- The gate passes from a clean checkout with only `docker compose up -d` as a prerequisite.
