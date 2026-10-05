# ADR-0022: Profile images live in Supabase Storage, uploaded through the server

- **Status:** Proposed — profile images epic (ticket to follow)
- **Date:** 2026-10-05
- **Deciders:** @itsDaiton
- **Related:** [ADR-0010](./0010-better-auth-for-auth.md) — better-auth owns the `users` table and its `image` field

## Context

Registered users get a Profile image (see `CONTEXT.md`), either uploaded in Settings or supplied by a social provider. better-auth already models the result as the nullable `users.image` URL, sets it from the OAuth profile when a social user is created, and lets `updateUser` change it. It does not accept uploads or store files. The project had no file storage of any kind.

Production Postgres already runs on a Supabase project (`nebula-chat`), so Supabase Storage is available without a new vendor or account. Its access policies key off Supabase Auth, which this app does not use: Supabase cannot tell which better-auth user is making a request.

## Decision

**Profile image files live in a public Supabase Storage bucket; the server is the only thing that writes to it, and the database holds references only.**

1. The browser uploads to our server (`modules/profile-image/`), never to Supabase. The server checks the type (JPEG, PNG or WebP) and size (5 MB), center-crops and resizes to one 256×256 WebP with `sharp`, re-encoding every time (strips EXIF/GPS, disarms crafted files), and puts it in the bucket with the project's secret key. The key never reaches the client.
2. The bucket is **public**. Each upload gets a fresh random path (`<userId>/<random>.webp`), so URLs are unguessable and immutable, cache well on Supabase's CDN, and never serve a stale image after a change. The bucket itself only accepts WebP up to about 1 MB.
3. `users.image` keeps the public URL, which better-auth already ships to the client on the session. A new nullable, server-only storage key column on `users` (a better-auth extra field clients cannot write) records that the current image is our upload; it is how the old file gets deleted on replace or remove. An `image` with no key is a provider URL, hotlinked and never copied.
4. Storage sits behind a small `ProfileImageStore` interface (`put`, `delete`) inside the server, with a Supabase implementation. Tests use an in-memory store; local dev uses a `profile-images-dev` bucket and production `profile-images`, chosen by env. Without the Supabase env vars the server still boots with uploads disabled.
5. Uploads are Registered-only and limited to 10 per user per hour, counted in Redis.

## Alternatives Considered

- **Bytes in Postgres** (a `profile_images` table served by our own endpoint) — no new moving parts, but grows the database, puts image traffic on the API server and gives up a CDN. Rejected once Supabase Storage turned out to be in the same project at no extra cost.
- **Another S3-compatible store (Cloudflare R2)** — the standard answer, but a new vendor, credentials and bucket policy for no gain over a store we already have.
- **Hosted upload service (UploadThing, Cloudinary)** — least code, most lock-in, another account and SDK.
- **Browser uploads directly via signed upload URLs** — saves a hop, but processing happens on the server anyway, so the bytes would travel twice and an unprocessed original would sit in the bucket.
- **Private bucket with signed URLs** — links expire and must be re-issued, defeating caching, for a picture with nothing to hide.

## Consequences

- **Positive:** no new vendor; the client reads the image from the session with no extra request; files are uniform and small; the store is swappable behind one interface.
- **Negative / Tradeoffs:** the app now depends on the Supabase project for more than Postgres. Image bytes cross the API server on upload. A file whose delete fails becomes an orphan in the bucket. When account deletion is built, it must delete the user's file too.
- **Neutral:** removing a Profile image falls back to initials, not to a provider picture, since the provider URL is not kept once an upload replaces it.

## Implementation Notes

- Migrations required: one nullable storage-key column on `users`. Buckets are provisioned outside Drizzle, which also runs against the local Docker Postgres that has no `storage` schema.
- New env: Supabase project URL, secret key and bucket name, all optional.
- OpenAPI/contract impact: new upload and remove routes under the server's own API (not better-auth's hidden `/api/auth/*`).
