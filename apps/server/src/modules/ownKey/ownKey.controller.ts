import type { FastifyReply, FastifyRequest } from 'fastify';
import type { OwnKeyBody, OwnKeyParams } from '@server/modules/ownKey/ownKey.types';
import { ownKeyService } from '@server/modules/ownKey/ownKey.service';
import { getSessionData } from '@server/plugins/authGate.plugin';

export const ownKeyController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { user } = getSessionData(req);
    return reply.status(200).send(await ownKeyService.list(user.id));
  },
  async save(req: FastifyRequest, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const { provider } = req.params as OwnKeyParams;
    const { key } = req.body as OwnKeyBody;
    return reply.status(200).send(await ownKeyService.save(user.id, provider, key, req.log));
  },
  async remove(req: FastifyRequest, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const { provider } = req.params as OwnKeyParams;
    await ownKeyService.remove(user.id, provider);
    return reply.status(204).send();
  },
};
