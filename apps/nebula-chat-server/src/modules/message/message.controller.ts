import type { FastifyReply, FastifyRequest } from 'fastify';
import { messageService } from '@backend/modules/message/message.service';
import type { CreateMessageDTO, GetMessageParams } from '@backend/modules/message/message.types';
import { getSessionData } from '@backend/plugins/auth.plugin';

export const messageController = {
  async create(req: FastifyRequest<{ Body: CreateMessageDTO }>, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const message = await messageService.createMessage(req.body, user.id);
    return reply.status(201).send(message);
  },
  async get(req: FastifyRequest<{ Params: GetMessageParams }>, reply: FastifyReply) {
    const { messageId } = req.params;
    const { user } = getSessionData(req);
    const message = await messageService.getMessage(messageId, user.id);
    return reply.status(200).send(message);
  },
  async getAll(req: FastifyRequest, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const messages = await messageService.getAllMessages(user.id);
    return reply.status(200).send(messages);
  },
};
