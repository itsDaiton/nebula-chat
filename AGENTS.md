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
   - [No `index.ts` barrels](#no-indexts-barrels)
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
├── apps/
│   ├── nebula-chat-client/   # React SPA (frontend)
│   └── nebula-chat-server/   # Fastify API (backend)
├── CLAUDE.md                 # Claude Code instructions
├── AGENTS.md                 # This file
├── package.json              # Root workspace (pnpm)
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
apps/nebula-chat-client/src/
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
│       │   └── ConversationsContext.tsx   # createContext + useConversationsContext hook only
│       ├── providers/
│       │   └── ConversationsProvider.tsx  # Provider component — reads store, supplies context value
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
        ├── dateUtils.ts
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

navigate(route.chat.root()); // /
navigate(route.chat.conversation(id)); // /c/:id
```

`RouterProvider.tsx` sets up the React Router instance. Route components live in `modules/*/` as `*Page.tsx` files.

---

### Imports

Always use the `@/` path alias — never relative paths (`./`, `../../`, etc.). `@/` maps to `apps/nebula-chat-client/src/`. This applies to **every** import in every file — components, hooks, utils, and types — regardless of how close the files are to each other.

**Check every import in every file you touch.** If a relative path exists anywhere in a file you modify, fix it.

```ts
// correct
import { useSearchStore } from '@/shared/stores/useSearchStore';
import type { Conversation } from '@/modules/conversations/types/types';
import { ChatInput } from '@/modules/chat/components/ChatInput';
import { useChatStream } from '@/modules/chat/hooks/useChatStream';

// wrong — no relative paths, ever
import { useSearchStore } from '../../shared/stores/useSearchStore';
import type { Conversation } from '../types/types';
import { ChatInput } from './ChatInput';
```

---

### No `index.ts` barrels

Never use `index.ts` files for re-exports. Each module, component, hook, util, or type must be imported directly from the file that defines it — no barrel files anywhere in the repo (frontend or backend).

This keeps imports explicit, avoids circular-dependency traps, and prevents the tree-shaking and IDE-performance issues barrel files are known for.

```ts
// correct — import from the defining file
import { axiosClient } from '@/libs/api/client';
import { queryClient } from '@/libs/api/queryClient';
import { ChatInput } from '@/modules/chat/components/ChatInput';

// wrong — never re-export through an index.ts
// apps/nebula-chat-client/src/libs/api/index.ts
export * from './client';
export * from './queryClient';
```

The only `index.ts` files tolerated are those emitted by code generators (e.g. Orval output). Do not hand-author or hand-edit them.

---

### TypeScript Types

- Use `type` — never `interface`. This applies everywhere: `types/types.ts`, hooks, components, utils — no exceptions.

```ts
// correct
type ConversationWithMessages = {
  id: string;
  messages: Message[];
};

// wrong — anywhere in the codebase
interface ConversationWithMessages { ... }
```

- All types must live in `/types/types.ts` under the relevant module or `shared/`. Never define types inline inside hook, store, or component files.
- Always import types with the `type` keyword:

```ts
import type { ChatMessage } from '@/modules/chat/types/types';
```

### Modern TypeScript / ES Style

- **Never use `'use client'`** — this is a Vite/React SPA, not Next.js. The directive has no effect and must never appear in any file.

- Always use `const` arrow functions — never `function` declarations. This applies to hooks, utils, helpers, and components.

```ts
// correct
export const useMyHook = () => { ... };
export const formatDate = (date: string): string => { ... };
export const MyComponent = () => <div />;

// wrong
export function useMyHook() { ... }
export function formatDate(date: string): string { ... }
function MyComponent() { ... }
```

---

### State Management — Zustand

All client state is managed with [Zustand](https://zustand.docs.pmnd.rs/). React Context is **not** used for state.

#### Never use `useState`

**Never use `useState`.** All state lives in Zustand stores. There is no scenario where `useState` is the right choice.

| Scenario                                                       | Use                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| State shared across two or more components                     | Zustand store                                               |
| Global UI state (drawer, search overlay, viewport height)      | Zustand store                                               |
| API-fetching state (loading, data, error)                      | Zustand store                                               |
| DOM measurements shared across instances (e.g. `useMultiLine`) | Zustand store keyed by content                              |
| Debounce timers                                                | Module-level variable alongside the store — not React state |
| Tracking a previous value across renders                       | `useRef` — not state                                        |
| Any other "local" state                                        | Zustand store in the owning module                          |

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
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
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

Context is **not** used for shared state. When a context is needed, split it across two files:

- **`context/<Name>Context.tsx`** — `createContext` + the typed `use<Name>Context()` hook. No JSX, no store imports.
- **`providers/<Name>Provider.tsx`** — the provider component. Reads from Zustand stores, memoizes the value, renders `<Context.Provider>`.

The one existing provider is `ConversationsProvider`, which wraps the app to supply context values from `useConversationsStore`. It does not hold its own state. The initial fetch is triggered at module-level store initialization. All components subscribe to `useConversationsStore` directly.

#### Existing stores

| Store                         | Location                        | Owns                                                             |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `useConversationsStore`       | `modules/conversations/stores/` | Conversations list, pagination, fetch, load-more                 |
| `useConversationStore`        | `modules/conversations/stores/` | Single active conversation, loading, error, refetch              |
| `useConversationsSearchStore` | `modules/conversations/stores/` | Search query, debounced query, results, loading, error           |
| `useChatStreamStore`          | `modules/chat/stores/`          | Chat history, streaming flag, token usage, conversation ID       |
| `useMessageStore`             | `modules/chat/stores/`          | Current message input value                                      |
| `useModelStore`               | `modules/chat/stores/`          | Selected AI model                                                |
| `useModelSelectorStore`       | `modules/chat/stores/`          | Model dropdown open state and trigger width                      |
| `useSearchStore`              | `shared/stores/`                | Search overlay open/closed                                       |
| `useDrawerStore`              | `shared/stores/`                | Mobile drawer open/closed                                        |
| `useViewportStore`            | `shared/stores/`                | Viewport height string (updated on resize)                       |
| `useMultiLineStore`           | `shared/stores/`                | Per-content multi-line detection map (`Record<string, boolean>`) |

---

### Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- **One component per file.** Never define multiple components, hooks, or significant logic in a single file. No co-located sub-components, no local helper components at the bottom of a file — every component gets its own file.
- Components read from stores and hooks — they do not own significant state themselves.
- Use Chakra UI primitives. Custom UI wrappers live in `shared/components/ui/`.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities.

---

### Hooks

Hooks in `/hooks/` are thin wrappers that read from one or more stores and compose logic. They must not duplicate state that already lives in a store.

```ts
// correct — delegates entirely to stores
export const useDrawer = () => {
  const { isDrawerOpen, openDrawer, closeDrawer, toggleDrawer } = useDrawerStore();
  const { isSearchOpen, openSearch, closeSearch, toggleSearch } = useSearchStore();
  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isSearchOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  };
};

// wrong — re-introduces local state that belongs in a store
export const useDrawer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // never do this
};
```

Utility hooks that are inherently parameterised per call-site (`useDebounce`, `useEventListener`) may use `useRef` — they cannot be singleton stores.

---

### `useEffect` rules

**Never use `useEffect`.** Reference: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

| Pattern                            | Wrong                            | Right                                                                             |
| ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Derived / computed state           | `useEffect` → `setState`         | Compute inline during render or `useMemo`                                         |
| Syncing state on prop/route change | `useEffect` → Zustand `set`      | Render-time `useRef` guard (see `useConversation.ts`)                             |
| Initialising data on mount         | `useEffect(() => fetch(), [])`   | Module-level store init (see `useConversationsStore.ts`)                          |
| Reading a browser API value        | `useEffect` + `useState`         | `useSyncExternalStore` (see `useViewportHeight.ts`)                               |
| DOM measurement after mount        | `useRef` + `useEffect`           | Callback ref — `ref={useCallback((node) => { ... }, [])}` (see `useMultiLine.ts`) |
| Registering a DOM event listener   | `useEffect` + `addEventListener` | `useEventListener` via `useSyncExternalStore` subscribe lifecycle                 |

No hook or component in the codebase may import or call `useEffect`.

---

### Shared Utilities

- `shared/utils/errorHandler.ts` — `handleHttpError(response)` and `handleNetworkError(err)` used in all API call sites. Always go through these rather than throwing raw errors.
- `shared/config/serverConfig.ts` — `SERVER_CONFIG.getApiEndpoint(path)` constructs full API URLs from `VITE_API_URL`. Never hardcode API base URLs.
- `shared/config/paginationConfig.ts` — `paginationConfig.defaultLimit` for page sizes.

---

## Backend

### Backend Directory Layout

```
apps/nebula-chat-server/src/
├── app.ts                         # buildApp() factory — registers plugins, routes, compilers
├── server.ts                      # Thin entry point — calls buildApp() then app.listen()
├── env.ts                         # Zod-validated env schema — single source for all process.env reads
├── prisma.ts                      # Prisma client singleton
├── config/
│   ├── cors.config.ts             # Allowed origins, CORS options
│   ├── headers.config.ts          # SSE + cache response headers (uses http.ServerResponse)
│   └── pagination.config.ts       # Default/max page limits
├── errors/
│   ├── AppError.ts                # Error class hierarchy
│   ├── error.handler.ts           # Fastify setErrorHandler callback (Zod, AppError, Prisma, fallback)
│   └── error.schema.ts            # Shared Zod errorResponseSchema (used in route response schemas)
├── modules/
│   ├── chat/
│   │   ├── chat.types.ts
│   │   ├── chat.validation.ts     # Zod request/response schemas
│   │   ├── chat.config.ts         # Token limits, model allowlist
│   │   ├── chat.tokenizer.ts      # tiktoken token counting/validation
│   │   ├── chat.utils.ts          # OpenAI client, SSE event formatting (uses http.ServerResponse)
│   │   ├── chat.service.ts        # Streaming orchestration
│   │   ├── chat.controller.ts
│   │   └── chat.routes.ts         # FastifyPluginAsyncZod; schema blocks + hook chain
│   ├── conversation/
│   │   ├── conversation.types.ts
│   │   ├── conversation.validation.ts
│   │   ├── conversation.repository.ts   # All Prisma queries
│   │   ├── conversation.service.ts
│   │   ├── conversation.controller.ts
│   │   └── conversation.routes.ts
│   └── message/
│       ├── message.types.ts
│       ├── message.validation.ts
│       ├── message.repository.ts
│       ├── message.service.ts
│       ├── message.controller.ts
│       └── message.routes.ts
└── cache/                         # Redis-backed cache as its own module
    ├── cache.types.ts
    ├── cache.config.ts            # Key format, TTL (600 000 ms), max items (1000)
    ├── cache.client.ts            # Redis connection
    ├── cache.service.ts           # get, set, stats, eviction
    ├── cache.validation.ts
    ├── cache.controller.ts
    └── cache.routes.ts
```

---

### Module Pattern

Every feature module follows this strict 6-layer convention. Add files in this order when creating a new module:

```
1. <module>.types.ts        — TypeScript types / DTOs (no logic)
2. <module>.validation.ts   — Zod schemas for request body/params/query/response
3. <module>.repository.ts   — Raw Prisma queries; no business logic (omit if no DB access)
4. <module>.service.ts      — Business logic; calls repository; never touches req/res
5. <module>.controller.ts   — Calls service; builds HTTP response; minimal logic
6. <module>.routes.ts       — FastifyPluginAsyncZod default export; schema blocks + hook chain
```

New modules must be mounted in `buildApp()` in `src/app.ts` via `app.register(plugin, { prefix: '/api/<module>' })`. No separate OpenAPI registry step — the `schema:` block on each route is the single source of truth for both validation and documentation.

---

### Error Handling

All errors extend `AppError` from `errors/AppError.ts`. Use the subclass that matches the situation:

| Class                                      | HTTP status  | When to use                        |
| ------------------------------------------ | ------------ | ---------------------------------- |
| `NotFoundError`                            | 404          | Resource not found by ID           |
| `BadRequestError`                          | 400          | Invalid input not caught by Zod    |
| `UnauthorizedError`                        | 401          | Not authenticated                  |
| `ForbiddenError`                           | 403          | Authenticated but not allowed      |
| `PayloadTooLargeError`                     | 413          | Message exceeds token limit        |
| `MissingConfigurationError`                | 500          | Required env var not set           |
| `RedisConnectionError` / `RedisCacheError` | 500          | Redis failures (usually fail-open) |
| `APIError`                                 | configurable | External API errors                |

Throw from service layer; the `errorHandler` exported from `errors/error.handler.ts` and registered in `buildApp()` catches everything and returns:

```json
{ "success": false, "error": "NotFound", "message": "Conversation ... not found" }
```

Never return raw error objects to the client. Never throw from controllers — let the global handler do it.

---

### Validation

Validation is handled by Fastify's native schema layer via `fastify-type-provider-zod`. Define Zod schemas in the module's `*.validation.ts` file, then reference them in the `schema:` block of the corresponding route. Use `FastifyPluginAsyncZod` (not `FastifyPluginAsync`) so TypeScript infers request types from the schemas:

```ts
// conversation.routes.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '@backend/errors/error.schema';
import { conversationController } from '@backend/modules/conversation/conversation.controller';
import { createConversationSchema, conversationResponseSchema } from './conversation.validation';

const conversationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/', {
    schema: {
      description: 'Create a new conversation with a title',
      summary: 'Create conversation',
      tags: ['Conversations'],
      operationId: 'createConversation',
      body: createConversationSchema,
      response: {
        201: conversationResponseSchema.describe('Conversation created successfully'),
        400: errorResponseSchema.describe('Invalid request body'),
        500: errorResponseSchema.describe('Internal server error'),
      },
    },
    handler: conversationController.create,
  });
};
```

**Rule — every response entry must have `.describe('...')`:** `@fastify/swagger` emits "Default Response" for any response schema that has no description. Always call `.describe('...')` on the Zod schema at the point it is used in the `response:` block (not in the validation file — the description is route-contextual). This applies to success and error responses alike:

```ts
response: {
  201: conversationResponseSchema.describe('Conversation created successfully'),
  400: errorResponseSchema.describe('Invalid request body'),
  404: errorResponseSchema.describe('Conversation not found'),
  500: errorResponseSchema.describe('Internal server error'),
},
```

**Rule — every route needs a `schema:` block.** Routes without one produce "Default Response" entries. Use `{ schema: { hide: true } }` to explicitly exclude infrastructure routes (e.g. `/openapi.json`) from the spec rather than leaving them undocumented.

On validation failure the error is routed through `setErrorHandler`. Use `hasZodFastifySchemaValidationErrors(err)` (exported from `fastify-type-provider-zod`) in the error handler to detect and format these. Define schemas in `*.validation.ts` using plain Zod — no registry extensions needed. Use `.describe()` to add field-level descriptions for Swagger docs:

```ts
// conversation.validation.ts
import { z } from 'zod';

export const getConversationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .default(10)
    .describe('Number of conversations to fetch (1-50, default 10)'),
  cursor: z.uuid().optional().describe('Pagination cursor for the next page'),
});
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

1. `cacheCheckHook` preHandler runs before the controller. If a key exists it replays the cached token stream and returns — OpenAI is never called.
2. `streamCaptureHook` preHandler monkey-patches `reply.raw.write` after a real OpenAI call. When the response ends it saves the full SSE stream to Redis.
3. Max 1,000 cache entries. On overflow the oldest key (FIFO tracked in a Redis list) is evicted.
4. TTL: 600,000 ms (10 minutes).
5. **Fail-open:** all Redis errors are caught; the app continues without caching.

Cache stats and management endpoints live at `/api/cache/*`.

---

### Chat Streaming

The chat route is the most complex part of the backend. End-to-end flow:

```
POST /api/chat/stream
  → @fastify/rate-limit         (10 req / 60 s per IP, opt-in via route config)
  → Zod body validation         (schema: { body: createChatStreamSchema } — native Fastify)
  → cacheCheckHook preHandler   (Redis hit → replay stream via reply.hijack() + reply.raw, done)
  → streamCaptureHook preHandler (monkey-patches reply.raw.write to capture output)
  → chatController.streamMessage
      → chat.service
          1. Validate token budget (tiktoken — max 2 000 prompt, 10 000 context)
          2. Fetch conversation history (last 20 messages)
          3. prisma.$transaction — create user message + conversation if new
          4. Call OpenAI streaming completions
          5. Pipe tokens to client as SSE events via reply.hijack() + reply.raw.write/reply.raw.end
          6. On stream end — persist assistant message + token usage
      → streamCaptureHook saves captured output to Redis
```

**SSE event types emitted to the client:**

| Event                       | Data                                              |
| --------------------------- | ------------------------------------------------- |
| `conversation-created`      | `{ conversationId }`                              |
| `user-message-created`      | `{ messageId }`                                   |
| `token`                     | `{ token }` — one per streamed chunk              |
| `usage`                     | `{ promptTokens, completionTokens, totalTokens }` |
| `assistant-message-created` | `{ messageId }`                                   |
| `end`                       | `"end"`                                           |
| `error`                     | `{ error }`                                       |

Token limits are configured in `chat.config.ts`:

- Max prompt tokens: **2 000**
- Max completion tokens: **1 000**
- Max context window: **10 000**

---

### OpenAPI Docs

OpenAPI documentation is generated dynamically by `@fastify/swagger` in dynamic mode, driven by `fastify-type-provider-zod`. There is no separate registry or `*.openapi.ts` file. The `schema:` block on each route is the single source of truth:

- `body`, `params`, `querystring` — Zod schemas for request validation and request docs
- `response` — Zod schemas per status code for response serialization and response docs
- `description`, `summary`, `tags`, `operationId` — OpenAPI metadata, inline on the route

The generated spec is served at `/openapi.json`; Swagger UI at `/docs`.

To export the spec as a static YAML file for the frontend Orval client, run:

```bash
pnpm --filter nebula-chat-server run generate:openapi  # writes openapi/openapi.yaml to repo root
```

The script (`src/scripts/generate-openapi.ts`) calls `buildApp()` → `app.ready()` → `app.swagger({ yaml: true })` and writes the result. It requires a full `.env` file since `buildApp()` parses env vars at startup.

**Rule:** After every change to the backend, agents must re-run this script to keep `openapi/openapi.yaml` in sync with the current API state. Always commit the updated `openapi/openapi.yaml` alongside backend changes.

**Rule (API client regeneration):** Whenever `openapi/openapi.yaml` changes — whether you edited the backend and regenerated it, or the file changed for any other reason — agents must immediately regenerate the typed frontend API client at `apps/nebula-chat-client/src/libs/api/generated/`:

```bash
pnpm --filter nebula-chat-client run generate:api
```

The generator is Orval, configured at `apps/nebula-chat-client/orval.config.ts`, driven by `openapi/openapi.yaml`, and using the axios mutator at `apps/nebula-chat-client/src/libs/api/client.ts`. Regenerated files in `apps/nebula-chat-client/src/libs/api/generated/` must be committed in the same PR as the backend/OpenAPI change — never ship an API change with a stale client. Do not hand-edit anything under `apps/nebula-chat-client/src/libs/api/generated/`; always regenerate.

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

### Frontend (`apps/nebula-chat-client/.env`)

| Variable       | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:3000`) |

### Backend (`apps/nebula-chat-server/.env`)

| Variable         | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| `OPENAI_API_KEY` | OpenAI API key                                          |
| `DATABASE_URL`   | PostgreSQL connection string                            |
| `REDIS_URL`      | Redis connection (e.g. `redis://localhost:6380`)        |
| `REDIS_PASSWORD` | Redis password (if set)                                 |
| `CLIENT_URL`     | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `SERVER_URL`     | Backend public URL (used in OpenAPI docs)               |
| `PORT`           | Port to listen on (default `3000`)                      |

> **`env.ts` rule:** All env vars are Zod-validated in `src/env.ts` and fail loudly at startup before any listener is bound. Never read `process.env.*` directly anywhere in the backend — always import from `@backend/env`.

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL on :5332, Redis on :6380)
cd apps/nebula-chat-server && docker-compose up -d

# 3. Run DB migrations
pnpm --filter nebula-chat-server run prisma:migrate

# 4. Start backend (watch mode)
pnpm --filter nebula-chat-server run dev

# 5. Start frontend (Vite dev server on :5173)
pnpm --filter nebula-chat-client run dev
```

### API Docs (dev)

Open `http://localhost:3000/docs` for the Swagger UI once the backend is running.
