---
name: drizzle-migrate
description: Generate a new Drizzle migration file from schema changes in `libs/db`. Use when the user changed `libs/db/src/schema.ts` and needs a migration generated, or asks to run the drizzle generate command.
allowed-tools: Bash, Read
argument-hint: '<kebab-case-migration-name>'
---

# Drizzle Migrate (generate)

Generate a new SQL migration file from the current `libs/db/src/schema.ts` diff.

## Preconditions

- Docker-compose Postgres must be running (port 5332) so drizzle-kit can introspect.
- A migration name was provided as `$ARGUMENTS`. If not, ask for one.
- An ADR exists in `docs/adr/` covering the schema change (if not, stop and invoke `adr-author`).

## Steps

1. Read `libs/db/src/schema.ts` to confirm the pending schema change.
2. Run:
   ```
   pnpm --filter @nebula-chat/db db:generate
   ```
3. Read the newly generated SQL file in `libs/db/migrations/` and verify it matches intent (column types, FK actions, indexes, defaults).
4. Report the migration filename and the SQL diff to the user.

## Anti-goals

- Do NOT edit generated migration SQL after it has been applied unless fixing a drizzle-kit bug; write a follow-up migration instead.
- Do NOT run `pnpm --filter @nebula-chat/db db:push` in place of `db:generate` when migrations are needed for production — `db:push` skips the migration history entirely.
