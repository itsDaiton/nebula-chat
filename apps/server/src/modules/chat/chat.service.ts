import { randomUUID } from 'node:crypto';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
} from '@nebula-chat/errors';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@server/db';
import type {
  ChatLogger,
  ChatUser,
  SendMessageDTO,
  SentMessage,
} from '@server/modules/chat/chat.types';
import { messageRepository } from '@server/modules/message/message.repository';
import { runRepository } from '@server/modules/run/run.repository';
import { sessionRepository } from '@server/modules/session/session.repository';
import { enqueueDirectReply, enqueueRun } from '@server/queue';
import { saveActiveStream, saveStreamOwner } from '@server/redis';
import { countTokens } from '@server/utils/countTokens';

const MAX_PROMPT_TOKENS = 2000;

export const chatService = {
  /**
   * Persists a user Message, records who may read the reply stream and enqueues the job; the worker does the LLM work (ADR-0013, ADR-0014).
   */
  async sendMessage(
    sessionId: string,
    input: SendMessageDTO,
    user: ChatUser,
    logger: ChatLogger,
  ): Promise<SentMessage> {
    const userId = user.id;
    // Runs are Registered-only (GLOSSARY.md); a Guest gets Direct replies.
    if (input.mode === 'run' && user.isAnonymous) {
      throw new ForbiddenError('A Run requires a registered account.');
    }
    const tokens = countTokens(input.content);
    if (tokens > MAX_PROMPT_TOKENS) {
      throw new PayloadTooLargeError(
        `User message exceeds token limit. Message has ${tokens} tokens, maximum allowed is ${MAX_PROMPT_TOKENS} tokens.`,
      );
    }

    const { messageId, runId } = await db.transaction(async (tx: DbTransaction) => {
      // Owner-scoped (ADR-0010 §2): another user's Session reads as absent.
      const session = await sessionRepository.findByIdTx(tx, sessionId, userId);
      if (!session) {
        throw new NotFoundError('Session', sessionId);
      }
      if (session.archivedAt) {
        throw new ConflictError('This Session is archived. Restore it before sending a Message.');
      }
      // The Model is set per Session (GLOSSARY.md); the picker changes it for this and later replies.
      if (input.model !== undefined && input.model !== session.model) {
        await sessionRepository.updateModelTx(tx, sessionId, input.model);
      }
      const message = await messageRepository.createTx(tx, {
        sessionId,
        role: 'user',
        content: input.content,
      });
      if (input.mode !== 'run') return { messageId: message.id, runId: undefined };
      const run = await runRepository.createTx(tx, { userId, sessionId, messageId: message.id });
      return { messageId: message.id, runId: run.id };
    });

    // The assistant Message is persisted under the stream's id, so one id names both.
    const streamId = randomUUID();
    await saveStreamOwner(streamId, userId);
    await saveActiveStream(sessionId, streamId);
    if (runId === undefined) {
      await enqueueDirectReply({ userId, sessionId, messageId, streamId }, logger);
      return { messageId, streamId };
    }
    await enqueueRun({ userId, sessionId, messageId, streamId, runId }, logger);
    return { messageId, streamId, runId };
  },
};
