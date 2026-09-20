import { messageRepository } from '@backend/modules/message/message.repository';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import { NotFoundError } from '@backend/errors/AppError';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';

export const messageService = {
  async createMessage(data: CreateMessageDTO, userId: string) {
    // A message may only be added to a conversation the caller owns (ADR-0010 §2).
    // An unowned or missing conversation reads as a 404, never leaking existence.
    const conversation = await conversationRepository.findByIdSimple(data.conversationId, userId);
    if (!conversation) {
      throw new NotFoundError('Conversation', data.conversationId);
    }
    return messageRepository.create({ ...data });
  },
  async getMessage(messageId: string, userId: string) {
    const message = await messageRepository.findById({ messageId }, userId);
    if (!message) {
      throw new NotFoundError('Message', messageId);
    }
    return message;
  },
  async getAllMessages(userId: string) {
    return messageRepository.findAll(userId);
  },
};
