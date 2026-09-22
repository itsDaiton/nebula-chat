<!--
Nebula-chat ticket — the single template for every issue. Humans: this pre-fills a new issue; keep the
`## headings` and fill each one. Agents (/to-tickets, /triage, by hand): fill THIS skeleton — it is
authoritative, no matter what a skill's built-in template says.

A ticket is a PRE-IMPLEMENTATION artifact an agent may pick up with no other context. Write it that way:
  • Present/imperative tense — never past tense or a "delivered/changelog" voice, and don't cite an ADR as
    already decided (the ADR comes from the same grilling session, separately).
  • Detailed enough to implement cold: name the files/modules/patterns and the seams to test. No code
    snippets or line numbers — they go stale. More detail is better than less; err long.
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

<!-- 2–5 sentences: what is true once this ships that isn't today, and the shape of the change. -->

## Background & problem

<!--
The long section — explain everything an implementer needs to understand the "why" without prior context.
Describe the current state in detail, what breaks or is missing, who hits it and how it costs us, the
constraints and prior decisions that bound the solution, and any relevant history. Present tense. Don't be
terse here; this is where the grilling that produced the ticket gets written down.
-->

## Scope

| Area / package | What changes |
| -------------- | ------------ |
|  |  |

## Acceptance criteria

- [ ]
- [ ]
- [ ] Tests cover the behaviour at its seam(s)

## Technical approach & notes

<!--
The files/modules/patterns/gotchas a cold implementer needs — go into detail: name the files to add/change,
the pattern to follow, the interfaces and their shapes, the ordering that matters, and the traps to avoid.
Name the files; no code snippets or line numbers.
-->

## Testing

<!--
The test strategy: which seams to test and how — what to mock vs. keep real, the test types (Vitest unit /
`app.inject()` route tests / MSW-mocked client), and what deliberately is NOT tested and why. See
.claude/skills/tdd/SKILL.md.
-->

## Depends on

- None (can start immediately) <!-- or one bullet per blocker, each LINKING the issue on GitHub: `- #NN — what it provides` -->

## Out of scope

<!-- Explicit non-goals, where they matter. Omit the section if there are none. -->
