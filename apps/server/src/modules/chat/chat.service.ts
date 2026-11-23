import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, PayloadTooLargeError } from '@nebula-chat/errors';
import type { DbTransaction } from '@nebula-chat/db';
import { db } from '@server/db';
import type {
  ChatLogger,
  ChatUser,
  SendMessageDTO,
  SentMessage,
} from '@server/modules/chat/chat.types';
import { providersOf, selectOwnKeys } from '@server/modules/ownKey/ownKey.selection';
import { messageRepository } from '@server/modules/message/message.repository';
import { runRepository } from '@server/modules/run/run.repository';
import { sessionRepository } from '@server/modules/session/session.repository';
import { userRepository } from '@server/modules/user/user.repository';
import { enqueueDirectReply, enqueueRun, removeClarifyingQuestionTimeout } from '@server/queue';
import { saveActiveStream, saveStreamOwner } from '@server/redis';
import { countTokens } from '@server/utils/countTokens';

const MAX_PROMPT_TOKENS = 2000;

// The Purge only needs day precision (ADR-0028), so a send writes at most once an hour.
const ACTIVITY_WRITE_INTERVAL_MS = 60 * 60 * 1000;

const touchLastActive = async (userId: string): Promise<void> => {
  const now = new Date();
  const last = await userRepository.findLastActiveAt(userId);
  if (last && now.getTime() - last.getTime() < ACTIVITY_WRITE_INTERVAL_MS) return;
  await userRepository.setLastActiveAt(userId, now);
};

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
    const tokens = countTokens(input.content);
    if (tokens > MAX_PROMPT_TOKENS) {
      throw new PayloadTooLargeError(
        `User message exceeds token limit. Message has ${tokens} tokens, maximum allowed is ${MAX_PROMPT_TOKENS} tokens.`,
      );
    }

    const { messageId, runId, answeredRun, providers } = await db.transaction(
      async (tx: DbTransaction) => {
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
        // The next Message answers a Run waiting on its question, whatever its mode. Claiming the Run and
        // saving the answer share this transaction, so the timeout job and the answer settle it once.
        const waiting = await runRepository.claimWaitingTx(tx, sessionId, userId);
        const message = await messageRepository.createTx(tx, {
          sessionId,
          role: 'user',
          content: input.content,
          ...(waiting && { runId: waiting.id }),
        });
        const replyProviders = providersOf({
          model: input.model ?? session.model,
          replyMode: waiting ? 'run' : session.replyMode,
        });
        if (waiting) {
          return {
            messageId: message.id,
            runId: waiting.id,
            answeredRun: waiting,
            providers: replyProviders,
          };
        }
        if (session.replyMode !== 'run')
          return {
            messageId: message.id,
            runId: undefined,
            answeredRun: undefined,
            providers: replyProviders,
          };
        const run = await runRepository.createTx(tx, { userId, sessionId, messageId: message.id });
        return {
          messageId: message.id,
          runId: run.id,
          answeredRun: undefined,
          providers: replyProviders,
        };
      },
    );

    await touchLastActive(userId);

    // The assistant Message is persisted under the stream's id, so one id names both.
    const streamId = randomUUID();
    // A Guest holds no Own key. The reference is looked up again here, from the facts the allowance hook used.
    const { keyRefs } = user.isAnonymous
      ? { keyRefs: undefined }
      : await selectOwnKeys(userId, providers);
    const refs = keyRefs && { keyRefs };
    await saveStreamOwner(streamId, userId);
    await saveActiveStream(sessionId, streamId);
    if (runId === undefined) {
      await enqueueDirectReply({ userId, sessionId, messageId, streamId, ...refs }, logger);
      return { messageId, streamId };
    }
    if (answeredRun) {
      await removeClarifyingQuestionTimeout(runId);
      await enqueueRun(
        {
          userId,
          sessionId,
          messageId: answeredRun.messageId,
          streamId,
          runId,
          ...refs,
          resume: { answerMessageId: messageId },
        },
        logger,
      );
      return { messageId, streamId, runId };
    }
    await enqueueRun({ userId, sessionId, messageId, streamId, runId, ...refs }, logger);
    return { messageId, streamId, runId };
  },
};
