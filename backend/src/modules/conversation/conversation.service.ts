import { conversationRepository } from '@backend/modules/conversation/conversation.repository';

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
