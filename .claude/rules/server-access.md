---
paths:
  - 'apps/server/src/**/*.routes.ts'
  - 'apps/server/src/plugins/authGate.plugin.ts'
---

# Access levels

Every route declares exactly one level in `config: { access: '…' }` ([ADR-0036](../../docs/adr/0036-every-route-declares-its-access-level.md)). The `authGate` plugin's `onRoute` hook attaches the gate as an `onRequest` hook and throws at boot, which also fails `generate:openapi`, on a route with none or an unknown one.

| Level        | Who                                                                          | Gate                    |
| ------------ | ---------------------------------------------------------------------------- | ----------------------- |
| `public`     | anyone                                                                       | none                    |
| `user`       | a Guest or a Registered user                                                 | `requireAuthentication` |
| `registered` | a Registered user                                                            | `requireRegistered`     |
| `admin`      | an acting Admin: role, verified, not banned, second factor this auth session | `requireAdmin`          |
| `operator`   | the holder of the operator token                                             | `requireOperator`       |

- **Deny by default.** Never attach a gate by hand: no `preHandler: requireX`, no `onRequest: requireX`.
- **`onRequest` only.** A gate runs before the body is parsed, so an anonymous caller gets 401, not a 400 describing the schema. A hook that needs the body (`messageAllowanceHook`) stays `preHandler` and runs after the gate; a hook that needs the session but not the body goes in `onRequest`, which the gate precedes.
- **`public` is an allowlist,** each entry with a one-line reason: `/` and `/health` (probes), `/api/auth/*` (better-auth checks itself), `/docs` and `/openapi.json` (the docs), CORS preflights, and `/api/models` (static catalog, for now).
- **Ownership is not a level.** Another User's Session, Message, Run or stream answers 404, enforced in the repository query. "Owner or Admin" stays `user`, with an explicit audited Admin branch in the service (`isActingAdmin`).
- **The spec follows the level.** Each operation's `security` and its "Access: …" line come from it; do not write `security` or that line by hand.
