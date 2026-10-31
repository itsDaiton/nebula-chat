import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import {
  adminSessionDetailSchema,
  sessionIdParamsSchema,
} from '@server/modules/admin/admin.validation';
import { requireAdmin } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminSessionsRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('/:id', {
    schema: {
      description:
        'Read any Session with all its Messages, oldest first, and record the read in the Audit log. If the Audit entry cannot be written the request fails. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Read a Session',
      tags: ['Admin'],
      operationId: 'readSession',
      params: sessionIdParamsSchema,
      response: {
        200: jsonResponse('The Session and its Messages', adminSessionDetailSchema),
        400: jsonResponse('Invalid id', errorEnvelopeSchema),
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
          errorEnvelopeSchema,
        ),
        404: jsonResponse('No Session has that id', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAdmin,
    handler: adminController.readSession,
  });
  done();
};

export default adminSessionsRoutes;
