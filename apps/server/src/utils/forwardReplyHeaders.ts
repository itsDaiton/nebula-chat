import type { FastifyReply } from 'fastify';

/**
 * Copies the reply's buffered headers (`@fastify/cors`'s, say) onto the raw response:
 * a hijacked reply never runs `reply.send`, which would otherwise flush them.
 */
export const forwardReplyHeaders = (reply: FastifyReply): void => {
  for (const [name, value] of Object.entries(reply.getHeaders())) {
    if (value !== undefined) {
      reply.raw.setHeader(name, value);
    }
  }
};
