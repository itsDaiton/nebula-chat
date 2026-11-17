---
name: add-endpoint
description: Use when adding or changing a server API route, or the request or response schema of one.
---

# Add an endpoint

An API change crosses four packages: the server module, `openapi/openapi.yaml`, and the two Orval clients (`apps/client`, `apps/cli`). Each has its own path-scoped rule, which loads only when you open a matching file, so this skill is the one list of the whole chain. Work the steps in order.

1. **Module.** Build or extend the module per `apps/server/AGENTS.md` → Module Pattern, layer by layer (types, validation, repository, service, controller, routes). Mount a new module in `buildApp()` in `apps/server/src/app.ts`. Done when every layer the route needs exists and `pnpm deps:check` passes, since it enforces the layer order.
2. **Schema.** Write the route's `schema:` block per `.claude/rules/server-openapi.md`: Zod `body`/`params`/`querystring`, a `jsonResponse` per status code, and `summary`, `tags` and `operationId`. Done when every status the controller can send has a response entry.
3. **Tests.** Test at the route seam with `app.inject()` and the repository mocked, per `.claude/rules/server-testing.md`. Done when the happy path and each error status have a test.
4. **Spec and clients.** Regenerate in this order, never editing the generated files:

   ```bash
   pnpm --filter @nebula-chat/server run generate:openapi
   pnpm --filter @nebula-chat/client run generate:api
   pnpm --filter @nebula-chat/cli run generate:api
   ```

   Done when `openapi/openapi.yaml` and both `generated/` folders show the change in `git status`.

5. **Consumers.** Call the generated hook from a module hook in `apps/client/src/modules/<feature>/hooks/` (`.claude/rules/client-hooks.md`). Client UI edits need the redesign mockups first (`CLAUDE.md`). Skip this step when no UI uses the endpoint yet.
6. **Verify.** Hand lint, typecheck and tests for `server`, `client` and `cli` to the `verifier` subagent. Done when it reports no failures.

The spec and both regenerated clients ship in the same PR as the route. The commit scope names every app the change touches, e.g. `feat(server,client): …`.
