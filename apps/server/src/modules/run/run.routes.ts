import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { runController } from '@server/modules/run/run.controller';
import { runIdParamsSchema, runResponseSchema } from '@server/modules/run/run.validation';
import { requireAuthentication } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const runRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('/:runId', {
    schema: {
      description:
        'Retrieve one of the caller’s own Runs with its Brief and every Step, in execution order, each with its full input and output. An Admin whose auth session passed two-factor authentication may read any Run; that read is recorded in the Audit log, and fails if the entry cannot be written.',
      summary: 'Get Run by ID',
      tags: ['Runs'],
      operationId: 'getRun',
      params: runIdParamsSchema,
      response: {
        200: jsonResponse('The Run and its Steps', runResponseSchema),
        400: jsonResponse('Invalid Run ID format', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        404: jsonResponse('Run not found or not owned by the caller', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Owner-scoped: another user's Run reads as 404, never 403, so Run ids don't leak.
    preHandler: requireAuthentication,
    handler: runController.get,
  });
  done();
};

export default runRoutes;
