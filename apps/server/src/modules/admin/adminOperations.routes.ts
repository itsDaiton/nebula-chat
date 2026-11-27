import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import { operationsResponseSchema } from '@server/modules/admin/admin.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminOperationsRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        "Report whether the worker is answering, each job queue's counts and the latest failed jobs, as Redis holds them now. Worker liveness counts the instances that answer the log-level read within 2 seconds, so reading never wakes a sleeping worker, and nothing is enqueued. A failed job carries only its id, queue, time, attempts, error and Run id, never its payload. Requires an Admin whose auth session passed two-factor authentication.",
      summary: 'Get operations',
      tags: ['Admin'],
      operationId: 'getAdminOperations',
      response: {
        200: jsonResponse(
          'Worker liveness, queue counts and the latest failed jobs',
          operationsResponseSchema,
        ),
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'An Admin short of two-factor (`TwoFactorRequired`); a signed-in non-Admin gets the unknown-route 404',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
        503: jsonResponse('Redis did not answer (`Unavailable`)', errorEnvelopeSchema),
      },
    },
    config: { access: 'admin' },
    handler: adminController.getOperations,
  });
  done();
};

export default adminOperationsRoutes;
