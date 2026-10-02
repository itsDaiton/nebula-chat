import type { FastifyReply } from 'fastify';
import { forwardReplyHeaders } from '@backend/utils/forwardReplyHeaders';

/**
 * Opens a hijacked SSE response. CORS is `@fastify/cors`'s decision (`cors.config.ts`),
 * forwarded from the reply — never derived from the request Origin here.
 */
export const setSseHeaders = (reply: FastifyReply): void => {
  forwardReplyHeaders(reply);
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
};
