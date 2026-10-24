import type { FastifyReply, FastifyRequest } from 'fastify';
import { profileImageService } from '@server/modules/profileImage/profileImage.service';
import { getSessionData } from '@server/plugins/authGate.plugin';

export const profileImageController = {
  async settings(_req: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(profileImageService.settings());
  },
  async upload(req: FastifyRequest<{ Body: Buffer | undefined }>, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const profileImage = await profileImageService.upload(user.id, req.body, req.log);
    return reply.status(200).send(profileImage);
  },
  async remove(req: FastifyRequest, reply: FastifyReply) {
    const { user } = getSessionData(req);
    await profileImageService.remove(user.id, req.log);
    return reply.status(204).send();
  },
};
