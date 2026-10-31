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

Test commands are in [client-testing](../../.claude/rules/client-testing.md); monorepo-wide lint/format/build live in the [root AGENTS.md](../../AGENTS.md#commands).

---

## Directory Layout

`src/` is `main.tsx` / `App.tsx` (mounts TanStack Router's `RouterProvider`), `routeTree.gen.ts` (generated,
committed, never hand-edited), `resources.ts` (UI strings) and:

- `routes/` — TanStack Router file-based routes (`__root`, the `_app` guard layout holding `settings` and `auth/*`,
  and the pathless `_app/_chat` layout rendering `AppShell` around `index` and `s/$id`). `routing/` — router setup, `RootLayout`, search-param helpers.
- `libs/api/` — the axios instance and SSE fetch mutator (`client.ts`, `streamClient.ts`), the query client,
  and `generated/` (Orval output). `libs/auth/` — the better-auth client, the one auth entry point.
- `modules/<feature>/` — `auth`, `chat`, `commandPalette`, `inspector`, `sessions`, `settings`. Each splits into `components/`, `hooks/`,
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

## Topic rules

Each topic lives in a path-scoped rule under [`.claude/rules/`](../../.claude/rules/). Claude Code loads one
when it reads a matching file; any other agent opens the file when it works in that area.

| Rule                                                                      | Covers                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| [client-routing](../../.claude/rules/client-routing.md)                   | TanStack Router files, guards, loaders, search params  |
| [client-state](../../.claude/rules/client-state.md)                       | react-query, Zustand, auth state, chat streaming       |
| [client-components](../../.claude/rules/client-components.md)             | One component per file, Chakra, `resources.ts` strings |
| [client-forms](../../.claude/rules/client-forms.md)                       | react-hook-form with zod, `AuthForm`                   |
| [client-hooks](../../.claude/rules/client-hooks.md)                       | Thin hooks over stores and queries                     |
| [client-use-effect](../../.claude/rules/client-use-effect.md)             | No `useEffect`, and what to use instead                |
| [client-shared-utilities](../../.claude/rules/client-shared-utilities.md) | `@nebula-chat/errors`, server config, pagination       |
| [client-env](../../.claude/rules/client-env.md)                           | `VITE_API_URL`                                         |
| [client-testing](../../.claude/rules/client-testing.md)                   | Frontend test commands, MSW, `renderRoute`             |
