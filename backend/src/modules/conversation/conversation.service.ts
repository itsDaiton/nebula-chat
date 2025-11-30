import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import type { CreateConversationDTO } from './conversation.types';

export const conversationService = {
  async createConversation(data: CreateConversationDTO) {
    return conversationRepository.create(data);
  },
  getConversation(conversationId: string) {
    return conversationRepository.findById({ conversationId });
  },
  async getAllConversations() {
    return conversationRepository.findAll();
  },
};
