import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import {
  listUsersQuerySchema,
  userDetailSchema,
  userIdParamsSchema,
  userPageSchema,
} from '@server/modules/admin/admin.validation';
import { requireAdmin } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminErrors = {
  401: jsonResponse('Not signed in', errorEnvelopeSchema),
  403: jsonResponse(
    'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
    errorEnvelopeSchema,
  ),
  500: jsonResponse('Internal server error', errorEnvelopeSchema),
};

const adminUsersRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'List Users, newest first by default, filtered by status and a name or email search, a page at a time. Guests are left out unless `status=guest`. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'List Users',
      tags: ['Admin'],
      operationId: 'listUsers',
      querystring: listUsersQuerySchema,
      response: {
        200: jsonResponse('A page of Users', userPageSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.listUsers,
  });

  app.get('/:id', {
    schema: {
      description:
        'Read one User: status, two-factor state, ban, Sessions and messages sent, and timestamps. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get a User',
      tags: ['Admin'],
      operationId: 'getUser',
      params: userIdParamsSchema,
      response: {
        200: jsonResponse('The User', userDetailSchema),
        400: jsonResponse('Invalid id', errorEnvelopeSchema),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.getUser,
  });

  app.post('/:id/restore', {
    schema: {
      description:
        'Restore a User in Pending deletion in full, and record it in the Audit log. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Restore a User',
      tags: ['Admin'],
      operationId: 'restoreUser',
      params: userIdParamsSchema,
      response: {
        204: { description: 'The User is no longer pending deletion' },
        400: jsonResponse('Invalid id', errorEnvelopeSchema),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        409: jsonResponse('The User is not pending deletion', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.restoreUser,
  });
  done();
};

export default adminUsersRoutes;
