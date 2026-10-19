import type { FastifyReply, FastifyRequest } from 'fastify';
import { logLevelService } from '@backend/modules/logLevel/logLevel.service';
import type { ChangeLogLevelDTO } from '@backend/modules/logLevel/logLevel.types';

export const logLevelController = {
  async change(req: FastifyRequest<{ Body: ChangeLogLevelDTO }>, reply: FastifyReply) {
    const result = await logLevelService.change(req.body);
    return reply.status(202).send(result);
  },

  async read(_req: FastifyRequest, reply: FastifyReply) {
    const result = await logLevelService.read();
    return reply.status(200).send(result);
  },
};
