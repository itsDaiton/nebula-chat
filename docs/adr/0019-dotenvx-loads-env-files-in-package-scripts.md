# ADR-0019: dotenvx loads env files, in package scripts only

- **Status:** Accepted — implemented by NEB-388 (#388)
- **Date:** 2026-09-27
- **Deciders:** @itsDaiton
- **Related:** [ADR-0018](./0018-fastify-zod-openapi-named-schemas-env-free-spec.md) — `generate:openapi` needs no environment, so it reads no env file

## Context

Env files reach a process in five places, three different ways: `import 'dotenv/config'` in the server's `src/env.ts` and `generate-openapi.ts`, `process.loadEnvFile` in the server's `load-env.ts` (imported by nothing), and the same call in `libs/db`'s `drizzle.config.ts` and `src/env.ts`, each with its own hard-coded path to `apps/nebula-chat-server/.env`. Each tolerates a missing file, because CI and Render inject variables directly.

Because `env.ts` loads the file itself, the server's test suite is not hermetic: `src/test/setup.ts` fills placeholders with `??=`, then `dotenv/config` loads a developer's real `.env` underneath them, so any variable the setup leaves unset (`ANTHROPIC_API_KEY`, `REDIS_PASSWORD`, …) reaches vitest from the real file.

## Decision

**From here on, dotenvx (`@dotenvx/dotenvx`) is the only tool that loads an env file, and it runs in package scripts, never in code.**

1. **Scripts load, code parses.** Scripts that need a `.env` wrap their command as `dotenvx run -f <file> --ignore=MISSING_ENV_FILE -- <cmd>`. Application and library code reads `process.env` only: no `dotenv` import, no `process.loadEnvFile`. The server's `src/env.ts` stays the single place that validates it.
2. **What is wrapped.** The server's `dev` and `start`, and every `@nebula-chat/db` CLI script (`db:generate`, `db:push`, `db:studio`, `db:migrate`, `db:baseline`). Not wrapped: `test` and `generate:openapi`, which are hermetic by design; docker-compose, which reads its own root `.env` (container credentials only) natively; and Render's `startCommand`, which runs `node dist/…` with platform-injected variables.
3. **One file per app.** Each app owns its `.env`. `apps/nebula-chat-server/.env` is the single source for `DATABASE_URL`, and the `libs/db` scripts point at it. There is no root `.env`. The worker app (ADR-0013) gets its own file and wraps its own scripts the same way.
4. **The environment beats the file.** No `--overload`: a variable set by the shell, CI or Render always wins over the file.
5. **A missing file is silent.** A missing required _variable_ still fails loudly, through the Zod parse in `env.ts` or the `DATABASE_URL is required` check in `libs/db`.
6. **Loader only.** dotenvx's encryption (`.env.keys`, `DOTENV_PRIVATE_KEY*`), precommit hook and secret scanning are not adopted. Render and GitHub secrets stay as they are.

Each package that wraps a script declares `@dotenvx/dotenvx` as a `catalog:` devDependency.

## Considered options

- **Keep `dotenv` plus `process.loadEnvFile`.** Rejected: two mechanisms, a duplicated cross-package path, and tests that pick up a developer's real keys.
- **Node's native `--env-file-if-exists`.** Covers `tsx` and `node`, but `drizzle-kit` is launched through pnpm's `.bin` shims, and passing Node flags through those is awkward, especially on Windows. `dotenvx run --` wraps any command the same way.
- **Load in code through `@dotenvx/dotenvx/config`.** Rejected: code would still decide where configuration comes from, and tests would still load the real `.env`.
- **A root `.env` shared by every app.** Rejected: it would put the worker's LLM provider keys into the server process, which ADR-0013 keeps out.
- **Encrypted `.env` files committed to git.** Deferred. The repository is public, and a leaked private key cannot be undone by re-encrypting, because git history keeps every old ciphertext. Revisit when the worker's deployment gives a reason to.

## Consequences

- A new script that needs env values must be wrapped; a bare `tsx` or `node` script sees only the shell's environment. This is intended for tests and `generate:openapi`, and a surprise anywhere else.
- `src/test/setup.ts` stays the one source of test values, so a test run behaves the same on a developer machine as in CI.
- Adopting encryption later is additive: the same `dotenvx run` wrappers decrypt, so no script changes shape.
