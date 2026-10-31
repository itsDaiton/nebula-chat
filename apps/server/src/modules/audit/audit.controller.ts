import type { FastifyReply, FastifyRequest } from 'fastify';
import { auditService } from '@server/modules/audit/audit.service';
import type { ListAuditQuery } from '@server/modules/audit/audit.types';

export const auditController = {
  async list(req: FastifyRequest<{ Querystring: ListAuditQuery }>, reply: FastifyReply) {
    const { limit, cursor, ...filters } = req.query;
    const page = await auditService.list(filters, limit, cursor);
    return reply.status(200).send(page);
  },
};
