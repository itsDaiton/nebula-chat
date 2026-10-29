# Claude Code harness review: results and token usage

Status: research, October 2026. Nothing here is applied yet; each item is a proposal with a ready-to-paste snippet.
Facts about Claude Code come from the official docs at `code.claude.com/docs` (linked per item). Community sources
are marked as such and treated as anecdotal.

## 1. What the harness is today

| Layer                 | Current state                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instructions          | `CLAUDE.md` (49 lines) tells Claude _in words_ to read `AGENTS.md`, the per-app `AGENTS.md` files and `CONTEXT.md`. Per-app files are large: server 426 lines / 30 KB, client 358 / 24 KB, worker 160 / 12 KB                                                                                                                                                                                                   |
| Skills                | 33 vendored `mattpocock/skills` (pinned by hash in `skills-lock.json`). 20 are `disable-model-invocation: true`, so their descriptions cost nothing; the 13 model-visible ones cost about 2.6 K chars (~650 tokens) of listing. This part is already lean                                                                                                                                                       |
| Skills from claude.ai | 28 account skills sync into every session (`~/.claude/skills/synced/`), about 15.5 K chars (~3.9 K tokens) of descriptions, including 6 Spotify, 2 Strava, `morning` and `post-creator`                                                                                                                                                                                                                         |
| Hooks                 | `PreToolUse(Bash)` blocks destructive commands. `PostToolUse(Edit\|Write)` runs `eslint --fix` on **every changed file in the working tree** after **every** edit, then checks the comment budget of the edited file                                                                                                                                                                                            |
| MCP                   | `.mcp.json`: shadcn, better-auth, context7, langchain-docs, playwright, redis-local (all `@latest`, unpinned). `.claude/settings.json` `allowedMcpServers` also allows the production connectors Grafana Cloud, Supabase, Render, plus Firecrawl and Claude Docs. A cloud session here lists ~370 deferred tool names plus each server's instructions: by my count roughly 6–7 K tokens before the first prompt |
| Subagents             | None defined (`.claude/agents/` missing). `code-review` and `research` spawn subagents, which run on the built-ins                                                                                                                                                                                                                                                                                              |
| Settings              | `env.CLAUDE_CODE_THRIFTY_SONIC=0`, which is not in the env-var reference ([env-vars](https://code.claude.com/docs/en/env-vars)) and was added with no explanation in `5fce3f9`                                                                                                                                                                                                                                  |
| Cloud bootstrap       | No `SessionStart` hook. Typecheck and tests need built libs (`dist/*.d.ts`), so each cloud session works that out on its own                                                                                                                                                                                                                                                                                    |

## 2. Findings, ranked

### P0. The per-app `AGENTS.md` files never load on their own

Claude Code reads `AGENTS.md` only when there is no `CLAUDE.md` in the working directory or above it. This repo has a root
`CLAUDE.md`, so the default mode (`claude-md-or-agents-md`) reads `CLAUDE.md` files only. The docs say this exact
setup is a trap: _"A `CLAUDE.md` that tells Claude in words to read `AGENTS.md`: Claude sees `AGENTS.md` only if it
decides to open the file."_ ([memory § Remove an earlier AGENTS.md workaround](https://code.claude.com/docs/en/memory#remove-an-earlier-agentsmd-workaround)).
The switch to read both (`claude-md-and-agents-md`) is honored only in user or managed settings, not in the repo.

Fix, which keeps `AGENTS.md` as the one file Codex and other agents share:

`CLAUDE.md`, first line:

```text
@AGENTS.md
```

`apps/server/CLAUDE.md` (the same one line for client, worker and cli):

```text
@AGENTS.md
```

A root import loads at launch (+~1.3 K tokens). Nested `CLAUDE.md` files load **on demand**, the first time Claude reads
or edits a file in that subdirectory, and reload on demand after compaction ([memory § How CLAUDE.md files load](https://code.claude.com/docs/en/memory)).
So a client-only session never pays for the 30 KB server file.

Follow-up: the docs target **under 200 lines per instruction file** ([memory § Write effective instructions](https://code.claude.com/docs/en/memory)).
Server (426) and client (358) are about twice that. Move sections that matter only for part of an app into
path-scoped rules, which load only when a matching file is touched:

`.claude/rules/server-routes.md`:

```text
---
paths:
  - "apps/server/src/routes/**/*.ts"
---

# Route conventions

…the routes section moved from apps/server/AGENTS.md…
```

Rules are Claude-only. To keep other agents in step, leave a one-line pointer in the `AGENTS.md`.

### P0. Production connectors load into every coding session

`docs/agents/mcp-servers.md` says Supabase, Render and Grafana are personal servers, _"use them only when a task explicitly
calls for it"_. But the project allowlist lets them in, so every session loads their tool names and instructions (Grafana
alone has ~140 tools and a long instruction block). It is also a safety risk: Render has no read-only mode.

Tool definitions are deferred by default, so only names and server instructions cost context
([costs § Reduce MCP server overhead](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)). The cost still
lands in every session and every subagent.

Options, best first:

1. **Cloud environments:** make a default "dev" environment with `ENABLE_CLAUDEAI_MCP_SERVERS=false` (it _"stops Claude
   Code from fetching claude.ai MCP servers"_, [env-vars](https://code.claude.com/docs/en/env-vars)), and a separate "ops"
   environment that keeps them for incident and deploy work.
2. **Repo-wide:** `"disableClaudeAiConnectors": true` in `.claude/settings.json`. _"A checked-in project
   `.claude/settings.json` can opt a repository out of those connectors"_ ([settings-reference](https://code.claude.com/docs/en/settings-reference#disableclaudeaiconnectors)).
   This is all or nothing, so check first that the GitHub tools a cloud session needs do not come in as a claude.ai connector.
3. **Per connector:** drop `Grafana_Cloud`, `Supabase`, `Render` (and `Claude_Docs` if unused) from the project
   `allowedMcpServers`. That list _"blocks any server that doesn't match an entry wherever it's defined, including … servers
   from claude.ai"_, and entries merge across files, so you can add one back in user settings when you need it.

Also:

- **`redis-local` in cloud sessions** points at `localhost:6380`, where cloud sessions have no Redis. Disable it there with
  `disabledMcpjsonServers` or the environment, or start it only when compose runs.
- **Pin the `npx`/`uvx` servers** (`shadcn@latest`, `@playwright/mcp@latest`, `redis-mcp-server@latest`). `@latest`
  re-resolves on every start: it is slower and a supply-chain risk.
- **Prefer CLIs over MCP where one exists:** _"Tools like `gh` … are still more context-efficient than MCP servers because
  they don't add any per-tool listing"_ ([costs](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)).

### P1. Synced claude.ai skills tax every session

The Spotify, Strava, `morning` and `post-creator` skills sync from the claude.ai account into every cloud session
([skills § Where synced skills load](https://code.claude.com/docs/en/skills#where-synced-skills-load)). Each one adds
its description to the skill listing. That listing has a budget of 1% of the context window; when it overflows, Claude
Code drops descriptions, starting with the least-used skills ([skills § Skill descriptions are cut short](https://code.claude.com/docs/en/skills#skill-descriptions-are-cut-short)).

- Locally: `"syncClaudeAiSkills": false` and `"syncClaudeAiPlugins": false` in `~/.claude/settings.json` or
  `.claude/settings.local.json`. A repository can't set these for you.
- Repo-wide, keeping them on claude.ai: hide them by name with `skillOverrides` in `.claude/settings.json`. Values:
  `"off"`, `"name-only"`, `"user-invocable-only"`. Check the result with `/skills` and `/context`: synced names carry an
  `anthropic-skills:` prefix, and the docs don't say whether overrides match that prefix.

```json
{
  "skillOverrides": {
    "spotify-fresh-picks": "off",
    "spotify-more-like-this": "off",
    "spotify-playlist": "off",
    "spotify-podcasts": "off",
    "spotify-recent-listening": "off",
    "spotify-similar": "off",
    "strava-progress-tracker": "off",
    "strava-run-analyzer": "off",
    "morning": "off",
    "post-creator": "off",
    "migrate-to-shoehorn": "name-only"
  }
}
```

### P1. Cheap subagents for verification, smart main model for judgment

The docs back this pattern directly: _"Delegate verbose operations to subagents … the verbose output stays in the
subagent's context while only a summary returns"_ and _"For simple subagent tasks, specify `model: haiku`"_
([costs](https://code.claude.com/docs/en/costs#delegate-verbose-operations-to-subagents)). Two facts from
[sub-agents](https://code.claude.com/docs/en/sub-agents) matter here:

- With a subscription, the built-in **Explore runs on Opus**, whatever your main model. A project agent named `Explore`
  overrides it and keeps its own `model`.
- `omitClaudeMd: true` (v2.1.271+) skips `CLAUDE.md` at startup. A test runner doesn't need the repo's prose rules.

Proposed `.claude/agents/`:

`.claude/agents/verifier.md`:

```text
---
name: verifier
description: Runs lint, typecheck and tests for the packages a change touches and returns only the failures. Use after implementing a change, before committing, and whenever a check needs running. Never edits files.
tools: Bash, Read, Grep, Glob
model: haiku
effort: low
maxTurns: 12
omitClaudeMd: true
---

Run, from the repo root, only what the caller names (default: all three for the changed packages):

- `pnpm run lint`
- `pnpm turbo run typecheck --filter=...[origin/main]`
- `pnpm turbo run test --filter=...[origin/main] --output-logs=errors-only`

Report at most 40 lines: per failing check, the file:line, the rule or assertion, and the first relevant error line.
If everything passes, reply `ALL GREEN` plus the commands you ran. Do not fix, edit, or speculate about causes.
```

`.claude/agents/Explore.md` (replaces the Opus-backed built-in):

```text
---
name: Explore
description: Read-only codebase search. Use to locate code, trace a call path, or answer "where is X" without loading files into the main context.
tools: Read, Grep, Glob, Bash
model: sonnet
effort: medium
---

Find what the caller asked for and return paths with line numbers and a short explanation. Quote only the lines that
answer the question. Never edit files.
```

`.claude/agents/doc-researcher.md` (backs the `research` skill and library lookups):

```text
---
name: doc-researcher
description: Looks up current library or API documentation (Context7, better-auth, langchain-docs, WebFetch) and returns the facts with source links.
tools: Read, Grep, Glob, WebFetch, WebSearch, mcp__context7__*, mcp__better-auth__*, mcp__langchain-docs__*
model: sonnet
maxTurns: 20
---

Answer from primary docs only and cite every URL. Report the version the facts apply to. Under 300 words.
```

How to use them in the Matt Pocock flow: `/implement` already says to run typecheck and tests "regularly". Add one line to
the repo `AGENTS.md`: _"Delegate lint/typecheck/test runs to the `verifier` subagent; read only its summary."_ For
`code-review`, its two axes can run on a Sonnet reviewer agent instead of the session model. Ask for it in the prompt,
because the skill is vendored and editing it breaks `npx skills update`.

How far to trust Haiku: community reports agree that Haiku is fine for **running** checks and summarizing failures, and
unreliable for **fixing** non-trivial bugs. One public set of 163 coding runs with hidden tests found where it falls
behind Opus ([dev.to](https://dev.to/jaehyun_cho_0dff271e0d2e5/i-tried-to-find-where-claude-haiku-stops-being-good-enough-for-coding-it-took-a-real-bug-to-find-17g7)).
Example setups: [Opus orchestrator with Haiku test-runner (PR)](https://github.com/spignotti/berlin-lst-downscaling/pull/102),
[claude-agent-team](https://github.com/sysrootix/claude-agent-team). Keep edits on the main model.

### P1. Two other ways to mix models (official)

- **Advisor tool:** a cheaper main model that consults a stronger one at decision points. Use `/advisor opus` or the
  `advisorModel` setting. Documented pairings include _Sonnet main + Opus advisor_: _"Sonnet handles routine work and
  escalates planning, ambiguous failures, and completion checks to Opus"_. Toggling it **does not** break the prompt
  cache ([advisor](https://code.claude.com/docs/en/advisor)). Suggested split: Opus main for `/grill-with-docs`,
  `/to-spec`, `/wayfinder`. For a well-specified `/implement` ticket, Sonnet 5.5 main + Opus advisor.
- **Dynamic workflows** for fan-out jobs (Knip clean-ups, codebase audits, multi-file migrations): the script holds the
  intermediate results, so _"Claude's context holds only the final answer"_, and you can ask for a smaller model per stage.
  Set `workflowSizeGuideline` to bound the agent count ([workflows](https://code.claude.com/docs/en/workflows)).

Cache rule for all of these: a model switch mid-session reprocesses the whole conversation uncached. So does a skill
whose frontmatter sets `model`. Spawning a subagent does not, and neither does toggling the advisor
([prompt-caching](https://code.claude.com/docs/en/prompt-caching#switching-models)). So **never add `model:` to a skill
in this repo**. Use `context: fork` plus `agent: verifier` (or another agent) instead, and pick the model and effort at
the start of a session.

### P1. Hooks: keep the edit loop cheap, put back-pressure at Stop

**The current `PostToolUse` lint hook grows with the diff.** It runs `eslint --fix` on every changed `.ts` file after
every edit, Markdown edits included. Late in a ticket that is many files per edit, and the typed ESLint config makes each
run slow. Proposed split:

1. `PostToolUse`: lint and check comments on **the edited file only**. In `lint-changed-files.sh`, exit early unless
   `$edited` ends in `.ts`, `.tsx`, `.js` or `.jsx`, then run `pnpm -s exec eslint --fix --no-warn-ignored "$edited"`
   instead of linting the whole `git diff` list. The hook `if` field can also narrow when a hook runs, but the docs call
   it best-effort ([hooks](https://code.claude.com/docs/en/hooks)), so keep the check in the script.

2. A **`Stop` hook as back-pressure**: when Claude tries to finish with code changes, run typecheck for the affected
   packages. If it fails, return `{"decision":"block","reason":"<first 40 error lines>"}` so Claude keeps going. Guard with
   `stop_hook_active` and stay under the 8-continuation cap so it can't loop forever ([hooks § Stop](https://code.claude.com/docs/en/hooks)).
   This "sensor" layer is what harness-engineering write-ups mean by computational feedback before human review
   ([ShipWithAI guide](https://shipwithai.io/blog/claude-code-harness-engineering-guide/), [DEV](https://dev.to/shipwithaiio/the-complete-claude-code-harness-engineering-guide-5-layers-8-deep-dives-3d4j), [arXiv study of 11 harnesses](https://arxiv.org/abs/2609.00006)).

**Trim test and log output before it reaches context.** The docs give a `PreToolUse` example that rewrites a test command
through `updatedInput` so it keeps only failures ([costs § Offload processing to hooks](https://code.claude.com/docs/en/costs#offload-processing-to-hooks-and-skills)).
`PostToolUse` can also replace a result through `updatedToolOutput`. The cheaper first step for this repo is to change
the documented commands in `AGENTS.md`:

```bash
pnpm turbo run test --output-logs=errors-only          # turbo prints only failing tasks' logs
pnpm --filter @nebula-chat/server exec vitest run --reporter=dot path/to/file.test.ts
```

**Cloud bootstrap:** a `SessionStart` hook that runs only when `$CLAUDE_CODE_REMOTE` is `"true"`. It runs
`pnpm install --frozen-lockfile && pnpm build:libs` so typecheck and tests work from turn one. The bundled
`session-start-hook` skill scaffolds it. Add a second `SessionStart` matcher on `compact` that re-prints the branch and
ticket number after compaction ([context-window § What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction)).

**Optional, third-party:** [RTK](https://mintlify.com/rtk-ai/rtk) is a `PreToolUse` Bash rewriter that compresses
`git`/test/lint output. The maintainers report 60–90% savings, but it only sees Bash, not Read/Grep, and it can drop detail
you need. Try it project-local before installing it globally ([firstaimovers review](https://radar.firstaimovers.com/rtk-claude-code-install-guide-2026), [DeployHQ list](https://www.deployhq.com/blog/free-github-repos-for-claude-code)).
Install from `github.com/rtk-ai/rtk`: `cargo install rtk` fetches a different crate.

### P2. Smaller settings

- **Remove or document `CLAUDE_CODE_THRIFTY_SONIC`.** It is not in the env-var reference. An undocumented flag in a shared
  settings file is a silent behavior change for every contributor.
- **Add compaction guidance to `CLAUDE.md`.** The docs support a `# Compact instructions` section
  ([costs § Manage context proactively](https://code.claude.com/docs/en/costs#manage-context-proactively)). For example:
  _"keep the ticket number, the branch, failing test names and the files changed; drop exploration output."_
- **Put the most important rules at the top of each long skill.** After compaction, each invoked skill keeps only its
  first 5,000 tokens, and all skills together share 25,000 ([skills](https://code.claude.com/docs/en/skills)).
- **TypeScript LSP, local only:** `npm i -g typescript-language-server typescript`, then
  `/plugin install typescript-lsp@claude-plugins-official`. Claude then sees type errors after each edit and navigates by
  symbol instead of grep-and-read. Cloud sessions don't start plugin language servers
  ([code-intelligence](https://code.claude.com/docs/en/plugins/code-intelligence)).
- **`bashOutputMaxChars`:** leave it at the 30 K default. Raising it makes verbose output more expensive, and the
  `verifier` agent is the better place for big logs.

### P2. Keep the Matt Pocock skills in sync with upstream

Upstream ([mattpocock/skills](https://github.com/mattpocock/skills)) now names the glossary `GLOSSARY.md`, not
`CONTEXT.md`, and has `pr` and `teach` skills this repo doesn't have. This repo also vendors skills that upstream lists
under `in-progress` or no longer lists (`writing-*`, `claude-handoff`, `implement-spec`). Upstream warns not to install
both the plugin (`claude plugin install mattpocock-skills@claude-plugins-official`) and the file copies, or every skill
loads twice. Keep the file copies, which this repo customizes, and run `npx skills@latest update` deliberately, in its
own PR. Upstream also advises starting with a few model-invoked skills, because model-invoked skills grow the listing.

## 3. Measure before and after

None of these can run from a cloud session on your behalf. Run them in a local terminal on this repo:

| Command                  | What it tells you                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/context`               | Live breakdown: system prompt, MCP names, skills listing, memory files                                                                  |
| `/usage` (press `d`/`w`) | Usage attributed to skills, subagents, plugins and individual MCP servers, rows of recommendations, `f` to apply; prompt-cache hit rate |
| `/doctor`                | Cost of the skill listing and its biggest contributors                                                                                  |
| `/skill-doctor`          | Skills you never use, so you can turn them off                                                                                          |
| `/doctor prompt-audit`   | Stale or conflicting text in `CLAUDE.md`, `AGENTS.md`, rules, skills, agents                                                            |
| `/insights`              | Friction across your recent sessions                                                                                                    |

Sources for this table: [costs](https://code.claude.com/docs/en/costs), [skills](https://code.claude.com/docs/en/skills),
[memory § Audit your instruction files](https://code.claude.com/docs/en/memory).

## 4. Suggested order

1. `@AGENTS.md` imports (root and per app) and `CLAUDE_CODE_THRIFTY_SONIC`. One small PR, biggest quality win.
2. Connector hygiene: a cloud "dev" environment without claude.ai connectors, a trimmed allowlist, pinned MCP versions.
3. `.claude/agents/verifier.md`, `Explore.md`, `doc-researcher.md` plus the one-line delegation rule in `AGENTS.md`.
4. Hook split (edited-file lint, `Stop` typecheck gate) and the cloud `SessionStart` bootstrap.
5. Split the server and client `AGENTS.md` into path-scoped `.claude/rules/`.
6. Re-measure with `/usage` and `/context` after a week of normal tickets.
