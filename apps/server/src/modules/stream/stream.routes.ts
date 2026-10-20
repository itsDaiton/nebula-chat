import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { streamController } from '@backend/modules/stream/stream.controller';
import { replyStreamSchema, streamParamsSchema } from '@backend/modules/stream/stream.validation';
import { requireAuthentication } from '@backend/plugins/authGate.plugin';
import { jsonResponse } from '@backend/utils/jsonResponse';

const streamRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('/:streamId', {
    schema: {
      description:
        'Relay a reply stream as server-sent events, from its first event to its `end` (ADR-0014). Only the User who sent the Message may read it.',
      summary: 'Read reply stream',
      tags: ['Streams'],
      operationId: 'readReplyStream',
      params: streamParamsSchema,
      response: {
        200: {
          description: 'The reply stream, as server-sent events',
          content: { 'text/event-stream': { schema: replyStreamSchema } },
        },
        400: jsonResponse('Invalid stream ID format', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        404: jsonResponse('Stream not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAuthentication,
    handler: streamController.relay,
  });
  done();
};

export default streamRoutes;
