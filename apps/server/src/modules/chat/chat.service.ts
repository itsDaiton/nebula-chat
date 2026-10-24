import { randomUUID } from 'node:crypto';
import { NotFoundError, PayloadTooLargeError } from '@nebula-chat/errors';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@server/db';
import type { ChatLogger, SendMessageDTO, SentMessage } from '@server/modules/chat/chat.types';
import { messageRepository } from '@server/modules/message/message.repository';
import { sessionRepository } from '@server/modules/session/session.repository';
import { enqueueDirectReply } from '@server/queue';
import { saveStreamOwner } from '@server/redis';
import { countTokens } from '@server/utils/countTokens';

const MAX_PROMPT_TOKENS = 2000;

export const chatService = {
  /**
   * Accepts a user Message for a Direct reply: persists it, records who may read
   * the reply stream, and enqueues the job. No LLM work happens here; the worker
   * produces the reply onto the stream (ADR-0013, ADR-0014).
   */
  async sendMessage(
    sessionId: string,
    input: SendMessageDTO,
    userId: string,
    logger: ChatLogger,
  ): Promise<SentMessage> {
    const tokens = countTokens(input.content);
    if (tokens > MAX_PROMPT_TOKENS) {
      throw new PayloadTooLargeError(
        `User message exceeds token limit. Message has ${tokens} tokens, maximum allowed is ${MAX_PROMPT_TOKENS} tokens.`,
      );
    }

    const messageId = await db.transaction(async (tx: DbTransaction) => {
      // Owner-scoped (ADR-0010 §2): another user's Session reads as absent.
      const session = await sessionRepository.findByIdTx(tx, sessionId, userId);
      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }
      // The Model is set per Session (CONTEXT.md); the picker changes it for this and later replies.
      if (input.model !== undefined && input.model !== session.model) {
        await sessionRepository.updateModelTx(tx, sessionId, input.model);
      }
      const message = await messageRepository.createTx(tx, {
        sessionId,
        role: 'user',
        content: input.content,
      });
      return message.id;
    });

    // The assistant Message is persisted under the stream's id, so one id names both.
    const streamId = randomUUID();
    await saveStreamOwner(streamId, userId);
    await enqueueDirectReply({ userId, sessionId, messageId, streamId }, logger);

    return { messageId, streamId };
  },
};
