# ADR-0028: Account deletion starts a 30-day Pending deletion ending in a Purge; Sessions are archived, never deleted

- **Status:** Accepted — Pending deletion, restore and sign-in handling are implemented (NEB-544); the daily Purge runs in the worker (NEB-545)
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0010](./0010-better-auth-for-auth.md) — account deletion through better-auth; [ADR-0031](./0031-worker-runs-all-background-jobs.md) — where the Purge runs

## Context

Account deletion today removes the User and cascades to every Session and Message at once. The app
now wants data to be kept: Sessions only ever archived, and deletion recoverable. But keeping a
deleted account's conversations indefinitely conflicts with the GDPR right to erasure (Art. 17) for
an EU-hosted app with EU users, and a "Delete account" button that deletes nothing would mislead.
Usage history (Model calls) should not change when a heavy user leaves.

## Decision

1. **Account deletion puts the User into Pending deletion for 30 days.** Every auth session is revoked, and the User is hidden and cannot act.
   - Signing in again asks whether to restore the account; a no signs them out.
   - Signing up with the same email points to signing in instead.
   - An Admin can restore the User.
2. **After 30 days, the Purge.** The User's Sessions and Messages are erased. Their Model calls are kept without anything that identifies them, so usage totals don't change. Then the email is free.
3. **Guests with no activity for 30 days are Purged too.** Without credentials, nobody can ever reach a Guest's data again.
4. **Sessions are never deleted by their owner.** The owner can archive and restore them. Admins see archived Sessions.
5. **The Purge is a daily background job** in the worker (ADR-0031).

## Consequences

- Rows carry a pending-deletion timestamp; reads exclude pending and purged Users.
- The Purge is the only code path that erases user content, which makes it the one place to audit.

## Alternatives considered

- **Archive accounts forever, with a re-signup creating a new User.** Simplest, but very likely unlawful after an erasure request.
- **Archive forever, with a re-signup reconnecting the old data.** Whoever later controls the email inherits the history.
- **Erase immediately (today's behaviour).** No recovery from a mistaken deletion, and usage totals shrink retroactively.
