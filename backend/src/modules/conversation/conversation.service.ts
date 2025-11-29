import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import type { CreateConversationDTO } from './conversation.types';

export const conversationService = {
  createConversation(data: CreateConversationDTO) {
    return conversationRepository.create(data);
  },
  getConversation(conversationId: string) {
    return conversationRepository.findById({ conversationId });
  },
  getAllConversations() {
    return conversationRepository.findAll();
  },
};
