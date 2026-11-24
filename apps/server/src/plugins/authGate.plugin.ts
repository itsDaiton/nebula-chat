import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import type { SessionData } from '@nebula-chat/auth';
import { bindAttributes } from '@nebula-chat/otel';
import { auth } from '@server/auth';
import { logRequestFailed } from '@server/errors/error.handler';
import { recordErrorType } from '@server/errors/requestErrorType';
import { forwardReplyHeaders } from '@server/utils/forwardReplyHeaders';
import { requireOperator } from '@server/utils/operatorGate.hook';
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
 * Returns the session an Access level's gate attached; throws `UnauthorizedError` if no gate ran.
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
 * Shared by the gates, since a hook cannot call another.
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
 * onRequest: requires any authenticated session (Guest or Registered) and attaches it for `getSessionData`.
 */
export const requireAuthentication: onRequestAsyncHookHandler = async (req, reply) => {
  await resolveSession(req, reply);
};

/**
 * onRequest: `requireAuthentication` plus a `ForbiddenError` when the session user
 * is a Guest (`isAnonymous`). Use on routes that a Guest must never reach.
 */
export const requireRegistered: onRequestAsyncHookHandler = async (req, reply) => {
  const { user } = await resolveSession(req, reply);
  if (user.isAnonymous) {
    throw new ForbiddenError('This action requires a registered account.');
  }
};

// Why the caller is not an acting Admin; null when they are one. 'not-found' hides the route from everyone but an admin-role user.
const adminRefusal = ({
  user,
  session,
}: SessionData): 'not-found' | TwoFactorRequiredError | null => {
  if (user.isAnonymous || !user.emailVerified || user.banned || user.role !== 'admin') {
    return 'not-found';
  }
  if (!user.twoFactorEnabled || !session.twoFactorVerified) {
    return new TwoFactorRequiredError();
  }
  return null;
};

/**
 * onRequest for `/api/admin/*`: a verified, unbanned Admin whose auth session passed a second factor (ADR-0027 §2).
 * better-auth 1.7 marks no auth session, so `@nebula-chat/auth` sets `twoFactorVerified` on each verified code; a trusted-device or social sign-in never does.
 */
export const requireAdmin: onRequestAsyncHookHandler = async (req, reply) => {
  // Past the cookie cache, so a revoked role, a ban or a fresh verification applies at once.
  const refusal = adminRefusal(await resolveSession(req, reply, { fresh: true }));
  if (refusal === 'not-found') {
    // Fastify's own handler, so the body matches an unknown route's.
    reply.callNotFound();
    return reply;
  }
  if (refusal) {
    throw refusal;
  }
};

/**
 * Whether the caller would pass `requireAdmin`, read past the cookie cache: for a route an Admin may use more widely than a User.
 */
export const isActingAdmin = async (req: FastifyRequest): Promise<boolean> => {
  const sessionData = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    query: { disableCookieCache: true },
  });
  return sessionData !== null && adminRefusal(sessionData as unknown as SessionData) === null;
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

// The path as better-auth's router would match it: its Node adapter parses `base + url`, which resolves `.`, `..` and `%2e`;
// then percent-escapes decoded and case ignored.
const isAdminPluginPath = (url: string): boolean => {
  const { pathname } = new URL(`http://localhost${url}`);
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // An undecodable path can't name the admin plugin's routes.
  }
  const normalized = path.toLowerCase().replace(/\/{2,}/g, '/');
  return normalized === ADMIN_PLUGIN_PREFIX || normalized.startsWith(`${ADMIN_PLUGIN_PREFIX}/`);
};

const ACCESS_LEVELS = ['public', 'user', 'registered', 'admin', 'operator'] as const;

type AccessLevel = (typeof ACCESS_LEVELS)[number];

declare module 'fastify' {
  // Module augmentation can only merge into an interface, which the repo otherwise forbids.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyContextConfig {
    access?: AccessLevel;
  }
}

// `null` is `public`: no gate.
const GATES: Record<AccessLevel, onRequestAsyncHookHandler | null> = {
  public: null,
  user: requireAuthentication,
  registered: requireRegistered,
  admin: requireAdmin,
  operator: requireOperator,
};

// Swagger UI registers its own routes, which can't declare a level; the docs are public (ADR-0036 §4).
export const DOCS_PREFIX = '/docs';

// @fastify/cors adds `OPTIONS *`; a preflight carries no credentials, so it must stay public.
const isPublicPlugin = (method: string | string[], url: string): boolean =>
  url === DOCS_PREFIX || url.startsWith(`${DOCS_PREFIX}/`) || (method === 'OPTIONS' && url === '*');

const isAccessLevel = (value: unknown): value is AccessLevel =>
  typeof value === 'string' && (ACCESS_LEVELS as readonly string[]).includes(value);

const SECURITY: Record<AccessLevel, Record<string, string[]>[]> = {
  public: [],
  user: [{ cookieAuth: [] }],
  registered: [{ cookieAuth: [] }],
  admin: [{ cookieAuth: [] }],
  operator: [{ operatorToken: [] }],
};

/**
 * Mounts better-auth at `GET|POST /api/auth/*` on the raw req/res (hidden from OpenAPI) and exposes the route gates.
 * Its passthrough body parser lives in an encapsulated child scope, so the rest of the API keeps JSON parsing.
 */
export default fp(
  async (app) => {
    app.decorateRequest('sessionData', null);

    // App-wide (this plugin is fastify-plugin wrapped), so every route is checked, whichever scope registers it.
    app.addHook('onRoute', (route) => {
      const url = route.url;
      const declared = route.config?.access;
      const level = declared ?? (isPublicPlugin(route.method, url) ? 'public' : undefined);
      if (!isAccessLevel(level)) {
        const method = Array.isArray(route.method) ? route.method.join('|') : route.method;
        throw new Error(
          `Route ${method} ${url} must declare an Access level in config.access (one of ${ACCESS_LEVELS.join(', ')}), got ${String(declared)}.`,
        );
      }

      const gate = GATES[level];
      // A HEAD route Fastify derives from a GET reuses the options this hook already changed.
      if (gate) {
        const existing = route.onRequest ?? [];
        const hooks = Array.isArray(existing) ? existing : [existing];
        if (!hooks.includes(gate)) {
          route.onRequest = [gate, ...hooks];
        }
      }

      const schema = route.schema;
      if (schema && !schema.hide) {
        const line = `Access: ${level}`;
        const description = schema.description ?? '';
        route.schema = {
          ...schema,
          // A copy per route: shared arrays serialize as YAML anchors in the generated spec.
          security: structuredClone(SECURITY[level]),
          description: description.endsWith(line)
            ? description
            : `${description}\n\n${line}`.trim(),
        };
      }
    });

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
        // better-auth does its own checks (sign-in has no session yet).
        config: { access: 'public' },
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
