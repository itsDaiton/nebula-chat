# ADR-0036: Every route declares its Access level; the server refuses to boot without one

- **Status:** Proposed — to be implemented by the API security hardening epic
- **Date:** 2026-11-17
- **Deciders:** @itsDaiton
- **Related:** [ADR-0010](./0010-better-auth-for-auth.md) — better-auth sessions; [ADR-0027](./0027-admin-role-two-factor-full-read-and-audit-log.md) — the Admin gate and the Audit log

## Context

Routes were gated by attaching `requireAuthentication`, `requireRegistered`, `requireAdmin` or `requireOperator` by hand, in either `onRequest` or `preHandler`. A route that forgot its gate was public, and nothing noticed. A scare in production showed how hard it is to tell what is protected: Swagger UI on the API origin sent the Admin's own cookie, and the request looked anonymous. The spec also claimed every route needed a cookie, because one global `security` entry covered them all.

## Decision

1. **Every route declares exactly one Access level**: `public`, `user`, `registered`, `admin` or `operator`. They are named after the actor in the glossary, so `user` means a Guest or a Registered user.
2. **Deny by default.** An `onRoute` hook attaches the matching gate. A route without a declaration throws at boot, which also fails `generate:openapi` in CI.
3. **Gates run in `onRequest`**, so a caller who is not allowed is turned away before the body is read.
4. **`public` is an allowlist**: health checks, the better-auth passthrough, and the docs where enabled. Each carries a one-line reason.
5. **Ownership is not an Access level.** A User asking for another User's Session, Message, Run or stream gets 404, enforced in the repository query. A route that serves "the owner or an Admin" stays `user` and makes the audited Admin branch in its service.
6. **Operator failures answer 404**, so `/api/internal/*` does not confirm it exists.
7. **The declaration drives the spec.** Each operation's OpenAPI `security` and its "Access:" line come from it.
8. **Docs are off in production.** `API_DOCS_ENABLED` hides Swagger UI and `/openapi.json`, but `@fastify/swagger` stays registered, so `generate:openapi` and the Orval clients are unaffected.

## Alternatives considered

- **Keep per-route `preHandler` gates and add a lint rule or a test.** This is cheaper, but it only makes a forgotten gate unlikely, not impossible.
- **A sixth level, `ownerOrAdmin`.** It would hide the Audit log requirement inside the gate, where the next route copying it would miss it.
- **403 for another User's record.** It confirms the id exists.
