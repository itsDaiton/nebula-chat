import type { FastifyReply, FastifyRequest } from 'fastify';
import { sessionService } from '@server/modules/session/session.service';
import type { CreateSessionDTO, GetSessionParams } from '@server/modules/session/session.types';
import { getSessionData } from '@server/plugins/authGate.plugin';

type GetSessionsQuery = {
  limit: number;
  cursor?: string;
  archived: boolean;
};

type SearchSessionsQuery = {
  q: string;
  archived: boolean;
};

export const sessionController = {
  async create(req: FastifyRequest<{ Body: CreateSessionDTO }>, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const session = await sessionService.createSession(req.body, user.id);
    return reply.status(201).send(session);
  },
  async get(req: FastifyRequest<{ Params: GetSessionParams }>, reply: FastifyReply) {
    const { sessionId } = req.params;
    const { user } = getSessionData(req);
    const session = await sessionService.getSession(sessionId, user.id);
    return reply.status(200).send(session);
  },
  async getAll(req: FastifyRequest<{ Querystring: GetSessionsQuery }>, reply: FastifyReply) {
    const { limit, cursor, archived } = req.query;
    const { user } = getSessionData(req);
    const result = await sessionService.getAllSessions(user.id, limit, cursor, archived);
    return reply.status(200).send(result);
  },
  async search(req: FastifyRequest<{ Querystring: SearchSessionsQuery }>, reply: FastifyReply) {
    const { q, archived } = req.query;
    const { user } = getSessionData(req);
    const sessions = await sessionService.searchSessions(user.id, q, archived);
    return reply.status(200).send(sessions);
  },
  async archive(req: FastifyRequest<{ Params: GetSessionParams }>, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const session = await sessionService.archiveSession(req.params.sessionId, user.id);
    return reply.status(200).send(session);
  },
  async restore(req: FastifyRequest<{ Params: GetSessionParams }>, reply: FastifyReply) {
    const { user } = getSessionData(req);
    const session = await sessionService.restoreSession(req.params.sessionId, user.id);
    return reply.status(200).send(session);
  },
};
