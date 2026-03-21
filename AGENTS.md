# AGENTS.md

Comprehensive reference for AI agents (and contributors) working in this repository.
Covers the full monorepo — where things live, how they are built, and how to add to them.

---

## Table of Contents

1. [Git Workflow](#git-workflow)
2. [Code Quality](#code-quality)
3. [Monorepo Structure](#monorepo-structure)
4. [Frontend](#frontend)
   - [Directory Layout](#frontend-directory-layout)
   - [Routing](#routing)
   - [Imports](#imports)
   - [TypeScript Types](#typescript-types)
   - [State Management — Zustand](#state-management--zustand)
   - [Components](#components)
   - [Hooks](#hooks)
   - [Shared Utilities](#shared-utilities)
5. [Backend](#backend)
   - [Directory Layout](#backend-directory-layout)
   - [Module Pattern](#module-pattern)
   - [Error Handling](#error-handling)
   - [Validation](#validation)
   - [Database — Prisma](#database--prisma)
   - [Caching — Redis](#caching--redis)
   - [Chat Streaming](#chat-streaming)
   - [OpenAPI Docs](#openapi-docs)
   - [Path Aliases](#backend-path-aliases)
6. [Environment Variables](#environment-variables)
7. [Local Development](#local-development)

---

## Git Workflow

- **Never commit directly to `main`.** All work must go through a feature branch and pull request.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`, `refactor/<short-description>`.
- One logical change per branch. Don't bundle unrelated changes.
- Always push the branch and open a PR when the work is complete.

### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`.
  - Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`.
  - Scope is optional but encouraged: `feat(chat): ...`, `fix(backend): ...`, `refactor(frontend): ...`
- Keep the subject line under 72 characters.
- Commit logically complete units of work — don't leave the codebase in a broken state between commits.

### Pull Requests

- Always open a PR against `main`.
- PR title follows the same Conventional Commits format.
- PR description must include a brief summary of what changed and why, plus a test plan.
- Keep PRs small and focused. Split large changes into multiple PRs.

---

## Code Quality

Run these from the repo root after **every** code change — this is mandatory, not optional:

```bash
pnpm run lint:fix      # ESLint auto-fix (zero warnings tolerance)
pnpm run format        # Prettier format
```

Also run typecheck in the affected package before committing:

```bash
pnpm --filter nebula-chat-client run typecheck
pnpm --filter nebula-chat-server run typecheck
```

Do not disable ESLint rules with inline `// eslint-disable` comments unless absolutely necessary, and always document why.

---

## Monorepo Structure

```
nebula-chat/
├── frontend/          # React SPA (nebula-chat-client)
├── backend/           # Express API (nebula-chat-server)
├── CLAUDE.md          # Claude Code instructions
├── AGENTS.md          # This file
├── package.json       # Root workspace (pnpm)
└── pnpm-workspace.yaml
```

Both packages are managed with pnpm workspaces. Run scripts scoped to a package:

```bash
pnpm --filter nebula-chat-client run dev
pnpm --filter nebula-chat-server run dev
```

---

## Frontend

### Frontend Directory Layout

```
frontend/src/
├── App.tsx                        # Root — mounts providers and router
├── main.tsx                       # Vite entry point
├── RouterProvider.tsx             # React Router setup
├── routes.ts                      # Typed route helpers
├── resources.ts                   # UI string constants
├── App.css
├── theme/
│   ├── theme.ts                   # Chakra UI theme tokens
│   └── ThemeProvider.tsx          # next-themes wrapper
├── modules/                       # Feature modules
│   ├── auth/
│   │   └── AuthPage.tsx
│   ├── chat/
│   │   ├── ChatPage.tsx
│   │   ├── types/types.ts         # All chat types
│   │   ├── utils/chatUtils.ts     # Model options list, pure helpers
│   │   ├── stores/                # Zustand stores
│   │   │   ├── useChatStreamStore.ts
│   │   │   ├── useMessageStore.ts
│   │   │   ├── useModelStore.ts
│   │   │   └── useModelSelectorStore.ts
│   │   ├── hooks/                 # Logic hooks (consume stores)
│   │   │   ├── useChatStream.ts
│   │   │   ├── useHandleSendMessage.ts
│   │   │   ├── useMessageHandler.ts
│   │   │   ├── useModel.ts
│   │   │   └── useModelSelector.ts
│   │   └── components/
│   │       ├── ChatContainer.tsx
│   │       ├── ChatInput.tsx
│   │       ├── ChatInputArea.tsx
│   │       ├── ChatMessage.tsx
│   │       ├── ChatStreaming.tsx
│   │       ├── ModelSelect.tsx
│   │       ├── SendButton.tsx
│   │       └── ...
│   └── conversations/
│       ├── types/types.ts         # All conversation types
│       ├── utils/navigationActions.tsx
│       ├── context/
│       │   └── ConversationsContext.tsx   # Init effect only — state is in the store
│       ├── stores/
│       │   └── useConversationsStore.ts
│       ├── hooks/
│       │   ├── useConversation.ts
│       │   ├── useConversationsSearch.ts
│       │   └── useInfiniteScroll.ts
│       └── components/
│           ├── ConversationsList.tsx
│           ├── ConversationDrawer.tsx
│           ├── ConversationsSearch.tsx
│           ├── ConversationListItem.tsx
│           └── ConversationSkeletons.tsx
└── shared/                        # Cross-module code
    ├── types/types.ts             # Shared types
    ├── config/
    │   ├── serverConfig.ts        # API base URL helper
    │   └── paginationConfig.ts    # Default page size
    ├── stores/                    # Global Zustand stores
    │   ├── useSearchStore.ts      # Search overlay open/closed
    │   ├── useDrawerStore.ts      # Mobile drawer open/closed
    │   └── useViewportStore.ts    # Viewport height
    ├── hooks/                     # Shared utility hooks
    │   ├── useAutoScroll.ts
    │   ├── useDebounce.ts
    │   ├── useDrawer.ts
    │   ├── useEscapeKey.ts
    │   ├── useEventListener.ts
    │   ├── useKeyboardHandler.ts
    │   ├── useKeyboardShortcut.ts
    │   ├── useMultiLine.ts
    │   ├── useResponsiveLayout.ts
    │   ├── useResetChat.ts
    │   ├── useTextareaAutoResize.ts
    │   └── useViewportHeight.ts
    ├── layout/
    │   ├── Layout.tsx             # Main shell (header, sidepanels, drawer)
    │   ├── Header.tsx
    │   ├── SidePanel.tsx
    │   └── Page.tsx
    ├── components/
    │   ├── navigation/
    │   │   ├── NebulaButton.tsx
    │   │   ├── NebulaMenu.tsx
    │   │   └── BadgeActionButton.tsx
    │   └── ui/                    # Chakra UI primitives & adapters
    │       ├── color-mode.tsx
    │       ├── provider.tsx
    │       ├── toaster.tsx
    │       ├── tooltip.tsx
    │       ├── markdown-content.tsx
    │       └── ...
    └── utils/
        ├── errorHandler.ts        # handleHttpError, handleNetworkError
        ├── formatDate.ts
        ├── scrollUtils.ts
        ├── menuUtils.ts
        ├── urlUtils.ts
        └── index.ts
```

---

### Routing

Routes are defined in `routes.ts` as typed helpers and consumed through React Router:

```ts
import { route } from '@/routes';

navigate(route.chat.root());                   // /
navigate(route.chat.conversation(id));         // /c/:id
```

`RouterProvider.tsx` sets up the React Router instance. Route components live in `modules/*/` as `*Page.tsx` files.

---

### Imports

Always use the `@/` path alias — never relative paths (`./`, `../../`, etc.). `@/` maps to `frontend/src/`.

```ts
// correct
import { useSearchStore } from '@/shared/stores/useSearchStore';
import type { Conversation } from '@/modules/conversations/types/types';

// wrong
import { useSearchStore } from '../../shared/stores/useSearchStore';
import type { Conversation } from '../types/types';
```

---

### TypeScript Types

- Use `type` — never `interface`.

```ts
// correct
type ConversationWithMessages = {
  id: string;
  messages: Message[];
};

// wrong
interface ConversationWithMessages { ... }
```

- All types must live in `/types/types.ts` under the relevant module or `shared/`. Never define types inline inside hook, store, or component files.
- Always import types with the `type` keyword:

```ts
import type { ChatMessage } from '@/modules/chat/types/types';
```

---

### State Management — Zustand

All client state is managed with [Zustand](https://zustand.docs.pmnd.rs/). React Context is **not** used for state.

#### When to use Zustand vs `useState`

| Scenario | Use |
|---|---|
| State shared across two or more components | Zustand store |
| Global UI state (drawer, search overlay, viewport height) | Zustand store |
| API-fetching state (loading, data, error) | Zustand store |
| DOM measurements shared across instances (e.g. `useMultiLine`) | Zustand store keyed by content |
| Debounce timers | Module-level variable alongside the store — not React state |
| Truly isolated, non-shared local state | `useState` acceptable as a last resort |

#### Folder rules

- Zustand stores go in `/stores/` under the owning module or `shared/stores/` if global.
- Hooks that consume stores go in `/hooks/`.
- One store file per concern.

#### Store conventions

Define state and named actions together in a single `create()` call. Prefer action names that express intent over generic setters:

```ts
// correct — expressive actions
export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  openSearch:   () => set({ isSearchOpen: true }),
  closeSearch:  () => set({ isSearchOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
}));

// avoid — unclear intent at call site
export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  setIsSearchOpen: (value: boolean) => set({ isSearchOpen: value }),
}));
```

Use `get()` inside async actions to read current state — do not close over stale values:

```ts
loadMore: async () => {
  const { hasMore, isLoadingMore, nextCursor } = get();
  if (!hasMore || isLoadingMore || !nextCursor) return;
  // ...
},
```

Store types that are referenced outside the store file must live in `/types/types.ts`.

#### React Context

Context is **not** used for shared state. The one remaining provider is `ConversationsProvider`, which exists solely to trigger `fetchConversations` on app startup — it does not hold its own state. All components subscribe to `useConversationsStore` directly.

#### Existing stores

| Store | Location | Owns |
|---|---|---|
| `useConversationsStore` | `modules/conversations/stores/` | Conversations list, pagination, fetch, load-more |
| `useConversationStore` | `modules/conversations/stores/` | Single active conversation, loading, error, refetch |
| `useConversationsSearchStore` | `modules/conversations/stores/` | Search query, debounced query, results, loading, error |
| `useChatStreamStore` | `modules/chat/stores/` | Chat history, streaming flag, token usage, conversation ID |
| `useMessageStore` | `modules/chat/stores/` | Current message input value |
| `useModelStore` | `modules/chat/stores/` | Selected AI model |
| `useModelSelectorStore` | `modules/chat/stores/` | Model dropdown open state and trigger width |
| `useSearchStore` | `shared/stores/` | Search overlay open/closed |
| `useDrawerStore` | `shared/stores/` | Mobile drawer open/closed |
| `useViewportStore` | `shared/stores/` | Viewport height string (updated on resize) |
| `useMultiLineStore` | `shared/stores/` | Per-content multi-line detection map (`Record<string, boolean>`) |

---

### Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- Components read from stores and hooks — they do not own significant state themselves.
- Use Chakra UI primitives. Custom UI wrappers live in `shared/components/ui/`.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- String literals shown in the UI live in `resources.ts` — do not hardcode UI strings inside components.

---

### Hooks

Hooks in `/hooks/` are thin wrappers that read from one or more stores and compose logic. They must not duplicate state that already lives in a store.

```ts
// correct — delegates entirely to stores
export const useDrawer = () => {
  const { isDrawerOpen, openDrawer, closeDrawer, toggleDrawer } = useDrawerStore();
  const { isSearchOpen, openSearch, closeSearch, toggleSearch } = useSearchStore();
  return { isDrawerOpen, openDrawer, closeDrawer, toggleDrawer, isSearchOpen, openSearch, closeSearch, toggleSearch };
};

// wrong — re-introduces local state that belongs in a store
export const useDrawer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // never do this
};
```

Utility hooks that are inherently parameterised per call-site (`useDebounce`, `useEventListener`, `useAutoScroll`) may use `useState`/`useRef` — they cannot be singleton stores.

---

### Shared Utilities

- `shared/utils/errorHandler.ts` — `handleHttpError(response)` and `handleNetworkError(err)` used in all API call sites. Always go through these rather than throwing raw errors.
- `shared/config/serverConfig.ts` — `SERVER_CONFIG.getApiEndpoint(path)` constructs full API URLs from `VITE_API_URL`. Never hardcode API base URLs.
- `shared/config/paginationConfig.ts` — `paginationConfig.defaultLimit` for page sizes.

---

## Backend

### Backend Directory Layout

```
backend/src/
├── server.ts                      # Express app bootstrap
├── prisma.ts                      # Prisma client singleton
├── config/
│   ├── cors.config.ts             # Allowed origins, CORS options
│   ├── headers.config.ts          # SSE + cache response headers
│   ├── openapi.config.ts          # OpenAPI generator setup
│   └── pagination.config.ts       # Default/max page limits
├── errors/
│   └── AppError.ts                # Error class hierarchy
├── middleware/
│   ├── errorHandler.ts            # Global error handler (last middleware)
│   ├── validate.ts                # Zod schema validation middleware
│   ├── rateLimiter.ts             # 10 req/min on /api/chat/stream
│   ├── cacheCheck.ts              # Redis cache hit — bypass OpenAI
│   └── streamCapture.ts           # Intercept stream to save to Redis
├── modules/
│   ├── chat/
│   │   ├── chat.types.ts
│   │   ├── chat.validation.ts     # Zod request schemas
│   │   ├── chat.config.ts         # Token limits, model allowlist
│   │   ├── chat.tokenizer.ts      # tiktoken token counting/validation
│   │   ├── chat.utils.ts          # OpenAI client, SSE event formatting
│   │   ├── chat.service.ts        # Streaming orchestration
│   │   ├── chat.controller.ts
│   │   ├── chat.routes.ts         # rateLimiter → validate → cacheCheck → streamCapture → controller
│   │   └── chat.openapi.ts
│   ├── conversation/
│   │   ├── conversation.types.ts
│   │   ├── conversation.validation.ts
│   │   ├── conversation.repository.ts   # All Prisma queries
│   │   ├── conversation.service.ts
│   │   ├── conversation.controller.ts
│   │   ├── conversation.routes.ts
│   │   └── conversation.openapi.ts
│   └── message/
│       ├── message.types.ts
│       ├── message.validation.ts
│       ├── message.repository.ts
│       ├── message.service.ts
│       ├── message.controller.ts
│       ├── message.routes.ts
│       └── message.openapi.ts
├── cache/                         # Redis-backed cache as its own module
│   ├── cache.types.ts
│   ├── cache.config.ts            # Key format, TTL (600 000 ms), max items (1000)
│   ├── cache.client.ts            # Redis connection
│   ├── cache.service.ts           # get, set, stats, eviction
│   ├── cache.validation.ts
│   ├── cache.controller.ts
│   ├── cache.routes.ts
│   └── cache.openapi.ts
├── openapi/
│   ├── index.ts                   # Aggregates all module specs
│   └── schemas.ts                 # Shared OpenAPI schemas (error shape, etc.)
└── routes/
    └── index.ts                   # Mounts all routers under /api/*
```

---

### Module Pattern

Every feature module follows this strict layering. Add files in this order when creating a new module:

```
1. <module>.types.ts        — TypeScript types / DTOs (no logic)
2. <module>.validation.ts   — Zod schemas for request body/params/query + OpenAPI extensions
3. <module>.repository.ts   — Raw Prisma queries; no business logic (omit if no DB access)
4. <module>.service.ts      — Business logic; calls repository; never touches req/res
5. <module>.controller.ts   — Calls service; builds HTTP response; minimal logic
6. <module>.routes.ts       — Express router; applies middleware chain
7. <module>.openapi.ts      — Registers routes in the OpenAPI registry
```

New modules must be mounted in `routes/index.ts` and registered in `openapi/index.ts`.

---

### Error Handling

All errors extend `AppError` from `errors/AppError.ts`. Use the subclass that matches the situation:

| Class | HTTP status | When to use |
|---|---|---|
| `NotFoundError` | 404 | Resource not found by ID |
| `BadRequestError` | 400 | Invalid input not caught by Zod |
| `UnauthorizedError` | 401 | Not authenticated |
| `ForbiddenError` | 403 | Authenticated but not allowed |
| `PayloadTooLargeError` | 413 | Message exceeds token limit |
| `MissingConfigurationError` | 500 | Required env var not set |
| `RedisConnectionError` / `RedisCacheError` | 500 | Redis failures (usually fail-open) |
| `APIError` | configurable | External API errors |

Throw from service layer; the global `errorHandler` middleware in `server.ts` catches everything and returns:

```json
{ "success": false, "error": "NotFound", "message": "Conversation ... not found" }
```

Never return raw error objects to the client. Never throw from controllers — let the global handler do it.

---

### Validation

Use the `validate()` middleware from `middleware/validate.ts` with a Zod schema on every route that accepts input:

```ts
// chat.routes.ts
router.post('/stream', rateLimiter, validate(chatStreamSchema), cacheCheck, streamCapture, controller.streamMessage);
```

`validate()` checks body, params, and query. On failure it returns 400 with a structured error tree via `z.treeifyError()`. Define schemas in the module's `*.validation.ts` file using the OpenAPI-extended Zod registry:

```ts
import { z } from 'zod';
import { registry } from '@backend/openapi';

export const chatStreamSchema = registry.register('ChatStreamRequest',
  z.object({
    messages: z.array(messageSchema).min(1),
    model: z.string(),
    conversationId: z.string().uuid().optional(),
  })
);
```

---

### Database — Prisma

Schema lives at `prisma/schema.prisma`. Two models:

```prisma
model Conversation {
  id        String    @id @default(uuid())
  title     String
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  content        String
  role           String       # "user" | "assistant" | "system"
  model          String?
  tokens         Json?        # { promptTokens, completionTokens, totalTokens }
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId])
}
```

**Rules:**
- All Prisma calls go in `*.repository.ts` files — never in services or controllers.
- The Prisma singleton lives in `src/prisma.ts`. Always import from there.
- After changing the schema run `pnpm prisma:migrate` in dev or `pnpm prisma:deploy` in prod, then `pnpm prisma:generate`.
- Conversations are cursor-paginated using the conversation `id` as the cursor.
- Max 20 messages are loaded into context for a single chat request.

---

### Caching — Redis

The cache is a Redis-backed SSE stream store keyed by conversation + model + prompt hash.

**Key format:** `conversation:{conversationId}:model:{model}:prompt:{sha256(prompt)[0:16]}`

**Flow:**
1. `cacheCheck` middleware runs before the controller. If a key exists it replays the cached token stream and returns — OpenAI is never called.
2. `streamCapture` middleware wraps `res.write()` after a real OpenAI call. When the response ends it saves the full SSE stream to Redis.
3. Max 1,000 cache entries. On overflow the oldest key (FIFO tracked in a Redis list) is evicted.
4. TTL: 600,000 ms (10 minutes).
5. **Fail-open:** all Redis errors are caught; the app continues without caching.

Cache stats and management endpoints live at `/api/cache/*`.

---

### Chat Streaming

The chat route is the most complex part of the backend. End-to-end flow:

```
POST /api/chat/stream
  → rateLimiter          (10 req / 60 s per IP)
  → validate(schema)     (Zod)
  → cacheCheck           (Redis hit → replay stream, done)
  → streamCapture        (wraps res.write to capture output)
  → chatController.streamMessage
      → chat.service
          1. Validate token budget (tiktoken — max 2 000 prompt, 10 000 context)
          2. Fetch conversation history (last 20 messages)
          3. prisma.$transaction — create user message + conversation if new
          4. Call OpenAI streaming completions
          5. Pipe tokens to client as SSE events
          6. On stream end — persist assistant message + token usage
      → streamCapture saves output to Redis
```

**SSE event types emitted to the client:**

| Event | Data |
|---|---|
| `conversation-created` | `{ conversationId }` |
| `user-message-created` | `{ messageId }` |
| `token` | `{ token }` — one per streamed chunk |
| `usage` | `{ promptTokens, completionTokens, totalTokens }` |
| `assistant-message-created` | `{ messageId }` |
| `end` | `"end"` |
| `error` | `{ error }` |

Token limits are configured in `chat.config.ts`:
- Max prompt tokens: **2 000**
- Max completion tokens: **1 000**
- Max context window: **10 000**

---

### OpenAPI Docs

Every route is documented automatically. When adding a new route:

1. Define the request/response Zod schemas in `*.validation.ts` using the shared `registry`.
2. Register the route in `*.openapi.ts` with `registry.registerPath()`.
3. Import and call your `register*` function from `openapi/index.ts`.

The generated spec is served at `/openapi.json`; Swagger UI at `/docs`.

---

### Backend Path Aliases

The backend uses `@backend/*` as a path alias for `src/*`:

```ts
import { prisma } from '@backend/prisma';
import { AppError } from '@backend/errors/AppError';
```

Never use relative paths in the backend. Aliases are configured in `tsconfig.json` and resolved at build time by `tsc-alias`.

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:3000`) |

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection (e.g. `redis://localhost:6380`) |
| `REDIS_PASSWORD` | Redis password (if set) |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `SERVER_URL` | Backend public URL (used in OpenAPI docs) |
| `PORT` | Port to listen on (default `3000`) |

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL on :5332, Redis on :6380)
cd backend && docker-compose up -d

# 3. Run DB migrations
pnpm --filter nebula-chat-server run prisma:migrate

# 4. Start backend (watch mode)
pnpm --filter nebula-chat-server run dev

# 5. Start frontend (Vite dev server on :5173)
pnpm --filter nebula-chat-client run dev
```

### API Docs (dev)

Open `http://localhost:3000/docs` for the Swagger UI once the backend is running.
