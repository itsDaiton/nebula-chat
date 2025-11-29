import { messageRepository } from '@backend/modules/message/message.repository';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';

export const messageService = {
  createMessage(data: CreateMessageDTO) {
    return messageRepository.create({ ...data });
  },
  getMessage(messageId: string) {
    return messageRepository.findById({ messageId });
  },
};
