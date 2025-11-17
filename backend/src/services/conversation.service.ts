import { conversationRepository } from '@backend/repositories/conversation.repository';
import type { CreateConversationDTO } from '@backend/types/conversation.types';

export const conversationService = {
  createConversation(title: CreateConversationDTO) {
    return conversationRepository.create(title);
  },
  getConversation(conversationId: string) {
    return conversationRepository.findById({ conversationId });
  },
  getAllConversations() {
    return conversationRepository.findAll();
  },
};
