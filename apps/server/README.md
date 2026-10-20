# Nebula Chat Server

The backend is a Fastify 5 API for Nebula Chat.

It is responsible for:
- Streaming AI chat responses from OpenAI
- Persisting sessions/messages in PostgreSQL via Drizzle
- Caching chat streams in Redis
- Storing Profile images in Supabase Storage (optional)
- Exposing OpenAPI docs (`/docs`, `/openapi.json`)

## Prerequisites

- Node.js `26.8.2` (repo `.nvmrc`)
- pnpm `>=12` (pinned to `12.4.1` via `packageManager`)
- Podman (recommended for local PostgreSQL + Redis)
- OpenAI API key

## Local setup

1. Install dependencies from monorepo root:

   ```bash
   pnpm install
   ```

2. Create backend env file:

   ```bash
   cp apps/server/.env.example apps/server/.env
   ```

3. Configure required variables in `apps/server/.env` (the server holds no LLM keys; those go in
   `apps/worker/.env`, see [the worker's AGENTS.md](../worker/AGENTS.md)):
   - `SERVER_URL` (for local use: `http://localhost:3000`), allowed as a CORS origin (e.g. for Swagger UI at `/docs`)
   - `CLIENT_URL` (for local use: `http://localhost:5173`)
   - `DATABASE_URL` and `REDIS_URL` (for the local containers, build them from the credentials in the root `.env`)

   The `dev`, `start` and `db:*` scripts load this file through `dotenvx run`; a variable already set in your shell
   wins over the file. Running `node` or `tsx` directly skips it.

4. Start local PostgreSQL + Redis. Their credentials live in a separate root `.env`
   (see `.env.example` in the repo root), which `podman compose` reads automatically:

   ```bash
   cp ../../.env.example ../../.env
   podman compose -f ../../docker-compose.yml up -d
   ```

5. Run DB migrations:

   ```bash
   cd ../..
   pnpm --filter @nebula-chat/db db:migrate
   ```

6. Start backend in watch mode:

   ```bash
   pnpm --filter @nebula-chat/server run dev
   ```

Server starts on `http://localhost:3000` by default.

## Profile image storage (optional)

Profile image uploads store one processed 256×256 WebP per upload in a public Supabase Storage
bucket ([ADR-0022](../../docs/adr/0022-supabase-storage-for-profile-images.md)). Only the server
writes to it, with the project's secret key; the browser only loads the public image URL.

Set all three variables, or none. With none, the server boots with uploads switched off: the
Settings page hides **Upload image**, and removing an image still works. Setting only some fails
env validation at boot.

| Variable               | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `SUPABASE_URL`         | The project URL, `https://<project-ref>.supabase.co` (Project Settings → API)          |
| `SUPABASE_SECRET_KEY`  | A secret key (`sb_secret_…`, Project Settings → API Keys). Server-only; never logged   |
| `PROFILE_IMAGE_BUCKET` | `profile-images-dev` for local development, `profile-images` in production             |

Both buckets already exist in the `nebula-chat` Supabase project, with the same settings:
**public**, allowed MIME types `image/webp` only, a file size limit of 1 MB, and **no access
policies** (the secret key bypasses them, and Supabase's policies can't identify better-auth
users anyway). To recreate one, use Storage → New bucket in the dashboard with those settings, or
run in the SQL editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images-dev', 'profile-images-dev', true, 1048576, array['image/webp']);
```

**On Render**, set the three variables on the `nebula-chat-server` service (Environment), with
`PROFILE_IMAGE_BUCKET=profile-images`, then redeploy. `sharp` installs from prebuilt binaries for
Render's Linux x64 Node runtime, so the build needs nothing extra.

## Scripts

Run from the repo root:

```bash
pnpm --filter @nebula-chat/server run dev
pnpm --filter @nebula-chat/server run build
pnpm --filter @nebula-chat/server run start
pnpm --filter @nebula-chat/server run typecheck
pnpm --filter @nebula-chat/db db:generate
pnpm --filter @nebula-chat/db db:migrate
pnpm --filter @nebula-chat/db db:push
pnpm --filter @nebula-chat/db db:studio
```

## API docs

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Health check

`GET /health` returns liveness plus the current UTC timestamp:

```json
{ "status": "ok", "timestamp": "2026-09-12T18:09:35.000Z" }
```

This is the path Render polls (`healthCheckPath` in `render.yaml`).
