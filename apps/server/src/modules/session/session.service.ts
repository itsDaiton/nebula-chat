import { sessionRepository } from '@server/modules/session/session.repository';
import { NotFoundError } from '@nebula-chat/errors';
import { paginationConfig } from '@server/config/pagination.config';
import type { CreateSessionDTO } from '@server/modules/session/session.types';
import { findActiveStream } from '@server/redis';

const SNIPPET_CONTEXT = 40;

// Whitespace is collapsed so a multi-line Message reads as one line in the palette.
const snippetAround = (content: string, query: string) => {
  const text = content.replace(/\s+/g, ' ').trim();
  const start = text.toLowerCase().indexOf(query.toLowerCase());
  if (start === -1) return undefined;
  const from = Math.max(0, start - SNIPPET_CONTEXT);
  const to = Math.min(text.length, start + query.length + SNIPPET_CONTEXT);
  return `${from > 0 ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`;
};

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
  async getAllSessions(
    userId: string,
    limit = paginationConfig.defaultLimit,
    cursor?: string,
    archived = false,
  ) {
    return sessionRepository.findAll(userId, limit, cursor, archived);
  },
  async searchSessions(userId: string, query: string, archived = false) {
    const rows = await sessionRepository.search(userId, query, archived);
    return rows.map(({ matchedContent, ...session }) => {
      const snippet = matchedContent ? snippetAround(matchedContent, query) : undefined;
      return snippet ? { ...session, snippet } : session;
    });
  },
  async archiveSession(sessionId: string, userId: string) {
    const session = await sessionRepository.archive(sessionId, userId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    return session;
  },
  async restoreSession(sessionId: string, userId: string) {
    const session = await sessionRepository.restore(sessionId, userId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }
    return session;
  },
};
