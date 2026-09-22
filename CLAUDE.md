# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the single source of truth for this repo's technical conventions: the root file covers monorepo-wide commands, git workflow, and cross-cutting rules; [apps/nebula-chat-client/AGENTS.md](./apps/nebula-chat-client/AGENTS.md) and [apps/nebula-chat-server/AGENTS.md](./apps/nebula-chat-server/AGENTS.md) cover package-specific conventions and code examples. Read the relevant ones before making non-trivial changes. `CONTEXT.md` is the single source of truth for domain vocabulary. This file covers only what's specific to operating as an agent here: how to ship changes and which skills to reach for.

## Shipping (branch + PR)

For Git workflow, **follow `AGENTS.md` as the source of truth**; the guidance below is intended to stay consistent with it, not override it.

- **Never commit to `main`.** If currently on `main`, create a feature branch before the first edit: `git checkout -b <type>/<kebab-slug>`.
- **Reuse the active feature branch** if one is already checked out — don't fork a parallel branch for the same unit of work.
- **Branch naming** uses the `AGENTS.md`-approved prefixes: `feat/...`, `fix/...`, `refactor/...`, `chore/...`.
- **Commit in logical chunks** using Conventional Commits. **Only `feat` and `fix` (plus `feat!`/`fix!` for breaking changes) are allowed** — Release Please ignores every other type, so a `chore:`/`docs:`/`refactor:` change merges and is never released. Default to `fix(<scope>): ...`; use `feat(<scope>): ...` for new capability. Never bundle unrelated changes.
- **Publish the branch** with `git push -u origin <branch>` on first push.
- **Open a PR when the work is complete**, consistent with `AGENTS.md`. Use `gh pr create` with the primary Conventional Commit header as the title, appending the ticket's issue number in parentheses if the work came from a ticket: `type(scope): summary (#NN)`. Because the repo squash-merges with `PR_TITLE`, **the PR title is the one line Release Please parses** — it must be `feat` or `fix`. The body must include: one-line summary, a `Closes #NN` line for the ticket (see `AGENTS.md`'s Referencing tickets), test plan checklist, and a link to the ADR (`docs/adr/NNNN-*.md`) backing the change, if one exists.
- **Never merge your own PR** unless the user explicitly asks. Never `git push --force` (blocked by the pre-bash hook for shared refs anyway). Never use `--no-verify`.

## Agent skills

### Default workflow

For any new feature or non-trivial change, follow the main flow instead of jumping straight to editing files: **`/grill-with-docs`** (sharpen the idea, update `CONTEXT.md`/ADRs as terms and decisions resolve) → **`/to-spec`** → **`/to-tickets`** → **`/implement`** per ticket (drives `/tdd` internally, finishes with `/code-review` before commit). Skip `/to-spec`/`/to-tickets` and go straight to `/implement` only for a single-session change with nothing to split.

On-ramps onto this flow: **`/triage`** for incoming bug reports/feature requests you didn't create; **`/wayfinder`** for a greenfield or multi-session effort too foggy for one `/grill-with-docs` session. Unsure which skill fits? Ask **`/ask-matt`**. Full flow map: `.claude/skills/ask-matt/SKILL.md`.

This flow supersedes the old per-change "invoke an ADR-author agent first" gate: ADRs and `CONTEXT.md` entries are now produced upstream, during `/grill-with-docs`/`/to-spec`/`/domain-modeling`, before a ticket ever reaches implementation.

`/implement` implements a ticket directly, driving `/tdd` and finishing with `/code-review` before commit. Domain-specific scaffolding skills speed common tasks: `backend-module-scaffold` for a new backend module, `drizzle-migrate` for a schema migration, `regenerate-api-client` after any route/schema change, `zustand-store-scaffold` for a new frontend store, and `lint-and-format` before commits.

### Issue tracker

Issues live in GitHub Issues (`itsDaiton/nebula-chat`), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
