---
paths:
  - 'apps/client/src/**/tests/**'
  - 'apps/client/src/test/**'
  - 'apps/client/vitest.config.ts'
  - 'apps/client/tsconfig.app.json'
---

# Testing

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
- **Render inside a fresh query client.** `renderWithChakra` and `renderHookWithQueryClient` (`@/test/render`)
  each create one per test with retries off, so no cached response leaks between tests and a failure
  surfaces at once. Pass your own `queryClient` to prime or inspect the cache, e.g. assert an invalidation
  with `queryClient.getQueryState(key)?.isInvalidated`.
- **Hooks and pages are the highest-value targets.** Drive query hooks and the components that use them
  through MSW rather than stubbing the generated hooks. Zustand stores are module-level singletons, so
  reset state between tests rather than relying on fresh imports.
- **Coverage-excluded**: `src/theme/**` (Chakra tokens), `src/libs/api/generated/**` (Orval output) and
  `src/routeTree.gen.ts` (router plugin output).
  Everything else faces the 80% bar.
