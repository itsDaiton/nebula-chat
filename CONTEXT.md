# Nebula Chat

An AI chat application: users hold conversations with a streaming LLM assistant, with responses cached for repeat requests.

## Language

**Conversation**:
A titled thread of messages between a user and one selected model, with an optional system prompt.
_Avoid_: Chat, thread, session.

**Message**:
A single turn in a conversation, authored by a `role` of `user`, `assistant`, or `system`.
_Avoid_: Turn.

**Model**:
The specific LLM (e.g. `gpt-4o-mini`) a conversation is bound to. Set per-conversation, not per-message.
_Avoid_: Provider (a model belongs to a provider, but the domain concept users and code select is the model).

**Streaming token**:
One incremental chunk of a model's completion, sent to the client as an SSE `token` event as soon as it's generated. Distinct from an LLM tokenizer token used for budgeting (see Token budget) — this is a transport-level unit.
_Avoid_: Chunk (reserve for describing SSE mechanics, not this domain concept).

**Token budget**:
The tiktoken-counted limits enforced before and during a completion: max prompt tokens, max completion tokens, and max context window (prompt + recent history + completion combined). Exceeding it fails the request with a typed error rather than silently truncating.
_Avoid_: Context window used alone to mean the whole budget — it's one part of it.

**Cache entry**:
A previously captured SSE token stream for a given conversation + model + prompt, replayed verbatim on a repeat request instead of calling the LLM again. Keyed by a hash of the prompt, with a fixed TTL and a max entry count enforced FIFO.
_Avoid_: Cached response.

**User**:
Anyone who owns conversations. Every conversation has exactly one owner — `userId` is non-null. A User is either a **Guest** or a **Registered user**.
_Avoid_: Account (an Account is an auth-provider link belonging to a User, not the User themselves).

**Guest**:
An anonymous User, auto-created on first use without any credentials, allowed a bounded number of messages (the **message allowance**) before registration is required to continue. Becomes a Registered user by **claiming** their conversations on sign-up or sign-in.
_Avoid_: Anonymous user (that names a state; the Guest is the actor), visitor.

**Registered user**:
A User who has authenticated with a credential (email/password today; social providers later). Not subject to the message allowance.
_Avoid_: Member, authenticated user.

**Message allowance**:
The maximum number of `user`-authored messages a Guest may send before they must register. Counted per Guest across all their conversations; assistant messages and regenerations do not count against it. Removed once the Guest becomes a Registered user.
_Avoid_: Quota, rate limit (rate limiting is auth-endpoint abuse throttling — a separate concern).

**Claim**:
Reassigning a Guest's conversations to a Registered account at the moment they sign up or sign in, so that authenticating upgrades the Guest in place rather than resetting their history.
_Avoid_: Merge, migrate.
