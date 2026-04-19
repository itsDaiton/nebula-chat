---
name: load-conventions
description: Load the project's conventions into context — reads AGENTS.md and the nearest CLAUDE.md. Use at the start of any non-trivial task, or when you suspect a convention-violation drift. Every build agent should invoke this early.
allowed-tools: Read
---

# Load Conventions

Ensures current project conventions are in context before work begins.

## Steps
1. Read `AGENTS.md` at the repo root. Note: frontend rules (Zustand-only, no useState, no barrels, `@/`), backend rules (7-layer, Zod, AppError, `@backend/*`), OpenAPI/Orval regen requirements, and lint zero-warning policy.
2. Read `CLAUDE.md` at the repo root for dev commands.
3. If working inside a specific app, read `apps/<app-name>/AGENTS.md` if present (none exists today, but the pattern is allowed).
4. Report which conventions are in scope for the current task.
