# ADR-0032: Apps live at `apps/{client,server,worker,cli}` as `@nebula-chat/<app>`; release tags and Render services keep their old names

- **Status:** Accepted — implemented by NEB-526 (#526)
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0013](./0013-worker-app-owns-all-llm-execution.md) — amended: the worker is `apps/worker`; [ADR-0029](./0029-operator-cli-as-an-api-client.md) — `apps/cli`

## Context

The apps are `apps/nebula-chat-client` and `apps/nebula-chat-server`, with unscoped package names. The libs are already `libs/<name>` scoped as `@nebula-chat/<name>`. Two more apps are coming (the worker and the CLI). The prefix repeats the repository name in every path, filter and import.

## Decision

1. Rename the app directories to `apps/client` and `apps/server`, and create the coming apps as `apps/worker` and `apps/cli`. The packages become `@nebula-chat/client`, `@nebula-chat/server` and so on.
2. **Release Please keeps the old tag prefixes.** The manifest keys move to the new paths (versions carry over), and the config pins `"component": "nebula-chat-client"` / `"nebula-chat-server"`. This keeps tag and changelog continuity without a `last-release-sha` bootstrap.
3. **Render service names don't change.** Renaming a service in the blueprint creates a new service; only paths and build filters change.
4. The rename lands as one change before any other work in this round, so the worker and the CLI are created at their final paths.

## Consequences

- Tags (`nebula-chat-client-v*`) no longer match the directory name. Moving to new prefixes later is a separate, deliberate change.
- Labels (`app:client`, `app:server`) already use the short names.
