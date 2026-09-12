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
- Docker (recommended for local PostgreSQL + Redis)
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
   cp apps/nebula-chat-server/.env.example apps/nebula-chat-server/.env
   cp apps/nebula-chat-client/.env.example apps/nebula-chat-client/.env
   ```

3. Fill required values:
   - `apps/nebula-chat-server/.env`: at least `OPENAI_API_KEY`, `SERVER_URL`, `CLIENT_URL`, and
     local DB/Redis values.
   - `apps/nebula-chat-client/.env`: `VITE_API_URL` (usually `http://localhost:3000` in local
     development).

4. Start local infrastructure:

   ```bash
   cd apps/nebula-chat-server && docker-compose up -d
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
pnpm --filter nebula-chat-client run typecheck
pnpm --filter nebula-chat-server run typecheck
```

## Deployment URLs

- Application: https://nebula-chat-p3c3.onrender.com/
- API: https://nebula-chat-api.onrender.com

## Notes

- Human-focused setup and usage docs are in these README files.
- Agent-specific implementation conventions are documented in `AGENTS.md`.
