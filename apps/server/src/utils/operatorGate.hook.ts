import { createHash, timingSafeEqual } from 'node:crypto';
import type { onRequestAsyncHookHandler } from 'fastify';
import { env } from '@server/env';

// Digests give timingSafeEqual equal lengths without leaking the token's length.
const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * onRequest, so it runs before body validation: admits only `Authorization: Bearer
 * <OPERATOR_TOKEN>`, whatever User session comes along. Unset, missing or wrong, the route is a 404.
 */
export const requireOperator: onRequestAsyncHookHandler = async (req, reply) => {
  const token = env.OPERATOR_TOKEN;
  const presented = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1];
  if (
    token === undefined ||
    presented === undefined ||
    !timingSafeEqual(digest(presented), digest(token))
  ) {
    reply.callNotFound();
    return reply;
  }
};
