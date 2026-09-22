# Nebula Chat

An AI chat application: users hold Sessions with an LLM assistant that answers either directly or through an orchestrated Run of specialised Agents.

## Language

**Session**:
A titled thread between a user and the assistant, holding its Messages and the Runs behind them, with an optional system prompt for Direct replies. Not to be confused with an _auth session_ (Better Auth's sign-in session), which is always called that in full.
_Avoid_: Conversation, chat, thread, workflow.

**Message**:
One thing said in a Session, authored by a `role` of `user` (the input) or `assistant` (the answer text). An assistant Message produced by a Run links to it: the Message is what was said, the Run is how it was made.
_Avoid_: Turn.

**Model**:
The specific LLM (e.g. `gpt-4o-mini`) a Session is bound to, used for its Direct replies. Set per-Session, not per-message. Runs ignore it — every Agent's model is fixed by the application.
_Avoid_: Provider (a model belongs to a provider, but the domain concept users and code select is the model).

**Streaming token**:
One incremental chunk of a model's completion, sent to the client as an SSE `token` event as soon as it's generated. Distinct from an LLM tokenizer token used for budgeting (see Token budget) — this is a transport-level unit.
_Avoid_: Chunk (reserve for describing SSE mechanics, not this domain concept).

**Token budget**:
The tiktoken-counted limits enforced before and during a completion: max prompt tokens, max completion tokens, and max context window (prompt + recent history + completion combined). Exceeding it fails the request with a typed error rather than silently truncating.
_Avoid_: Context window used alone to mean the whole budget — it's one part of it.

**Cache entry**:
A previously captured stream of Streaming tokens for a Direct reply, replayed into a repeat Direct reply's stream instead of calling the LLM again. Runs are never cached.
_Avoid_: Cached response.

**User**:
Anyone who owns Sessions. Every Session has exactly one owner — `userId` is non-null. A User is either a **Guest** or a **Registered user**.
_Avoid_: Account (an Account is an auth-provider link belonging to a User, not the User themselves).

**Guest**:
An anonymous User, auto-created on first use without any credentials, allowed a bounded number of messages (the **message allowance**) before registration is required to continue. Becomes a Registered user by **claiming** their Sessions on sign-up or sign-in.
_Avoid_: Anonymous user (that names a state; the Guest is the actor), visitor.

**Registered user**:
A User who has authenticated with a credential (email/password today; social providers later). Not subject to the message allowance.
_Avoid_: Member, authenticated user.

**Message allowance**:
The maximum number of `user`-authored messages a Guest may send before they must register. Counted per Guest across all their Sessions; assistant messages and regenerations do not count against it. Removed once the Guest becomes a Registered user.
_Avoid_: Quota, rate limit (rate limiting is auth-endpoint abuse throttling — a separate concern).

**Claim**:
Reassigning a Guest's Sessions to a Registered account at the moment they sign up or sign in, so that authenticating upgrades the Guest in place rather than resetting their history.
_Avoid_: Merge, migrate.

### Orchestration

**Direct reply**:
An assistant Message produced by a single model call on the Session's Model, streamed straight back — no Agents, no Steps. The only reply mode available to Guests.
_Avoid_: Plain chat, completion, simple mode.

**Run**:
One orchestrated response to one user Message, opted into per message by a Registered user: the durable record of every Step taken to produce the assistant's answer. Proceeds in three phases — Intake, the Orchestrator's loop, then the Output Agent. Ends `completed`, `partial` (a limit forced an early answer or a non-essential Step failed), `failed`, or `cancelled`. Started from a Session and inspectable on its own.
_Avoid_: Workflow, task, job, execution, deep mode (that's a UI label, not the concept).

**Agent**:
A named, predefined role — a fixed pairing of model, system prompt, allowed tools and parameters (e.g. `researcher`, `critic`). Agents are defined by the application, never invented at run time.
_Avoid_: Worker (that is the app), bot, persona.

**Intake Agent**:
One of a fixed set of cheap Agents that run in parallel on every Run's input before the Orchestrator starts (e.g. language detection and translation, Session summary). Each returns structured output.
_Avoid_: Preprocessor, first prompts.

**Brief**:
The structured merge of all Intake Agents' outputs — the Orchestrator's starting input.
_Avoid_: Context, aggregated output, concatenation.

**Orchestrator**:
The Agent that directs a Run: working from the Brief, it decides which other Agents to delegate to, turn by turn, until it hands its findings to the Output Agent. The only Agent allowed to delegate; it calls no tools itself.
_Avoid_: Planner, main model, router.

**Output Agent**:
The Agent that writes the user-facing answer of a Run from the Brief and the Orchestrator's findings — deciding language, tone and form.
_Avoid_: Synthesizer, final prompt.

**Step**:
One unit of work inside a Run — a single Agent execution or a single tool call — with a status and a result.
_Avoid_: Task, job, subtask.

**Run budget**:
The maximum total tokens a Run may spend across all its Steps. Nearing it forces the Orchestrator to hand off to the Output Agent, and the Run ends `partial` rather than failing.
_Avoid_: Token budget (that is the per-call limit), cost limit, quota.
