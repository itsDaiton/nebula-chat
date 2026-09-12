---
status: accepted
supersedes: ADR-0001 (partially — the specialized agent roster and hook-based lint gate stand; the ADR-authoring/curation portion is replaced)
---

# Retire the ADR-gate agents in favor of a skill-driven decision-capture flow

ADR-0001 introduced a per-change ADR gate enforced by dedicated `adr-author`, `docs-curator`, and `code-reviewer` subagents, invoked by every builder agent before non-trivial edits. Since then, globally-installed engineering skills (`/grill-with-docs`, `/to-spec`, `/to-tickets`, `/implement`, `/domain-modeling`, `/code-review`) became available and cover the same ground: `/domain-modeling` authors ADRs and maintains `CONTEXT.md` as part of `/grill-with-docs`/`/to-spec`, upstream of any ticket reaching an implementer, and `/code-review` is a drop-in replacement for the `code-reviewer` agent, already run automatically inside `/implement`.

We removed `adr-author.md`, `docs-curator.md`, and `code-reviewer.md`, reworded the remaining builder agents' "halt and invoke `adr-author`" guardrails to a non-blocking "flag if a backing ADR is clearly missing" (since the gate now runs earlier, before tickets exist, not per-edit), and wired the main flow into `CLAUDE.md`'s Agent skills section so it's the default rather than something each session has to remember to invoke. We picked this over keeping the three agents as a redundant fallback, because two decision-capture and two review paths for the same job (agent + skill) is the kind of drift that made the old workspace bloated and confusing to reach for.
