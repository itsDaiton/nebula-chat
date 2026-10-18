# ADR-0033: Runs execute as a LangGraph graph, tool-using Agents are LangChain agents, and the checkpointer owns resume

- **Status:** Proposed — to be implemented by the nebula-chat 2.0 epic (NEB-349) from NEB-359; checked by a throwaway spike (see Consequences)
- **Date:** 2026-10-18
- **Deciders:** @itsDaiton
- **Related:** [ADR-0015](./0015-run-model-intake-orchestrator-loop-output.md) — amended: the
  runtime, and the Clarifying question;
  [ADR-0016](./0016-one-job-per-run-resume-from-persisted-steps.md) — §1 amended, §3 superseded;
  [ADR-0013](./0013-worker-app-owns-all-llm-execution.md) — unchanged: the LLM code lives in the
  worker; [ADR-0014](./0014-redis-streams-delivery-and-split-send-stream-api.md) — stream events
  gain a Step `attempt` and a waiting event

## Context

ADR-0015 fixed the shape of a Run and ADR-0016 how it survives a crash, but left the runtime to the
tickets, which planned a hand-written loop over `@langchain/core` and resume by replaying persisted
Steps. No Run code exists yet. LangGraph (`@langchain/langgraph`) is LangChain's orchestration
runtime: graph state, nodes, cyclic edges, parallel fan-out, checkpointed durable execution,
streaming and cancellation. It builds on `@langchain/core` rather than replacing it, and is already
in the lockfile through `langchain`, whose `createAgent` runs on it. A `/grill-with-docs` session
decided to build Runs on it.

## Decision

1. **LangGraph is a library inside the worker**, not the hosted Agent Server. BullMQ, Redis Streams and the split API stay. No LLM library is kept: ADR-0013 §2 holds, and the worker organises the code in folders.
2. **Only Runs are graphs.** A Direct reply stays a single streamed model call with history packing and the response cache.
3. **A Run is a `StateGraph`.** Intake Agents fan out in parallel and fan in to the Brief, then the
   Orchestrator runs, then the Output Agent. The Orchestrator and every delegate Agent that uses
   tools is a LangChain `createAgent` agent nested in the graph, and delegates are exposed to the
   Orchestrator as tools. Our middleware records Steps and Model calls around each model and tool
   call, enforces the Run budget's forced handoff, the turn cap and the per-delegate tool-call cap,
   and checks the cancel flag. Intake and Output are plain model calls with structured output. The
   model layer stays `@langchain/core` with the provider packages; the LCEL chain is dropped.
4. **The checkpointer owns resume.** `PostgresSaver` keeps checkpoints in a `langgraph` Postgres
   schema that it creates and migrates itself, outside Drizzle. The thread is the Run (`thread_id`
   is the Run ID), never the Session. Checkpoints are resume state, not storage: they are deleted
   when the Run reaches an end state. The `steps` table stays the durable record — inspection, the
   Model call ledger and the Run budget — and is written idempotently. A delegate Step's ID is the
   Orchestrator's tool-call ID, which the checkpoint keeps stable across a resume. This supersedes
   ADR-0016 §3.
5. **A re-run node streams again.** On resume, the node in flight re-runs from its start, so its Step emits `step-started` again with a higher `attempt`, and the client discards what it rendered for that Step.
6. **The Orchestrator may ask one Clarifying question per Run** (see `CONTEXT.md`), through a
   LangGraph interrupt. The question and the answer are Messages. While `waiting`, the Run holds no
   job; the user's next Message in the Session resumes it from its checkpoint on a new job, so
   ADR-0016 §1 becomes "one job at a time per Run". A delayed job ends the wait after a configurable
   timeout (3 minutes by default): the Run carries on without the answer and ends `partial`.
   Cancelling a waiting Run promotes that job with the cancel flag set. Archiving the Session,
   Account deletion or a Ban cancels a waiting Run. Asking is an Orchestrator action, like
   delegating, so the Orchestrator still calls no tools.

## Consequences

- Resume, parallel fan-out and streaming come from the runtime; the worker does not hand-write replay.
- While a Run is live its state lives in two places: checkpoints for resume, Steps for the record. Only Steps outlive the Run, so the Purge never meets a checkpoint.
- The checkpointer's `setup()` creates the `langgraph` schema at worker boot. drizzle-kit reads only `public` and never sees it; the server never touches it.
- A delegate that was running when the worker died re-runs as a whole; delegates that finished in the same turn keep their results. A model call cut off by a crash returns no usage and is missing from the Model call ledger.
- The 3-minute wait plus the 5-minute Run timeout fit inside the free Render worker's 15-minute idle window, so the timeout job fires on time.
- Tests keep the worker job seam with an in-memory checkpointer and a scripted fake chat model that supports tool binding. No test reaches Postgres.
- A throwaway spike (`langchain` 1.5, `@langchain/langgraph` 1.5, `PostgresSaver` 1.1, a scripted fake model, a scratch Postgres) confirmed the design:
  - The fake model drives `createAgent` and the middleware sees every model call's usage and every tool call's ID. Intake nodes and delegates in one turn run in parallel, and the Output Agent's tokens stream from inside the graph.
  - After a `SIGKILL` during one of two parallel delegates, a fresh process resumes the thread and re-runs only that delegate, under the same tool-call ID. Intake, the Brief, the Orchestrator's turn and the finished delegate are not repeated.
  - A Clarifying question pauses the graph and the process exits cleanly. A fresh process resumes it with the answer without repeating the Orchestrator's turn. The asking tool re-runs from its start on resume, so anything it does before the interrupt must be idempotent. The interrupt reaches the stream once per graph level, so the worker reads it at the root.
  - The checkpointer creates its four tables in the `langgraph` schema, and deleting a thread removes all of its rows.

## Alternatives considered

- **The LangGraph Agent Server.** It replaces the queue, the streams and most of the worker, it is paid hosting, and the distributed system would stop being ours to build.
- **Resume by replaying Steps, with no checkpointer** (ADR-0016 as written). One source of truth, but it hand-writes the feature LangGraph exists for.
- **Drizzle owning the checkpoint tables, or a custom checkpointer over Drizzle.** It breaks silently whenever the package changes its tables.
- **A Redis checkpointer.** Short-lived state suits Redis, but it needs modules that plain hosted Redis lacks.
- **A hand-written Orchestrator loop over `bindTools`.** Full control, but it rebuilds the limits the `createAgent` middleware already provides.
- **Keeping an LLM library for the worker.** It would have one consumer; folders in the worker give the same separation.
- **Reopening ADR-0015 further.** Nested delegation and Agent-to-Agent handoffs stay rejected for cost and inspectability. A plan shown up front needs no LangGraph, and a self-check of the answer conflicts with streaming it.
