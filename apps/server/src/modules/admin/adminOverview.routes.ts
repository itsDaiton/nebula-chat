import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { adminController } from '@server/modules/admin/admin.controller';
import { overviewQuerySchema, overviewSchema } from '@server/modules/admin/admin.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const adminOverviewRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('', {
    schema: {
      description:
        'Activity KPIs for the last 7, 14, 30 or 90 UTC days (today included) with the totals of the period just before, for deltas. An active User is a User with a `user` Message on that UTC day; weekly active counts the 7 days ending on each day. A registration is a non-Guest account by creation day. Estimated spend sums the Model call ledger per day. A conversion is a Registered account whose Sessions predate it (a Claim leaves no timestamp, so the account creation day stands in), and the rate is conversions over conversions plus Guests created in the range. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get the admin Overview',
      tags: ['Admin'],
      operationId: 'getAdminOverview',
      querystring: overviewQuerySchema,
      response: {
        200: jsonResponse('Per-day series and totals for each KPI', overviewSchema),
        400: jsonResponse('Invalid query', errorEnvelopeSchema),
        401: jsonResponse('Not signed in', errorEnvelopeSchema),
        403: jsonResponse(
          'Not an Admin (`Forbidden`), or an Admin short of two-factor (`TwoFactorRequired`)',
          errorEnvelopeSchema,
        ),
        500: jsonResponse('Internal server error', errorEnvelopeSchema),
      },
    },
    config: { access: 'admin' },
    handler: adminController.getOverview,
  });
  done();
};

export default adminOverviewRoutes;
