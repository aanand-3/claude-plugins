"""project-kit tracker: repo-local project management stored in .project/.

Module layers (each imports only from layers above it):
  model, text, gitio            constants, pure text helpers, git access
  doc                           markdown document with frontmatter + section helpers
  store                         loading/saving tracked documents, IDs, settings
  queries, gates                derived relationships; triage / readiness rules
  workflow, backlog, sprints    status changes, backlog items, sprints
  milestones, reports           forecasts, release notes, roadmap, backlog, status
  planning, advisor, checks     creation commands, `next` / `current`, `check`
  cli                           argument parsing and dispatch
"""
