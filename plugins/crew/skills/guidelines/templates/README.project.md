# <Project name>

<One-line tagline. The full purpose, users and scope live in the brief.>

> **Status:** <scaffolding | the focus goal>{{#hub}}, see the [idea](.crew/idea.md) and `crew.mjs status`{{/hub}}.<!-- Add a must-know caveat here only if it isn't recorded elsewhere; otherwise link the ADR. -->

<!-- README owns only the tagline, status and Getting started. Everything else is linked, never copied:
     each fact has one home (see the map below). -->

## Where to find things
| I want to know… | Look in |
|---|---|
| Why this exists, who it's for, what's in scope | [Project brief](docs/project-brief.md) |
| How it's built, the repository layout, where new code goes | [Architecture](docs/architecture.md) |
| Why we chose X | [Decisions (ADRs)](docs/adr/) |
| Stack, versions and settings of record | [`.crew/config.yaml`](.crew/config.yaml) |
| Engineering rules | [`.claude/rules/`](.claude/rules/) |
{{#hub}}
| What it's for and what's in progress | [Idea and focus](.crew/idea.md) · [Goals](.crew/goals/) · `crew.mjs status` |
{{/hub}}
| How we work: {{#hub}}plans, {{/hub}}branches, PRs | [CLAUDE.md → How we work](CLAUDE.md#how-we-work) |
| Available commands | `make help` |

## Getting started
Prerequisites: <tools and versions from config, e.g. Docker, uv, Node LTS + pnpm>.

```bash
git clone <repo-url> && cd <project>
git config core.hooksPath .githooks   # activate the project's git hooks
cp .env.example .env                  # local settings; see comments in the file
```
<First run, e.g. `make setup && make up`. Write _TBD, lands with {{#hub}}P-001{{/hub}}{{^hub}}the project tooling{{/hub}}_ until the tooling exists.>
