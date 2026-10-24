# AGENTS.md — Operator CLI (`@nebula-chat/cli`)

Conventions for the `nebula` CLI. Monorepo-wide rules live in the [root AGENTS.md](../../AGENTS.md).

`nebula` is the terminal client for Operators and Admins ([ADR-0029](../../docs/adr/0029-operator-cli-as-an-api-client.md)). It talks only to the public HTTP API, through a fetch client Orval generates from `openapi/openapi.yaml` (the `Operator` and `Admin` tags). Run it from the repo root, no build needed:

```bash
pnpm nebula --help
pnpm nebula profile add local --url http://localhost:3000   # the first profile becomes the default
pnpm nebula profile add prod --url https://<server-host>
pnpm nebula profile use prod
NEBULA_OPERATOR_TOKEN=… pnpm nebula --profile local log-level set redis debug --ttl 600
NEBULA_OPERATOR_TOKEN=… pnpm nebula --profile local log-level get
pnpm nebula --json profile list | jq .
```

- **CLI profiles** (server URLs, and which is the default) live in `$XDG_CONFIG_HOME/nebula-chat/config.json`, else `~/.config/nebula-chat/config.json`. `--profile <name>` overrides the default per command.
- **The operator token** is read only from `NEBULA_OPERATOR_TOKEN` and never written to disk. `log-level set` records `--operator`, else `$NEBULA_OPERATOR`, else `$USER`, as who asked.
- **`log-level get`** prints one row per server instance and target (the root, then every component): its level, when a runtime change expires, and who set it (`-` at the boot-time level).
  - Every instance answers for itself ([ADR-0034](../../docs/adr/0034-reading-log-levels-from-every-instance.md)).
  - A warning on stderr flags instances that disagree on a level, or that did not answer within the server's 2 seconds.
  - `--json` prints the server's `{ receivers, reports }` as is.
- **Output:** a table, key–value list or sentence for humans (bold headers only on a TTY without `NO_COLOR`); `--json` prints exactly one JSON document to stdout. Errors go to stderr.
- **Exit codes:** `0` success, `1` server or unknown error, `2` usage error (bad arguments, unknown profile, a `400`), `3` authentication or authorisation error.

## Adding a command

1. If the route is new, regenerate the spec, then the CLI client: `pnpm --filter @nebula-chat/cli run generate:api`. Generated code under `src/api/generated/` is never hand-edited.
2. Add `src/commands/<group>.ts` exporting `register<Group>Commands(program, ctx)`, and call it in `buildProgram` in `src/run.ts`. Give each command a description and an example (`addHelpText('after', …)`).
3. In the action, call the generated function with `{ target }` (`operatorTarget(profile, deps)` for operator routes), narrow the response union on `status`, and turn any other status into an error (`operatorError` / `responseError`). Throw `UsageError` / `AuthError` / `CliError` for the exit code; never call `process.exit`.
4. Print once, through `ctx.print({ data, view })`: `data` is the `--json` document, `view` the human `table`, `fields` or `message`.
5. Test it at the CLI's only seam: `src/commands/tests/<group>.test.ts` calls `run(argv, deps)` through `createHarness()` (temp config dir, captured streams) with MSW handlers built from the generated `get…Url()` helpers. Cover success, `--json`, each auth failure, a server error and usage errors.

`run(argv, deps)` takes everything outside the process as `deps` (env, stdout, stderr, fetch, clock, home directory); `src/bin.ts` wires the real ones and is the only untested file.
