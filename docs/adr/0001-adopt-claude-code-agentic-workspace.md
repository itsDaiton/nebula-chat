# ADR-0001: Adopt a Claude Code Agentic Workspace

- **Status:** Proposed
- **Date:** 2026-04-19
- **Deciders:** @itsDaiton

## Context

Nebula Chat is a TypeScript pnpm monorepo (`apps/nebula-chat-client` + `apps/nebula-chat-server`) with strict conventions encoded in `AGENTS.md` (Zustand-only state, strict backend layering, OpenAPI↔Orval contract, zero-warning lint) and an active rearchitecture planned across ten migration tickets in `docs/new-backend/TICKET-M*.md` (Express→Fastify, Prisma→Drizzle, bare OpenAI→LangChain, libs/ workspace extraction).

Before this change, the `.claude/` directory contained only `settings.local.json` — no shared agents, skills, or hooks. Every Claude Code session started cold, re-derived conventions from scratch, and had no enforced discipline around decision-capture. The migration tickets in `docs/new-backend/` are explicitly described as volatile; any agent baking their content into a static prompt would go stale the moment a ticket is rewritten.

We needed a shared, versioned agentic workspace that (a) encodes domain specialization matching the real module boundaries, (b) loads volatile docs lazily on each invocation, (c) gates non-trivial work behind an ADR so future agents and humans recover the "why", and (d) keeps its own agent definitions in sync as the docs and code evolve.

## Decision

Introduce a shared `.claude/` workspace committed to the repository, containing:

- **13 specialized subagents** in `.claude/agents/` covering architecture migration, database schema, API contract, backend modules, chat streaming hot path, frontend state, frontend UI, testing, code review, security audit, docs curation, ADR authoring, and a meta-synchronizer that updates agent definitions when source-of-truth docs change.
- **7 skills** in `.claude/skills/` for repeatable procedures (`drizzle-migrate`, `regenerate-api-client`, `lint-and-format`, `zustand-store-scaffold`, `backend-module-scaffold`, `load-conventions`, `load-migration-ticket`).
- **Hooks** in `.claude/settings.json` + `.claude/hooks/`: a `PostToolUse` hook that runs `eslint --fix` on files changed since last commit, and a `PreToolUse` Bash hook that blocks destructive commands (`rm -rf`, `git push --force`, unqualified `docker-compose down -v`, `DROP TABLE`, `--no-verify`, etc.).
- **ADR workflow** rooted at `docs/adr/` with a canonical template at `docs/template/adr-template.md`. Build agents must check for a matching ADR before editing; `adr-author` is a pre-change gate. Agents are pointed at `docs/adr/` as required reading.
- **gitignore adjustment**: track `.claude/` contents (agents/skills/hooks/settings.json) but continue to ignore `settings.local.json` so personal permission allowlists stay private.

Model tiering: `opus` for architectural/reviewer/ADR roles, `sonnet` for build/iterate roles, tool allowlists scoped per agent (read-only agents have no `Edit`/`Write`).

## Alternatives Considered

- **Single generalist agent (status quo).** Rejected — no domain specialization, no tool-scope enforcement, no way to auto-delegate based on task terminology, and no mechanism to keep decisions captured separately from code.
- **Agents without ADR gating.** Rejected — the migration tickets' "why" was already drifting from implementation and there is no PR body discipline strong enough to substitute for durable decision records living next to the code.
- **Bake `AGENTS.md` and migration ticket content directly into each agent's system prompt.** Rejected — the migration docs are explicitly volatile, so baked content would immediately diverge from source-of-truth. Agents re-read the relevant markdown at every invocation instead.
- **Automate `meta-synchronizer` on a hook.** Rejected for now — doc churn during the active migration would cause continuous thrash against agent definitions. Manual invocation preferred until `docs/new-backend/` stabilizes post-M10.

## Consequences

- **Positive:**
  - Domain-specialized agents auto-delegate from natural requests ("regen the client", "add a migration", "audit auth").
  - Decision-capture discipline enforced: every non-trivial change lands with a committed ADR.
  - Volatile docs (`docs/new-backend/*.md`) treated as sources-of-truth — agents reload them each session, so doc edits take effect immediately without updating agent prompts.
  - Destructive-command hook reduces the blast radius of agent mistakes.
  - Meta-synchronizer provides a deliberate mechanism to update agent definitions as the rearchitecture progresses.

- **Negative / Tradeoffs:**
  - Maintenance burden: 13 agents + 7 skills is a non-trivial surface to keep aligned. `meta-synchronizer` mitigates but does not eliminate this.
  - Opus-tier agents (6 of 13) increase token cost on architecturally heavy sessions.
  - ADR gate adds friction to small-but-non-trivial changes; softened by excluding typos/renames and leaving judgment to the invoking agent.
  - Post-`Proposed` ADR lifecycle (moving to `Accepted` and filling `Verification`) relies on human or `docs-curator` follow-through — easy to skip.

- **Neutral:**
  - `.claude/settings.local.json` remains per-machine, so permission prompts still happen on each developer's box until they approve tool calls.
  - Worktree isolation for parallel agent runs is deferred.

## Implementation Notes

- Files touched:
  - Added: `.claude/settings.json`, `.claude/hooks/lint-changed-files.sh`, `.claude/hooks/block-dangerous-bash.sh`.
  - Added: `.claude/agents/*.md` (13 files listed in the Decision section).
  - Added: `.claude/skills/*/SKILL.md` (7 skills listed in the Decision section).
  - Added: `docs/template/adr-template.md`, `docs/adr/` (this file is the first entry).
  - Modified: `.gitignore` — replaced blanket `.claude` ignore with `.claude/settings.local.json` (and `**/.claude/settings.local.json`).
- Migrations required: none.
- OpenAPI/contract impact: none.
- Rollback plan: revert the commit. Restore the old `.gitignore` rule (`.claude`) if needed. No runtime artifacts are involved.

## Verification

_To be filled after acceptance._

- `/agents` in Claude Code lists 13 agents without errors.
- `/skills` lists 7 skills.
- Editing a `.ts` file triggers `lint-changed-files.sh`.
- Attempting a blocked command (e.g. `git push --force`) is rejected by `block-dangerous-bash.sh`.
- Asking Claude for a backend-module task auto-delegates to `backend-module-builder`.
- `meta-synchronizer` successfully updates an agent definition in response to a deliberate edit of a migration ticket.
