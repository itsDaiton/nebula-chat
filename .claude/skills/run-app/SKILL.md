---
name: run-app
description: Use when starting the app locally to see a change working, take a screenshot, or reproduce a bug end to end.
---

# Run the app

The setup steps are in `docs/getting-started.md` → Quick start: env files, infrastructure, migrations, then the server, worker and client. Follow them; this skill adds only what an agent running them needs.

- **Containers.** The docs use `podman compose up -d`. Where only Docker exists (cloud sessions), `docker compose up -d` reads the same `docker-compose.yml`. Done when Postgres answers on `:5332` and Redis on `:6380`.
- **Libs first.** Run `pnpm build:libs` on a fresh checkout: the apps import the libs' built `dist/`.
- **Background the dev servers.** Start the server, worker and client as background processes, each logging to its own file in your scratch space, and read those logs when something fails.
- **Ready means answering.** The server is up when `curl -sf http://localhost:3000/health` succeeds, and the client when `http://localhost:5173` returns HTML. Chat replies need the worker too, and the worker needs an `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Without a key, say so and verify only the non-chat flows.
- **Drive the UI** with Playwright at `http://localhost:5173`.
- **Stop** every process you started when you are done.
