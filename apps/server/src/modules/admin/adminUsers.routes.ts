import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import {
  adminSessionPageSchema,
  banUserSchema,
  listUserSessionsQuerySchema,
  listUsersQuerySchema,
  setRoleSchema,
  userDetailSchema,
  userIdParamsSchema,
  userPageSchema,
} from '@server/modules/admin/admin.validation';
import { requireAdmin } from '@server/plugins/authGate.plugin';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminErrors = {
  401: jsonResponse('Not signed in', errorEnvelopeSchema),
  403: jsonResponse(
    'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
    errorEnvelopeSchema,
  ),
  500: jsonResponse('Internal server error', errorEnvelopeSchema),
};

const adminUsersRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'List Users, newest first by default, filtered by status and a name or email search, a page at a time. Guests are left out unless `status=guest`. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'List Users',
      tags: ['Admin'],
      operationId: 'listUsers',
      querystring: listUsersQuerySchema,
      response: {
        200: jsonResponse('A page of Users', userPageSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.listUsers,
  });

  app.get('/:id', {
    schema: {
      description:
        'Read one User: status, two-factor state, ban, Sessions and messages sent, and timestamps. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get a User',
      tags: ['Admin'],
      operationId: 'getUser',
      params: userIdParamsSchema,
      response: {
        200: jsonResponse('The User', userDetailSchema),
        400: jsonResponse('Invalid id', errorEnvelopeSchema),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.getUser,
  });

  app.get('/:id/sessions', {
    schema: {
      description:
        "List a User's Sessions, archived ones included and marked, newest first, a page at a time. Listing is not a content read, so it writes no Audit entry. Requires an Admin whose auth session passed two-factor authentication.",
      summary: "List a User's Sessions",
      tags: ['Admin'],
      operationId: 'listUserSessions',
      params: userIdParamsSchema,
      querystring: listUserSessionsQuerySchema,
      response: {
        200: jsonResponse('A page of Sessions', adminSessionPageSchema),
        400: jsonResponse('Invalid id or query', errorEnvelopeSchema),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.listUserSessions,
  });

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
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        409: jsonResponse('The User is not pending deletion', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.restoreUser,
  });

  const cacheNote =
    'Sessions are revoked through Redis secondary storage; a cookie-cache holder may stay signed in for up to five minutes, as with Sign out everywhere.';

  app.post('/:id/role', {
    schema: {
      description: `Grant or revoke the Admin role, and record it in the Audit log. A Guest, an unverified or a banned user cannot become an Admin (\`NotEligibleForAdmin\`), and the last Admin cannot be revoked (\`LastAdmin\`). Requires an Admin whose auth session passed two-factor authentication.`,
      summary: 'Grant or revoke Admin',
      tags: ['Admin'],
      operationId: 'setUserRole',
      params: userIdParamsSchema,
      body: setRoleSchema,
      response: {
        204: { description: 'The role is changed' },
        400: jsonResponse('Invalid id or body', errorEnvelopeSchema),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        409: jsonResponse(
          'Already (or not) an Admin (`Conflict`), not eligible (`NotEligibleForAdmin`) or the last Admin (`LastAdmin`)',
          errorEnvelopeSchema,
        ),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.setRole,
  });

  app.post('/:id/ban', {
    schema: {
      description: `Ban a User with a reason and an optional end time, revoke every auth session of theirs, and record it in the Audit log. Their sign-in then fails with the reason and end time until the ban ends or is lifted. The last Admin cannot be banned (\`LastAdmin\`). ${cacheNote} Requires an Admin whose auth session passed two-factor authentication.`,
      summary: 'Ban a User',
      tags: ['Admin'],
      operationId: 'banUser',
      params: userIdParamsSchema,
      body: banUserSchema,
      response: {
        204: { description: 'The User is banned' },
        400: jsonResponse(
          'Invalid id or body, or the Admin banning themselves',
          errorEnvelopeSchema,
        ),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        409: jsonResponse(
          'Already banned (`Conflict`) or the last Admin (`LastAdmin`)',
          errorEnvelopeSchema,
        ),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.banUser,
  });

  app.post('/:id/unban', {
    schema: {
      description:
        'Lift a ban, and record it in the Audit log. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Unban a User',
      tags: ['Admin'],
      operationId: 'unbanUser',
      params: userIdParamsSchema,
      response: {
        204: { description: 'The User is no longer banned' },
        400: jsonResponse('Invalid id', errorEnvelopeSchema),
        404: jsonResponse('No User has that id', errorEnvelopeSchema),
        409: jsonResponse('The User is not banned', errorEnvelopeSchema),
        ...adminErrors,
      },
    },
    preHandler: requireAdmin,
    handler: adminController.unbanUser,
  });
  done();
};

export default adminUsersRoutes;
