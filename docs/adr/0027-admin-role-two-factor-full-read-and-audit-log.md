# ADR-0027: Admin is a role on a Registered user — better-auth admin and two-factor plugins, full read access, every action and read audited, behind our own admin API

- **Status:** Proposed — to be implemented by the roles and accounts epic
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0010](./0010-better-auth-for-auth.md) — better-auth as the auth substrate (extended here); [ADR-0020](./0020-runtime-log-level-switching.md) — the operator token

## Context

The app has Guests and Registered users, and a token-holding Operator who is explicitly not a User. Running the app now needs people who sign in and administer it: see usage, manage Users, read Sessions and Runs. The glossary had said "there is no admin role". The admin surface will grow (a dashboard, a CLI), so the data model should allow full read access rather than aggregates only.

## Decision

1. **Admin is a role, not a kind of account.** A verified Registered user may hold `role: admin` (better-auth's **admin plugin**, which also brings `banned`, `banReason` and `banExpires`). An Admin keeps chatting like any User. Guests and unverified users can never hold it. The last Admin cannot demote, ban or delete themselves.
2. **Admins must use two-factor authentication.** This uses better-auth's **two-factor plugin**: TOTP plus one-time backup codes, with no SMS or email codes. Without 2FA enabled, the admin API refuses the request and the dashboard sends the Admin to enrol. Every new Admin auth session asks for the code. Other users may enable 2FA and trust a device for 30 days; Admins cannot trust devices.
3. **Full read access.** Admins can read any User's Sessions, Messages, Runs and Steps.
4. **Everything is audited.** Every Admin mutation (role change, ban, restore) and every content read (opening a User's Session or Run) appends an entry to the **Audit log**. Users are told in Settings that Admins can read their Sessions.
5. **No impersonation.** The plugin's impersonation is disabled: acting as a user would muddle Claims and the Message allowance, and read access already covers support.
6. **Our own `/api/admin/*` module.** It is OpenAPI-documented and writes the Audit log, and it calls better-auth's server API internally. The plugin's HTTP endpoints (`/api/auth/admin/*`) are blocked at the auth gate, so auditing cannot be bypassed and the dashboard and the CLI share one typed API.
7. **The first Admin is granted by an Operator** through an operator-token route. After that, Admins promote others.

## Consequences

- The Operator concept stays: the operator token is how the first Admin is created, and it is the break-glass path when auth is down.
- Owner-only reads (for example the Run inspection endpoint) gain an Admin branch that writes an Audit entry.

## Alternatives considered

- **Admin-only accounts that cannot chat.** Two logins for the same person, and restrictions bolted onto better-auth.
- **Aggregates-only Admin access.** Safer for privacy, but it would cap what the admin surface can ever do; auditing and disclosure were preferred.
- **Using the admin plugin's endpoints directly.** Less code, but no Audit log, no OpenAPI and no knowledge of Pending deletion.
