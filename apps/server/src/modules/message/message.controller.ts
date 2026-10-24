import type { FastifyReply, FastifyRequest } from 'fastify';
import { messageService } from '@server/modules/message/message.service';
import type {
  CreateMessageDTO,
  GetMessageParams,
  ListMessagesQuery,
} from '@server/modules/message/message.types';
import { getSessionData } from '@server/plugins/authGate.plugin';

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
  async getAll(req: FastifyRequest<{ Querystring: ListMessagesQuery }>, reply: FastifyReply) {
    const { sessionId } = req.query;
    const { user } = getSessionData(req);
    const messages = await messageService.getAllMessages(user.id, sessionId);
    return reply.status(200).send(messages);
  },
};
