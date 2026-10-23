---
pack: python
description: Python language, typing, settings and tooling conventions.
scope: backend
requires: [base]
paths: ["**/*.py", "pyproject.toml", "uv.lock"]
---

# Python

## Tooling (defaults)
- **uv** for Python versions, virtualenvs, dependencies and running tools. `pyproject.toml` is the single source of project and tool config; `uv.lock` is committed.
- **ruff** for lint *and* format. **pyright** (strict) or **mypy --strict** — one, as chosen in config.
- **import-linter** enforces the architecture's dependency rules (contracts come from the arch pack).
- **pre-commit** runs ruff, type-check and import-linter.
- One verification gate, e.g. `make check` / `uv run task check`: lint + format-check + types + import contracts + tests.
- `src/` layout: `src/<package>/...`, tests in `tests/`. No logic in `__init__.py` beyond explicit re-exports.

## Typing
- Target the version in `.crew/config.yaml`; modern syntax (`X | None`, `list[str]`, `type` aliases, `match`).
- Fully typed public API. No `Any` at module boundaries.
- Interfaces are `typing.Protocol`s, defined by the consumer (the core), implemented by adapters.
- Typed IDs with `NewType` (`RunId = NewType("RunId", UUID)`); closed sets as `StrEnum`.
- Prefer immutable values: `@dataclass(frozen=True, slots=True)` for domain/internal values.

## Imports
- All imports at module top level, absolute (`from <pkg>.domain import ...`), grouped by ruff.
- Function-level imports only for a stated reason, with a comment: optional dependency, measured startup cost (e.g. a CLI lazily loading a heavy library), or a temporary circular-import break (and fix the structure soon after). Type-only imports go under `if TYPE_CHECKING:`.

## Models — keep the categories distinct
| Category | Tool | Lives in |
|---|---|---|
| API request/response DTOs | Pydantic v2 `BaseModel` | HTTP boundary |
| Domain/core values & entities | dataclasses (framework-free) | core/domain |
| Persistence rows | ORM models | persistence adapter only |
| Settings | `pydantic-settings` | config / composition root |

Map explicitly between categories. Never pass ORM rows across the API boundary or into the domain; never let DTOs leak inward.

## Settings (pydantic-settings)
- One root `Settings(BaseSettings)` with nested groups (`DatabaseSettings`, `RedisSettings`, ...) and an `env_prefix`/`env_nested_delimiter` convention.
- Secrets are `SecretStr`; URLs/DSNs use Pydantic URL/DSN types; durations/limits have bounds (`Field(gt=0)`).
- Loaded **once** in the composition root and injected. Business code never reads `os.environ` and never imports a global `settings` object.
- Tests build `Settings(...)` explicitly — no env-var monkeypatching before import.

## Errors
- A small project exception hierarchy rooted at one base (`AppError` → `NotFoundError`, `ConflictError`, `ValidationError`, ...), each with a stable `code`.
- Never `except Exception: pass`; catch the narrowest type.

## Logging
- **structlog** (or stdlib `logging` if chosen) configured once at startup; JSON in deployed envs, console locally.
- `logger.info("run.started", run_id=run_id)` — stable event name + fields, no f-string messages.

## Performance
- Stream large sequences (generators / async iterators); batch DB and network operations.
- Don't optimize speculatively — measure first.
