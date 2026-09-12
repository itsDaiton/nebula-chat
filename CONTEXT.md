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
An account holder who owns conversations. A conversation's `userId` is nullable — anonymous/unauthenticated conversations are permitted by the current schema.
_Avoid_: Account.
