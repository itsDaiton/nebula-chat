import { sessionRepository } from '@backend/modules/session/session.repository';
import { NotFoundError } from '@nebula-chat/errors';
import { paginationConfig } from '@backend/config/pagination.config';
import type { CreateSessionDTO } from '@backend/modules/session/session.types';
import { findActiveStream } from '@backend/redis';

export const sessionService = {
  async createSession(data: CreateSessionDTO, userId: string) {
    // sessions.userId is NOT NULL (ADR-0010 §2): the owner is the auth
    // session's user, resolved in the controller — never trusted from the request body.
    return sessionRepository.create(data, userId);
  },
  async getSession(sessionId: string, userId: string) {
    const session = await sessionRepository.findById({ sessionId }, userId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    // The in-flight reply lives in Redis until the worker ends it; Postgres has only finished ones.
    return { ...session, activeStreamId: await findActiveStream(sessionId) };
  },
  async getAllSessions(userId: string, limit = paginationConfig.defaultLimit, cursor?: string) {
    return sessionRepository.findAll(userId, limit, cursor);
  },
  async searchSessions(userId: string, query: string) {
    return sessionRepository.search(userId, query);
  },
};
