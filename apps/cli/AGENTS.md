# AGENTS.md — Operator CLI (`@nebula-chat/cli`)

Conventions for the `nebula` CLI. Monorepo-wide rules live in the [root AGENTS.md](../../AGENTS.md).

`nebula` is the terminal client for Operators and Admins ([ADR-0029](../../docs/adr/0029-operator-cli-as-an-api-client.md)). It talks only to the public HTTP API, through a fetch client Orval generates from `openapi/openapi.yaml` (the `Operator` and `Admin` tags). Run it from the repo root, no build needed:

```bash
pnpm nebula --help
pnpm nebula profile add local --url http://localhost:3000   # the first profile becomes the default
pnpm nebula profile add prod --url https://<server-host>
pnpm nebula profile use prod
pnpm nebula login                                            # approve the printed code in the browser as an Admin
pnpm nebula whoami
pnpm nebula logout
NEBULA_OPERATOR_TOKEN=… pnpm nebula --profile local log-level set redis debug --ttl 600
NEBULA_OPERATOR_TOKEN=… pnpm nebula --profile local log-level get
NEBULA_OPERATOR_TOKEN=… pnpm nebula admins grant dana@example.com   # how the first Admin is made
NEBULA_OPERATOR_TOKEN=… pnpm nebula admins revoke dana@example.com --yes
NEBULA_OPERATOR_TOKEN=… pnpm nebula admins list
pnpm nebula --json profile list | jq .
```

- **CLI profiles** (server URLs, and which is the default) live in `$XDG_CONFIG_HOME/nebula-chat/config.json`, else `~/.config/nebula-chat/config.json`. `--profile <name>` overrides the default per command.
- **`nebula login`** signs in as an Admin with the OAuth device flow ([docs/auth.md](../../docs/auth.md#cli-login-device-authorization)):
  it prints a one-time code and the approval link on stderr, opens the browser (`--no-browser` skips that) and polls
  until an Admin signed in with 2FA approves. Denial and expiry exit `3`.
  - The auth session token goes to the OS keychain (`@napi-rs/keyring`, service `nebula-chat`), else to
    `credentials.json` (`0600`) beside the config file. It is keyed by server URL, so it is only ever sent to the
    server that issued it.
  - `whoami` shows the User, role and profile; `logout` ends the auth session on the server and deletes the token,
    even when the server can't be reached.
  - Admin routes take `adminTarget(ctx)` (`src/api/admin.ts`): the profile plus `Authorization: Bearer <token>`.
    better-auth's own routes are not in `openapi.yaml`, so `src/api/auth.ts` calls them through `apiFetch` by hand.
- **The operator token** is read only from `NEBULA_OPERATOR_TOKEN` and never written to disk. `log-level set` records `--operator`, else `$NEBULA_OPERATOR`, else `$USER`, as who asked.
- **`--service server|worker`** on `log-level get` and `set` picks whose levels (default `server`). `receivers: 0` for the worker means none is awake: on the free plan it sleeps when idle.
- **`log-level get`** prints one row per instance and target (the root, then every component): its level, when a runtime change expires, and who set it (`-` at the boot-time level).
  - Every instance answers for itself ([ADR-0034](../../docs/adr/0034-reading-log-levels-from-every-instance.md)).
  - A warning on stderr flags instances that disagree on a level, or that did not answer within the server's 2 seconds.
  - `--json` prints the server's `{ receivers, reports }` as is.
- **`admins revoke`** asks `[y/N]` on a TTY, and without `--yes` refuses in a non-interactive shell (exit `2`). The server's own message (unknown email, Guest, unverified, banned, already or not an Admin, last Admin) prints with exit `1`.
  - `list` shows the account's creation time as "granted at": the API records no grant time.
- **Output:** a table, key–value list or sentence for humans (bold headers only on a TTY without `NO_COLOR`); `--json` prints exactly one JSON document to stdout. Errors go to stderr.
- **Exit codes:** `0` success, `1` server or unknown error, `2` usage error (bad arguments, unknown profile, a `400`), `3` authentication or authorisation error.

## Adding a command

1. If the route is new, regenerate the spec, then the CLI client: `pnpm --filter @nebula-chat/cli run generate:api`. Generated code under `src/api/generated/` is never hand-edited.
2. Add `src/commands/<group>.ts` exporting `register<Group>Commands(program, ctx)`, and call it in `buildProgram` in `src/run.ts`. Give each command a description and an example (`addHelpText('after', …)`).
3. In the action, call the generated function with `{ target }` (`operatorTarget(profile, deps)` for operator routes), narrow the response union on `status`, and turn any other status into an error (`operatorError` / `responseError`). Throw `UsageError` / `AuthError` / `CliError` for the exit code; never call `process.exit`.
4. Print once, through `ctx.print({ data, view })`: `data` is the `--json` document, `view` the human `table`, `fields` or `message`.
5. Test it at the CLI's only seam: `src/commands/tests/<group>.test.ts` calls `run(argv, deps)` through `createHarness()` (temp config dir, captured streams) with MSW handlers built from the generated `get…Url()` helpers. Cover success, `--json`, each auth failure, a server error and usage errors.

`run(argv, deps)` takes everything outside the process as `deps` (env, stdout, stderr, stdin, confirm prompt, fetch, clock, home directory, keychain, browser opener, sleep); `src/bin.ts` wires the real ones and is the only untested file.
