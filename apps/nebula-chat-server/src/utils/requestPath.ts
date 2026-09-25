import type { FastifyRequest } from 'fastify';

/**
 * `url.path`: the request path without its query string. The query can carry
 * search terms and cursors, which are not the path and have no place in a line.
 */
export const requestPath = (req: FastifyRequest): string => req.url.split('?', 1)[0] ?? req.url;
