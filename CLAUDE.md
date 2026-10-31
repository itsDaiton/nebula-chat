# CLAUDE.md

Guidance for Claude Code in this repository. The repo-wide habits below come from [AGENTS.md](./AGENTS.md);
each app's `CLAUDE.md` imports its `AGENTS.md` on first touch; [GLOSSARY.md](./GLOSSARY.md) owns domain vocabulary.

@AGENTS.md

Topic rules for the server and client live in `.claude/rules/` and load when Claude reads a matching file.

## Working principles

These bias toward caution over speed; for trivial tasks use judgment.

1. **Think before coding.** State assumptions; if uncertain, ask. If several readings exist, present
   them instead of picking silently. If a simpler approach exists, say so and push back. If something is
   unclear, stop and name what's confusing.
2. **Simplicity first.** The minimum code that solves the problem. No unrequested features, no
   abstractions for single-use code, no speculative configurability, no handling of impossible cases. If
   200 lines could be 50, rewrite it.
3. **Surgical changes.** Touch only what the task requires; match existing style. Don't "improve"
   adjacent code, comments or formatting, and mention unrelated dead code instead of deleting it. Remove
   only the orphans your own change created. Every changed line should trace to the request.
   Comments stay at one line, two at most: the why, never the what.
4. **Goal-driven execution.** Turn the task into a verifiable goal — a failing test first for a bug, tests
   green before and after for a refactor — and loop until it's verified. For multi-step work, state a
   short plan with a check per step.

## Shipping

- **Never commit to `main`.** Branch first (`git checkout -b <type>/<kebab-slug>`); reuse the active
  feature branch rather than forking a parallel one.
- **Conventional Commits, `feat`/`fix` only** (`!` for breaking) — Release Please ignores every other
  type. Default to `fix(<scope>): …`. Never bundle unrelated changes.
- **Open a PR when the work is complete.** Title `type(scope): NEB-<n> summary` (no ID for ad-hoc work).
  Write the body with **`/pr`** (Summary, Evidence, Merge Danger), then add `Closes #NN` and the ADR link if
  one exists.
- **Never merge your own PR** unless asked. Never force-push shared refs or use `--no-verify`.

## Skills

Feature or non-trivial change: **`/grill-with-docs`** → **`/to-spec`** → **`/to-tickets`** →
**`/implement`** per ticket (drives `/tdd`, ends with `/code-review`) → **`/pr`**. Go straight to `/implement` for a
single-session change. Incoming reports: **`/triage`**. Foggy multi-session effort: **`/wayfinder`**.
Unsure: **`/ask-matt`**.
Vendored skills carry local edits in `tdd` (seams don't block on confirmation) and `to-tickets` (our ticket
template); after `npx skills@latest update`, re-apply them from the diff.

## Subagents

- Hand lint, typecheck and test runs to the **`verifier`** subagent and act on its summary; keep edits in the
  main session.
- Library and API docs: the **`doc-researcher`** subagent. Never set `model:` in a skill: a mid-session model
  switch re-reads the whole conversation uncached. Use `context: fork` with an `agent:` instead.

## Tickets and domain docs

- Tracker: GitHub Issues (`itsDaiton/nebula-chat`) via `gh`; labels in `docs/agents/triage-labels.md`.
- A new ticket fills `.github/ISSUE_TEMPLATE.md` and follows the Ticket anatomy in
  `docs/agents/issue-tracker.md` — this overrides any thinner template a skill embeds. Title it
  `type(scope): NEB-<n> summary`; label it `app:server` / `app:client` / `lib:<name>` plus a triage label.
- Domain: one `GLOSSARY.md` plus `docs/adr/` — see `docs/agents/domain.md`. Both are produced upstream
  during `/grill-with-docs`, not during implementation.

## Compact instructions

Keep the ticket number, the branch, the spec or acceptance criteria, failing check names and the files changed.
Drop exploration output and passing test logs.
