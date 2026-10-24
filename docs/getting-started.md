# Getting started

Run Nebula Chat locally: toolchain, environment files, infrastructure, and the dev servers.

## Prerequisites

- Node.js `26.12.1` (see `.nvmrc`)
- pnpm `>=12` (pinned to `12.4.1` via `packageManager`)
- Podman (recommended for local PostgreSQL + Redis)
- OpenAI API key

### Selecting the toolchain

Node is managed with [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) or
[nvm-windows](https://github.com/coreybutler/nvm-windows). From the repo root:

```bash
nvm install $(cat .nvmrc) && nvm use $(cat .nvmrc)
```

On nvm-windows, pass the version explicitly — it does not read `.nvmrc`:

```powershell
nvm install 26.12.1; nvm use 26.12.1
```

Node 26 no longer bundles Corepack, so install pnpm once per Node version with
the npm that ships with the runtime:

```bash
npm install -g pnpm@12.4.1
```

After that the `packageManager` pin keeps everyone on the same pnpm: a mismatched
local pnpm downloads and runs the pinned version (`pmOnFail: download`, the
default).

## Quick start

1. Install dependencies from the repo root:

   ```bash
   pnpm install
   ```

2. Create environment files:

   ```bash
   cp .env.example .env # credentials for the local Postgres/Redis containers
   cp apps/server/.env.example apps/server/.env
   cp apps/worker/.env.example apps/worker/.env
   cp apps/client/.env.example apps/client/.env
   ```

3. Fill required values:
   - `.env` (root): Postgres/Redis container credentials. `DATABASE_URL` and `REDIS_URL` in the
     server `.env` must use the same ones.
   - `apps/server/.env`: at least `SERVER_URL`, `CLIENT_URL`, `DATABASE_URL` and
     `REDIS_URL`.
   - `apps/worker/.env`: `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`), plus the same
     `DATABASE_URL` and `REDIS_URL`. The worker produces every reply, so chat needs it running.
   - `apps/client/.env`: `VITE_API_URL` (usually `http://localhost:3000` in local
     development).

4. Start local infrastructure:

   ```bash
   podman compose up -d
   ```

5. Run DB migrations:

   ```bash
   pnpm --filter @nebula-chat/db db:migrate
   ```

6. Start the server, worker and client (separate terminals):

   ```bash
   pnpm --filter @nebula-chat/server run dev
   pnpm --filter @nebula-chat/worker run dev
   pnpm --filter @nebula-chat/client run dev
   ```

7. Open:
   - App: `http://localhost:5173`
   - API docs: `http://localhost:3000/docs`
   - OpenAPI spec: `http://localhost:3000/openapi.json`

## Useful commands

```bash
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check
pnpm run build:libs                      # build all workspace libs (libs/*) and their dependencies
pnpm --filter @nebula-chat/client run typecheck
pnpm --filter @nebula-chat/server run typecheck
```

Build the libs after a fresh clone or after pulling lib changes. The apps typecheck against the libs' built `dist/`,
so running `typecheck` on a stale build fails with errors like `no exported member`. `pnpm turbo run typecheck --filter=<pkg>`
builds the libs it needs first.
