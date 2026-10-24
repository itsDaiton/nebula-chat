import fp from 'fastify-plugin';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { recordedErrorType } from '@server/errors/requestErrorType';
import { requestPath } from '@server/utils/requestPath';

/**
 * One `info` `http.request.completed` per request (plus `http.request.received` at `debug`), replacing Fastify's own pair.
 * Registered via `fastify-plugin` on the root, so it covers every route, hijacked SSE and the auth catch-all included.
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
