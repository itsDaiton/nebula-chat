import type { FastifyReply, FastifyRequest } from 'fastify';
import { runService } from '@server/modules/run/run.service';
import type { RunIdParams } from '@server/modules/run/run.types';
import { getSessionData, isActingAdmin } from '@server/plugins/authGate.plugin';

export const runController = {
  async get(req: FastifyRequest<{ Params: RunIdParams }>, reply: FastifyReply) {
    const run = await runService.getRun(req.params.runId, {
      userId: getSessionData(req).user.id,
      isActingAdmin: () => isActingAdmin(req),
    });
    return reply.status(200).send(run);
  },
};
