import { messageRepository } from '@server/modules/message/message.repository';
import { sessionRepository } from '@server/modules/session/session.repository';
import { NotFoundError } from '@nebula-chat/errors';

export const messageService = {
  async getMessage(messageId: string, userId: string) {
    const message = await messageRepository.findById({ messageId }, userId);
    if (!message) {
      throw new NotFoundError('Message', messageId);
    }
    return message;
  },
  async getAllMessages(userId: string, sessionId?: string) {
    // A foreign or missing Session is a 404, as on every other id route, not an empty list.
    if (sessionId !== undefined && !(await sessionRepository.findByIdSimple(sessionId, userId))) {
      throw new NotFoundError('Session', sessionId);
    }
    return messageRepository.findAll(userId, sessionId);
  },
};
