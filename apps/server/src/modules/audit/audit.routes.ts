import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { auditController } from '@server/modules/audit/audit.controller';
import { auditPageSchema, listAuditQuerySchema } from '@server/modules/audit/audit.validation';
import { requireAdmin } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const auditRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'List Audit log entries, newest first, filtered by actor, action, target and time range, a page at a time. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'List Audit log',
      tags: ['Admin'],
      operationId: 'listAuditEntries',
      querystring: listAuditQuerySchema,
      response: {
        200: jsonResponse('A page of Audit log entries', auditPageSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAdmin,
    handler: auditController.list,
  });
  done();
};

export default auditRoutes;
