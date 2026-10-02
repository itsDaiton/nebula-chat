import { createHash, timingSafeEqual } from 'node:crypto';
import type { onRequestAsyncHookHandler } from 'fastify';
import { ForbiddenError } from '@nebula-chat/errors';
import { env } from '@backend/env';

// Digests give timingSafeEqual equal lengths without leaking the token's length.
const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * onRequest, so it runs before body validation: admits only `Authorization: Bearer
 * <OPERATOR_TOKEN>`, whatever User session comes along. Unset, the route is a 404.
 */
export const requireOperator: onRequestAsyncHookHandler = async (req, reply) => {
  const token = env.OPERATOR_TOKEN;
  if (token === undefined) {
    reply.callNotFound();
    return reply;
  }
  const presented = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1];
  if (presented === undefined || !timingSafeEqual(digest(presented), digest(token))) {
    throw new ForbiddenError('This action requires the operator token.');
  }
};
