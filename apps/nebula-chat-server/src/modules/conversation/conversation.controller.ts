import type { FastifyReply, FastifyRequest } from 'fastify';
import { conversationService } from '@backend/modules/conversation/conversation.service';
import type {
  CreateConversationDTO,
  GetConversationParams,
} from '@backend/modules/conversation/conversation.types';

type GetConversationsQuery = {
  limit: number;
  cursor?: string;
};

type SearchConversationsQuery = {
  q: string;
};

export const conversationController = {
  async create(req: FastifyRequest<{ Body: CreateConversationDTO }>, reply: FastifyReply) {
    const conversation = await conversationService.createConversation(req.body);
    return reply.status(201).send(conversation);
  },
  async get(req: FastifyRequest<{ Params: GetConversationParams }>, reply: FastifyReply) {
    const { conversationId } = req.params;
    const conversation = await conversationService.getConversation(conversationId);
    return reply.status(200).send(conversation);
  },
  async getAll(req: FastifyRequest<{ Querystring: GetConversationsQuery }>, reply: FastifyReply) {
    const { limit, cursor } = req.query;
    const result = await conversationService.getAllConversations(limit, cursor);
    return reply.status(200).send(result);
  },
  async search(
    req: FastifyRequest<{ Querystring: SearchConversationsQuery }>,
    reply: FastifyReply,
  ) {
    const { q } = req.query;
    const conversations = await conversationService.searchConversations(q);
    return reply.status(200).send(conversations);
  },
};
