import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { logLevelController } from '@server/modules/logLevel/logLevel.controller';
import { requireOperator } from '@server/utils/operatorGate.hook';
import {
  changeLogLevelSchema,
  logLevelChangeResponseSchema,
  logLevelServiceQuerySchema,
  logLevelReportsResponseSchema,
} from '@server/modules/logLevel/logLevel.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const logLevelRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        "Report the root log level and every component's, with the expiry and operator of any runtime change, from every running instance of the service (the server unless `service` says the worker). Each instance answers for itself; one that does not answer within 2 seconds is left out, so `receivers` exceeds the number of reports. Requires the operator token, not a User session.",
      summary: 'Get log levels',
      tags: ['Operator'],
      operationId: 'getLogLevels',
      querystring: logLevelServiceQuerySchema,
      security: [{ operatorToken: [] }],
      response: {
        200: jsonResponse('The levels each instance applies', logLevelReportsResponseSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        403: jsonResponse('Missing or wrong operator token', errorEnvelopeSchema),
        404: jsonResponse('No operator token is configured', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    onRequest: requireOperator,
    handler: logLevelController.read,
  });

  app.post('', {
    schema: {
      description:
        "Change the root log level, or one component's, on every running instance of the service (the server unless `service` says the worker). It reverts to the boot-time level after `ttlSeconds`. Requires the operator token, not a User session.",
      summary: 'Change log level',
      // orval.config.ts excludes this tag: the browser client gets no hook for it.
      tags: ['Operator'],
      operationId: 'changeLogLevel',
      security: [{ operatorToken: [] }],
      body: changeLogLevelSchema,
      response: {
        202: jsonResponse(
          'Change sent to every instance of the service',
          logLevelChangeResponseSchema,
        ),
        400: jsonResponse('Invalid request body', errorEnvelopeSchema),
        403: jsonResponse('Missing or wrong operator token', errorEnvelopeSchema),
        404: jsonResponse('No operator token is configured', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    onRequest: requireOperator,
    handler: logLevelController.change,
  });
  done();
};

export default logLevelRoutes;
