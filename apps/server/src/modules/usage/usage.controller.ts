import type { FastifyReply, FastifyRequest } from 'fastify';
import { usageService } from '@server/modules/usage/usage.service';
import type {
  UsageAgentDetailQuery,
  UsageDetailQuery,
  UsageRunSeriesQuery,
  UsageSeriesQuery,
  UsageTotalsQuery,
} from '@server/modules/usage/usage.types';

export const usageController = {
  async getSeries(req: FastifyRequest<{ Querystring: UsageSeriesQuery }>, reply: FastifyReply) {
    return reply.status(200).send(await usageService.getSeries(req.query));
  },
  async getDetail(req: FastifyRequest<{ Querystring: UsageDetailQuery }>, reply: FastifyReply) {
    return reply.status(200).send(await usageService.getDetail(req.query));
  },
  async getRunSeries(
    req: FastifyRequest<{ Querystring: UsageRunSeriesQuery }>,
    reply: FastifyReply,
  ) {
    return reply.status(200).send(await usageService.getRunSeries(req.query));
  },
  async getAgentDetail(
    req: FastifyRequest<{ Querystring: UsageAgentDetailQuery }>,
    reply: FastifyReply,
  ) {
    return reply.status(200).send(await usageService.getAgentDetail(req.query));
  },
  async getTotals(req: FastifyRequest<{ Querystring: UsageTotalsQuery }>, reply: FastifyReply) {
    return reply.status(200).send(await usageService.getTotals(req.query));
  },
};
