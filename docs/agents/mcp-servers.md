# MCP servers

The repo-root [`.mcp.json`](../../.mcp.json) gives every agent session the same project-scoped MCP servers. It holds no secrets: the only variable is `${NEBULA_MCP_REDIS_URL}`, which has a local default. Interactive Claude Code asks once before enabling project servers; non-interactive and cloud sessions load them without asking, so nothing in this file may reach production.

| Server           | Use it for                                                                                                                                              | Notes                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn`         | Searching, viewing and adding shadcn/ui registry components (the client redesign)                                                                       | Add components through it or the shadcn CLI, never by hand-copying from the website                                                                                       |
| `better-auth`    | Better Auth docs: plugins (admin, two-factor, anonymous, device authorization), hooks, configuration                                                    | Docs only                                                                                                                                                                 |
| `context7`       | Version-specific docs for libraries without their own server: TanStack Router/Query/Table/Virtual, Tailwind CSS, Drizzle, BullMQ, Base UI, Fastify, Zod | Free tier without a key; to raise limits add a personal key with `claude mcp add` at user scope instead of editing this file                                              |
| `langchain-docs` | LangChain, LangGraph and LangSmith guides                                                                                                               | Docs only                                                                                                                                                                 |
| `playwright`     | Driving the locally running client (`http://localhost:5173`) to verify a UI change and capture screenshots for a PR                                     | Headless, isolated, Chromium; local dev servers only (setup below the table)                                                                                              |
| `redis-local`    | Inspecting the **local** Redis: BullMQ queues, reply streams, cache entries                                                                             | Defaults to the compose Redis on `:6380`; set `NEBULA_MCP_REDIS_URL` if yours needs a password (`redis://:<password>@localhost:6380/0`). Never point it at a hosted Redis |

**Versions are pinned.** The `npx`/`uvx` servers use exact versions, so a session never starts a release nobody reviewed. Bump them deliberately, to a release at least two weeks old.

**Playwright setup.** Install its browser once with `npx @playwright/mcp@latest install-browser chromium`. In a cloud session that has a preinstalled Chromium, set `PLAYWRIGHT_MCP_EXECUTABLE_PATH` to it instead. It refuses `file:` URLs, so serve pages over HTTP. Its snapshots go to the git-ignored `.playwright-mcp/`.

**No MCP server, use these instead:**

- **TanStack** has retired its MCP server. Use Context7, or `npx @tanstack/cli search-docs "<query>" --library <router|query|table> --json`. TanStack Charts ships its docs inside the package (`node_modules/@tanstack/charts/docs`): read those for the installed version.
- **Base UI** has no MCP server; Context7 covers it, and [base-ui.com/llms.txt](https://base-ui.com/llms.txt) is the canonical index.
- **The local Postgres** has no reliable MCP server right now (crystaldba's `postgres-mcp` fails to start against current MCP SDKs). Use `psql` against the compose database (`localhost:5332`) or Drizzle Studio, read-only unless the task is a migration.

**Personal servers (not committed).** These need personal credentials and can change production, so they are never added to `.mcp.json`. Add them at user scope (`claude mcp add --scope user …`) or as claude.ai connectors, and use them only when a task explicitly calls for it:

| Service       | Server                                              | Keep it safe                                                      |
| ------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| GitHub        | Remote `https://api.githubcopilot.com/mcp/`         | Prefer the read-only URL (`…/mcp/readonly`) for exploration       |
| Supabase      | Remote `https://mcp.supabase.com/mcp`               | Always add `project_ref=<ref>&read_only=true`                     |
| Render        | Remote `https://mcp.render.com/mcp` with an API key | Has no read-only mode: it can change env vars and trigger deploys |
| Grafana Cloud | Remote `https://mcp.grafana.com/mcp` (OAuth)        | Choose read-only access at consent                                |
| Resend        | Remote `https://mcp.resend.com/mcp`                 | Can send real email; use a test domain                            |

When a new provider joins the stack, check for an official MCP server and add it here, or to `.mcp.json` if it needs no personal credentials and cannot touch production.
