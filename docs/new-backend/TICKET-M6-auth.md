# M-6 — Auth & Security

## Ticket metadata

| Field | Value |
|-------|-------|
| **ID** | M-6 |
| **Scope** | `apps/server` only |
| **Depends on** | M-1 (Fastify must be set up) |
| **Blocks** | Nothing |
| **Standalone** | No — requires M-1 |

## Objective

Implement JWT authentication and password hashing. Add security headers and CSRF protection. Create an `authenticate` decorator for protecting routes.

## Acceptance criteria

- [ ] `@fastify/jwt` registered as a plugin
- [ ] `app.authenticate` decorator verifies JWT and returns 401 on failure
- [ ] `hashPassword(password)` hashes with argon2id
- [ ] `verifyPassword(hash, password)` verifies argon2 hash
- [ ] `POST /api/auth/register` creates a user with hashed password
- [ ] `POST /api/auth/login` returns a signed JWT
- [ ] `@fastify/helmet` sets security headers on all responses
- [ ] Protected routes return 401 without a valid token

## Packages to add to `apps/server/package.json`

```json
{
  "dependencies": {
    "@fastify/jwt": "^9.0.0",
    "@fastify/oauth2": "^7.0.0",
    "@fastify/helmet": "^12.0.0",
    "@fastify/csrf-protection": "^7.0.0",
    "jose": "^5.0.0",
    "argon2": "^0.43.0"
  }
}
```

## Implementation

### File: `apps/server/src/plugins/auth.plugin.ts`

```ts
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import { env } from '../env';

export default fp(async (app) => {
  await app.register(helmet);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  app.decorate('authenticate', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.unauthorized('Invalid or expired token');
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
}
```

### File: `apps/server/src/modules/auth/auth.utils.ts`

```ts
import argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Protecting a route

```ts
app.get('/api/me', {
  onRequest: [app.authenticate],
  handler: async (req) => {
    return { user: req.user };
  },
});
```

### `env.ts` additions

Add to the Zod schema in `apps/server/src/env.ts`:

```ts
JWT_SECRET: z.string().min(32),
JWT_REFRESH_SECRET: z.string().min(32),
```

---
---

