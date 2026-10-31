import type { FastifyReply, FastifyRequest } from 'fastify';
import { adminService } from '@server/modules/admin/admin.service';
import type {
  AdminEmailParams,
  GrantAdminDTO,
  ListUsersQuery,
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
};
