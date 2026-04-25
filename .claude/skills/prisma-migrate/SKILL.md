---
name: prisma-migrate
description: Create a new Prisma migration against the dev database. Use when the user changed prisma/schema.prisma and needs the migration authored, or asks to run "pnpm prisma:migrate". Takes a kebab-case migration name as the argument.
allowed-tools: Bash, Read
argument-hint: '<kebab-case-migration-name>'
---

# Prisma Migrate (dev)

Create a migration from the current `schema.prisma` diff.

## Preconditions

- Docker-compose Postgres must be running (port 5332).
- A migration name was provided as `$ARGUMENTS`. If not, ask for one.
- An ADR exists in `docs/adr/` covering the schema change (if not, stop and invoke `adr-author`).

## Steps

1. Read `apps/nebula-chat-server/prisma/schema.prisma` to confirm the pending diff.
2. Run:
   ```
   pnpm --filter nebula-chat-server prisma:migrate --name $ARGUMENTS
   ```
3. Read the newly generated file in `apps/nebula-chat-server/prisma/migrations/<timestamp>_$ARGUMENTS/migration.sql` and confirm it matches intent.
4. Run `pnpm --filter nebula-chat-server prisma:generate` to refresh Prisma Client.
5. Report file paths of the new migration and any Prisma Client type changes.

## Anti-goals

- Do NOT run `prisma migrate reset` — the hook will block it and it destroys dev data.
- Do NOT edit a migration SQL file after it's been applied; write a follow-up migration instead.
