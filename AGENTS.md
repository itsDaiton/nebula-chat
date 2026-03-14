# AGENTS.md

Conventions for AI agents (Claude Code, Copilot, etc.) working in this repository.

## Git Workflow

- **Never commit directly to `main`.** All work must go through a feature branch and pull request.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`, `refactor/<short-description>`.
- One logical change per branch. Don't bundle unrelated changes.
- Always push the branch and open a PR when the work is complete.

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`.
  - Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`.
  - Scope is optional but encouraged (e.g. `feat(chat): ...`, `fix(backend): ...`).
- Keep the subject line under 72 characters.
- Commit logically complete units of work — don't leave the codebase in a broken state between commits.

## Pull Requests

- Always open a PR against `main`.
- PR title follows the same Conventional Commits format as commits.
- PR description must include:
  - A brief summary of what changed and why.
  - A test plan (manual steps or automated tests that cover the change).
- Keep PRs small and focused. If a task requires many unrelated changes, split into multiple PRs.

## Code Quality

- After every code change, always run `npm run lint:fix` and `npm run format` from the repo root. This is mandatory, not optional.
- Also run `npm run typecheck` in the relevant package (`npm run frontend typecheck` or `npm run backend typecheck`) and fix all errors before committing.
- Do not disable ESLint rules with inline comments (`// eslint-disable`) unless there is a compelling reason, and document why.

## Making Changes

- Read the relevant files before editing. Understand existing patterns before introducing new ones.
- Match the existing code style of the file you are editing.
- Prefer editing existing files over creating new ones.
- Keep changes minimal and scoped to what was requested.
