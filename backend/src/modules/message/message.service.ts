import { messageRepository } from '@backend/modules/message/message.repository';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';

export const messageService = {
  async createMessage(data: CreateMessageDTO) {
    return messageRepository.create({ ...data });
  },
  async getMessage(messageId: string) {
    return messageRepository.findById({ messageId });
  },
  async getAllMessages() {
    return messageRepository.findAll();
  },
};
