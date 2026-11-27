import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import { adminChangeLogLevelSchema } from '@server/modules/admin/admin.validation';
import {
  logLevelChangeResponseSchema,
  logLevelReportsResponseSchema,
  logLevelServiceQuerySchema,
} from '@server/modules/logLevel/logLevel.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminErrors = {
  401: jsonResponse('Not signed in', errorEnvelopeSchema),
  403: jsonResponse(
    'An Admin short of two-factor (`TwoFactorRequired`); a signed-in non-Admin gets the unknown-route 404',
    errorEnvelopeSchema,
  ),
  500: jsonResponse('Internal server error', errorEnvelopeSchema),
};

const adminLogLevelsRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        "Report the root log level and every component's, with the expiry and setter of any temporary change, from every running instance of the service (the server unless `service` says the worker). An instance that does not answer within 2 seconds is left out, so `receivers` exceeds the number of reports. Requires an Admin whose auth session passed two-factor authentication.",
      summary: 'Get log levels',
      tags: ['Admin'],
      operationId: 'getAdminLogLevels',
      querystring: logLevelServiceQuerySchema,
      response: {
        200: jsonResponse('The levels each instance applies', logLevelReportsResponseSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    config: { access: 'admin' },
    handler: adminController.readLogLevels,
  });

  app.post('', {
    schema: {
      description:
        "Change the root log level, or one component's, on every running instance of the service for `ttlSeconds`, or with `revert` return it to the boot-time level. The services log the change under the acting Admin's name, and it is recorded in the Audit log as `log_level.changed` before it is sent. Requires an Admin whose auth session passed two-factor authentication.",
      summary: 'Change log level',
      tags: ['Admin'],
      operationId: 'changeAdminLogLevel',
      body: adminChangeLogLevelSchema,
      response: {
        202: jsonResponse(
          'Change sent to every instance of the service',
          logLevelChangeResponseSchema,
        ),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        409: jsonResponse('A revert with no temporary change to revert', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    config: { access: 'admin' },
    handler: adminController.changeLogLevel,
  });
  done();
};

export default adminLogLevelsRoutes;
