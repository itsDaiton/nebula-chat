import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { modelController } from '@server/modules/models/models.controller';
import { modelsArraySchema } from '@server/modules/models/models.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const modelRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'The Models a Session can be bound to, with their labels, limits and list prices (USD per million tokens)',
      summary: 'List Models',
      tags: ['Models'],
      operationId: 'listModels',
      response: {
        200: jsonResponse('The model catalog', modelsArraySchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Public: the catalog is static data, the same for every caller.
    handler: modelController.list,
  });
  done();
};

export default modelRoutes;
