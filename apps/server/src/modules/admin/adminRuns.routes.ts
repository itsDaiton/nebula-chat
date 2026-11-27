import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import {
  adminRunListPageSchema,
  listRunsQuerySchema,
} from '@server/modules/admin/admin.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminRunsRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'List Runs across all Users, newest first by default, filtered by status, owner and start time, and sorted by start, duration, tokens or cost, a page at a time. Listing is not a content read, so nothing is audited; opening a Run is (`GET /api/runs/{runId}`). Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'List Runs',
      tags: ['Admin'],
      operationId: 'listAllRuns',
      querystring: listRunsQuerySchema,
      response: {
        200: jsonResponse('A page of Runs', adminRunListPageSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'An Admin short of two-factor (`TwoFactorRequired`); a signed-in non-Admin gets the unknown-route 404',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: { access: 'admin' },
    handler: adminController.listRuns,
  });
  done();
};

export default adminRunsRoutes;
