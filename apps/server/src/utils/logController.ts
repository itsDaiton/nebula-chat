import { LogController } from 'fastify';
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';
import { errorCodeForStatus } from '@nebula-chat/errors';
import { componentLogger, logEvent } from '@nebula-chat/otel';
import { recordErrorType } from '@server/errors/requestErrorType';
import { requestPath } from '@server/utils/requestPath';

/**
 * Fastify's hook for its own log lines: request lines are off (`requestLogging.plugin.ts` replaces them), the request id is `http.request.id`,
 * and remaining framework faults are stamped `fastify.log` via `logEvent`. A class because Fastify takes only a `LogController` instance.
 */
class StampedLogController extends LogController {
  // Reached only if `errors/error.handler.ts` itself throws. Same rule as the
  // handler: classify always, write a line only for a 5xx.
  override defaultErrorLog(error: Error, request: FastifyRequest, reply: FastifyReply): void {
    const errorType = errorCodeForStatus(reply.statusCode);
    recordErrorType(request, errorType);
    if (reply.statusCode < 500) {
      return;
    }
    logEvent(
      componentLogger(reply.log, 'http'),
      'error',
      'fastify.log',
      { err: error, 'error.type': errorType, 'http.response.status_code': reply.statusCode },
      `Fastify's fallback error handler answered ${request.method} ${requestPath(request)}`,
    );
  }

  override streamError(error: Error, _request: FastifyRequest, reply: FastifyReply): void {
    // A client closing an SSE stream early is routine, not a failure.
    if ((error as { code?: unknown }).code === 'ERR_STREAM_PREMATURE_CLOSE') {
      logEvent(
        componentLogger(reply.log, 'http'),
        'debug',
        'fastify.log',
        {},
        'Stream closed early',
      );
      return;
    }
    logEvent(
      componentLogger(reply.log, 'http'),
      'warn',
      'fastify.log',
      { err: error },
      'Response stream failed after the headers were sent',
    );
  }

  override routeNotFound(request: FastifyRequest): void {
    // `http.request.completed` already reports the 404; only classify it.
    recordErrorType(request, 'NotFound');
  }

  override writeHeadError(error: Error, _request: FastifyRequest, reply: FastifyReply): void {
    logEvent(
      componentLogger(reply.log, 'http'),
      'warn',
      'fastify.log',
      { err: error },
      'Writing the error response headers failed',
    );
  }

  override serializerError(
    error: Error,
    _request: FastifyRequest,
    reply: FastifyReply,
    metadata: { statusCode: number },
  ): void {
    logEvent(
      componentLogger(reply.log, 'http'),
      'error',
      'fastify.log',
      { err: error, 'http.response.status_code': metadata.statusCode },
      `The response serializer for status ${metadata.statusCode} failed`,
    );
  }

  override serviceUnavailable(logger: FastifyBaseLogger): void {
    logEvent(
      componentLogger(logger, 'http'),
      'info',
      'fastify.log',
      { 'http.response.status_code': 503 },
      'Refused a request: the server is closing',
    );
  }
}

// Typed as Fastify's base class: callers see its full method signatures.
export const logController: LogController = new StampedLogController({
  disableRequestLogging: true,
  requestIdLogLabel: 'http.request.id',
});
