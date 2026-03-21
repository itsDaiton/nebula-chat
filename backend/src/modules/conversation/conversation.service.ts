import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import { NotFoundError } from '@backend/errors/AppError';
import { paginationConfig } from '@backend/config/pagination.config';
import type { CreateConversationDTO } from '@backend/modules/conversation/conversation.types';

export const conversationService = {
  async createConversation(data: CreateConversationDTO) {
    return conversationRepository.create(data);
  },
  async getConversation(conversationId: string) {
    const conversation = await conversationRepository.findById({ conversationId });
    if (!conversation) {
      throw new NotFoundError('Conversation', conversationId);
    }
    return conversation;
  },
  async getAllConversations(limit = paginationConfig.defaultLimit, cursor?: string) {
    return conversationRepository.findAll(limit, cursor);
  },
  async searchConversations(query: string) {
    return conversationRepository.search(query);
  },
};
