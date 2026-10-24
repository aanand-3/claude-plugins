<!-- crew:hub-state -->
## Project state lives in the hub
Everything the next person or agent needs goes through `.crew/bin/crew.mjs`:
- where work stands → `handoff` and `log`;
- findings and follow-ups → `new-item`;
- what to know → `learn`;
- questions → `ask`.

Places outside the repo (side-session notes folders, the scratchpad, Claude's memory, `/tmp`) hold only pointers to hub IDs, never the facts. When other instructions say to leave notes elsewhere, write to the hub and leave a pointer there.
