---
name: db-migration
description: Use when changing the database schema in libs/db, or writing or reviewing a migration.
---

# Database migration

The schema lives in `libs/db/src/schema.ts` and migrations in `libs/db/migrations/`. Rules: `.claude/rules/server-database.md`. Commands: `apps/server/AGENTS.md` → `@nebula-chat/db` migrations.

**The gotcha that shapes every migration:** Render runs `db:migrate` in the server's build, so the new schema is live while the old server and the old worker are still serving (`docs/architecture.md` → deploys).
Additive statements (new tables, nullable columns, indexes) are safe against that old code. A **destructive** statement (a drop, a rename, a new `NOT NULL` without a default) breaks it until the deploy finishes.

1. **Schema.** Edit `libs/db/src/schema.ts`. A new domain table or column name follows `GLOSSARY.md`; add the term there if it is new.
2. **Generate.** With local Postgres up (`podman compose up -d`) and `apps/server/.env` filled in, run `pnpm --filter @nebula-chat/db db:generate`. Done when a new SQL file and journal entry appear under `libs/db/migrations/`.
3. **Review the SQL.** Mark each generated statement additive or destructive. A migration already on `main` stays as it is: write a follow-up. Done when every destructive statement is either split into a later PR or named in the PR's Merge Danger with the window it breaks.
4. **Apply locally.** Run `pnpm --filter @nebula-chat/db db:migrate`; it prints the full Postgres error on failure. Done when it exits 0.
5. **Consumers.** Run `pnpm build:libs` (apps typecheck against the built `dist/`), then update the repositories in `apps/server` and `apps/worker` that read the changed tables. Done when the `verifier` subagent reports both apps green.

Scope the commit `db` plus the apps it touches, e.g. `feat(db,server): …`. A `db` release redeploys both the server and the worker.
