---
name: regenerate-api-client
description: Regenerate the backend OpenAPI spec and the frontend Orval client. Use after any backend route/schema change, or when the user says "regen the client", "types are out of sync", or "update openapi.yaml".
allowed-tools: Bash, Read
---

# Regenerate OpenAPI + Orval

Syncs the backend↔frontend contract. Both artifacts must be committed together.

## Steps
1. From repo root, regenerate the backend spec:
   ```
   pnpm --filter nebula-chat-server run generate:openapi
   ```
2. Diff the resulting `openapi.yaml` (or path reported by the script). Confirm only expected changes.
3. Regenerate the frontend typed client:
   ```
   pnpm --filter nebula-chat-client run generate:api
   ```
4. Run frontend typecheck to surface any broken call sites:
   ```
   pnpm --filter nebula-chat-client typecheck
   ```
5. Report the paths of the changed artifacts and any typecheck failures.

## Anti-goals
- Do NOT hand-edit `openapi.yaml` or any Orval-generated file.
- Do NOT split the two regens across separate commits/PRs.
