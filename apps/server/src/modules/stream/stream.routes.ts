import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { streamController } from '@server/modules/stream/stream.controller';
import {
  replyStreamHeadersSchema,
  replyStreamQuerySchema,
  replyStreamSchema,
  streamParamsSchema,
} from '@server/modules/stream/stream.validation';
import { requireAuthentication } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const streamRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('/:streamId', {
    schema: {
      description:
        'Relay a reply stream as server-sent events, from its first event (or after `Last-Event-ID`) to its `end` (ADR-0014). Only the User who sent the Message may read it. A stream that has expired answers 404: read the persisted Message instead.',
      summary: 'Read reply stream',
      tags: ['Streams'],
      operationId: 'readReplyStream',
      params: streamParamsSchema,
      querystring: replyStreamQuerySchema,
      headers: replyStreamHeadersSchema,
      response: {
        200: {
          description: 'The reply stream, as server-sent events',
          content: { 'text/event-stream': { schema: replyStreamSchema } },
        },
        400: jsonResponse('Invalid stream ID or Last-Event-ID format', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        404: jsonResponse(
          'Stream not found, expired, or not owned by the caller',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAuthentication,
    handler: streamController.relay,
  });
  app.post('/:streamId/cancel', {
    schema: {
      description:
        'Stop a Direct reply in flight: the worker aborts the model call, persists what it had produced and ends the stream with `end` { reason: "cancelled" }. Cancelling a reply that already finished does nothing.',
      summary: 'Cancel reply stream',
      tags: ['Streams'],
      operationId: 'cancelReplyStream',
      params: streamParamsSchema,
      response: {
        204: { description: 'Stop requested, or the reply had already finished' },
        400: jsonResponse('Invalid stream ID format', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        404: jsonResponse('Stream not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAuthentication,
    handler: streamController.cancel,
  });
  done();
};

export default streamRoutes;
