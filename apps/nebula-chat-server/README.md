# Nebula Chat Server

The backend is a Fastify 5 API for Nebula Chat.

It is responsible for:
- Streaming AI chat responses from OpenAI
- Persisting conversations/messages in PostgreSQL via Drizzle
- Caching chat streams in Redis
- Exposing OpenAPI docs (`/docs`, `/openapi.json`)

## Prerequisites

- Node.js `26.8.2` (repo `.nvmrc`)
- pnpm `>=12` (pinned to `12.4.1` via `packageManager`)
- Docker (recommended for local PostgreSQL + Redis)
- OpenAI API key

## Local setup

1. Install dependencies from monorepo root:

   ```bash
   pnpm install
   ```

2. Create backend env file:

   ```bash
   cp apps/nebula-chat-server/.env.example apps/nebula-chat-server/.env
   ```

3. Configure required variables in `apps/nebula-chat-server/.env`:
   - `OPENAI_API_KEY`
   - `SERVER_URL` (for local use: `http://localhost:3000`)
   - `CLIENT_URL` (for local use: `http://localhost:5173`)
   - `DATABASE_URL` (if using external DB) or local Postgres values (`POSTGRES_*`)
   - `REDIS_URL` (if using external Redis) or `REDIS_PASSWORD` for local Redis

4. Start local PostgreSQL + Redis:

   ```bash
   cd apps/nebula-chat-server
   docker-compose up -d
   ```

5. Run DB migrations:

   ```bash
   cd ../..
   pnpm --filter @nebula-chat/db db:migrate
   ```

6. Start backend in watch mode:

   ```bash
   pnpm --filter nebula-chat-server run dev
   ```

Server starts on `http://localhost:3000` by default.

## Scripts

Run from the repo root:

```bash
pnpm --filter nebula-chat-server run dev
pnpm --filter nebula-chat-server run build
pnpm --filter nebula-chat-server run start
pnpm --filter nebula-chat-server run typecheck
pnpm --filter @nebula-chat/db db:generate
pnpm --filter @nebula-chat/db db:migrate
pnpm --filter @nebula-chat/db db:push
pnpm --filter @nebula-chat/db db:studio
```

## API docs

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Health check

`GET /health` returns liveness plus the current UTC timestamp:

```json
{ "status": "ok", "timestamp": "2026-09-12T18:09:35.000Z" }
```

This is the path Render polls (`healthCheckPath` in `render.yaml`).
