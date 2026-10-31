---
paths:
  - 'apps/client/src/shared/config/**'
  - 'apps/client/src/libs/api/**'
  - 'apps/client/src/shared/utils/**'
---

# Shared Utilities

- `@nebula-chat/errors` — the error vocabulary shared with the server (ADR-0011). The generated hooks already
  reject with its `AppError`; the reply stream reads an error body or `error` event with
  `parseErrorEnvelope(value)` and shows its `message`. Switch on the error code (`AppError.code`), not the
  HTTP status (a `MessageAllowanceReached` and a `Forbidden` are both 403s).
- `shared/config/serverConfig.ts` — `SERVER_CONFIG.BASE_URL` (the axios `baseURL`) and `getApiEndpoint(path)`
  (the stream mutator's `fetch`) come from `VITE_API_URL`. Never hardcode API base URLs.
- `shared/config/paginationConfig.ts` — `paginationConfig.defaultLimit` for page sizes.
