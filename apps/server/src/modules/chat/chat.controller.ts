import type { FastifyReply, FastifyRequest } from 'fastify';
import { getMessageAllowance as readMessageAllowance } from '@server/modules/chat/chat.messageAllowance.service';
import type { SendMessageDTO, SendMessageParams } from '@server/modules/chat/chat.types';
import { chatService } from '@server/modules/chat/chat.service';
import { getSessionData } from '@server/plugins/authGate.plugin';

export const chatController = {
  async sendMessage(req: FastifyRequest, reply: FastifyReply) {
    const { sessionId } = req.params as SendMessageParams;
    const { user } = getSessionData(req);
    const sent = await chatService.sendMessage(
      sessionId,
      req.body as SendMessageDTO,
      user.id,
      req.log,
    );
    return reply.status(202).send(sent);
  },

  async getMessageAllowance(req: FastifyRequest, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const allowance = await readMessageAllowance(user);
    return reply.status(200).send(allowance);
  },
};
