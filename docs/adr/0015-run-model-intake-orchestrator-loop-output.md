# ADR-0015: The Run model — Intake, an Orchestrator tool-calling loop, then an Output Agent; Agents defined in code

- **Status:** Proposed — to be implemented by the nebula-chat 2.0 epic (NEB-349)
- **Date:** 2026-09-22
- **Deciders:** @itsDaiton

## Context

A **Run** answers one user Message by coordinating several LLM executions and tools. The design space ranges from a fixed pipeline to a fully dynamic agent framework where models write each other's prompts. The original 2.0 design doc called for parallel prompts, per-model prompts and tools, delegation, and dependencies between tasks, and warned against building a generic agent framework before concrete requirements exist. A `/grill-with-docs` session chose the shape below. The vocabulary (Run, Agent, Intake Agent, Brief, Orchestrator, Output Agent, Step, Run budget) is defined in `CONTEXT.md`.

## Decision

A Run has three phases:

1. **Intake.** A fixed set of cheap-model **Intake Agents** run in parallel on the input (e.g. language detection and translation, a Session summary). Each returns **structured output**; the outputs are merged into a typed **Brief**. The Session summary replaces raw history for Runs, keeping the strong model's prompt small. A failed Intake Agent leaves a partial Brief instead of failing the Run.
2. **The Orchestrator loop.** A strong-model **Orchestrator** receives the Brief and works in turns using native tool calling. **Each delegate Agent is exposed to it as a tool.** Several tool calls in one turn run in parallel, and later turns express dependencies, so the loop covers parallel, sequential and mixed shapes **without an explicit DAG or plan schema**. The loop ends when the Orchestrator hands off its findings, or when a limit forces the handoff (turn cap, or nearing the **Run budget**), in which case the Run ends `partial`. A delegate Step that fails returns its error to the Orchestrator as the tool result, and the Orchestrator decides what to do.
3. **Output.** An **Output Agent** on a mid-tier model writes the user-facing answer from the Brief and the findings — in the user's detected language — and streams it.

Four constraints bound the model:

- **Agents are defined in code.** Each Agent is a fixed pairing of model, system prompt, allowed tools and parameters, versioned in git. The Orchestrator chooses _which_ Agent and writes its task, but never invents an Agent, a system prompt, a model or a tool grant. Tool access is therefore a static, reviewable fact.
- **Delegation is one level deep.** Only the Orchestrator delegates. Delegate Agents may call tools but not other Agents. The Orchestrator itself calls no tools directly: every tool call is attributed to a delegate's Step.
- **The Session's Model does not apply to Runs.** It governs Direct replies only; every Agent's model is fixed by the application, which keeps Runs reproducible.
- **Runs are opted into per message and only by Registered users.** Guests get Direct replies only.

## Consequences

- The worker's LLM layer must add native tool calling and structured output. The current chat chain supports neither.
- "Maximum orchestration depth" is fixed at one, and Run cost is bounded by turn cap × parallel calls per turn × the Run budget.
- Every Step has a single owner (an Agent or a tool call within an Agent), which keeps the Run inspectable as a flat list of turns.
- Letting the Orchestrator create Agents at run time, or letting users configure Agents, becomes an explicit future decision rather than a drift.

## Alternatives considered

- **Plan, then execute.** The Orchestrator emits a DAG of Steps up front, and code executes it. Rejected: needs a plan schema and a DAG executor, and cannot adapt to results mid-Run.
- **Orchestrator writes the final answer itself.** Rejected: separating findings from presentation lets a mid-tier model handle language and form, and keeps the Orchestrator's job purely strategic.
- **Dynamic Agents** (the Orchestrator writes system prompts and picks models and tools). Rejected for now: it lets an LLM grant itself tool permissions.
- **Nested delegation.** Rejected: unbounded cost and a tree of Steps that is hard to inspect.
- **Concatenate Intake outputs as text.** Rejected in favor of a typed Brief, which keeps each Intake result addressable.
