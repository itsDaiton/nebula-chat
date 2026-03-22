# Nebula Chat Client

The frontend is a React 19 + Vite SPA for Nebula Chat.

It provides:
- Chat UI with streaming assistant responses
- Conversation list/search navigation
- Responsive layout built with Chakra UI

## Prerequisites

- Node.js `22.22.1` (repo `.nvmrc`)
- pnpm `>=10`

## Local setup

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. Create frontend env file:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

3. Set `VITE_API_URL` in `frontend/.env`:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. Start the app:

   ```bash
   pnpm --filter nebula-chat-client run dev
   ```

The frontend runs at `http://localhost:5173`.

## Scripts

Run from the repo root:

```bash
pnpm --filter nebula-chat-client run dev
pnpm --filter nebula-chat-client run build
pnpm --filter nebula-chat-client run preview
pnpm --filter nebula-chat-client run typecheck
```

## Container notes

If you want to containerize this package manually, you can still build/run it with Podman or
Docker. For local development, the pnpm flow above is the recommended path.
