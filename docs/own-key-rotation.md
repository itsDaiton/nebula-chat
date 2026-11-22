# Own key rotation

A User's Own key is stored as RSA-OAEP ciphertext (4096-bit, SHA-256 for the hash and MGF1, base64) beside an integer key version
([ADR-0037](./adr/0037-spend-allowance-and-own-key.md)). The server holds a public key and the worker holds the private key of each
version in the worker secret `OWN_KEY_PRIVATE_KEY_V<n>` (a PEM; `\n` stands for a line break). There is no backup or escrow: a lost
private key makes every key stored under that version unreadable, and those Users re-enter theirs.

## First key

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out own-key-v1.pem
openssl pkey -in own-key-v1.pem -pubout -out own-key-v1.pub.pem
```

Set the private PEM as `OWN_KEY_PRIVATE_KEY_V1` on the worker and keep the public PEM for the server. Without any private key the
worker still boots, and Own keys are simply unusable.

## Rotating to version `n + 1`

Order matters: the worker must be able to read both versions before the server writes the new one.

1. Generate a new keypair as above.
2. Add its private key to the worker as `OWN_KEY_PRIVATE_KEY_V<n+1>`, next to the old one, and deploy the worker. The highest version
   becomes current; set `OWN_KEY_CURRENT_VERSION` only to pin another.
3. Deploy the server with the new public key and version, so new and replaced keys are written under `n + 1`.
4. Enqueue the re-wrap job (queue `own-key-rewrap`, empty payload). It re-encrypts every key not at the current version, in one
   update per key that applies only while the key is unchanged. It is idempotent; a key it could not move fails the job so BullMQ
   retries it, and the job can simply be run again.
5. Check that `own_keys` has no row below the new version, then delete the old private key from the worker.

Never delete an old private key while any row still carries its version.
