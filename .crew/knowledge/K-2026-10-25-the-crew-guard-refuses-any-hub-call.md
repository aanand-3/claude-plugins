---
id: K-2026-10-25-the-crew-guard-refuses-any-hub-call
type: gotcha
title: The crew guard refuses any hub call whose text names the human-approval flag, even inside a --verify or --note description, and mangles hub calls built from a shell variable; write checkpoint calls literally, one per command, and describe that flag in words
scope: 
source: 
supersedes:
tier: project
created: 2026-10-25
---

# The crew guard refuses any hub call whose text names the human-approval flag, even inside a --verify or --note description, and mangles hub calls built from a shell variable; write checkpoint calls literally, one per command, and describe that flag in words

QA on P-033 (2026-10-25) lost two checkpoint batches this way, and the Director's own learn call was refused for quoting the flag; related to BUG-017
