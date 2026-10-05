# Nebula Chat

Nebula Chat is a full-stack AI chat application.  
It provides a React frontend for chatting and conversation history, plus an Express backend that
streams model responses, stores conversations/messages in PostgreSQL, and caches responses in
Redis.

## Monorepo structure

```text
nebula-chat/
└── apps/
    ├── nebula-chat-client/   # React + Vite client
    └── nebula-chat-server/   # Fastify + Drizzle API
```

## Prerequisites

- Node.js `26.8.2` (see `.nvmrc`)
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
nvm install 26.8.2; nvm use 26.8.2
```

Node 26 no longer bundles Corepack, so install pnpm once per Node version with
the npm that ships with the runtime:

```bash
npm install -g pnpm@12.4.1
```

After that the `packageManager` pin keeps everyone on the same pnpm: a mismatched
local pnpm downloads and runs the pinned version (`pmOnFail: download`, the
default).

## Local development (quick start)

1. Install dependencies from the repo root:

   ```bash
   pnpm install
   ```

2. Create environment files:

   ```bash
   cp .env.example .env # credentials for the local Postgres/Redis containers
   cp apps/nebula-chat-server/.env.example apps/nebula-chat-server/.env
   cp apps/nebula-chat-client/.env.example apps/nebula-chat-client/.env
   ```

3. Fill required values:
   - `.env` (root): Postgres/Redis container credentials. `DATABASE_URL` and `REDIS_URL` in the
     server `.env` must use the same ones.
   - `apps/nebula-chat-server/.env`: at least `OPENAI_API_KEY`, `SERVER_URL`, `CLIENT_URL`,
     `DATABASE_URL` and `REDIS_URL`.
   - `apps/nebula-chat-client/.env`: `VITE_API_URL` (usually `http://localhost:3000` in local
     development).

4. Start local infrastructure:

   ```bash
   podman compose up -d
   ```

5. Run DB migrations:

   ```bash
   cd ../..
   pnpm --filter @nebula-chat/db db:migrate
   ```

6. Start backend and frontend (in separate terminals):

   ```bash
   pnpm --filter nebula-chat-server run dev
   pnpm --filter nebula-chat-client run dev
   ```

7. Open:
   - App: `http://localhost:5173`
   - API docs: `http://localhost:3000/docs`
   - OpenAPI spec: `http://localhost:3000/openapi.json`

## Useful commands (repo root)

```bash
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check
pnpm turbo run build --filter='./libs/*' # build all workspace libs (libs/*)
pnpm --filter nebula-chat-client run typecheck
pnpm --filter nebula-chat-server run typecheck
```

Build the libs after a fresh clone or after pulling lib changes. The apps typecheck against the libs' built `dist/`,
so running `typecheck` on a stale build fails with errors like `no exported member`. `pnpm turbo run typecheck --filter=<pkg>`
builds the libs it needs first.

## Deployment URLs

- Application: https://www.nebula-chat.cz
- API: https://api.nebula-chat.cz

## Notes

- Human-focused setup and usage docs are in these README files.
- Agent-specific implementation conventions are documented in `AGENTS.md`.
