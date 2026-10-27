# AGENTS.md — Frontend (`@nebula-chat/client`)

Conventions specific to the React SPA. See the [root AGENTS.md](../../AGENTS.md) for monorepo-wide commands, git workflow, and cross-cutting rules (no barrels, `type` not `interface`, arrow functions) that also apply here.

**Redesign mockups are required input, not optional reading.** Before writing any UI, follow
[docs/design/redesign](../../docs/design/redesign/README.md#required-steps-for-every-ui-ticket): fetch every
screenshot your ticket names from the Claude artifact "Nebula Redesign Mockups" and look at it. The
`require-redesign-shots` hook blocks `.tsx`/`.css` edits under `src/` until a session has read one. If the
artifact can't be loaded, stop and tell the user; never build the UI from the ticket text alone.

---

## Commands

Run from `apps/client` (or `pnpm --filter @nebula-chat/client run <cmd>` from the root):

```bash
pnpm dev        # Vite dev server on localhost:5173
pnpm build      # tsc + Vite build → build/
pnpm typecheck  # tsc --noEmit
```

Test commands are under [Testing](#testing); monorepo-wide lint/format/build live in the [root AGENTS.md](../../AGENTS.md#commands).

---

## Directory Layout

`src/` is `main.tsx` / `App.tsx` (mounts TanStack Router's `RouterProvider`), `routeTree.gen.ts` (generated,
committed, never hand-edited), `resources.ts` (UI strings) and:

- `routes/` — TanStack Router file-based routes (`__root`, and the `_app` guard layout holding `index`,
  `s/$id`, `settings` and `auth/*`). `routing/` — router setup, `RootLayout`, search-param helpers.
- `libs/api/` — the axios instance and SSE fetch mutator (`client.ts`, `streamClient.ts`), the query client,
  and `generated/` (Orval output). `libs/auth/` — the better-auth client, the one auth entry point.
- `modules/<feature>/` — `auth`, `chat`, `sessions`, `settings`. Each splits into `components/`, `hooks/`,
  `stores/`, `utils/` and `types/types.ts`, plus its page component.
- `shared/` — cross-module `components/` (with `ui/` for Chakra adapters and the redesign's base components),
  `hooks/`, `stores/`, `layout/`, `config/`, `utils/`.
- `styles/` — the redesign's Tailwind entry: design tokens for light and dark, Geist fonts.
- `theme/` — Chakra tokens and the next-themes wrapper.

---

## Routing

The client routes with [TanStack Router](https://tanstack.com/router) and its file-based Vite plugin
([ADR-0025](../../docs/adr/0025-tanstack-router-replaces-react-router.md)). Routes are files in
`src/routes/`; the plugin writes `routeTree.gen.ts`, which is committed and excluded from lint, format,
coverage and knip. A route file only wires a page: the component lives in `modules/*/` as a `*Page.tsx`.

- **Adding a route.** Create the file under `routes/_app/` (`s/$id.tsx` is `/s/:id`), export
  `Route = createFileRoute('/_app/<path>')({ component })`, and run `pnpm dev` or `pnpm build` so the plugin
  regenerates the tree. Every path is typed: a link to a route that doesn't exist fails the typecheck.
- **Links and navigation.** `<Link to="/auth">`, `<Link to="/s/$id" params={{ id }}>` and
  `useNavigate()({ to: '/s/$id', params: { id } })`. There is no path-helper object; the literal path is
  the source of truth. Read a path param with `useParams({ strict: false })` from a component shared by
  several routes, or `getRouteApi('<route id>')` from a page that belongs to one.
- **Guards.** `routes/_app.tsx` is a pathless layout whose `beforeLoad` ensures the auth session
  (`sessionBootstrapOptions`, minting a Guest when there is none) before any child page or loader runs, so a
  page never renders, or fetches, without one. A new guard (a Registered-only subtree) is another pathless
  layout with its own `beforeLoad` that throws `redirect({ to })`. `SessionOutlet` also holds the app back
  while sign-out resets the session, so nothing fetches as nobody while a Guest is re-minted.
- **Loaders.** A loader prefetches through the existing query client:
  `context.queryClient.ensureQueryData(getGetSessionQueryOptions(id))`. Components keep using the generated
  hooks. A prefetch whose failure the page shows itself sets `meta: { inlineError: true }`
  (see `routes/_app/s/$id.tsx`) so it isn't toasted twice.
- **Search params** are declared per route with a Zod schema as `validateSearch`, built from
  `routing/searchParams.ts` so a malformed value never throws: `optionalSearchText()` falls back to
  absent, `optionalSearchError()` to an unrecognised code (still an error). TanStack JSON-parses each
  value (`?token=123` arrives as a number), and both turn a scalar back into text. A page reads them with
  `getRouteApi('<route id>').useSearch()` (and writes them with that API's `useNavigate`), never by
  importing its route file.
- **Testing.** Page tests go through the URL: `renderRoute('/s/abc')` (`test/renderRoute.tsx`) boots the real
  router on memory history with the app's providers, a fresh query client and MSW. It seeds the session
  bootstrap so the guard passes; `renderRoute(path, { seedSession: false })` lets the guard run (see
  `routing/tests/guard.test.tsx`). A component that only links or reads the route uses `renderInRouter(ui)`.

## Imports, barrels and types

The root rules apply (`@/` alias only, no barrels, `type` not `interface`, arrow functions). Frontend specifics:

- `@/` maps to `apps/client/src/`. Check every import in a file you touch and fix any relative path.
- Import from the defining file, e.g. `@/libs/api/client`. Never add an `index.ts` re-export; Orval's
  generated ones are the only tolerated barrels.
- All types live in `types/types.ts` under their module or `shared/` — none inline in hooks, stores or
  components — and are imported with `import type`.
- Never write `'use client'`: this is a Vite SPA, not Next.js.

---

## State Management — react-query for server state, Zustand for client state

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

### Server state — the generated hooks

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

### Auth state — better-auth

Auth is not in `openapi.yaml`, so it goes through better-auth's own client (`libs/auth/client.ts`), never
Orval. The `_app` route guard (`routes/_app.tsx`) resolves `get-session` and, with no
session, mints a Guest via `signIn.anonymous()` before any route renders — the server never mints one and
every API route `401`s without a session. Read the session with `useAuth`, which wraps better-auth's
`useSession`; never copy it into a Zustand store or `useState`.

### Client state — Zustand

**Never use `useState`.** Client state lives in Zustand stores.

| Scenario                                                       | Use                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Anything read from or written to the API                       | Generated react-query hook (see above)                      |
| State shared across two or more components                     | Zustand store                                               |
| Global UI state (drawer, search overlay, viewport height)      | Zustand store                                               |
| DOM measurements shared across instances (e.g. `useMultiLine`) | Zustand store keyed by content                              |
| Form field values, validation and submit state                 | react-hook-form (see [Forms](#forms))                       |
| Debounce timers                                                | Module-level variable alongside the store — not React state |
| Tracking a previous value across renders                       | `useRef` — not state                                        |
| Any other "local" state                                        | Zustand store in the owning module                          |

### Folder rules

- Zustand stores go in `/stores/` under the owning module or `shared/stores/` if global.
- Hooks (query wrappers and hooks that consume stores) go in `/hooks/`.
- One store file per concern. A store holds no API calls and does no work at module load; a query hook
  fetches on mount.

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

Inside an action, read current state with `get()` rather than a value closed over earlier.

Store types that are referenced outside the store file must live in `/types/types.ts`.

### React Context

Server state is shared through the query cache and client state through Zustand, so neither needs a
context. The providers in `App.tsx` (`QueryClientProvider`, theme, Chakra) are library wiring. When a
context is genuinely needed, split it across two files:

- **`context/<Name>Context.tsx`** — `createContext` + the typed `use<Name>Context()` hook. No JSX, no store imports.
- **`providers/<Name>Provider.tsx`** — the provider component, memoizing its value and rendering `<Context.Provider>`.

---

## Components

- Components live in `modules/<module>/components/` or `shared/components/`.
- **One component per file.** Never define multiple components, hooks, or significant logic in a single file. No co-located sub-components, no local helper components at the bottom of a file — every component gets its own file.
- Components read from stores and hooks — they do not own significant state themselves.
- Use Chakra UI primitives. Custom UI wrappers live in `shared/components/ui/`.
- **Redesign (epic #530).** New surfaces build on the shadcn/ui base components in `shared/components/ui/`
  (Base UI primitives, `components.json` style `base-nova`; add one with `pnpm dlx shadcn add <name>`, then
  convert it to arrow functions, drop `'use client'` and move any UI string into `resources.ts`). Each such
  file holds one component family with its prop types inline, the exception to one-component-per-file and
  to `types/types.ts`. Style them with Tailwind
  utilities over the tokens in `styles/globals.css` (`bg-panel`, `text-muted-foreground`, `border-border`,
  `font-mono` for metadata and ids, `tabular-nums` for numbers), never raw colours. Until Chakra is removed
  (NEB-555), Tailwind's preflight is off and its utilities are unlayered so they beat Chakra's layered
  reset; a small reset scoped to `[data-slot]` stands in for preflight on the new components.
- Responsive layout decisions (`isMobile`, `showSidePanels`) come from `useResponsiveLayout`.
- **All static text must live in `resources.ts`.** If it is a string shown in the UI — button labels, placeholders, error messages, hints, empty states, tooltips — it goes in `resources.ts`. Never hardcode UI strings inline in components or utilities.

---

## Forms

Forms use [react-hook-form](https://react-hook-form.com) with a [zod](https://zod.dev) schema through
`zodResolver`. `AuthForm` in `modules/auth/components/` is the reference: sign-in, sign-up, forgot and
reset, change password and delete account are one component fed its configs (`utils/authForms.ts`), not copies —
variants of a form differ by config. A config with a `successMessage` replaces the form with it once
submitted; one without clears its fields and calls `onSuccess` (the change-password form stays on `/settings`
and toasts). `header` trims the form's own heading where the page already labels it: `description` under a
dialog's title, `none` inside a labelled settings row.

- **The schema is the source of truth.** It lives in the owning module's `utils/` (`authSchemas.ts`), its
  messages come from `resources.ts`, and the form's value type is `z.infer<typeof schema>` in
  `types/types.ts` — never a hand-written duplicate.
- `useForm({ resolver: zodResolver(schema), mode: 'onTouched' })`: a field validates on first blur, then
  on every change, so an error clears as soon as it is fixed. Set `noValidate` on the `<form>` so the
  browser's own bubbles never pre-empt the schema.
- **A field checked against another** (a confirmation, new ≠ current) sets `comparedWith` in its field
  config, so it re-validates once touched as that other field changes; the rule itself is an object
  refinement in the schema (`compareFields` in `authSchemas.ts`), which zod otherwise skips while any field
  is invalid.
- **Errors render under their field.** Wrap each input in Chakra's `Field.Root invalid={…}` with a
  `Field.ErrorText`; Field wires `aria-invalid` and `aria-errormessage`, so tests assert with
  `toHaveAccessibleErrorMessage`.
- **Server failures go through `setError`.** One that belongs to a field goes under it
  (`setError('password', …)`); anything else goes to `root.server` and renders as an alert above the
  fields. Flag that mutation `meta: { inlineError: true }` so it is not toasted too.
- Field values belong to react-hook-form — never mirror them into a Zustand store. UI state around a form
  (e.g. password masking) is still a Zustand store.

---

## Hooks

Hooks in `/hooks/` are thin wrappers that read from stores or query hooks and compose logic. They must not duplicate state that already lives in a store or the query cache.

A hook that just re-exposes store state (`useDrawer` over `useDrawerStore` and `useSearchStore`) is correct; one that keeps its own `useState` for it is not.

Utility hooks that are inherently parameterised per call-site (`useDebounce`, `useEventListener`) may use `useRef` — they cannot be singleton stores.

---

## `useEffect` rules

**Never use `useEffect`.** Reference: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

| Pattern                            | Wrong                            | Right                                                                             |
| ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Derived / computed state           | `useEffect` → `setState`         | Compute inline during render or `useMemo`                                         |
| Syncing state on prop/route change | `useEffect` → Zustand `set`      | Guarded render-time write (see `useChatSession.ts`)                               |
| Fetching data on mount             | `useEffect(() => fetch(), [])`   | Generated react-query hook, which fetches on mount (see `useSessions.ts`)         |
| Refreshing data after a write      | `useEffect` → refetch            | `queryClient.invalidateQueries` where the write happens (see `useChatStream.ts`)  |
| Reading a browser API value        | `useEffect` + `useState`         | `useSyncExternalStore` (see `useViewportHeight.ts`)                               |
| DOM measurement after mount        | `useRef` + `useEffect`           | Callback ref — `ref={useCallback((node) => { ... }, [])}` (see `useMultiLine.ts`) |
| Registering a DOM event listener   | `useEffect` + `addEventListener` | `useEventListener` via `useSyncExternalStore` subscribe lifecycle                 |

New code reaches for the patterns above. Two `useEffect` calls predate this rule and remain until they are
reworked: `ChatContainer` (clearing the post-stream flags, scrolling to the newest message) and `Layout`
(closing mobile search when the desktop layout appears). Add no others.

---

## Shared Utilities

- `@nebula-chat/errors` — the error vocabulary shared with the server (ADR-0011). The generated hooks already
  reject with its `AppError`; the reply stream reads an error body or `error` event with
  `parseErrorEnvelope(value)` and shows its `message`. Switch on the error code (`AppError.code`), not the
  HTTP status (a `MessageAllowanceReached` and a `Forbidden` are both 403s).
- `shared/config/serverConfig.ts` — `SERVER_CONFIG.BASE_URL` (the axios `baseURL`) and `getApiEndpoint(path)`
  (the stream mutator's `fetch`) come from `VITE_API_URL`. Never hardcode API base URLs.
- `shared/config/paginationConfig.ts` — `paginationConfig.defaultLimit` for page sizes.

---

## Environment Variables

`apps/client/.env`:

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
  server.use(getListSessionsMockHandler({ sessions, nextCursor: null, hasMore: false }));
  ```

  The generated handlers match any origin, which is what keeps `http://localhost:3000` out of tests. Three
  things have no usable generated handler: failure responses (Orval emits only the documented success),
  `/api/streams/:streamId` (its handler returns a plain string, not SSE frames; `mockReplyStream` in
  `@/test/chat` serves real frames) and better-auth's `/api/auth/*`. Their
  routes live in `@/test/api`, the one place route strings are written; `@/test/auth` holds the auth
  fixture and handlers (`aSession` (pass `image` for a Profile image), `mockGetSession`, `mockAnonymousSignIn`, `mockEmailSignIn`,
  `mockEmailSignUp`, `mockSocialSignIn` (its redirect is a hash change to `providerConsentUrl()`, the one
  navigation jsdom performs), `mockSignOut`, `mockRequestPasswordReset`, `mockResetPassword`, `mockChangePassword`, `mockUpdateUser`, `mockRevokeSessions`, `mockDeleteUser`, `mockListAccounts`,
  `mockSendVerificationEmail`) plus `refreshSession`, which refetches better-auth's module-level session
  store after a render, and `holdSession`, which serves a session and waits until that store holds it. Regenerate with `pnpm frontend generate:api` after any backend change.

- **Upload a file with `aSendableFile` (`@/test/files`)**, not `new File(...)`: vitest's bridge from jsdom's
  Blob to Node's fetch fails on this jsdom (and on Node 26 even Node's own Blob goes through it), so a Blob
  body never reaches an MSW handler. It is a byte array carrying a File's `name`, `type` and `size`.

- **Build a Metered user's allowance with `aMeteredAllowance` (`@/test/allowance`)**: `remaining` of
  `limit` (10 by default) left, with `used` derived, for the generated `getGetMessageAllowanceMockHandler`.

- **Pick a Chakra menu item with `selectMenuItem` (`@/test/menu`)**, not `userEvent.click`: Zag only
  selects a pointer-highlighted item, and jsdom's (0, 0) pointer events stop highlighting once anything
  switches its interaction modality, so a click can silently select nothing. Selection navigates a tick
  later, so assert the destination with `findBy*`.

- **One test file per source file, in a `tests/` folder beside it**: `ChatInput.tsx` is tested by
  `components/tests/ChatInput.test.tsx`. Never group several modules into one file.
- **`tsconfig.app.json` declares the Vitest and testing-library types.** The build runs `tsc -b` over
  `include: ["src"]`, so tests are typechecked — without those `types` entries the build fails
  on `describe` and `expect`.
- **Test a page through the router with `renderRoute(path)` (`@/test/renderRoute`)**: it boots the app's
  real router on a memory history at `path`, with the root route's providers, a fresh query client (also
  returned) and MSW. The session bootstrap is marked done (`seedSession: false` lets the guard run), so
  serve the session yourself (`holdSession`, `mockGetSession`). It is async (`await renderRoute(...)`) and
  returns the `router`, whose `router.state.location` asserts where a navigation landed. A component that
  only links or reads the route uses `renderInRouter(ui)` instead.
- **Render a component with `renderWithProviders(ui)` (`@/test/render`)**: the app's own providers (query
  client, theme, tooltips) without a router; `renderRoute` renders through it. New tests use it over
  `renderWithChakra`, which goes with Chakra.
- **Render inside a fresh query client.** `renderWithProviders`, `renderWithChakra` and `renderHookWithQueryClient` (`@/test/render`)
  each create one per test with retries off, so no cached response leaks between tests and a failure
  surfaces at once. Pass your own `queryClient` to prime or inspect the cache, e.g. assert an invalidation
  with `queryClient.getQueryState(key)?.isInvalidated`.
- **Hooks and pages are the highest-value targets.** Drive query hooks and the components that use them
  through MSW rather than stubbing the generated hooks. Zustand stores are module-level singletons, so
  reset state between tests rather than relying on fresh imports.
- **Coverage-excluded**: `src/theme/**` (Chakra tokens), `src/libs/api/generated/**` (Orval output) and
  `src/routeTree.gen.ts` (router plugin output).
  Everything else faces the 80% bar.
