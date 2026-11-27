import type { FastifyPluginCallbackZodOpenApi } from 'fastify-zod-openapi';
import { errorEnvelopeSchema } from '@nebula-chat/errors';
import { usageController } from '@server/modules/usage/usage.controller';
import {
  usageAgentDetailQuerySchema,
  usageAgentDetailSchema,
  usageDetailQuerySchema,
  usageDetailSchema,
  usageRunSeriesQuerySchema,
  usageRunSeriesSchema,
  usageSeriesQuerySchema,
  usageSeriesSchema,
  usageTotalsQuerySchema,
  usageTotalsSchema,
} from '@server/modules/usage/usage.validation';
import { jsonResponse } from '@server/utils/jsonResponse';

const errors = {
  400: jsonResponse('Invalid query', errorEnvelopeSchema),
  401: jsonResponse('Not signed in', errorEnvelopeSchema),
  403: jsonResponse(
    'An Admin short of two-factor (`TwoFactorRequired`); a signed-in non-Admin gets the unknown-route 404',
    errorEnvelopeSchema,
  ),
  500: jsonResponse('Internal server error', errorEnvelopeSchema),
};

const usageRoutes: FastifyPluginCallbackZodOpenApi = (app, _options, done) => {
  app.get('/series', {
    schema: {
      description:
        'One value per UTC day (today included, zeros filled in) for each Model, for the last 7, 14, 30 or 90 days. `prompts` counts user Messages: a reply is attributed to its Session’s Model and a Message that started a Run counts once, in the `run` series. `tokens` and `spend` sum Model calls per Model that served them. Only the top 8 Models are listed; the rest are grouped as `other`. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get Model usage per day',
      tags: ['Admin'],
      operationId: 'getModelUsageSeries',
      querystring: usageSeriesQuerySchema,
      response: { 200: jsonResponse('Per-day series per Model', usageSeriesSchema), ...errors },
    },
    config: { access: 'admin' },
    handler: usageController.getSeries,
  });

  app.get('/detail', {
    schema: {
      description:
        'One Model on one UTC day: averages per Model call, cache replays, completion rate and duration, with its Prompts trend over the range. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get one Model’s usage on a day',
      tags: ['Admin'],
      operationId: 'getModelUsageDetail',
      querystring: usageDetailQuerySchema,
      response: { 200: jsonResponse('The Model’s day', usageDetailSchema), ...errors },
    },
    config: { access: 'admin' },
    handler: usageController.getDetail,
  });

  app.get('/runs/series', {
    schema: {
      description:
        'One value per UTC day (today included, zeros filled in) for the last 7, 14, 30 or 90 days: Runs started that day by outcome, and the estimated spend and tokens of the Model calls Steps made, per Agent. Runs still queued, running or waiting are not counted by outcome. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get Run usage per day',
      tags: ['Admin'],
      operationId: 'getRunUsageSeries',
      querystring: usageRunSeriesQuerySchema,
      response: {
        200: jsonResponse('Per-day Runs and Agent spend', usageRunSeriesSchema),
        ...errors,
      },
    },
    config: { access: 'admin' },
    handler: usageController.getRunSeries,
  });

  app.get('/runs/detail', {
    schema: {
      description:
        'One Agent on one UTC day: averages per Model call, cache replays, completion rate and duration, with its Model calls per day over the range. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get one Agent’s usage on a day',
      tags: ['Admin'],
      operationId: 'getRunUsageAgentDetail',
      querystring: usageAgentDetailQuerySchema,
      response: { 200: jsonResponse('The Agent’s day', usageAgentDetailSchema), ...errors },
    },
    config: { access: 'admin' },
    handler: usageController.getAgentDetail,
  });

  app.get('/totals', {
    schema: {
      description:
        'Totals over the range with those of the period just before it, for deltas. Requires an Admin whose auth session passed two-factor authentication.',
      summary: 'Get Model usage totals',
      tags: ['Admin'],
      operationId: 'getModelUsageTotals',
      querystring: usageTotalsQuerySchema,
      response: { 200: jsonResponse('Range totals', usageTotalsSchema), ...errors },
    },
    config: { access: 'admin' },
    handler: usageController.getTotals,
  });
  done();
};

export default usageRoutes;
