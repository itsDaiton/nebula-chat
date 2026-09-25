import fp from 'fastify-plugin';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { recordedErrorType } from '@backend/errors/requestErrorType';
import { requestPath } from '@backend/utils/requestPath';

/**
 * Request logging: one `info` line per HTTP request, `http.request.completed`,
 * written when the response finishes — plus `http.request.received` at `debug`.
 * Replaces Fastify's own `incoming request`/`request completed` pair, which
 * `utils/logController.ts` disables.
 *
 * Registered through `fastify-plugin` so both hooks sit on the root instance
 * and cover every route, the auth catch-all included. `onResponse` fires on the
 * raw response's `finish`, so it runs for hijacked replies too — the SSE chat
 * route gets its completion line alongside its `chat.reply.completed`.
 *
 * The completion line is written through `reply.log`, which the auth gate
 * rebinds with the User, so it carries `user.id` once a gate has run. A 4xx
 * writes no line of its own; its classification (recorded by the error
 * handler) lands here as `error.type`.
 */
export default fp(
  async (app) => {
    app.addHook('onRequest', async (req) => {
      const path = requestPath(req);
      logEvent(
        componentLogger(req.log, 'http'),
        'debug',
        'http.request.received',
        { 'http.request.method': req.method, 'url.path': path },
        `${req.method} ${path}`,
      );
    });

    app.addHook('onResponse', async (req, reply) => {
      const path = requestPath(req);
      const durationMs = Math.round(reply.elapsedTime * 100) / 100;
      const errorType = recordedErrorType(req);
      logEvent(
        componentLogger(reply.log, 'http'),
        'info',
        'http.request.completed',
        {
          'http.request.method': req.method,
          'url.path': path,
          'http.route': req.routeOptions.url,
          'http.response.status_code': reply.statusCode,
          'nebula.duration_ms': durationMs,
          'error.type': errorType,
        },
        `${[req.method, path, reply.statusCode, errorType].filter(Boolean).join(' ')} · ${durationMs} ms`,
      );
    });
  },
  { name: 'requestLogging' },
);
