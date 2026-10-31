import { messageRepository } from '@server/modules/message/message.repository';
import { sessionRepository } from '@server/modules/session/session.repository';
import { ConflictError, NotFoundError } from '@nebula-chat/errors';
import type { CreateMessageDTO, MessageMeta } from '@server/modules/message/message.types';

// A Message just created has no Model call yet, so none of its metadata exists.
const NO_META: MessageMeta = {
  model: null,
  estimatedCostUsd: null,
  contextTokens: null,
  contextMessages: null,
};

export const messageService = {
  async createMessage(data: CreateMessageDTO, userId: string) {
    // A message may only be added to a session the caller owns (ADR-0010 §2).
    // An unowned or missing session reads as a 404, never leaking existence.
    const session = await sessionRepository.findByIdSimple(data.sessionId, userId);
    if (!session) {
      throw new NotFoundError('Session', data.sessionId);
    }
    if (session.archivedAt) {
      throw new ConflictError('This Session is archived. Restore it before adding a Message.');
    }
    return { ...(await messageRepository.create({ ...data })), ...NO_META };
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
