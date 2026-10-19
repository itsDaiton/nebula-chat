---
name: regenerate-api-client
description: Regenerate the backend OpenAPI spec and the Orval clients (frontend and CLI). Use after any backend route/schema change, or when the user says "regen the client", "types are out of sync", or "update openapi.yaml".
allowed-tools: Bash, Read
---

# Regenerate OpenAPI + Orval

Syncs the backend↔frontend and backend↔CLI contracts. All the artifacts must be committed together.

## Steps

1. From repo root, regenerate the backend spec:
   ```
   pnpm --filter @nebula-chat/server run generate:openapi
   ```
   No `.env` or env vars are needed: the script fills placeholders for what `src/env.ts` requires, and the output does not depend on the environment.
2. Diff the resulting `openapi.yaml` (or path reported by the script). Confirm only expected changes.
3. Regenerate both typed clients (the CLI's covers the `Operator` and `Admin` tags, the frontend's everything else):
   ```
   pnpm --filter @nebula-chat/client run generate:api
   pnpm --filter @nebula-chat/cli run generate:api
   ```
4. Typecheck both to surface any broken call sites:
   ```
   pnpm --filter @nebula-chat/client typecheck
   pnpm --filter @nebula-chat/cli typecheck
   ```
5. Report the paths of the changed artifacts and any typecheck failures.

## Anti-goals

- Do NOT hand-edit `openapi.yaml` or any Orval-generated file.
- Do NOT split the regens across separate commits/PRs.
