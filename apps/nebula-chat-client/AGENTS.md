# AGENTS.md — Frontend (`nebula-chat-client`)

Conventions specific to the React SPA. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

---

## Commands

Run from `apps/nebula-chat-client` (or `pnpm --filter nebula-chat-client run <cmd>` from the root):

```bash
pnpm dev        # Vite dev server on localhost:5173
pnpm build      # tsc + Vite build → build/
pnpm typecheck  # tsc --noEmit
```

Test commands are under [Testing](#testing); monorepo-wide lint/format/build live in the [root AGENTS.md](../../AGENTS.md#development-commands).

---

## Directory Layout

```text
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

## Routing

Routes are defined in `routes.ts` as typed helpers and consumed through React Router:

```ts
import { route } from '@/routes';

navigate(route.chat.root()); // /
navigate(route.chat.conversation(id)); // /c/:id
```

`RouterProvider.tsx` sets up the React Router instance. Route components live in `modules/*/` as `*Page.tsx` files.

---

## Imports

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

## No `index.ts` barrels

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

## TypeScript Types

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

## State Management — Zustand

All client state is managed with [Zustand](https://zustand.docs.pmnd.rs/). React Context is **not** used for state.

### Never use `useState`

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

### Folder rules

- Zustand stores go in `/stores/` under the owning module or `shared/stores/` if global.
- Hooks that consume stores go in `/hooks/`.
- One store file per concern.

### Store conventions

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

### React Context

Context is **not** used for shared state. When a context is needed, split it across two files:

- **`context/<Name>Context.tsx`** — `createContext` + the typed `use<Name>Context()` hook. No JSX, no store imports.
- **`providers/<Name>Provider.tsx`** — the provider component. Reads from Zustand stores, memoizes the value, renders `<Context.Provider>`.

The one existing provider is `ConversationsProvider`, which wraps the app to supply context values from `useConversationsStore`. It does not hold its own state. The initial fetch is triggered at module-level store initialization. All components subscribe to `useConversationsStore` directly.

### Existing stores

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

## Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- **One component per file.** Never define multiple components, hooks, or significant logic in a single file. No co-located sub-components, no local helper components at the bottom of a file — every component gets its own file.
- Components read from stores and hooks — they do not own significant state themselves.
- Use Chakra UI primitives. Custom UI wrappers live in `shared/components/ui/`.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities.

---

## Hooks

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

## `useEffect` rules

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

## Shared Utilities

- `@nebula-chat/errors` — the error vocabulary shared with the server (ADR-0011). Read an error body or an SSE
  `error` frame with `parseErrorEnvelope(value)` (or `isErrorEnvelope`) and show its `message`. Switch on the
  envelope's `error` code, not the HTTP status, and read `details` only after narrowing on it.
- `shared/utils/errorHandler.ts` — **legacy**. `handleHttpError(response)` and `handleNetworkError(err)` still
  back the raw-`fetch` conversation stores and parse error bodies by hand. NEB-307 replaces them with the
  envelope parser above; do not add new call sites.
- `shared/config/serverConfig.ts` — `SERVER_CONFIG.getApiEndpoint(path)` constructs full API URLs from `VITE_API_URL`. Never hardcode API base URLs.
- `shared/config/paginationConfig.ts` — `paginationConfig.defaultLimit` for page sizes.

---

## Environment Variables

`apps/nebula-chat-client/.env`:

| Variable       | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:3000`) |

---

## Testing

The monorepo-wide rules live in the root [`AGENTS.md`](../../AGENTS.md#testing) and
[ADR-0008](../../docs/adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md). Frontend specifics:

```bash
pnpm frontend test             # vitest run
pnpm frontend test:watch
pnpm frontend test:coverage
```

- **Environment is `jsdom`**, not `happy-dom` — Chakra UI v3 leans on layout and `matchMedia` APIs where
  happy-dom has gaps.
- **React Testing Library for components.** Query by role and accessible name, never by test id or class.
  If a component is hard to query by role, that is usually an accessibility bug worth fixing rather than a
  reason to reach for `container.querySelector`.
- **Mock HTTP with the MSW handlers Orval generates, never with a hand-written URL and never by stubbing
  the hooks.** `orval.config.ts` sets `mock.generators: [{ type: 'msw' }]`, so every documented success
  response has a handler beside the client (`src/libs/api/generated/**/**.msw.ts`) built from the same
  OpenAPI document the backend emits:

  ```ts
  server.use(getListConversationsMockHandler({ conversations, nextCursor: null, hasMore: false }));
  ```

  The generated handlers match any origin, which is what keeps `http://localhost:3000` out of tests. Two
  things have no generated handler: failure responses (Orval emits only the documented success) and
  `/api/chat/stream` (excluded from Orval by tag — it streams SSE). Both go through `@/test/api`, the one
  place route strings are written. Regenerate with `pnpm frontend generate:api` after any backend change.

- **One test file per source file, in a `tests/` folder beside it**: `ChatInput.tsx` is tested by
  `components/tests/ChatInput.test.tsx`. Never group several modules into one file.
- **`tsconfig.app.json` declares the Vitest and testing-library types.** The build runs `tsc -b` over
  `include: ["src"]`, so tests are typechecked — without those `types` entries the build fails
  on `describe` and `expect`.
- **Stores and hooks are the highest-value targets.** Zustand stores are module-level singletons, so reset
  state between tests rather than relying on fresh imports.
- **Coverage-excluded**: `src/theme/**` (Chakra tokens) and `src/libs/api/generated/**` (Orval output).
  Everything else faces the 80% bar.
