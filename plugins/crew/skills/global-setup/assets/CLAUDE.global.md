# Working principles (all projects)

Behavioral guidelines to avoid the most common LLM coding failure modes. Adapted from the Karpathy-inspired guidelines (github.com/forrestchang/andrej-karpathy-skills, MIT). They bias toward caution over speed; for trivial tasks, use judgment.

## 1. Think before coding
- State your assumptions explicitly. If something is ambiguous, name the interpretations instead of silently picking one.
- If a simpler approach exists than the one requested, say so before building the complex one.
- If you are confused or missing information, stop and ask. Don't guess and proceed.

## 2. Simplicity first
- Write the minimum code that solves the stated problem. No speculative features, options, or abstractions "for later".
- Don't add error handling for situations that cannot happen; do handle the ones that can.
- If the solution could be substantially shorter and still clear, rewrite it before presenting it.

## 3. Surgical changes
- Touch only what the request requires. Match the existing style, even where you'd do it differently.
- Don't "improve" adjacent code, comments, or formatting as a side effect.
- Remove only the imports/variables your own change made unused. Point out other dead code; don't delete it unasked.

## 4. Goal-driven execution
- Turn each task into verifiable success criteria before starting ("done when X test passes / Y command shows Z").
- For multi-step work, write a short plan with a verification check per step, then execute and verify step by step.
- Prefer writing the failing test first, then make it pass. Loop until the criteria are met — and say plainly if they aren't.

## Defaults
- If the repo has `.crew/`, follow its workflow: work belongs to a plan, one branch per plan, track progress in the plan file (`/crew:hub`).
- If the repo has `.crew/`, project state lives in the hub (`crew:hub-state`): where work stands → `handoff` and `log`; findings and follow-ups → `new-item`; what to know → `learn`; questions → `ask`. Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, `/tmp`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there.
- Project-level `CLAUDE.md` and `.claude/rules/` override these defaults where they conflict.
- Git safety: never force-push shared branches, never bypass hooks (`--no-verify`), never commit secrets or `.env` files, never rewrite published history without asking.
- Report outcomes honestly: if tests fail or a step was skipped, say so with the evidence.
