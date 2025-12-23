import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import { NotFoundError } from '@backend/errors/AppError';
import type { CreateConversationDTO } from './conversation.types';

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
  async getAllConversations(limit = 20, cursor?: string) {
    return conversationRepository.findAll(limit, cursor);
  },
};
