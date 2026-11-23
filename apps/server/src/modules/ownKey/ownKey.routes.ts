import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { ownKeyController } from '@server/modules/ownKey/ownKey.controller';
import { requireVerified } from '@server/modules/ownKey/ownKey.verified.hook';
import { limitOwnKeyWrites } from '@server/modules/ownKey/ownKey.writeLimit.hook';
import {
  ownKeyBodySchema,
  ownKeyListSchema,
  ownKeyParamsSchema,
  ownKeySchema,
} from '@server/modules/ownKey/ownKey.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const ownKeyRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        "The caller's stored Own keys: provider, last four characters and validation status. The key itself is never returned.",
      summary: 'List Own keys',
      tags: ['Own keys'],
      operationId: 'listOwnKeys',
      response: {
        200: jsonResponse('The stored Own keys', ownKeyListSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        403: jsonResponse(
          'A Guest or an unverified user cannot hold an Own key',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: { access: 'registered' },
    onRequest: [requireVerified],
    handler: ownKeyController.list,
  });

  app.put('/:provider', {
    schema: {
      description:
        'Store or replace the verified Registered user’s Own key for a provider. The key is encrypted to the worker’s public key and only its last four characters are kept readable; a worker job then validates it, and it is used only once `valid`.',
      summary: 'Save Own key',
      tags: ['Own keys'],
      operationId: 'saveOwnKey',
      params: ownKeyParamsSchema,
      body: ownKeyBodySchema,
      response: {
        200: jsonResponse('Key stored and queued for validation', ownKeySchema),
        400: jsonResponse('Invalid provider or key', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        403: jsonResponse(
          'A Guest or an unverified user cannot hold an Own key',
          errorEnvelopeSchema,
        ),
        404: jsonResponse('Own keys are switched off on this server', errorEnvelopeSchema),
        429: jsonResponse('Too many saves this hour', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: { access: 'registered' },
    onRequest: [requireVerified, limitOwnKeyWrites],
    handler: ownKeyController.save,
  });

  app.delete('/:provider', {
    schema: {
      description:
        'Remove the caller’s Own key for a provider, so its Model calls use the Operator key again. Succeeds when there is none.',
      summary: 'Remove Own key',
      tags: ['Own keys'],
      operationId: 'removeOwnKey',
      params: ownKeyParamsSchema,
      response: {
        204: { description: 'Own key removed' },
        400: jsonResponse('Invalid provider', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        403: jsonResponse(
          'A Guest or an unverified user cannot hold an Own key',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: { access: 'registered' },
    onRequest: [requireVerified],
    handler: ownKeyController.remove,
  });
  done();
};

export default ownKeyRoutes;
