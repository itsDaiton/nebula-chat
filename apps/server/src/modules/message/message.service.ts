import { messageRepository } from '@backend/modules/message/message.repository';
import { sessionRepository } from '@backend/modules/session/session.repository';
import { NotFoundError } from '@nebula-chat/errors';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';

export const messageService = {
  async createMessage(data: CreateMessageDTO, userId: string) {
    // A message may only be added to a session the caller owns (ADR-0010 §2).
    // An unowned or missing session reads as a 404, never leaking existence.
    const session = await sessionRepository.findByIdSimple(data.sessionId, userId);
    if (!session) {
      throw new NotFoundError('Session', data.sessionId);
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
  async getAllMessages(userId: string, sessionId?: string) {
    return messageRepository.findAll(userId, sessionId);
  },
};
