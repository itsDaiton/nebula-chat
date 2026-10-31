import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import {
  adminEmailParamsSchema,
  adminSchema,
  adminsSchema,
  grantAdminSchema,
} from '@server/modules/admin/admin.validation';
import { jsonResponse } from '@server/utils/jsonResponse';
import { requireOperator } from '@server/utils/operatorGate.hook';

const operatorErrors = {
  403: jsonResponse('Missing or wrong operator token', errorEnvelopeSchema),
  404: jsonResponse(
    'No operator token is configured, or no user has that email',
    errorEnvelopeSchema,
  ),
  500: jsonResponse('Internal server error', errorEnvelopeSchema),
};

const adminRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description: 'List every Admin. Requires the operator token, not a User session.',
      summary: 'List Admins',
      tags: ['Operator'],
      operationId: 'listAdmins',
      security: [{ operatorToken: [] }],
      response: {
        200: jsonResponse('Every Admin, oldest account first', adminsSchema),
        403: operatorErrors[403],
        404: jsonResponse('No operator token is configured', errorEnvelopeSchema),
        500: operatorErrors[500],
      },
    },
    onRequest: requireOperator,
    handler: adminController.list,
  });

  app.post('', {
    schema: {
      description:
        'Make a verified Registered user an Admin, and record it in the Audit log with the Operator as actor. This is how the first Admin is made. Requires the operator token, not a User session.',
      summary: 'Grant Admin',
      tags: ['Operator'],
      operationId: 'grantAdmin',
      security: [{ operatorToken: [] }],
      body: grantAdminSchema,
      response: {
        201: jsonResponse('The user is now an Admin', adminSchema),
        400: jsonResponse(
          'Invalid body, or the user is a Guest, unverified or banned',
          errorEnvelopeSchema,
        ),
        409: jsonResponse('The user is already an Admin', errorEnvelopeSchema),
        ...operatorErrors,
      },
    },
    onRequest: requireOperator,
    handler: adminController.grant,
  });

  app.delete('/:email', {
    schema: {
      description:
        'Take the Admin role from a user, and record it in the Audit log with the Operator as actor. Requires the operator token, not a User session.',
      summary: 'Revoke Admin',
      tags: ['Operator'],
      operationId: 'revokeAdmin',
      security: [{ operatorToken: [] }],
      params: adminEmailParamsSchema,
      response: {
        204: { description: 'The user is no longer an Admin' },
        400: jsonResponse('Invalid email', errorEnvelopeSchema),
        409: jsonResponse('The user is not an Admin', errorEnvelopeSchema),
        ...operatorErrors,
      },
    },
    onRequest: requireOperator,
    handler: adminController.revoke,
  });
  done();
};

export default adminRoutes;
