import type { FastifyReply, FastifyRequest } from 'fastify';
import { userService } from '@server/modules/user/user.service';
import type { UserIdParams } from '@server/modules/user/user.types';
import { getSessionData } from '@server/plugins/authGate.plugin';

export const userController = {
  async restore(req: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
    await userService.restore(req.params.id, getSessionData(req).user.id);
    return reply.status(204).send();
  },
};
