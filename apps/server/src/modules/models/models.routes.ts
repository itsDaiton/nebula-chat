import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { modelController } from '@server/modules/models/models.controller';
import { modelCatalogResponseSchema } from '@server/modules/models/models.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const modelRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'The model catalog: the Models a Session can be bound to, with their labels, limits and list prices (USD per million tokens), plus the catalog version and content hash',
      summary: 'Get the model catalog',
      tags: ['Models'],
      operationId: 'getModelCatalog',
      response: {
        200: jsonResponse('The model catalog', modelCatalogResponseSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    // Public: the catalog is static data, the same for every caller.
    handler: modelController.list,
  });
  done();
};

export default modelRoutes;
