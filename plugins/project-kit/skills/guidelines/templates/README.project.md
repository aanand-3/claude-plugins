# <Project name>

<One-line tagline. The full purpose, users and scope live in the brief.>

> **Status:** <scaffolding | current milestone>{{#tracker}}, see the [roadmap](.project/ROADMAP.md){{/tracker}}.<!-- Add a must-know caveat here only if it isn't recorded elsewhere; otherwise link the ADR. -->

<!-- README owns only the tagline, status and Getting started. Everything else is linked, never copied:
     each fact has one home (see the map below). -->

## Where to find things
| I want to know… | Look in |
|---|---|
| Why this exists, who it's for, what's in scope | [Project brief](docs/project-brief.md) |
| How it's built, the repository layout, where new code goes | [Architecture](docs/architecture.md) |
| Why we chose X | [Decisions (ADRs)](docs/adr/) |
| Stack, versions and settings of record | [`.project/config.yaml`](.project/config.yaml) |
| Engineering rules | [`.claude/rules/`](.claude/rules/) |
{{#tracker}}
| What's planned and in progress | [Roadmap](.project/ROADMAP.md) · [Backlog](.project/BACKLOG.md) |
{{/tracker}}
| How we work: {{#tracker}}plans, {{/tracker}}branches, PRs | [CLAUDE.md → How we work](CLAUDE.md#how-we-work) |
| Available commands | `make help` |

## Getting started
Prerequisites: <tools and versions from config, e.g. Docker, uv, Node LTS + pnpm>.

```bash
git clone <repo-url> && cd <project>
git config core.hooksPath .githooks   # activate the project's git hooks
cp .env.example .env                  # local settings; see comments in the file
```
<First run, e.g. `make setup && make up`. Write _TBD, lands with {{#tracker}}P-001{{/tracker}}{{^tracker}}the project tooling{{/tracker}}_ until the tooling exists.>
