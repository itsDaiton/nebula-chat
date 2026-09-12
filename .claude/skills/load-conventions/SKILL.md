---
name: load-conventions
description: Load the project's conventions into context — reads AGENTS.md, CLAUDE.md, and CONTEXT.md. Use at the start of any non-trivial task, or when you suspect a convention-violation drift. Every build agent should invoke this early.
allowed-tools: Read
---

# Load Conventions

Ensures current project conventions and domain vocabulary are in context before work begins.

## Steps

1. Read `AGENTS.md` at the repo root — the single source of truth for conventions. Note: dev commands, frontend rules (Zustand-only, no useState, no barrels, `@/`), backend rules (6-layer, Zod, AppError, `@backend/*`), OpenAPI/Orval regen requirements, and lint zero-warning policy.
2. Read `CLAUDE.md` at the repo root for the default engineering workflow and shipping (branch/PR) rules.
3. Read `CONTEXT.md` at the repo root for domain vocabulary — use its terms, not synonyms.
4. If working inside a specific app, read `apps/<app-name>/AGENTS.md` if present (none exists today, but the pattern is allowed).
5. Report which conventions are in scope for the current task.
