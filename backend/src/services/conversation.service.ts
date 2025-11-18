import { conversationRepository } from '@backend/repositories/conversation.repository';

export const conversationService = {
  createConversation(title: string) {
    return conversationRepository.create({ title });
  },
  getConversation(conversationId: string) {
    return conversationRepository.findById({ conversationId });
  },
  getAllConversations() {
    return conversationRepository.findAll();
  },
};
