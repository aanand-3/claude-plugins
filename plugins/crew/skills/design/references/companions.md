# Companion skills (optional)

crew's design skill owns the **system**: the direction, DESIGN.md, consistency checks and the page workflow. These third-party skills go deeper on craft. They are never required. Suggest one only when the task calls for it, and let the user install it. They all read the project's DESIGN.md or work alongside it, so they don't replace it.

| Skill | Good for | Install | License |
|---|---|---|---|
| **Impeccable** (pbakaus/impeccable) | Critique and polish passes: `audit`, `critique`, `polish`, `typeset`, `layout`, `harden`; a deterministic anti-pattern detector | `npx impeccable install` | Apache-2.0 |
| **Taste Skill** (Leonxlnx/taste-skill) | Marketing and landing pages with a strong art direction; screenshot-and-fix loop. Not aimed at app screens | `npx skills add leonxlnx/taste-skill` | MIT |
| **Emil Kowalski's skills** (emilkowalski/skills) | Motion and interaction polish: animation reviews, the decision of whether to animate, performance | `npx skills@latest add emilkowalski/skills` | MIT |
| **shadcn skill** (shadcn-ui/ui → skills/shadcn) | Using shadcn/ui correctly: components, registry, theming from a DESIGN.md | see the shadcn docs → Skills | MIT |
| **Web Interface Guidelines** (vercel-labs/web-interface-guidelines) | A fast accessibility, forms and focus audit with `file:line` output | fetched at runtime by Vercel's `web-design-guidelines` skill | MIT (guidelines) |
| **Anthropic frontend-design** (anthropics/skills) | One-off pages and prototypes outside a project's system | `/plugin` → anthropic skills | Apache-2.0 |

## When to suggest which
- "Review / critique this page" → our `review` first, then Impeccable `critique` or `audit` for a second opinion.
- "Make the landing page stunning" → our `page` with the direction, plus Taste for the art-direction pass.
- "It feels stiff" or animation work → Emil Kowalski's skills plus our motion.md.
- shadcn component questions → the shadcn skill.

## Rules
- If a companion's advice conflicts with DESIGN.md, DESIGN.md wins. Change it through `design refresh` if the advice is better.
- Don't copy companion reference text into this repository. Link to it.
