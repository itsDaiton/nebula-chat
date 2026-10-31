import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { userController } from '@server/modules/user/user.controller';
import { userIdParamsSchema } from '@server/modules/user/user.validation';
import { requireAdmin } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const userRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
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
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
          errorEnvelopeSchema,
        ),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        409: jsonResponse('The User is not pending deletion', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAdmin,
    handler: userController.restore,
  });
  done();
};

export default userRoutes;
