---
paths:
  - 'apps/client/src/**/components/**'
  - 'apps/client/src/routes/**'
---

# Data states — what a surface shows while it fetches

A surface that reads a query or waits on a route never renders nothing. Async _actions_ (a button or
menu item that fires a mutation) are a separate concern.

- **First load (`isPending`): a skeleton shaped like the content.** Tiles for tiles, a chart-height block
  for a chart, rows for a list or table, built from `Skeleton` (`shared/components/ui/skeleton.tsx`). Wrap it
  in an `<output aria-label={resources…loading}>` so it is a named live region. See `AdminDataTable`,
  `OverviewPage` and `UsagePage`.
- **A changed key (filter, range, metric, sort, search, page) keeps the previous data.** Set
  `placeholderData: keepPreviousData` in the module's query options or hook (`auditQueryOptions`,
  `overviewQueryOptions`, `useUsageSeries`), never at each call site and never in Orval output. While
  `isPlaceholderData`, dim the region (`opacity-60 transition-opacity`) and set `aria-busy` on it.
- **Not for a different entity.** A key that names another User or Session drops to its skeleton: showing
  the previous one would be misleading (`UserSessionsList`, `UserDetailPanel`).
- **Errors keep their inline copy** (`isError` with the surface's `loadFailed` string), unchanged.
- **Routes.** The router's defaults (`routing/router.ts`) show `RoutePending` for any loader or `beforeLoad`
  slower than 150 ms and hold it at least 300 ms. A route with chrome of its own sets `pendingComponent`:
  `/admin` renders `AdminPending`, the admin shell with a skeleton body; `_app` keeps `SessionPending`.
- **Tests** hold the request (`await delay('infinite')` in the generated MSW handler) and assert the named
  loading region; for a key change, assert the old content stays with `aria-busy="true"`.
