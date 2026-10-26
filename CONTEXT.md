# Nebula Chat

An AI chat application: users hold Sessions with an LLM assistant that answers either directly or through an orchestrated Run of specialised Agents.

## Language

**Session**:
A titled thread between a user and the assistant, holding its Messages and the Runs behind them, with an optional system prompt for Direct replies. Not to be confused with an _auth session_ (Better Auth's sign-in session), which is always called that in full.
_Avoid_: Conversation, chat, thread, workflow.

**Archived Session**:
A Session its owner has put away: hidden from their Session list and kept unchanged until they restore it. Archiving is the only way a User removes a Session themselves; nothing a User does to a single Session erases it. Admins still see archived Sessions, marked as such.
_Avoid_: Deleted session, hidden session.

**Message**:
One thing said in a Session, authored by a `role` of `user` (the input) or `assistant` (the answer text). An assistant Message produced by a Run links to it: the Message is what was said, the Run is how it was made. A Run's Clarifying question and the user Message that answers it link to the Run too.
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

**Model call**:
One invocation of an LLM, recorded once it ends with its Model, token counts, estimated cost and outcome. A Direct reply makes one; a Run makes one per Step that calls a model (tool Steps make none). A replayed Cache entry counts as a Model call at zero cost. The unit that usage and spend are measured in.
_Avoid_: Request, completion, generation.

**User**:
Anyone who owns Sessions. Every Session has exactly one owner — `userId` is non-null. A User is either a **Guest** or a **Registered user**.
_Avoid_: Account (an Account is an auth-provider link belonging to a User, not the User themselves).

**Guest**:
An anonymous User, auto-created on first use without any credentials, allowed a bounded number of messages (the **message allowance**) before registration is required to continue. Becomes a Registered user by **claiming** their Sessions on sign-up or sign-in. A Guest with no activity for 30 days is Purged, since without credentials nobody can reach their Sessions again.
_Avoid_: Anonymous user (that names a state; the Guest is the actor), visitor.

**Registered user**:
A User who has authenticated with a credential: email/password, or a Google or GitHub account (social sign-in). Not subject to the message allowance. An email/password user's email starts **unverified** until they follow the emailed verification link, and until then they keep the Guest message allowance; an email the social provider has verified arrives verified.
_Avoid_: Member, authenticated user.

**Metered user**:
A User currently subject to the Message allowance: a Guest, or a Registered user whose email is still unverified. Stops being metered once they are a verified Registered user. Being metered says nothing about having hit the allowance — a Metered user with messages left can still send.
_Avoid_: Capped user (that is a Metered user who has spent the allowance), limited user.

**Message allowance**:
The maximum number of `user`-authored messages a Metered user may send before they must register (Guest) or verify their email (unverified Registered user). Counted per User across all their Sessions; assistant messages and regenerations do not count against it. A Metered user can see how much is left; at zero they cannot send until they register or verify. Lifted once verified.
_Avoid_: Quota, rate limit (rate limiting is auth-endpoint abuse throttling — a separate concern).

**Claim**:
Reassigning a Guest's Sessions to a Registered account at the moment they sign up or sign in, so that authenticating upgrades the Guest in place rather than resetting their history.
_Avoid_: Merge, migrate.

**Password change**:
A signed-in Registered user replacing their password by proving the current one. Signs out every other auth session of theirs; the one they changed it from stays signed in. The new password must differ from the current one.
_Avoid_: Password update, password reset (that is the signed-out flow).

**Password reset**:
A User who has forgotten their password setting a new one through an emailed link, without being signed in. Proves ownership of the email, so it also verifies it, and signs out every auth session.
_Avoid_: Password recovery, password change (that is the signed-in flow).

**Sign out everywhere**:
A Registered user ending every auth session of theirs at once, the one they are using included; that device then carries on as a fresh Guest. Devices holding a still-valid auth cookie cache may stay signed in for up to five minutes.
_Avoid_: Log out of all devices (UI-copy only), revoke sessions.

**Account deletion**:
A Registered user asking to remove their User. Confirmed with their password, or, for a User without one, a sign-in less than a day old. Puts the User into Pending deletion at once and signs out every auth session of theirs; the device carries on as a fresh Guest.
_Avoid_: Account closure, deactivation, archiving (Archived is reserved for Sessions).

**Pending deletion**:
The 30 days between Account deletion and the Purge. The User is hidden and cannot act, but signing back in offers to restore them in full, and an Admin can restore them too. Their email stays taken, so signing up with it again points them to signing in instead.
_Avoid_: Archived account, soft-deleted, deactivated.

**Purge**:
The irreversible end of Pending deletion: the User's Sessions and Messages are erased and their Model calls are kept only without anything that identifies them, so past usage totals don't change.
_Avoid_: Hard delete, wipe, cleanup.

**Ban**:
An Admin barring a User from signing in, permanently or until a set time, with a reason the User is shown. Ends every auth session of theirs; their Sessions are kept. The same device can still carry on as a fresh Guest, held back by the Message allowance.
_Avoid_: Block, suspension, lock.

**Avatar**:
The visual that stands for a User in the interface. For a Registered user it is their Profile image if they have one, otherwise their initials; a Guest's is always a generic anonymous one.
_Avoid_: Icon, profile picture (that is the Profile image, one possible content of an Avatar).

**Profile image**:
The picture a Registered user is represented by, either one they uploaded or one their social provider supplied; an upload replaces a provider-supplied one. Guests have none.
_Avoid_: Profile picture, photo, avatar (the Avatar falls back to initials when there is no Profile image).

**Admin**:
A verified Registered user who also holds the admin role: sees and acts on every User, Session and Run through the admin dashboard, including reading Message content. Must sign in with two-factor authentication to act as one. Still a User, and still chats like any other. A Guest or an unverified user can never be an Admin.
_Avoid_: Operator (an Operator holds the operator token and is not a User), superuser, moderator.

**Audit log**:
The permanent, append-only record of every Admin action (changing a role, banning, archiving) and every time an Admin reads a User's Sessions or Runs.
_Avoid_: Activity log, history.

**Operator**:
Someone running a deployment rather than using it: holds the operator token and can change operational settings, such as log levels at runtime. Not a User — an Operator owns no Sessions, and no Guest or Registered user can act as one.
_Avoid_: Admin (an Admin is a User with elevated rights; operating is not a kind of User).

**CLI profile**:
A named deployment the `nebula` CLI talks to (for example `local` or `prod`): just a server URL, one of them the default. Holds no credentials.
_Avoid_: Profile on its own (reads as a User's profile or Profile image), environment, context.

### Orchestration

**Direct reply**:
An assistant Message produced by a single model call on the Session's Model, streamed straight back — no Agents, no Steps. The only reply mode available to Guests.
_Avoid_: Plain chat, completion, simple mode.

**Run**:
One orchestrated response to one user Message, opted into per message by a Registered user: the
durable record of every Step taken to produce the assistant's answer. Proceeds in three phases —
Intake, the Orchestrator's loop, then the Output Agent — and may pause once, `waiting` on the answer
to a Clarifying question. Ends `completed`, `partial` (a limit forced an early answer, a
non-essential Step failed, or a Clarifying question went unanswered), `failed`, or `cancelled`.
Started from a Session and inspectable on its own.
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
The Agent that directs a Run: working from the Brief, it decides which other Agents to delegate to, turn by turn, until it hands its findings to the Output Agent. The only Agent allowed to delegate or to ask a Clarifying question; it calls no tools itself.
_Avoid_: Planner, main model, router.

**Delegate Agent**:
An Agent the Orchestrator hands one self-contained task to, as one of its tools (e.g. `analyst`, `critic`). It sees only that task, never the Brief or the conversation, and can never delegate in turn. One that fails or times out is reported back to the Orchestrator, and the Run ends `partial`.
_Avoid_: Sub-agent, worker, helper, tool (it is exposed as one, but it is an Agent).

**Findings**:
What the Orchestrator hands the Output Agent: its own reply when it hands off, or, when a limit forces the handoff, its Delegate Agents' results so far, marked partial.
_Avoid_: Plan, summary, draft answer.

**Clarifying question**:
The one question an Orchestrator may put to the user during a Run, asked as an assistant Message; the user's next Message in that Session is the answer. Left unanswered, the Run carries on without it and ends `partial`; it is cancelled instead if its Session is Archived or its owner can no longer act.
_Avoid_: Interrupt, pause, follow-up question, prompt.

**Output Agent**:
The Agent that writes the user-facing answer of a Run from the Brief and the Orchestrator's findings — deciding language, tone and form.
_Avoid_: Synthesizer, final prompt.

**Step**:
One unit of work inside a Run — a single Agent execution or a single tool call — with a status and a result.
_Avoid_: Task, job, subtask.

**Run budget**:
The maximum total tokens a Run may spend across all its Steps. Nearing it forces the Orchestrator to hand off to the Output Agent, and the Run ends `partial` rather than failing.
_Avoid_: Token budget (that is the per-call limit), cost limit, quota.
