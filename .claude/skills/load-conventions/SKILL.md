---
name: load-conventions
description: Load the project's conventions into context — reads AGENTS.md, CLAUDE.md, and CONTEXT.md. Use at the start of any non-trivial task, or when you suspect a convention-violation drift. Every build agent should invoke this early.
allowed-tools: Read
---

# Load Conventions

Ensures current project conventions and domain vocabulary are in context before work begins.

## Steps

1. Read `AGENTS.md` at the repo root — monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions, lint zero-warning policy).
2. Read `apps/nebula-chat-client/AGENTS.md` and/or `apps/nebula-chat-server/AGENTS.md`, whichever side the task touches, for package-specific conventions (Zustand-only/no useState/no useEffect on the frontend; 6-layer/Zod/AppError/`@backend/*` on the backend) and code examples.
3. Read `CLAUDE.md` at the repo root for the default engineering workflow and shipping (branch/PR) rules.
4. Read `CONTEXT.md` at the repo root for domain vocabulary — use its terms, not synonyms.
5. Report which conventions are in scope for the current task.
