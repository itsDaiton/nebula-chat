import type { FastifyReply, FastifyRequest } from 'fastify';
import { sessionService } from '@server/modules/session/session.service';
import type { CreateSessionDTO, GetSessionParams } from '@server/modules/session/session.types';
import { getSessionData } from '@server/plugins/authGate.plugin';

type GetSessionsQuery = {
  limit: number;
  cursor?: string;
};

type SearchSessionsQuery = {
  q: string;
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
    const { limit, cursor } = req.query;
    const { user } = getSessionData(req);
    const result = await sessionService.getAllSessions(user.id, limit, cursor);
    return reply.status(200).send(result);
  },
  async search(req: FastifyRequest<{ Querystring: SearchSessionsQuery }>, reply: FastifyReply) {
    const { q } = req.query;
    const { user } = getSessionData(req);
    const sessions = await sessionService.searchSessions(user.id, q);
    return reply.status(200).send(sessions);
  },
};
