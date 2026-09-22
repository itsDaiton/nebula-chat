import type { FastifyReply, FastifyRequest } from 'fastify';
import { conversationService } from '@backend/modules/conversation/conversation.service';
import type {
  CreateConversationDTO,
  GetConversationParams,
} from '@backend/modules/conversation/conversation.types';
import { getSessionData } from '@backend/plugins/authGate.plugin';

type GetConversationsQuery = {
  limit: number;
  cursor?: string;
};

type SearchConversationsQuery = {
  q: string;
};

export const conversationController = {
  async create(req: FastifyRequest<{ Body: CreateConversationDTO }>, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const conversation = await conversationService.createConversation(req.body, user.id);
    return reply.status(201).send(conversation);
  },
  async get(req: FastifyRequest<{ Params: GetConversationParams }>, reply: FastifyReply) {
    const { conversationId } = req.params;
    const { user } = getSessionData(req);
    const conversation = await conversationService.getConversation(conversationId, user.id);
    return reply.status(200).send(conversation);
  },
  async getAll(req: FastifyRequest<{ Querystring: GetConversationsQuery }>, reply: FastifyReply) {
    const { limit, cursor } = req.query;
    const { user } = getSessionData(req);
    const result = await conversationService.getAllConversations(user.id, limit, cursor);
    return reply.status(200).send(result);
  },
  async search(
    req: FastifyRequest<{ Querystring: SearchConversationsQuery }>,
    reply: FastifyReply,
  ) {
    const { q } = req.query;
    const { user } = getSessionData(req);
    const conversations = await conversationService.searchConversations(user.id, q);
    return reply.status(200).send(conversations);
  },
};
