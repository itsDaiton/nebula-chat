import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { logLevelController } from '@backend/modules/logLevel/logLevel.controller';
import { requireOperator } from '@backend/modules/logLevel/logLevel.operatorGate.hook';
import {
  changeLogLevelSchema,
  logLevelChangeResponseSchema,
} from '@backend/modules/logLevel/logLevel.validation';
import { jsonResponse } from '@backend/utils/jsonResponse';

const logLevelRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.post('', {
    schema: {
      description:
        "Change the root log level, or one component's, on every running server instance. It reverts to the boot-time level after `ttlSeconds`. Requires the operator token, not a User session.",
      summary: 'Change log level',
      // orval.config.ts excludes this tag: the browser client gets no hook for it.
      tags: ['Operator'],
      operationId: 'changeLogLevel',
      security: [{ operatorToken: [] }],
      body: changeLogLevelSchema,
      response: {
        202: jsonResponse('Change sent to every server instance', logLevelChangeResponseSchema),
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
