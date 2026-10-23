---
pack: base
description: Always-on engineering principles and rules for every project, regardless of stack.
scope: any
requires: []
paths: []
---

# Engineering Baseline

Applies to every file. Language, framework and architecture packs add specifics; `project.md` adds project decisions. When rules conflict, the more specific file wins.

## Design principles
- **Simple first (KISS / YAGNI).** Build for today's requirements. No speculative options, extension points or layers "for later".
- **DRY applies to knowledge, not to code shape.** Every business rule, contract, schema and constant has one authoritative home. Tolerate small, incidental duplication until the third occurrence; a wrong abstraction costs more than a little repetition.
- **SOLID, pragmatically.** One responsibility per module/class/function. Depend on abstractions (Protocols / interfaces) *at I/O and context boundaries* — not everywhere. Small, focused interfaces. Composition over inheritance.
- **Functional core, imperative shell.** Business rules are deterministic functions over typed values. I/O (DB, HTTP, queues, files, clock, randomness) lives at the edges and is injected.
- **Parse, don't validate.** Convert untrusted input into typed objects once, at the boundary. Inner code receives types that cannot be invalid and never handles raw dicts/JSON.
- **Make illegal states unrepresentable.** Enums, discriminated unions and typed IDs instead of free strings, magic values and boolean flags.
- **Explicit over implicit.** Dependencies are passed in (constructor/function args, DI from a composition root). No hidden globals, service locators, or import-time side effects.
- **Consistency over preference.** Follow the established pattern in the codebase. Change a pattern deliberately (ADR + update the rules), not incidentally.

## Typed code
- Strict type checking is on for every language in the repo; it runs in pre-commit and CI.
- Public functions, methods and module boundaries are fully typed. No `Any`/`any` at boundaries; use `unknown`/`object` + narrowing.
- Suppressions (`# type: ignore`, `@ts-expect-error`, `eslint-disable`) need a specific rule code and a one-line reason.

## Code
- Clear names over comments. Comment the *why*, never the *what*.
- No dead code, commented-out code, or TODOs without a backlog/plan reference.
- Fail fast and loudly at boundaries. Trust validated data internally.
- Never swallow exceptions: handle meaningfully, add context and re-raise, or let propagate.

## Modules & size (no god modules)
- **One reason to change per module.** A module's name states its single responsibility (`invoice_pricing`, `sprint_burndown`). If the honest name needs "and", or is `utils` / `helpers` / `common` / `manager` / `misc`, it is two modules or a missing concept — split it, or name the concept.
- **Limits (soft, enforced as warnings):**

  | Unit | Limit | Enforced by |
  |---|---|---|
  | Module / file | 300 non-blank lines | `module_max_lines` in `.crew/config.yaml` (pre-commit), ESLint `max-lines` |
  | Function / method | ~50 lines | ESLint `max-lines-per-function`, ruff `PLR0915` (statements) |
  | Cyclomatic complexity | 10 | ruff `C901`, ESLint `complexity` |
  | Parameters | 5 (group the rest into a typed object) | ruff `PLR0913`, ESLint `max-params` |
  | Branches / returns | 12 / 6 | ruff `PLR0912` / `PLR0911` |

  Crossing a limit needs a reason in the PR (e.g. a declarative table, a generated file). "It was already big" is not a reason.
- **No god objects.** A class that every caller depends on for unrelated operations (a `Manager`/`Service` with dozens of methods, a `Hub` that loads, validates, mutates and renders) is split into a small data-access object plus focused functions or services that receive it explicitly.
- **Split by responsibility, not by technical kind.** Keep what changes together in one place (a feature module, a use case); don't scatter one behavior across `models.py` / `utils.py` / `helpers.py`.
- **Acyclic dependencies between modules.** Imports flow one way (core → nothing; adapters → core; entrypoints → everything). Two modules importing each other means a shared concept belongs in a third, lower module. Document the layering in the package's `__init__`/README when it's not obvious, and test it where cheap.
- **Refactor when you cross the line.** If your change pushes a module past the limit, split it in the same plan (it's part of the work) or, when the split is large, capture a CHORE item and note it in the plan's Outcome. Splitting is a pure refactor: behavior unchanged, tests green before and after.

## Project structure
- The high-level layout is declared in `.crew/config.yaml` → `structure:` and checked on every commit (warning by default, `structure_check: block` to enforce). Folders appear only when real code needs them — never create empty placeholder directories.
- `docs/architecture.md → Repository layout` is the one description of the designed tree and where new code goes; README and CLAUDE.md link to it. A layout change updates `structure:`, that section and `project.md` together (plus an ADR if architectural).
- **One home per fact.** Docs link to the source of truth instead of copying it (stack → config, layout → architecture, commands → Makefile, scope → brief, decisions → ADRs). Copies drift.
- Put new code inside the declared structure. If something genuinely doesn't fit, either change the layout as above with the reason, or — when moving fast — accept the warning and list the file under *follow-ups* in the plan's Outcome so it gets refactored later. Never ignore a warning silently.

## Configuration, secrets & environments
- All configuration comes from environment variables, loaded and validated **once at startup** into a typed settings object, and injected where needed.
- Commit `.env.example` with every variable (safe local default + comment). Never commit `.env` or real secrets.
- Environments (`local`, `test`, later `staging`/`production`, as listed in config) differ **only** by configuration and secrets. Same code, same build artifact. No `if env == "prod"` branches; drive behavior from explicit settings values.
- Local secrets come from `.env`; deployed environments from the platform's secret manager.

## Errors & API contracts
- One error shape for clients (stable machine-readable `code` + human `detail`, e.g. RFC 9457 Problem Details). Clients branch on codes, never on message text.
- Error codes are part of the contract: stable, documented, never repurposed.
- Never leak stack traces or internal messages to clients.

## External integrations (APIs, brokers, third-party services)
Treat every external system as a hostile boundary:
- Explicit timeouts on every call. Bounded retries with exponential backoff + jitter, only for errors known to be retryable.
- Retry safety is explicit: writes are idempotent (idempotency keys / upserts) or not retried.
- Validate responses before use; handle partial, malformed, stale and rate-limited responses.
- Bound concurrency toward each external system.
- Unit tests and CI never call real external services; use recorded fixtures or fakes.

## Logging & observability
- Structured logs (JSON in deployed environments). Event names are stable identifiers (`run.started`), context goes in fields.
- Every log line in a request/job carries a correlation ID.
- Never log secrets, tokens, credentials, or full PII/record payloads; log IDs and counts.

## Security
- Validate all external input at the boundary. Parameterize every query.
- Least privilege for service accounts, DB users and tokens.
- Dependencies pinned via lockfiles. Add a dependency only when it removes meaningful code; say why in the PR.

## Testing
- Every behavior change ships with a test that would have failed before it.
- Tests are deterministic: no real network, no sleeps, no wall-clock or test-order dependence.

## Definition of Done (per plan)
1. Acceptance criteria in the plan are met and demonstrably verified.
2. Lint, type-check, boundary checks and tests pass locally.
3. Docs updated where behavior, config or setup changed (`README`, `.env.example`, ADR if a decision changed).
4. Plan file updated: tasks checked, Outcome written, status `done`.
