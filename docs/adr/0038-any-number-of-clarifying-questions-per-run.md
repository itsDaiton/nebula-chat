# ADR-0038: A Run may ask any number of Clarifying questions, one at a time

- **Status:** Proposed
- **Date:** 2026-11-27
- **Deciders:** @itsDaiton
- **Related:** [ADR-0033](./0033-runs-on-langgraph-checkpointer-owns-resume.md) — §6 superseded: "one Clarifying
  question per Run"

## Context

ADR-0033 §6 let the Orchestrator ask one Clarifying question per Run, refusing any later `askUser` call. A Run
that learns from the first answer that it needs a second has to guess instead. The pause, resume, answer claim
and client already handle one wait at a time, so the cap is the only thing in the way, plus a timeout job keyed
by Run that a second wait would collide with.

## Decision

1. **No cap on Clarifying questions.** The Orchestrator's turn cap and token budget bound them, since each ask
   spends an Orchestrator turn; there is no separate question limit.
2. **One question per pause.** Each `askUser` call is one question and one pause, answered by the user's next
   Message. Several calls in one turn run only the first; the rest are refused and the Orchestrator may ask
   again after reading the answer. `run-waiting` keeps its one-question shape.
3. **A question left unanswered ends asking.** After a timeout the Run carries on, refuses later `askUser`
   calls and ends `partial`; a Run whose every question was answered may end `completed`.
4. **The timeout job is keyed by the question**, `clarifying-question-timeout-<questionMessageId>`, so a late
   timeout for one question cannot settle the wait on the next, and a kept or still-active job cannot swallow
   the next one's schedule. The server finds the waiting Run's current question to remove or promote its job.
5. **The prompt sets the bar:** ask whenever the answer would materially change what the Run does or answers,
   never for what the Brief, the conversation or a delegate can find out, and never twice for the same thing.

## Considered Options

- **A configurable question cap:** rejected; the turn cap already makes the loop finite, and a second limit is
  speculative configurability.
- **Several questions in one pause, answered by one Message:** rejected; it changes the `run-waiting` contract
  and makes it ambiguous which part of the reply answers which question.

## Consequences

A Run asking several questions may take up to one timeout per question; ending asking at the first timeout
keeps a Run whose user has left from stacking waits.
