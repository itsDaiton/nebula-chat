import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import { NotFoundError } from '@nebula-chat/errors';
import { paginationConfig } from '@backend/config/pagination.config';
import type { CreateConversationDTO } from '@backend/modules/conversation/conversation.types';

export const conversationService = {
  async createConversation(data: CreateConversationDTO, userId: string) {
    // conversations.userId is NOT NULL (ADR-0010 §2): the owner is the session
    // user, resolved in the controller — never trusted from the request body.
    return conversationRepository.create(data, userId);
  },
  async getConversation(conversationId: string, userId: string) {
    const conversation = await conversationRepository.findById({ conversationId }, userId);
    if (!conversation) {
      throw new NotFoundError('Conversation', conversationId);
    }
    return conversation;
  },
  async getAllConversations(
    userId: string,
    limit = paginationConfig.defaultLimit,
    cursor?: string,
  ) {
    return conversationRepository.findAll(userId, limit, cursor);
  },
  async searchConversations(userId: string, query: string) {
    return conversationRepository.search(userId, query);
  },
};
