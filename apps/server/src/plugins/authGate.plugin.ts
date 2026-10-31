import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import type { SessionData } from '@nebula-chat/auth';
import { bindAttributes } from '@nebula-chat/otel';
import { auth } from '@server/auth';
import { logRequestFailed } from '@server/errors/error.handler';
import { recordErrorType } from '@server/errors/requestErrorType';
import { forwardReplyHeaders } from '@server/utils/forwardReplyHeaders';
import {
  ERROR_STATUS,
  ForbiddenError,
  INTERNAL_ERROR_ENVELOPE,
  NotFoundError,
  TwoFactorRequiredError,
  UnauthorizedError,
} from '@nebula-chat/errors';

/**
 * The request with its resolved session attached; the cast stays in this file because Fastify augmentation needs a forbidden `interface`.
 */
type RequestWithSession = FastifyRequest & { sessionData: SessionData | null };

/**
 * Returns the session `requireAuthentication` / `requireRegistered` attached; throws `UnauthorizedError` if no gate ran.
 */
export const getSessionData = (req: FastifyRequest): SessionData => {
  const data = (req as RequestWithSession).sessionData;
  if (!data) {
    throw new UnauthorizedError();
  }
  return data;
};

/**
 * Resolves the session from the cookies (else `UnauthorizedError`), attaches it, and binds the User onto both `req.log` and `reply.log`.
 * Shared by both gates, since a preHandler cannot call another.
 */
const resolveSession = async (
  req: FastifyRequest,
  reply: FastifyReply,
  { fresh = false } = {},
): Promise<SessionData> => {
  const headers = fromNodeHeaders(req.headers);
  const sessionData = await auth.api.getSession(
    fresh ? { headers, query: { disableCookieCache: true } } : { headers },
  );
  if (!sessionData) {
    throw new UnauthorizedError();
  }
  const typed = sessionData as unknown as SessionData;
  (req as RequestWithSession).sessionData = typed;
  const log = bindAttributes(req.log, {
    'user.id': typed.user.id,
    'nebula.user.kind': typed.user.isAnonymous ? 'guest' : 'registered',
  });
  req.log = log;
  reply.log = log;
  return typed;
};

/**
 * preHandler: requires any authenticated session (Guest or Registered) and attaches it for `getSessionData`.
 */
export const requireAuthentication: preHandlerAsyncHookHandler = async (req, reply) => {
  await resolveSession(req, reply);
};

/**
 * preHandler: `requireAuthentication` plus a `ForbiddenError` when the session user
 * is a Guest (`isAnonymous`). Use on routes that a Guest must never reach.
 */
export const requireRegistered: preHandlerAsyncHookHandler = async (req, reply) => {
  const { user } = await resolveSession(req, reply);
  if (user.isAnonymous) {
    throw new ForbiddenError('This action requires a registered account.');
  }
};

/**
 * preHandler for `/api/admin/*`: a verified, unbanned Admin whose auth session passed a second factor (ADR-0027 §2).
 * better-auth 1.7 marks no auth session, so `@nebula-chat/auth` sets `twoFactorVerified` on each verified code; a trusted-device or social sign-in never does.
 */
export const requireAdmin: preHandlerAsyncHookHandler = async (req, reply) => {
  // Past the cookie cache, so a revoked role, a ban or a fresh verification applies at once.
  const { user, session } = await resolveSession(req, reply, { fresh: true });
  if (user.isAnonymous || !user.emailVerified || user.banned || user.role !== 'admin') {
    throw new ForbiddenError('This action requires an Admin.');
  }
  if (!user.twoFactorEnabled || !session.twoFactorVerified) {
    throw new TwoFactorRequiredError();
  }
};

/**
 * Logs and ends a hijacked auth request whose handler threw: the hijack bypasses
 * `errorHandler`, so without this the raw response never ends and the client hangs.
 */
const failAuthRequest = (err: unknown, req: FastifyRequest, reply: FastifyReply): void => {
  const res = reply.raw;
  const status = res.headersSent ? res.statusCode : ERROR_STATUS.Internal;
  // Names the 500's `http.request.completed` line; a destroyed response writes none.
  recordErrorType(req, 'Internal');
  logRequestFailed(err, req, reply, 'Internal', status);

  if (!res.headersSent) {
    // A half-built better-auth response (a session cookie, say) must not ride on the 500;
    // the CORS headers must, or the browser hides the 500 from the client.
    for (const name of res.getHeaderNames()) {
      res.removeHeader(name);
    }
    forwardReplyHeaders(reply);
    res
      .writeHead(ERROR_STATUS.Internal, { 'content-type': 'application/json; charset=utf-8' })
      .end(JSON.stringify(INTERNAL_ERROR_ENVELOPE));
  } else if (!res.writableEnded) {
    // Too late for a status: drop the connection so the client sees the failure.
    res.destroy();
  }
};

const ADMIN_PLUGIN_PREFIX = '/api/auth/admin';

// The path as better-auth's router would match it: query dropped, percent-escapes decoded, case ignored.
const isAdminPluginPath = (url: string): boolean => {
  const [rawPath = ''] = url.split('?');
  let path = rawPath;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    // An undecodable path can't name the admin plugin's routes.
  }
  const normalized = path.toLowerCase().replace(/\/{2,}/g, '/');
  return normalized === ADMIN_PLUGIN_PREFIX || normalized.startsWith(`${ADMIN_PLUGIN_PREFIX}/`);
};

/**
 * Mounts better-auth at `GET|POST /api/auth/*` on the raw req/res (hidden from OpenAPI) and exposes the route gates.
 * Its passthrough body parser lives in an encapsulated child scope, so the rest of the API keeps JSON parsing.
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
          // Answered before the hijack; admin actions must use the audited `/api/admin/*` (ADR-0027 §6).
          if (isAdminPluginPath(req.url)) {
            return reply
              .status(ERROR_STATUS.NotFound)
              .send(new NotFoundError('Route').toEnvelope());
          }
          reply.hijack();
          forwardReplyHeaders(reply);
          try {
            await authHandler(req.raw, reply.raw);
          } catch (err) {
            failAuthRequest(err, req, reply);
          }
        },
      });
    });
  },
  { name: 'authGate' },
);
