import { messageRepository } from '@backend/modules/message/message.repository';
import { NotFoundError } from '@backend/errors/AppError';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';

export const messageService = {
  async createMessage(data: CreateMessageDTO) {
    return messageRepository.create({ ...data });
  },
  async getMessage(messageId: string) {
    const message = await messageRepository.findById({ messageId });
    if (!message) {
      throw new NotFoundError('Message', messageId);
    }
    return message;
  },
  async getAllMessages() {
    return messageRepository.findAll();
  },
};
