# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

`AGENTS.md` is the source of truth for technical conventions — the root file covers monorepo commands, git workflow, and cross-cutting rules; the per-app files ([client](./apps/nebula-chat-client/AGENTS.md), [server](./apps/nebula-chat-server/AGENTS.md)) cover package specifics; `CONTEXT.md` owns domain vocabulary. Read the relevant ones before a non-trivial change. This file covers only what's specific to operating as an agent here: how to ship, and which skills to reach for.

## Shipping (branch + PR)

Follow `AGENTS.md` for the full Git workflow; these are the agent-behaviour rules layered on top.

- **Never commit to `main`.** Branch first (`git checkout -b <type>/<kebab-slug>`), and reuse the active feature branch rather than forking a parallel one for the same work.
- **Conventional Commits, `feat`/`fix` only** (`feat!`/`fix!` for a breaking/major change) — Release Please ignores every other type, so a `chore:`/`refactor:` change merges but never releases. Default to `fix(<scope>): …`. Never bundle unrelated changes.
- **Open a PR when the work is complete.** The title carries the ticket ID — `type(scope): NEB-<n> "Ticket title"` (plain `type(scope): summary` for ad-hoc work with no ticket); it's the one line Release Please parses, so it must be `feat`/`fix`. Body: one-line summary, `Closes #NN`, test-plan checklist, and the backing ADR link if one exists. Full title/branch/close rules: `AGENTS.md` → Referencing tickets.
- **Never merge your own PR** unless the user asks. Never force-push shared refs (the pre-bash hook blocks it) or use `--no-verify`.

## Workflow & skills

Main flow for any feature or non-trivial change: **`/grill-with-docs`** → **`/to-spec`** → **`/to-tickets`** → **`/implement`** per ticket (drives `/tdd`, finishes with `/code-review` before commit). Go straight to `/implement` only for a single-session change with nothing to split. On-ramps: **`/triage`** for incoming bug reports / feature requests you didn't create, **`/wayfinder`** for a multi-session effort too foggy for one `/grill-with-docs`. Unsure which fits? **`/ask-matt`**.

ADRs and `CONTEXT.md` entries are produced upstream during `/grill-with-docs`/`/to-spec`/`/domain-modeling`, before a ticket reaches implementation. Repo scaffolding skills speed common tasks: `backend-module-scaffold`, `drizzle-migrate`, `regenerate-api-client`, `zustand-store-scaffold`, `lint-and-format`.

## Issues & domain docs

- **Tracker**: GitHub Issues (`itsDaiton/nebula-chat`) via the `gh` CLI. Each issue is ticket `NEB-<number>`. See `docs/agents/issue-tracker.md`.
- **Triage labels**: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.
- **Domain**: a single `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
