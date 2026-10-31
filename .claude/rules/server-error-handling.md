---
paths:
  - 'apps/server/src/errors/**'
  - 'apps/server/src/**/*.service.ts'
  - 'libs/errors/**'
---

# Error Handling

The error vocabulary lives in the shared **`@nebula-chat/errors`** lib (`libs/errors`), which both apps
import — see [ADR-0011](../../docs/adr/0011-shared-errors-lib-and-typed-envelope.md). Throw the `AppError`
subclass that matches the situation, imported from `@nebula-chat/errors`:

| Class                          | HTTP status | Code (`error`)            | When to use                                 |
| ------------------------------ | ----------- | ------------------------- | ------------------------------------------- |
| `BadRequestError`              | 400         | `BadRequest`              | Invalid input not caught by Zod             |
| `ValidationError`              | 400         | `Validation`              | Data that breaks a rule (Zod, DB checks)    |
| `UnauthorizedError`            | 401         | `Unauthorized`            | Not authenticated                           |
| `ForbiddenError`               | 403         | `Forbidden`               | Authenticated but not allowed               |
| `MessageAllowanceReachedError` | 403         | `MessageAllowanceReached` | A Guest has spent their message allowance   |
| `TwoFactorRequiredError`       | 403         | `TwoFactorRequired`       | An Admin's auth session lacks two-factor    |
| `NotFoundError`                | 404         | `NotFound`                | Resource not found by ID                    |
| `ConflictError`                | 409         | `Conflict`                | The data clashes with an existing record    |
| `LastAdminError`               | 409         | `LastAdmin`               | Demoting or banning the only Admin left     |
| `NotEligibleForAdminError`     | 409         | `NotEligibleForAdmin`     | A Guest, unverified or banned user as Admin |
| `PayloadTooLargeError`         | 413         | `PayloadTooLarge`         | Message exceeds token limit                 |
| `TooManyRequestsError`         | 429         | `TooManyRequests`         | A rate limit was hit                        |
| `MissingConfigurationError`    | 500         | `Internal`                | Required env var not set                    |

The code decides the status (`ERROR_STATUS` in `libs/errors/src/errorStatus.ts`), so the two cannot disagree.

Throw from the service layer; the `errorHandler` exported from `errors/error.handler.ts` and registered in
`buildApp()` catches everything and answers with the shared **error envelope**:

```json
{ "success": false, "error": "NotFound", "message": "Session ... not found" }
```

- An `AppError` builds its own envelope with `toEnvelope()`. Never write an envelope literal by hand.
- `error` is a closed union (`ErrorCode`), not a free string. `Internal` is the escape hatch for anything
  unclassified, and its message is always the generic `GENERIC_ERROR_MESSAGE`. A raw message reaches the
  client only from a non-`Internal` `AppError`, or from a Fastify 4xx, whose message is written for the caller.
- The envelope is flat: `{ success: false, error, message }` for every code. A case the client must tell apart
  gets its own code rather than extra fields, like `MessageAllowanceReached` (a 403, like `Forbidden`).
- The handler turns everything it catches into an `AppError`: Zod validation failures, Postgres constraint
  codes, and framework errors (classified by their status). A framework error keeps its own status (415, 503).
- The reply stream relay hijacks its reply once the owner check has passed, so nothing after that reaches
  `errorHandler`. A reply's own failure arrives from the worker as an `error` event already carrying the
  envelope; a Redis failure mid-relay is written as an `error` event with the `Internal` envelope, then `end`.
- The `/api/auth/*` catch-all hijacks its reply too. A throw from better-auth's handler is logged through
  `logRequestFailed` and answered `500` `Internal` on `reply.raw`; once headers are out, the connection is
  dropped instead.
- To add a code, add it to `errorCodeSchema` in `libs/errors/src/errorEnvelope.ts` and give it a status in
  `ERROR_STATUS` (the compiler insists on both). Then regenerate the OpenAPI spec and the Orval client.

Never return raw error objects to the client. Never throw from controllers — let the global handler do it.
