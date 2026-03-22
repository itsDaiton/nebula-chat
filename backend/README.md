# Nebula Chat Server

The backend is an Express 5 API for Nebula Chat.

It is responsible for:
- Streaming AI chat responses from OpenAI
- Persisting conversations/messages in PostgreSQL via Prisma
- Caching chat streams in Redis
- Exposing OpenAPI docs (`/docs`, `/openapi.json`)

## Prerequisites

- Node.js `22.22.1` (repo `.nvmrc`)
- pnpm `>=10`
- Docker (recommended for local PostgreSQL + Redis)
- OpenAI API key

## Local setup

1. Install dependencies from monorepo root:

   ```bash
   pnpm install
   ```

2. Create backend env file:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Configure required variables in `backend/.env`:
   - `OPENAI_API_KEY`
   - `SERVER_URL` (for local use: `http://localhost:3000`)
   - `CLIENT_URL` (for local use: `http://localhost:5173`)
   - `DATABASE_URL` (if using external DB) or local Postgres values (`POSTGRES_*`)
   - `REDIS_URL` (if using external Redis) or `REDIS_PASSWORD` for local Redis

4. Start local PostgreSQL + Redis:

   ```bash
   cd backend
   docker-compose up -d
   ```

5. Run Prisma migrations:

   ```bash
   cd ..
   pnpm --filter nebula-chat-server run prisma:migrate
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
pnpm --filter nebula-chat-server run prisma:generate
pnpm --filter nebula-chat-server run prisma:migrate
pnpm --filter nebula-chat-server run prisma:deploy
pnpm --filter nebula-chat-server run prisma:studio
pnpm --filter nebula-chat-server run prisma:validate
```

## API docs

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Health check

- `GET /health` returns `{ "ok": true }`
