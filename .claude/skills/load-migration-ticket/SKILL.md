---
name: load-migration-ticket
description: Load the backend migration index and a specific TICKET-M<n>.md into context. Use before any work on the Fastify / Drizzle / LangChain / libs-folder rearchitecture described in docs/new-backend/. Takes the ticket number as argument.
allowed-tools: Read
argument-hint: "<ticket-number (1-10)>"
---

# Load Migration Ticket

Reads the master index + one ticket. These markdowns are volatile — always reload on every work session.

## Steps
1. Read `docs/new-backend/backend-migration.md` — master index and dependency graph.
2. Read `docs/new-backend/TICKET-M$ARGUMENTS-*.md` (Glob if needed to find the suffix).
3. Confirm the ticket's prerequisites are met (check dependency graph).
4. Report: scope, prerequisites status, and the list of files this ticket expects to add/modify.

## Anti-goals
- Do not start implementing. Separate agent (e.g. `architecture-migrator`) does that.
- Do not cache or summarize ticket content across sessions — always re-read.
