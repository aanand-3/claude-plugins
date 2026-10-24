# crew reference Makefile — one entry point for humans, Claude and CI.
# Copy to the repo root in P-001; delete targets for stacks you don't use.
.DEFAULT_GOAL := help
.PHONY: help setup up down logs check fmt test backend-check frontend-check structure api-types

help: ## Show targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

setup: ## Install toolchains and dependencies, create .env
	@test -f .env || cp .env.example .env
	cd backend && uv sync
	cd frontend && pnpm install
	git config core.hooksPath .githooks

up: ## Start the local dev stack
	docker compose up -d --wait

down: ## Stop the local dev stack
	docker compose down

logs: ## Tail dev stack logs
	docker compose logs -f

check: backend-check frontend-check structure ## The full gate: lint, format, types, boundaries, tests

backend-check: ## Backend: ruff, format, pyright, import contracts, tests
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run lint-imports && uv run pytest

frontend-check: ## Frontend: typecheck, eslint (boundaries), prettier, vitest
	cd frontend && pnpm check

structure: ## Report files outside the declared layout
	node .crew/bin/check_structure.mjs --all

fmt: ## Format everything
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && pnpm format

test: ## Run tests only
	cd backend && uv run pytest
	cd frontend && pnpm test

api-types: ## Regenerate frontend API types from the running backend's OpenAPI spec
	cd frontend && pnpm api:types
