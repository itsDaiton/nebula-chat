# Nebula Chat

Nebula Chat is a full-stack AI chat application.  
It provides a React frontend for chatting and conversation history, plus an Express backend that
streams model responses, stores conversations/messages in PostgreSQL, and caches responses in
Redis.

## Monorepo structure

```text
nebula-chat/
├── frontend/   # React + Vite client (nebula-chat-client)
└── backend/    # Express + Prisma API (nebula-chat-server)
```

## Prerequisites

- Node.js `22.22.1` (see `.nvmrc`)
- pnpm `>=10`
- Docker (recommended for local PostgreSQL + Redis)
- OpenAI API key

## Local development (quick start)

1. Install dependencies from the repo root:

   ```bash
   pnpm install
   ```

2. Create environment files:

   ```bash
   cp /home/runner/work/nebula-chat/nebula-chat/backend/.env.example /home/runner/work/nebula-chat/nebula-chat/backend/.env
   cp /home/runner/work/nebula-chat/nebula-chat/frontend/.env.example /home/runner/work/nebula-chat/nebula-chat/frontend/.env
   ```

3. Fill required values:
   - `backend/.env`: at least `OPENAI_API_KEY`, `SERVER_URL`, `CLIENT_URL`, and local DB/Redis
     values.
   - `frontend/.env`: `VITE_API_URL` (usually `http://localhost:3000` in local development).

4. Start local infrastructure:

   ```bash
   cd /home/runner/work/nebula-chat/nebula-chat/backend && docker-compose up -d
   ```

5. Run DB migrations:

   ```bash
   cd /home/runner/work/nebula-chat/nebula-chat
   pnpm --filter nebula-chat-server run prisma:migrate
   ```

6. Start backend and frontend (in separate terminals):

   ```bash
   cd /home/runner/work/nebula-chat/nebula-chat
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
