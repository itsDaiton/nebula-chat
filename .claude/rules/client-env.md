---
paths:
  - 'apps/client/.env*'
  - 'apps/client/src/shared/config/**'
  - 'apps/client/vite.config.ts'
---

# Environment Variables

`apps/client/.env`:

| Variable               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `VITE_API_URL`         | Base URL of the backend API (e.g. `http://localhost:3000`)                 |
| `VITE_ENABLE_DEVTOOLS` | `true` shows the TanStack Router devtools under `pnpm dev`; off when unset |
