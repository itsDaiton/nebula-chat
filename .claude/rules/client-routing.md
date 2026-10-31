---
paths:
  - 'apps/client/src/routes/**'
  - 'apps/client/src/routing/**'
  - 'apps/client/src/test/renderRoute.tsx'
---

# Routing

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
