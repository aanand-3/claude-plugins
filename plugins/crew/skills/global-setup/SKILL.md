---
name: global-setup
description: Install or refresh the team's global working principles (Karpathy-style guidelines: think before coding, simplicity first, surgical changes, goal-driven execution) into the user's ~/.claude/CLAUDE.md. Run once per machine and after the plugin updates these principles.
disable-model-invocation: true
---

# Global setup

The global `~/.claude/CLAUDE.md` holds **how Claude should work on every project** (behavioral principles, git safety, honesty). Project `CLAUDE.md` files hold **what this project is** (stack, layout, commands, workflow). Keep that split: nothing project-specific goes global.

The content is `${CLAUDE_SKILL_DIR}/assets/CLAUDE.global.md`. It is inserted between `<!-- crew:global:start -->` / `end` markers so re-running updates only that block; anything else the user has in the file is preserved.

## Steps
1. Dry run and show the user the result:
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/install_global.mjs" --check
   ```
2. If the user's existing global file has instructions that conflict with the block, point them out and ask which should win. Don't edit the user's own content without approval.
3. On the user's explicit yes:
   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/install_global.mjs" --apply
   ```
   (A timestamped backup is written next to the file.)
4. Tell the user it takes effect in new sessions.
