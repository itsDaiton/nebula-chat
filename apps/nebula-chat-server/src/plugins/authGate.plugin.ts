import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import type { SessionData } from '@nebula-chat/auth';
import { auth } from '@backend/auth';
import { ForbiddenError, UnauthorizedError } from '@backend/errors/AppError';

/**
 * The request with its resolved session attached. Fastify augmentation would need
 * a merged `interface`, which the repo forbids (`type` only, ADR/AGENTS) and which
 * nothing else here uses — decorators are accessed by direct import, not off the
 * typed instance. The cast is confined to this file: `requireAuthentication` writes
 * it and `getSessionData` reads it, so no consumer touches an untyped property.
 */
type RequestWithSession = FastifyRequest & { sessionData: SessionData | null };

/**
 * Returns the session attached by `requireAuthentication` / `requireRegistered`, or
 * throws `UnauthorizedError` if no gate ran (a programming error — the gate belongs
 * in the route's `preHandler` chain). Downstream handlers read the owner id through
 * this rather than reaching for an untyped request property.
 */
export const getSessionData = (req: FastifyRequest): SessionData => {
  const data = (req as RequestWithSession).sessionData;
  if (!data) {
    throw new UnauthorizedError();
  }
  return data;
};

/**
 * Resolves the better-auth session from the request cookies, throws
 * `UnauthorizedError` when there is none, and attaches it to the request. Both
 * gates share this — a preHandler cannot call another (the `this` context differs).
 */
const resolveSession = async (req: FastifyRequest): Promise<SessionData> => {
  const sessionData = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!sessionData) {
    throw new UnauthorizedError();
  }
  const typed = sessionData as unknown as SessionData;
  (req as RequestWithSession).sessionData = typed;
  return typed;
};

/**
 * preHandler: requires any authenticated session (Guest or Registered). On
 * success the session is attached to the request for downstream handlers
 * (`getSessionData`).
 */
export const requireAuthentication: preHandlerAsyncHookHandler = async (req) => {
  await resolveSession(req);
};

/**
 * preHandler: `requireAuthentication` plus a `ForbiddenError` when the session user
 * is a Guest (`isAnonymous`). Use on routes that a Guest must never reach.
 */
export const requireRegistered: preHandlerAsyncHookHandler = async (req) => {
  const { user } = await resolveSession(req);
  if (user.isAnonymous) {
    throw new ForbiddenError('This action requires a registered account.');
  }
};

/**
 * `authGate` — mounts better-auth and exposes the route gates.
 *
 * - `GET|POST /api/auth/*` delegates to better-auth's Node handler
 *   (`toNodeHandler`) on the raw req/res. better-auth reads the raw request body
 *   itself, so Fastify's JSON body parser must not consume the stream first. That
 *   passthrough parser is registered in an **encapsulated child scope** so it
 *   applies only to the auth catch-all — the rest of the API keeps normal JSON
 *   parsing. The route is `{ schema: { hide: true } }` to stay out of the OpenAPI
 *   spec.
 * - `requireAuthentication` / `requireRegistered` are decorated on the app (via
 *   `fastify-plugin`, so they reach the whole instance) for availability and are
 *   also exported for direct import by route modules.
 */
export default fp(
  async (app) => {
    app.decorateRequest('sessionData', null);
    app.decorate('requireAuthentication', requireAuthentication);
    app.decorate('requireRegistered', requireRegistered);

    const authHandler = toNodeHandler(auth);

    await app.register(async (authScope) => {
      // Scoped to this child instance only: better-auth owns the raw body, so the
      // JSON/urlencoded parsers must hand the stream through untouched here.
      authScope.addContentTypeParser(
        ['application/json', 'application/x-www-form-urlencoded'],
        (_req, _payload, done) => done(null, undefined),
      );

      authScope.route({
        method: ['GET', 'POST'],
        url: '/api/auth/*',
        schema: { hide: true },
        handler: async (req, reply) => {
          reply.hijack();
          await authHandler(req.raw, reply.raw);
        },
      });
    });
  },
  { name: 'authGate' },
);
