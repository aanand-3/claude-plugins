---
pack: temporal
description: Temporal durable workflows — determinism, activities, retries, versioning, testing.
scope: backend
requires: [base]
paths: ["**/workflows/**", "**/activities/**", "**/worker/**", "**/temporal/**"]
---

# Temporal

## Workflows (orchestration only)
- **Deterministic.** No I/O, network, DB, file access, threads, or non-deterministic APIs in workflow code. Use the SDK equivalents: `workflow.now()`, `workflow.uuid4()`, `workflow.random()`, `workflow.sleep()` (Python) / `Date.now()` inside the TS sandbox, `uuid4()` from the SDK.
- Workflows decide *what* happens next; activities *do* it.
- Pass **IDs and small parameters**, not large payloads (history and payload size limits). Large data stays in the DB/object store; activities load it.
- Long-running/looping workflows use **continue-as-new** before history grows large.
- Workflow IDs are business-meaningful and unique per logical execution (e.g. `run-{run_id}`) so starting twice is idempotent.
- Signals/updates for commands (pause, cancel), queries for status. Cancellation is handled explicitly with cleanup.

## Activities (all side effects)
- **Idempotent** — they will be retried. Use idempotency keys/upserts and record progress (checkpoints) so a retry resumes rather than repeats.
- Always set `start_to_close_timeout`; long activities **heartbeat** (with progress details) and set `heartbeat_timeout`.
- Explicit `RetryPolicy` per activity type: backoff, max attempts/interval, and `non_retryable_error_types` for permanent failures (validation, auth, not-found).
- Raise typed errors that distinguish retryable vs permanent. Rate-limit responses are retryable with backoff.
- Activities receive dependencies (clients, repositories) via the worker's composition root, not globals.

## Changing workflow code
- Changing logic of a workflow that may have running executions requires **versioning** (`workflow.patched()` / `patched()` in TS, or a new workflow type). Never silently change command order.
- Keep a replay test with recorded histories of each workflow type; it must pass before merging changes.

## Workers & ops
- Workers are a separate entrypoint/process from the API. Task queue names come from settings.
- Configure concurrency limits per worker; graceful shutdown drains in-flight activities.
- Log with workflow/activity IDs and run IDs in context; never log payloads containing PII or credentials.

## Testing
- Workflow tests use the SDK test environment with **time skipping** and mocked activities.
- Activity tests are ordinary unit/integration tests of their logic and adapters.
- Replay tests (see above) catch non-determinism.
