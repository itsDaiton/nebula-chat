# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Ticket IDs

Every issue is a ticket with a Jira-style key: **`NEB-<issue-number>`** (issue `#329` → `NEB-329`). The number is the GitHub issue number itself — no separate counter.

- Use the bare `#NN` in `gh` commands and `Closes #NN` lines (GitHub only understands that form).
- Use the `NEB-<n>` key in branch names and titles, where a bare `#NN` collides with PR numbers.
- **The issue title carries the key and becomes the PR title.** Right after creating an issue, edit its title to `type(scope): NEB-<n> summary` — the ID, a space, then the summary, no colon after it (e.g. `feat(server): NEB-330 migrate Express to Fastify`). The implementing PR reuses that exact string. Full title/branch format: `AGENTS.md` → **Referencing tickets**.

## Labels

Every ticket gets, in addition to its triage state (see [triage-labels.md](./triage-labels.md)):

- **One or more area/lib labels** naming what it touches:
  - `app:server` — `apps/nebula-chat-server` (backend) · `app:client` — `apps/nebula-chat-client` (frontend)
  - `lib:auth`, `lib:db`, `lib:langchain`, `lib:otel`, `lib:redis` — the corresponding `libs/*` package
- **`enhancement`** for a `feat`, **`bug`** for a `fix`.

Apply these when creating or triaging a ticket. **When a new `libs/<name>` package is created, add a matching `lib:<name>` GitHub label** (`gh label create lib:<name> --color 5319e7 --description "Touches libs/<name>"`) — this is part of the new-lib checklist in `AGENTS.md`.

## Ticket anatomy

A ticket is a **pre-implementation artifact** — the output of a `/grill-with-docs` or `/to-tickets` session, handed to an agent or human who may pick it up with **no other context**. Write it accordingly:

- **Forward-looking, present/imperative tense.** Describe the work to be done, not work that was done. "Create `libs/db`…", "Replace Express with Fastify…" — never "Created…", "✅ Delivered", or a changelog voice. Acceptance criteria are **unchecked** (`- [ ]`).
- **No ADR / decision-record framing in the body.** A ticket precedes the ADR; it doesn't cite one as already decided or link to a changelog. (The ADR is written from the grilling session, separately.)
- **Detailed enough to implement cold.** Name the files, modules, and packages involved and the pattern to follow; call out gotchas and the seams to test. Do **not** paste implementation code or line numbers — they go stale. Prose, tables, and short lists over code blocks.
- **Fill the template.** [`.github/ISSUE_TEMPLATE.md`](../../.github/ISSUE_TEMPLATE.md) is the one canonical skeleton — it pre-fills a new issue in the browser, and agents fill the same file. Keep every `## heading`. A **validate-ticket** GitHub Action ([`.github/workflows/validate-ticket.yml`](../../.github/workflows/validate-ticket.yml)) checks the title and these sections on every issue, auto-applies `needs-triage`, and labels `malformed-ticket` + comments when a ticket doesn't match. It **skips** non-ticket tracking issues — label a capability backlog or an umbrella epic `backlog` or `epic` and validate-ticket leaves it alone.
- **The standard sections:**

  | Section | Holds |
  | ------- | ----- |
  | **Change type** | `feat` / `fix` (`!` for breaking) |
  | **Summary** | 2–5 sentences: what's true once this ships, and the shape of the change |
  | **Background & problem** | the long section — the current state in detail, what breaks or is missing, who it costs, and the constraints and prior decisions that bound the fix. Explain everything |
  | **Scope** | a table of area/package → what changes |
  | **Acceptance criteria** | checkable, unchecked; cover happy path, error paths, and tests |
  | **Technical approach & notes** | files/patterns/interfaces/gotchas for a cold implementer — go into detail, name the files, no code |
  | **Testing** | which seams to test, what to mock vs. keep real, the test types, and what's deliberately not tested |
  | **Depends on** | a **bullet list** of blocking tickets, each linking the issue on GitHub with `#NN` (e.g. `- #334 — @nebula-chat/otel`); a single `- None` bullet if it can start immediately. The inverse ("blocks") is GitHub's native dependency graph, not a written field |
  | **Out of scope** | explicit non-goals, where they matter |
  | **Notes** _(optional)_ | anything that doesn't fit above: references, deployment realities that shape the design, domain-vocabulary changes (`CONTEXT.md` terms), links to related tickets |

The closed issues `NEB-330`…`NEB-336` (the retired backend-migration work) are worked examples of this shape.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments` for a human-readable view with comments inline. For structured output (labels, comment bodies) to pipe through `jq`, use `gh issue view <number> --json title,body,labels,comments --jq '{title, body, labels: [.labels[].name], comments: [.comments[].body]}'` — `view`'s `comments` field is an array of comment objects.
- **List issues**: `gh issue list --state open --json number,title,body,labels --jq '[.[] | {number, title, body, labels: [.labels[].name]}]'` with appropriate `--label` and `--state` filters. `list`'s `comments` field is only a count, not comment bodies — fetch those per-issue with the `gh issue view --json comments` command above.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
