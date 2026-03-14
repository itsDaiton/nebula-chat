# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root (monorepo)
```bash
npm install           # Install all workspace dependencies
npm run lint          # ESLint (strict, max-warnings=0)
npm run lint:fix      # Auto-fix linting issues
npm run format        # Prettier format all files
npm run format:check  # Check formatting compliance
npm run frontend <cmd>  # Run frontend npm script (e.g. npm run frontend dev)
npm run backend <cmd>   # Run backend npm script (e.g. npm run backend dev)
```

### Frontend (`/frontend`)
```bash
npm run dev        # Vite dev server on localhost:5173
npm run build      # tsc + Vite build → /frontend/build
npm run typecheck  # tsc --noEmit
```

### Backend (`/backend`)
```bash
npm run dev              # tsx watch mode (auto-restart)
npm run build            # prisma generate + tsc + path alias resolution
npm run start            # node dist/src/server.js (production)
npm run typecheck        # tsc --noEmit

npm run prisma:migrate   # Create and run migrations
npm run prisma:deploy    # Deploy migrations (production)
npm run prisma:generate  # Regenerate Prisma Client
npm run prisma:studio    # Open Prisma Studio
```

### Local infrastructure
```bash
cd backend && docker-compose up  # Start PostgreSQL (port 5332) + Redis (port 6380)
```

## Architecture

This is a TypeScript monorepo with three packages: `frontend`, `backend`, and `shared`.

### Frontend (`/frontend`)
React 19 SPA built with Vite and Chakra UI. State is managed through React Context providers defined in `src/App.tsx`:
- `ThemeProvider` (Next Themes)
- `SearchStateProvider`
- `ConversationsProvider`

Feature code lives in `src/modules/` (chat, conversations, auth). Shared UI components, layouts, and contexts are in `src/shared/`. The API base URL is configured via `VITE_API_URL`.

Chat responses are streamed from the backend and rendered using `react-markdown` + `shiki` for syntax highlighting.

### Backend (`/backend`)
Express 5 REST API with:
- **PostgreSQL + Prisma**: Two models — `Conversation` (1:many) `Message`. Schema at `prisma/schema.prisma`.
- **Redis**: Caches chat responses. Cache middleware is layered onto routes.
- **OpenAI**: Streaming completions. Token counting via `tiktoken` to manage context window. Key logic in `src/modules/chat/`.
- **Rate limiting**: `express-rate-limit` middleware applied to the chat streaming route.
- **OpenAPI docs**: Auto-generated from Zod schemas, served at `/docs` (Swagger UI) and `/openapi.json`.

Route structure: `/api/chat`, `/api/conversations`, `/api/messages`, `/api/cache`, `/health`.

Errors use a custom `AppError` class. Path aliases use `@backend/*` mapping to `src/*`.

### Key environment variables
| Variable | Where |
|---|---|
| `VITE_API_URL` | frontend `.env` |
| `OPENAI_API_KEY` | backend `.env` |
| `DATABASE_URL` | backend `.env` |
| `REDIS_URL`, `REDIS_PASSWORD` | backend `.env` |
| `CLIENT_URL`, `SERVER_URL` | backend `.env` (CORS) |

## Code Style
- ESLint with TypeScript strict rules, React hooks validation, and import sorting — enforced with zero warnings tolerance.
- Prettier: single quotes, semicolons, trailing commas, 100-char print width, 2-space indent.
- Backend uses `@backend/*` path aliases. Frontend has its own `tsconfig.json` targeting ESNext.
