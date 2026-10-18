# ADR-0025: Migrate the client from react-router to file-based TanStack Router, before the redesign

- **Status:** Proposed — to be implemented by the router migration epic
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0012](./0012-adopt-tanstack-query-for-server-state.md) — TanStack Query for server state; [ADR-0024](./0024-shadcn-tailwind-base-ui-replace-chakra.md) — the redesign this precedes

## Context

The client routes with react-router 8: seven routes in `routing/routes.ts`, about 30 files importing
it, and `AuthGate` deciding access inside components. The admin dashboard leans on URL state
(metric, range and model filters in the search params) and needs a route tree that only Admins can
enter. TanStack Router gives typed, validated search params, `beforeLoad` guards and loaders that
prefetch through the TanStack Query the client already uses.

## Decision

Migrate to **TanStack Router with file-based routes** (the Vite plugin and a generated route tree, with automatic code-splitting) as its own epic, **on `main`, before the redesign starts**, still on Chakra. The migration is behaviour-preserving: the same URLs, the same pages. Auth and Admin checks move into `beforeLoad`; search params are validated with Zod.

## Consequences

- The redesign builds its shell on TanStack Router layouts instead of being mixed with a router swap.
- `/admin/*` arrives later as its own route subtree with one guard.
- TanStack Start is not adopted: the server stays Fastify, and the client stays a Vite SPA.

## Alternatives considered

- **Keep react-router** and parse dashboard search params with Zod in a hook. Works, but leaves guards in components and search params untyped.
- **Migrate during the redesign.** Fewer epics, but a visual rewrite and a routing rewrite in the same diffs are hard to review and to bisect.
