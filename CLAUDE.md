# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the single source of truth for this repo's technical conventions: the root file covers monorepo-wide commands, git workflow, and cross-cutting rules; [apps/nebula-chat-client/AGENTS.md](./apps/nebula-chat-client/AGENTS.md) and [apps/nebula-chat-server/AGENTS.md](./apps/nebula-chat-server/AGENTS.md) cover package-specific conventions and code examples. Read the relevant ones before making non-trivial changes. `CONTEXT.md` is the single source of truth for domain vocabulary. This file covers only what's specific to operating as an agent here: how to ship changes and which skills to reach for.

## Shipping (branch + PR) — applies to every agent

This rule applies to **every** build/write agent in `.claude/agents/`. Read-only agents (e.g. `security-auditor`) do not open PRs but may comment on existing ones via `gh`. For Git workflow, **follow `AGENTS.md` as the source of truth**; the guidance below is intended to stay consistent with it, not override it.

- **Never commit to `main`.** If currently on `main`, create a feature branch before the first edit: `git checkout -b <type>/<kebab-slug>`.
- **Reuse the active feature branch** if one is already checked out — don't fork a parallel branch for the same unit of work.
- **Branch naming** uses the `AGENTS.md`-approved prefixes: `feat/...`, `fix/...`, `refactor/...`, `chore/...`. Architectural migration branches include the ticket: `feat/m-<n>-<slug>`.
- **Commit in logical chunks** using Conventional Commits (`feat(<scope>): ...`, `fix(<scope>): ...`). Never bundle unrelated changes.
- **Publish the branch** with `git push -u origin <branch>` on first push.
- **Open a PR when the work is complete**, consistent with `AGENTS.md`. Use `gh pr create` with the primary Conventional Commit header as the title. The body must include: one-line summary, test plan checklist, and a link to the ADR (`docs/adr/NNNN-*.md`) backing the change, if one exists.
- **Never merge your own PR** unless the user explicitly asks. Never `git push --force` (blocked by the pre-bash hook for shared refs anyway). Never use `--no-verify`.
- **Read-only agents** that need to leave findings on a PR use `gh pr comment` or `gh pr review`; they never push commits.

## Agent skills

### Default workflow

For any new feature or non-trivial change, follow the main flow instead of jumping straight to editing files: **`/grill-with-docs`** (sharpen the idea, update `CONTEXT.md`/ADRs as terms and decisions resolve) → **`/to-spec`** → **`/to-tickets`** → **`/implement`** per ticket (drives `/tdd` internally, finishes with `/code-review` before commit). Skip `/to-spec`/`/to-tickets` and go straight to `/implement` only for a single-session change with nothing to split.

On-ramps onto this flow: **`/triage`** for incoming bug reports/feature requests you didn't create; **`/wayfinder`** for a greenfield or multi-session effort too foggy for one `/grill-with-docs` session. Unsure which skill fits? Ask **`/ask-matt`**. Full flow map: `~/.claude/skills/ask-matt/SKILL.md`.

This flow supersedes the old per-change "invoke an ADR-author agent first" gate: ADRs and `CONTEXT.md` entries are now produced upstream, during `/grill-with-docs`/`/to-spec`/`/domain-modeling`, before a ticket ever reaches an implementing agent.

### Specialist delegation during `/implement`

`/implement` is generic — left alone it implements a ticket directly. In this repo, when a ticket (or a slice of one) falls inside a specialist's domain, delegate that slice to the matching agent (via the Task tool) instead of implementing it directly, then run `/tdd` and `/code-review` over the combined result as usual:

| Ticket touches...                                                    | Delegate to                  |
| ------------------------------------------------------------------------| ---------------------------------|
| A backend feature module (new/changed endpoint under `modules/**`)    | `backend-module-builder`     |
| The chat streaming hot path (SSE, token budget, prompt, provider swap) | `chat-streaming-specialist`  |
| A Drizzle schema or migration change (`libs/db`)                      | `drizzle-migration-engineer` |
| OpenAPI/Orval regen after any backend route/schema change             | `api-contract-keeper`        |
| A Zustand store, hook, or cross-module frontend state change          | `frontend-state-architect`   |
| Chakra UI components, theme, layout, a11y, copy                       | `frontend-ui-artisan`        |
| A `docs/new-backend/TICKET-M*.md` migration ticket                    | `architecture-migrator`      |
| Heavier test infrastructure (beyond what `/tdd` covers inline)        | `test-strategist`            |

A vertical-slice ticket that spans layers (e.g. a new feature touching schema + API + UI) delegates each layer to its owning specialist in sequence, then reviews the whole slice together. `security-auditor` and `meta-synchronizer` stay out-of-band — invoke them directly when asked ("security review", "sync the agents"), not as part of routine ticket implementation.

### Issue tracker

Issues live in GitHub Issues (`itsDaiton/nebula-chat`), managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
