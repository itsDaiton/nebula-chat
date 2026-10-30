# AGENTS.md

Monorepo-wide habits: commands, git workflow, and cross-cutting rules. Package conventions live in
each package's own file — read the one you're about to touch:

- [apps/client](./apps/client/AGENTS.md) — React, TanStack Query, Zustand, Chakra UI
- [apps/server](./apps/server/AGENTS.md) — Fastify, Drizzle, Zod
- [apps/worker](./apps/worker/AGENTS.md) — every LLM reply and background job (BullMQ, Redis Streams)
- [apps/cli](./apps/cli/AGENTS.md) — the `nebula` operator CLI

How the pieces fit: [docs/architecture.md](./docs/architecture.md). Domain vocabulary: [GLOSSARY.md](./GLOSSARY.md).
Local setup and env files: [README.md](./README.md).

## Commands

```bash
pnpm install
pnpm run lint:fix && pnpm run format           # after every code change; zero warnings tolerated
pnpm turbo run typecheck --filter=<pkg>        # builds workspace libs (dist/*.d.ts) first
pnpm turbo run test                            # every package (or `pnpm backend|frontend|worker test`)
pnpm turbo run test --output-logs=errors-only  # same, printing only failing tasks' logs
pnpm knip                                      # on demand: after deleting/moving files or changing exports
pnpm catalog:stamp                             # after editing libs/contracts/src/models/catalog.json
podman compose up -d                           # PostgreSQL :5332, Redis :6380
```

Don't add `// eslint-disable` unless unavoidable, and say why. Never hand-edit generated code (Orval output).
`main` is Knip-clean: a finding is yours — delete the dead code or drop the `export`.

## Git

- Never commit to `main`. One logical change per branch, then a PR against `main`.
- Branch: `type/<slug>`, or `type/neb-<n>-<slug>` for a ticket.
- **Only `feat` and `fix` (and `feat!`/`fix!`).** Release Please ignores every other type, so the work
  would merge and never release. `fix` is the default (bugs, deps, tooling, CI, docs, refactors);
  `feat` is new user-visible capability; `!` is a real breaking change to a released surface.
- Scope names the Release Please component: `client`, `server`, `worker`, `cli`, `contracts`, `db`,
  `errors`, `openapi` — or none for root tooling/docs. The bump is decided from changed paths,
  not the scope.
- Squash-merge is the default, so the **PR title is the commit Release Please parses**. Subject under 72 chars.
- PR body: the `pr` skill's template (Summary, Evidence, Merge Danger), plus `Closes #NN` and any ADR link.

### Tickets

A GitHub issue is ticket `NEB-<issue-number>`. The issue title is the PR title:
`type(scope): NEB-<n> summary` (no colon after the ID; no ID for ad-hoc work). `Closes #NN` closes the
ticket — GitHub keys off the bare number, not the `NEB-` alias. Prefer one PR per ticket.
No `<` or `>` in issue or PR titles: Release Please drops every release after the first when one reaches
the notes (write `@nebula-chat/app-name`, not `@nebula-chat/<app>`).

## Testing

A PR that changes behavior ships tests at the seams that behavior crosses — not a test per file. The
`tdd` skill defines good tests and seams; [ADR-0008](./docs/adr/0008-vitest-unit-testing-with-an-enforced-coverage-gate.md)
records the rest.

- Vitest in every package, config per package. Unit tests only: no live database or network.
- One test file per source file, named after it, in a `tests/` folder beside the code
  (`hooks/useX.ts` → `hooks/tests/useX.test.ts`). Tests hold their own assertions.
- Tests run against built libs; never alias `@nebula-chat/*` to `libs/*/src`.
- 80% coverage gate. Below the bar, exclude a file with no behavior in both its `vitest.config` and
  `matrix.coverage` in `.github/workflows/build.yml` — never lower a threshold.
- Never fix a failing test by skipping, deleting or weakening it.

## Cross-cutting conventions

- `type`, never `interface`.
- `const` arrow functions, never `function` declarations.
- No barrel `index.ts` in apps. The only exceptions are generated files and the single `src/index.ts`
  public surface of each `libs/*` package.
- No relative imports: `@/*` in the client, `@server/*` in the server, `@worker/*` in the worker.
- Comments are one line, two at most, and say only what the code can't: the reason, constraint or gotcha.
  No JSDoc blocks restating a name or type, no `@param`/`@returns`. History goes in the commit, cross-file
  rationale in an ADR. The edit hook flags blocks of three or more lines.
- Layouts in docs list folders with a one-line purpose, not individual files.
- Diagrams are Mermaid in Markdown, never exported images — see [docs/agents/diagrams.md](./docs/agents/diagrams.md).

## New lib under `libs/`

In order: add `libs/<name>/.gitignore` (`dist/`, `node_modules/`); add the package to
`release-please-config.json`; create the `lib:<name>` GitHub label. Give it exactly one `src/index.ts`.

## Keep docs true

A change to conventions, module layout or architecture updates, in the same PR: the relevant `AGENTS.md`,
`GLOSSARY.md` for vocabulary, `docs/adr/` for hard-to-reverse decisions, the Mermaid diagrams that draw the
area, and any skill that references it. Operator CLI usage: [apps/cli/AGENTS.md](./apps/cli/AGENTS.md).
MCP servers: [docs/agents/mcp-servers.md](./docs/agents/mcp-servers.md).
