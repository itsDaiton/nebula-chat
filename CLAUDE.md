# CLAUDE.md

Guidance for Claude Code in this repository. [AGENTS.md](./AGENTS.md) holds the repo-wide habits;
the per-app `AGENTS.md` files hold package conventions; [CONTEXT.md](./CONTEXT.md) owns domain vocabulary.
Read the relevant ones before a non-trivial change.

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
  Body: one-line summary, `Closes #NN`, test-plan checklist, ADR link if one exists.
- **Never merge your own PR** unless asked. Never force-push shared refs or use `--no-verify`.

## Skills

Feature or non-trivial change: **`/grill-with-docs`** → **`/to-spec`** → **`/to-tickets`** →
**`/implement`** per ticket (drives `/tdd`, ends with `/code-review`). Go straight to `/implement` for a
single-session change. Incoming reports: **`/triage`**. Foggy multi-session effort: **`/wayfinder`**.
Unsure: **`/ask-matt`**.

## Tickets and domain docs

- Tracker: GitHub Issues (`itsDaiton/nebula-chat`) via `gh`; labels in `docs/agents/triage-labels.md`.
- A new ticket fills `.github/ISSUE_TEMPLATE.md` and follows the Ticket anatomy in
  `docs/agents/issue-tracker.md` — this overrides any thinner template a skill embeds. Title it
  `type(scope): NEB-<n> summary`; label it `app:server` / `app:client` / `lib:<name>` plus a triage label.
- Domain: one `CONTEXT.md` plus `docs/adr/` — see `docs/agents/domain.md`. Both are produced upstream
  during `/grill-with-docs`, not during implementation.
