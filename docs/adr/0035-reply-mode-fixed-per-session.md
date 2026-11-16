# ADR-0035: Reply mode is fixed per Session and stored on it

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** @itsDaiton
- **Related:** [ADR-0015](./0015-run-model-intake-orchestrator-loop-output.md) — amended: a Run is no longer opted into per message

## Context

A Run was opted into per message: the composer's Run toggle reset after every send, so one Session could
mix Direct replies and Runs. The client then had to juggle two Inspector tabs, a Model picker that applied
to some messages and not others, and a Run tab that lost its selection on every route change.

## Decision

1. **A Session has one Reply mode, `direct` or `run`, chosen with its first Message and never changed.**
2. **It is a `replyMode` column on `sessions`, set by `createSession`.** It is not derived from Messages:
   a Run that fails before saving an assistant Message leaves no `runId` behind, and only the server can
   stop another tab or the CLI from sending the other mode.
3. **The send takes its mode from the Session.** `sendMessage`'s `mode` is ignored for one release, then
   removed; a send the Session's mode cannot serve (a Guest's Session can only be `direct`) is refused.
4. **Existing Sessions are backfilled** as `run` when they hold any Run, otherwise `direct`.

## Consequences

The client reads the mode from the Session: the Run toggle works only on a new chat, the Model picker is
disabled in a Run Session, and the Inspector shows the Run view or the Session view, never both as tabs.
