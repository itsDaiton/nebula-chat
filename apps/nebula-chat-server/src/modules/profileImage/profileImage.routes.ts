import type { onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { profileImageController } from '@backend/modules/profileImage/profileImage.controller';
import { profileImageService } from '@backend/modules/profileImage/profileImage.service';
import { limitProfileImageUploads } from '@backend/modules/profileImage/profileImage.uploadLimit.hook';
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_CONTENT_TYPES,
  profileImageBodySchema,
  profileImageSchema,
  profileImageSettingsSchema,
} from '@backend/modules/profileImage/profileImage.validation';
import { requireAuthentication, requireRegistered } from '@backend/plugins/authGate.plugin';
import { jsonResponse } from '@backend/utils/jsonResponse';

// onRequest, so a Guest or a server without storage is turned away before the body is read.
const requireUploadsEnabled: onRequestAsyncHookHandler = async () => {
  profileImageService.assertUploadsEnabled();
};

const profileImageRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  // Scoped to this plugin: an upload is the raw image bytes, and any other body type is a 415.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser(
    [...PROFILE_IMAGE_CONTENT_TYPES],
    { parseAs: 'buffer', bodyLimit: MAX_PROFILE_IMAGE_BYTES },
    (_req, body, parsed) => parsed(null, body),
  );

  app.get('/settings', {
    schema: {
      description: 'Whether this server can store Profile image uploads.',
      summary: 'Get Profile image settings',
      tags: ['Profile image'],
      operationId: 'getProfileImageSettings',
      response: {
        200: jsonResponse('Profile image settings', profileImageSettingsSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireAuthentication,
    handler: profileImageController.settings,
  });

  app.put('', {
    bodyLimit: MAX_PROFILE_IMAGE_BYTES,
    schema: {
      description:
        "Set the Registered user's Profile image from a JPEG, PNG or WebP of up to 5 MB, sent as the raw request body. It is stored as a 256×256 WebP; the previous upload is deleted.",
      summary: 'Upload Profile image',
      tags: ['Profile image'],
      operationId: 'uploadProfileImage',
      body: profileImageBodySchema,
      response: {
        200: jsonResponse('Profile image stored', profileImageSchema),
        400: jsonResponse('The file is not a JPEG, PNG or WebP image', errorEnvelopeSchema),
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        403: jsonResponse('A Guest cannot set a Profile image', errorEnvelopeSchema),
        404: jsonResponse('Profile image uploads are switched off', errorEnvelopeSchema),
        413: jsonResponse('The file is larger than 5 MB', errorEnvelopeSchema),
        415: jsonResponse('The body is not a JPEG, PNG or WebP', errorEnvelopeSchema),
        429: jsonResponse('Too many uploads this hour', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    onRequest: [requireRegistered, requireUploadsEnabled],
    preHandler: limitProfileImageUploads,
    handler: profileImageController.upload,
  });

  app.delete('', {
    schema: {
      description:
        "Remove the Registered user's Profile image, so their Avatar shows initials. Succeeds when there is none.",
      summary: 'Remove Profile image',
      tags: ['Profile image'],
      operationId: 'removeProfileImage',
      response: {
        204: { description: 'Profile image removed' },
        401: jsonResponse('No auth session', errorEnvelopeSchema),
        403: jsonResponse('A Guest cannot have a Profile image', errorEnvelopeSchema),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    preHandler: requireRegistered,
    handler: profileImageController.remove,
  });
  done();
};

export default profileImageRoutes;
