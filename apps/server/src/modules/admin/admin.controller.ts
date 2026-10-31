import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { adminService } from '@server/modules/admin/admin.service';
import { getSessionData } from '@server/plugins/authGate.plugin';
import type {
  AdminEmailParams,
  BanUserDTO,
  GrantAdminDTO,
  ListUserSessionsQuery,
  ListUsersQuery,
  SessionIdParams,
  SetRoleDTO,
  UserIdParams,
} from '@server/modules/admin/admin.types';

export const adminController = {
  async grant(req: FastifyRequest<{ Body: GrantAdminDTO }>, reply: FastifyReply) {
    const admin = await adminService.grant(req.body.email);
    return reply.status(201).send(admin);
  },
  async revoke(req: FastifyRequest<{ Params: AdminEmailParams }>, reply: FastifyReply) {
    await adminService.revoke(req.params.email);
    return reply.status(204).send();
  },
  async list(_req: FastifyRequest, reply: FastifyReply) {
    const admins = await adminService.list();
    return reply.status(200).send(admins);
  },
  async listUsers(req: FastifyRequest<{ Querystring: ListUsersQuery }>, reply: FastifyReply) {
    const page = await adminService.listUsers(req.query);
    return reply.status(200).send(page);
  },
  async getUser(req: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
    const user = await adminService.getUser(req.params.id);
    return reply.status(200).send(user);
  },
  async listUserSessions(
    req: FastifyRequest<{ Params: UserIdParams; Querystring: ListUserSessionsQuery }>,
    reply: FastifyReply,
  ) {
    const page = await adminService.listUserSessions(req.params.id, req.query);
    return reply.status(200).send(page);
  },
  async readSession(req: FastifyRequest<{ Params: SessionIdParams }>, reply: FastifyReply) {
    const session = await adminService.readSession(req.params.id, getSessionData(req).user.id);
    return reply.status(200).send(session);
  },
  async setRole(
    req: FastifyRequest<{ Params: UserIdParams; Body: SetRoleDTO }>,
    reply: FastifyReply,
  ) {
    const { id } = getSessionData(req).user;
    await adminService.setRole(req.params.id, req.body, id, fromNodeHeaders(req.headers));
    return reply.status(204).send();
  },
  async banUser(
    req: FastifyRequest<{ Params: UserIdParams; Body: BanUserDTO }>,
    reply: FastifyReply,
  ) {
    const { id } = getSessionData(req).user;
    await adminService.banUser(req.params.id, req.body, id, fromNodeHeaders(req.headers), req.log);
    return reply.status(204).send();
  },
  async unbanUser(req: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
    const { id } = getSessionData(req).user;
    await adminService.unbanUser(req.params.id, id, fromNodeHeaders(req.headers));
    return reply.status(204).send();
  },
  async restoreUser(req: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) {
    await adminService.restoreUser(req.params.id, getSessionData(req).user.id);
    return reply.status(204).send();
  },
};
