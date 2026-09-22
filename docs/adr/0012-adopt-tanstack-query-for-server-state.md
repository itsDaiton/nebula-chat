# ADR-0012: Adopt TanStack Query for server state; keep Zustand for client state

- **Status:** Proposed — to be implemented for NEB-307
- **Date:** 2026-09-22
- **Deciders:** @itsDaiton

## Context

The frontend carried two half-committed data-fetching worlds:

- **What the code actually does, and what the docs mandate:** every server call goes through a raw-`fetch` Zustand store (`useConversationsStore`, `useConversationStore`, `useConversationsSearchStore`), with error handling via `handleHttpError`/`handleNetworkError`. The frontend `AGENTS.md` states this in bold — "**All API-fetching state → Zustand store**" and "**React Context is not used for state.**" A `ConversationsProvider`/`useConversationsContext` layer exists solely to broadcast the store-backed list to `ConversationsList` and `Layout`, and the migrated stores trigger their initial fetch at **module-level init**.
- **A dead client:** Orval generates a full react-query + axios client (`src/libs/api/generated/**`), plus a `queryClient` — but **nothing imports the generated hooks**, and `QueryClientProvider` is **never mounted**. Orval's only live consumer is its MSW handlers in tests. A complete server-state library sat unused beside a hand-rolled one.

A `/grill-with-docs` session chose to resolve the fork by **committing to the generated client** rather than deleting it: adopt TanStack Query as the real server-state layer. This reverses the documented doctrine, so it cannot land as silent drift.

## Decision

Adopt **TanStack Query for server state; keep Zustand for client (UI) state.** SSE streaming stays bespoke.

- **Server state → react-query:** `useConversationsStore` → `useInfiniteQuery`, `useConversationStore` → `useQuery`, `useConversationsSearchStore` → `useQuery`, using the Orval-generated hooks. The raw-`fetch` store bodies and `handleHttpError`/`handleNetworkError` are retired.
- **Client/UI state → Zustand (unchanged):** `useMessageStore`, `useModelStore`, `useModelSelectorStore`, `useSearchStore`, `useDrawerStore`, `useViewportStore`, `useMultiLineStore`.
- **SSE stays bespoke:** `useChatStream` keeps its `fetch` (it is excluded from Orval by tag and cannot be a react-query hook) but interacts with the query cache.

This overturns the two bolded rules above; the frontend `AGENTS.md` state-management, context, and `useEffect` sections are rewritten in the same ticket to describe the new division.

Sub-decisions that clear the "hard to reverse + surprising + real trade-off" bar:

### 1. The split is by state kind, not by convenience

Server state (owned by the backend, cached, invalidated) is fundamentally different from ephemeral UI state (drawer open, selected model, input value). React-query owns the former with caching, dedup, and background refetch; Zustand keeps the latter. This is the only split that leaves chat streaming — which is neither — intact.

### 2. Keep Orval's `tags-split` output and use non-suspense hooks

The generated files only _felt_ wrong (the original NEB-307 note) because nothing imported them; once components import `useListConversations` from `conversations.ts`, per-resource files are the clean, tree-shakeable layout, and the granular `model/` files and Orval `index.ts` barrels are never-hand-edited generator output. We keep `tags-split` + axios + MSW. We use plain `useQuery`/`useInfiniteQuery` (and flip `useSuspenseQuery: false` in `orval.config.ts`) so the existing skeleton-on-`isPending` pattern survives without introducing `<Suspense>` fallbacks and error boundaries throughout.

### 3. The axios client consumes the shared error lib (ADR-0011)

`client.ts` gains a response interceptor that parses the body with `@nebula-chat/errors`' envelope schema and rejects with a typed `AppError`, so every hook's `error` is a typed `AppError`. Failures surface through a **single** react-query global `onError` (via `QueryCache`/`MutationCache`) that calls the existing `toaster`, replacing per-store error strings; components may still read `query.error` for inline states. The axios instance sets `withCredentials: true` so the better-auth session cookie is sent — the current `fetch` calls omit it, so this also closes a cross-origin gap. This dependency on ADR-0011's contract is why **NEB-323 ships first**.

### 4. SSE and the query cache coexist via invalidation

A completed stream creates a conversation + messages that the caches must reflect. On `conversation-created` we **invalidate** the conversations list (cheap; guarantees the sidebar shows the new thread) and invalidate the detail/messages query for that id. We do **not** hand-seed via `setQueryData` — the chat store already holds the live-streamed content for the current view, and optimistic seeding is added later only if a flash appears.

### 5. The context/store-init machinery is deleted

`ConversationsProvider`, `ConversationsContext`, and the module-level init fetch existed only to distribute a store; react-query drives fetching on hook mount and dedupes across consumers. `ConversationsList` and `Layout` call the query hook directly. The provider/context layer is removed rather than kept as a thin wrapper.

## Consequences

- The frontend `AGENTS.md` is rewritten in this ticket (state management, React Context, and the `useEffect` rules where they touch data-fetching). A convention flip without the doc rewrite is the "stale docs = bug" failure the root `AGENTS.md` calls out.
- Store unit tests lose their subject and are replaced by **component/hook-seam** tests: render inside a fresh `QueryClientProvider` (retry off) with the generated Orval **MSW** success handlers; route failures (no success-only handler exists) and any leftover raw calls through `@/test/api`. Coverage stays at the 80% gate by testing the components/hooks that now own fetching; the new `client.ts` interceptor gets its own unit test.
- This is a large, coherent single ticket (deliberately not split). It depends on NEB-323 (ADR-0011) for the error contract.
