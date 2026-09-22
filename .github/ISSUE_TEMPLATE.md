<!--
Nebula-chat ticket — the single template for every issue. Humans: this pre-fills a new issue; keep the
`## headings` and fill each one. Agents (/to-tickets, /triage, by hand): fill THIS skeleton — it is
authoritative, no matter what a skill's built-in template says.

A ticket is a PRE-IMPLEMENTATION artifact an agent may pick up with no other context. Write it that way:
  • Present/imperative tense — never past tense or a "delivered/changelog" voice, and don't cite an ADR as
    already decided (the ADR comes from the same grilling session, separately).
  • Detailed enough to implement cold: name the files/modules/patterns and the seams to test. No code
    snippets or line numbers — they go stale.
  • Title: `type(scope): summary`. Once this issue has a number, edit the title to
    `type(scope): NEB-<n> summary` (feat/fix only; `!` for a breaking/major change). It becomes the PR title.
  • Labels: `needs-triage` is applied automatically. Triage adds area/lib labels (`app:server`, `app:client`,
    `lib:db`, …) and a state (`ready-for-agent` / `ready-for-human` / `needs-info`).
  • Full guidance: docs/agents/issue-tracker.md#ticket-anatomy. A validate-ticket CI check flags anything
    that doesn't match this shape.
-->

## Change type

`feat` <!-- one of: feat | fix | feat! | fix! -->

## Summary

<!-- One or two sentences: what is true once this ships that isn't true today. -->

## Background & problem

<!-- The current state and why it isn't good enough — what breaks or is missing today. Present tense. -->

## Scope

| Area / package | What changes |
| -------------- | ------------ |
|  |  |

## Acceptance criteria

- [ ]
- [ ]
- [ ] Tests cover the behaviour at its seam(s)

## Technical approach & notes

<!-- The files/modules/patterns/gotchas a cold implementer needs. Name the files; no code or line numbers. -->

## Depends on

- None (can start immediately) <!-- or a bullet per blocker, linking it: `- #NN — what it provides` -->

## Out of scope

<!-- Explicit non-goals, where they matter. Omit the section if there are none. -->
