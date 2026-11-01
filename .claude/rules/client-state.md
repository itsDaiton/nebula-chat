---
paths:
  - 'apps/client/src/**/stores/**'
  - 'apps/client/src/**/hooks/**'
  - 'apps/client/src/**/providers/**'
  - 'apps/client/src/libs/**'
  - 'apps/client/src/App.tsx'
---

# State Management — react-query for server state, Zustand for client state

State is split by **kind** ([ADR-0012](../../docs/adr/0012-adopt-tanstack-query-for-server-state.md)):

- **Server state** is anything the API owns (sessions, messages, search results). It lives in the
  [TanStack Query](https://tanstack.com/query) cache and is read through the **Orval-generated hooks** in
  `src/libs/api/generated/**`; the cache owns loading, errors, dedup and refetching.
- **Client state** is what the browser owns (drawer open, selected model, input text). It lives in
  [Zustand](https://zustand.docs.pmnd.rs/) stores.
- **Chat streaming** is send, then subscribe (ADR-0014). `useChatStream` creates the Session for a new chat
  (`useCreateSession`), sends the Message with the generated `useSendMessage` mutation (202
  `{ messageId, streamId }`), then opens the reply stream through the generated `readReplyStream` (a fetch
  mutator, `libs/api/streamClient.ts`, that returns the raw `Response`). It reads the SSE body with
  `utils/parseSseStream.ts` and writes the live reply into `useChatStreamStore`. `readReplyStream` is only
  called through `useChatStream`; its generated react-query hook (`useReadReplyStream`) must never be used,
  because it would go through axios and buffer the body. A dropped stream reconnects with backoff, passing
  the last event id as `lastEventId` and skipping any entry at or before it; a 404 (expired) shows the saved
  Messages instead. `resumeStream` re-attaches to a Session's `activeStreamId` (called render-time from
  `ChatContainer`), and `stop` posts `cancelReplyStream`, deferred until the send names the stream.

## Server state — the generated hooks

- Import the generated hook (`useGetSession`, `useListSessionsInfinite`, …) from its per-resource
  file, e.g. `@/libs/api/generated/sessions/sessions`. Regenerate with `pnpm frontend
generate:api` after any backend change; generated files are never hand-edited.
- Wrap it in a module hook in `/hooks/` when the view needs another shape: `useSessions` flattens the
  pages with `select`. Type the view with the generated models (`Session`, `Message`); never re-declare
  or alias them by hand. Components that call the same hook
  share one request (react-query dedupes by query key), so no provider distributes server state.
- Use the plain, non-suspense hooks (`useSuspenseQuery: false` in `orval.config.ts`) and drive skeletons off
  `isPending` / `isFetchingNextPage`.
- **Errors are typed.** The axios interceptor in `libs/api/client.ts` rejects every failed request with an
  `AppError` from `@nebula-chat/errors`, built by `libs/api/utils/toAppError.ts`: an envelope keeps its code
  and message, anything else gets a code from its status and a generic message. `query.error` is therefore an `AppError` whose `message` is safe to
  show. The global `onError` in `libs/api/queryClient.ts` toasts every failure once; a component reads
  `query.error` only for an inline state. A query or mutation whose component shows its failure inline sets
  `meta: { inlineError: true }` and is not toasted.
- **After a write the cache cannot see, invalidate** with the generated key helpers:
  `queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() })`. `useChatStream` invalidates the
  list once it creates a Session, and the list, session detail and messages on `end` (a messages
  refetch mid-stream would race the reply). It also invalidates the message allowance once the send is
  accepted, the moment the server counts the message, and after a send refused at the allowance.
  Invalidate rather than hand-seed with `setQueryData`.

## Auth state — better-auth

Auth is not in `openapi.yaml`, so it goes through better-auth's own client (`libs/auth/client.ts`), never
Orval. The `_app` route guard (`routes/_app.tsx`) resolves `get-session` and, with no
session, mints a Guest via `signIn.anonymous()` before any route renders — the server never mints one and
every API route `401`s without a session. Read the session with `useAuth`, which wraps better-auth's
`useSession`; never copy it into a Zustand store or `useState`.

## Client state — Zustand

**Never use `useState`** (ESLint fails the import). Client state lives in Zustand stores. State that must not outlive its UI (a half-finished setup, a search box) resets from `useOnUnmount`'s ref callback, not an effect.

| Scenario                                                       | Use                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Anything read from or written to the API                       | Generated react-query hook (see above)                      |
| State shared across two or more components                     | Zustand store                                               |
| Global UI state (drawer, search overlay, viewport height)      | Zustand store                                               |
| DOM measurements shared across instances (e.g. `useMultiLine`) | Zustand store keyed by content                              |
| Form field values, validation and submit state                 | react-hook-form (see [Forms](client-forms.md))              |
| Debounce timers                                                | Module-level variable alongside the store — not React state |
| Tracking a previous value across renders                       | `useRef` — not state                                        |
| Any other "local" state                                        | Zustand store in the owning module                          |

## Folder rules

- Zustand stores go in `/stores/` under the owning module or `shared/stores/` if global.
- Hooks (query wrappers and hooks that consume stores) go in `/hooks/`.
- One store file per concern. A store holds no API calls and does no work at module load; a query hook
  fetches on mount.

## Store conventions

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

Inside an action, read current state with `get()` rather than a value closed over earlier.

Store types that are referenced outside the store file must live in `/types/types.ts`.

## React Context

Server state is shared through the query cache and client state through Zustand, so neither needs a
context. The providers in `App.tsx` (`QueryClientProvider`, theme, Chakra) are library wiring. When a
context is genuinely needed, split it across two files:

- **`context/<Name>Context.tsx`** — `createContext` + the typed `use<Name>Context()` hook. No JSX, no store imports.
- **`providers/<Name>Provider.tsx`** — the provider component, memoizing its value and rendering `<Context.Provider>`.
