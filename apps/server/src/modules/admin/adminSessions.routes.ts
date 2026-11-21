import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import {
  adminSessionDetailSchema,
  adminSessionListPageSchema,
  listSessionsQuerySchema,
  sessionIdParamsSchema,
} from '@server/modules/admin/admin.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminSessionsRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'List Sessions across all Users, most recently active first by default, filtered by a title search, owner, Model and archived state, a page at a time. Listing is not a content read, so nothing is audited. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'List Sessions',
      tags: ['Admin'],
      operationId: 'listAllSessions',
      querystring: listSessionsQuerySchema,
      response: {
        200: jsonResponse('A page of Sessions', adminSessionListPageSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: { access: 'admin' },
    handler: adminController.listSessions,
  });

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
    config: { access: 'admin' },
    handler: adminController.readSession,
  });
  done();
};

export default adminSessionsRoutes;
