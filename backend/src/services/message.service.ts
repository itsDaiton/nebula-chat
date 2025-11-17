import { messageRepository } from '@backend/repositories/message.repository';
import type { CreateMessageDTO } from '@backend/types/message.types';

export const messageService = {
  createMessage(data: CreateMessageDTO) {
    return messageRepository.create(data);
  },
  getMessage(messageId: string) {
    return messageRepository.findById({ messageId });
  },
};
