# Nebula Chat

**An AI chat product built to be tried in seconds and trusted in production.**

Open the app and start talking — no sign-up wall. Guests get a free message allowance; registering
(email, Google or GitHub) keeps their history and lifts the limit. Replies stream token by token from
OpenAI or Anthropic models, and every conversation stays in a searchable, archivable history.

🌐 **App:** <https://www.nebula-chat.cz> · **API:** <https://api.nebula-chat.cz>

## Why it's different

- **Zero-friction start.** Guests chat immediately; signing up *claims* their existing conversations
  instead of resetting them.
- **Pick the model per conversation.** Switch between providers without losing the thread.
- **Live, resumable streaming.** Replies keep generating if you drop offline and pick up where they left
  off; a Stop button cancels one mid-flight.
- **Accounts done properly.** Email verification, password reset, social sign-in, profile images,
  sign-out everywhere, and self-serve account deletion with a 30-day grace period.
- **Run like a service.** Token budgets enforced per request, structured logs and traces in Grafana, and an
  operator CLI to change log levels in production without a deploy.
- **More coming.** Orchestrated multi-agent responses are designed ([domain model](./CONTEXT.md)) and next in line.

## How it fits together

```mermaid
flowchart LR
  browser([Browser])
  operator([Operator<br/>nebula CLI])

  subgraph render[Render]
    client["Client SPA<br/>apps/client · static site"]
    server["Server API<br/>apps/server · web service"]
    worker["Worker<br/>apps/worker · web service"]
  end

  subgraph data[Data]
    pg[("Postgres<br/>Supabase")]
    redis[(Redis)]
    storage[("Supabase Storage<br/>Profile images")]
  end

  subgraph vendors[Third parties]
    llm["OpenAI / Anthropic"]
    resend[Resend]
    oauth["Google / GitHub OAuth"]
    grafana["Grafana Cloud<br/>Loki · Tempo"]
  end

  browser -->|loads| client
  browser -->|"/api/* and SSE<br/>auth cookie"| server
  browser <-->|social sign-in redirect| oauth
  operator -->|"/api/internal/*<br/>bearer token"| server
  server --> pg
  server <--> redis
  server -->|upload, delete| storage
  server -->|verification and reset email| resend
  server <-->|code exchange| oauth
  server -.->|"GET /health wake-up"| worker
  worker --> pg
  worker <--> redis
  worker -->|model call| llm
  server -.->|OTLP logs and traces| grafana
  worker -.->|OTLP logs and traces| grafana
```

The browser only ever talks to the **server**, which owns auth and history and relays replies over SSE.
The **worker** owns every model call and takes its jobs off Redis, so slow LLM work never blocks the API
and each side scales on its own. [Architecture deep dive →](./docs/architecture.md)

## Built with

TypeScript end to end: React and Chakra UI on the client, Fastify and Drizzle on PostgreSQL on the server,
BullMQ and Redis Streams for the reply pipeline, LangChain for providers, Better Auth for identity,
OpenTelemetry into Grafana Cloud. A pnpm + Turborepo monorepo with a typed OpenAPI contract between the
apps, unit tests behind an 80% coverage gate, and automated releases.

## Run it locally

You need Node `26.12.1`, pnpm, Podman and an OpenAI or Anthropic API key.

```bash
pnpm install
podman compose up -d
pnpm --filter @nebula-chat/db db:migrate
```

Then start the server, worker and client. [Full setup guide →](./docs/getting-started.md)

## Learn more

| | |
| --- | --- |
| [Architecture](./docs/architecture.md) | Deployment, packages, data model and the flows that cross apps |
| [Authentication](./docs/auth.md) | Sign-in, guests, the message allowance and claiming |
| [Observability](./docs/logging.md) | Logging, tracing and runtime log levels |
| [Decisions](./docs/adr) | Architecture decision records |
| [Domain glossary](./CONTEXT.md) | The language the product and code share |
| [Contributing](./AGENTS.md) | Conventions, git workflow and testing |
