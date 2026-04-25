import type { FastifyReply, FastifyRequest } from 'fastify';
import { messageService } from '@backend/modules/message/message.service';
import type { CreateMessageDTO, GetMessageParams } from '@backend/modules/message/message.types';

export const messageController = {
  async create(req: FastifyRequest<{ Body: CreateMessageDTO }>, reply: FastifyReply) {
    const message = await messageService.createMessage(req.body);
    return reply.status(201).send(message);
  },
  async get(req: FastifyRequest<{ Params: GetMessageParams }>, reply: FastifyReply) {
    const { messageId } = req.params;
    const message = await messageService.getMessage(messageId);
    return reply.status(200).send(message);
  },
  async getAll(_req: FastifyRequest, reply: FastifyReply) {
    const messages = await messageService.getAllMessages();
    return reply.status(200).send(messages);
  },
};
