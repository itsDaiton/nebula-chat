# ADR-0037: A monthly Spend allowance on the Operator key, lifted by an Own key the server cannot read

- **Status:** Accepted — NEB-820, NEB-822 and NEB-823 have landed
- **Date:** 2026-11-21
- **Deciders:** @itsDaiton
- **Related:** [ADR-0013](./0013-worker-app-owns-all-llm-execution.md) — amended: the server stores ciphertext only the worker can decrypt; [ADR-0028](./0028-purge-of-inactive-guests-and-unverified-users.md) — Purge; [ADR-0030](./0030-model-catalog-in-contracts-and-model-call-ledger.md) — the Model call ledger; [ADR-0033](./0033-runs-on-langgraph-checkpointer-owns-resume.md) — a Message answering a waiting Run resumes it

## Context

A Metered user is bounded by the Message allowance, but a verified Registered user is not, so nothing limits what they spend on the Operator's LLM keys. A Run fans one Message out to several Agents, so the exposure is real. The Model call ledger already records estimated cost per call, and ADR-0013 says the worker owns all LLM execution and the server holds no LLM keys.

## Decision

1. **A cost-based monthly soft cap.** A verified Registered user may incur a configured amount (`SPEND_ALLOWANCE_USD`, one value for everyone but Admins, who are exempt) of estimated cost per UTC calendar month, summed from the ledger. The server checks it before anything is persisted or enqueued, and refuses with `SpendAllowanceReached` naming the reset date. A Run in flight finishes, so the cap can overshoot by one Run. A Cache replay costs zero, and a Message that answers a waiting Run is never refused.
2. **An Own key lifts the cap.** A User may supply a key per provider, paid for by them, with no fallback to the Operator key. Calls made with it do not count. The sum lives in one service function so this lands without touching callers.
3. **The server encrypts and never decrypts.** It encrypts a supplied key to a worker public key (RSA-OAEP, 4096-bit, versioned) and stores the ciphertext. Only the worker holds the private key.
4. **The server chooses the key at enqueue; the worker loads it by reference at each call.** The key never travels through Redis.
5. **Validation and rotation are worker jobs.**
6. **Delivery order.** The cap first (NEB-820), then the key store and worker decryption, then key selection at enqueue, then the client for managing keys. The worker deploys before the server sends a key reference.

## Alternatives considered

- **A cap with no Own key.** Protects the Operator but leaves a heavy user no way forward.
- **An Own key with no cap.** Leaves every user who brings no key unbounded.
- **A key sent with each message through Redis.** Puts a secret on the queue and in its persistence.
- **The browser calling the provider directly.** Contradicts ADR-0013.
- **A shared AES-GCM key in env.** Lets the server read every stored key.

## Consequences

- The server stores ciphertext it cannot read; a lost worker private key means Users re-enter their keys.
- The cap can overshoot by one Run, and a purged User's ledger rows never count.
- The worker must deploy before the server sends a key reference.
