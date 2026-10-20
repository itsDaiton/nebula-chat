# nebula-chat-openapi

The HTTP contract of the Nebula Chat API, as `openapi.yaml`. It is generated, never edited by hand:

```bash
pnpm generate:openapi   # from the server's Zod route schemas (ADR-0018)
pnpm generate:api       # regenerates the Orval clients in apps/client and apps/cli from it
```

Release Please versions this package on its own (tag `openapi-v*`), so a breaking change to the contract
is a major release here. The `/api/auth/*` routes are better-auth's and are not in this spec.
How the spec feeds the generated clients is drawn in
[docs/architecture.md → API contract](../docs/architecture.md#api-contract).
